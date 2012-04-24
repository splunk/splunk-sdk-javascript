#!/usr/bin/env python
#
# Copyright 2012 Splunk, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License"): you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.

# internal
import util

# stdlib
import time
import json
import sys
import xml.etree.cElementTree as et
#import lxml.etree as et

import logging
logger = logging.getLogger('splunk.xml2json.xml2json')

ATOM_NS         = 'http://www.w3.org/2005/Atom'
SPLUNK_NS       = 'http://dev.splunk.com/ns/rest'
OPENSEARCH_NS   = 'http://a9.com/-/spec/opensearch/1.1/'

XML_HEADER = "<?xml version='1.0' encoding='UTF-8'?>"

SPLUNK_TAGF = '{%s}%%s' % SPLUNK_NS


class ResultFormat(object):
    VERBOSE = 0
    ROW = 1
    COLUMN = 2

def extract_messages(node):
    '''
    Inspects an XML node and extracts any messages
    that have been passed through the standard XML messaging spec
    '''

    output = {}
    messages = node.find('messages')
    if messages == None:
        messages = node.find(SPLUNK_TAGF % 'messages')
        
    if messages is not None:
        for child in messages:
            message_type = child.get('type')
            message_code = child.get('code')
            message_text = child.text
            
            message_store = output.get(message_type, [])
            message_store.append(message_text)
            
            output[message_type] = message_store
            
    return output


def combine_messages(existing_messages = {}, new_messages = {}):
    for message_type in new_messages.keys():
        if message_type in existing_messages:
            existing_messages[message_type].extend(new_messages[message_type])
        else:
            existing_messages[message_type] = new_messages[message_type]


def unesc(str):
    if not str:
        return str
    return su.unescape(str, {'&quot;': '"', '&apos;': "'"})
    

def node_to_primitive(N):
    if N == None:
        return None
    if N.tag in (SPLUNK_TAGF % 'dict', 'dict'):
        return _dict_node_to_primitive(N)
    elif N.tag in (SPLUNK_TAGF % 'list', 'list'):
        return _list_node_to_primitive(N)
    return unesc(str(N))
    

def _dict_node_to_primitive(N):
    output = {}
    for child in N:
        if child.text and (len(child.text.strip()) > 0):
            output[child.get('name')] = child.text
        elif len(child) > 0:
            output[child.get('name')] = node_to_primitive(child[0])
        else:
            output[child.get('name')] = unesc(child.text)
    return output
    

def _list_node_to_primitive(N):
    output = []
    for child in N:
        if child.text:
            output.append(child.text)
        elif len(child) > 0:
            output.append(node_to_primitive(child[0]))
        else:
            output.append(None)
    return output
    

def extract_result_inner_text(node):
    # TODO: fails if segementation is enabled
    output = []
    for innernode in node.getiterator():
        if innernode.text and innernode.text.strip():
            output.append(innernode.text)
        elif innernode != node:
            output.append(extract_result_inner_text(innernode))
        if innernode.tail and innernode.tail.strip():
            output.append(innernode.tail)
    return output

####################

def from_feed(content, timings={}, messages={}):
    collection = {}
    
    if content:
        # Parse XML
        time_start = time.time()
        root = et.fromstring(content)
        time_end = time.time()
        timings["xml_parse"] = time_end - time_start
        
        # Try and extract messages
        time_start = time.time()
        try:
            extracted_messages = extract_messages(root)
            if extracted_messages:
                combine_messages(messages, extracted_messages)
        except:
            # TODO
            pass
        time_end = time.time()
        timings["extract_messages"] = time_end - time_start
        
        # Handle the case of a single <entry> node (i.e. the feed is an entry)
        if root.tag == '{http://www.w3.org/2005/Atom}entry':
            time_start = time.time()
            collection["entry"] = from_entry(root, messages)
            time_end = time.time()
            timings["single_entry_convert"] = time_end - time_start
        else:
            # Since we have a proper collection, let's convert each item
            time_start = time.time()
            
            entries = []
            collection["entry"] = entries
            
            for node in root.findall('{%s}entry' % (ATOM_NS)):
                entries.append(from_entry(node, messages))
                
            time_end = time.time()
            timings["collection_convert"] = time_end - time_start
            
            # OK, we've converted all the items, now we convert the
            # feed metadata set collection data
            time_start = time.time()
            
            try:
                paging = {}
                collection["paging"] = paging
                
                try:
                    paging["page"] = int(root.findall('{%s}itemsPerPage' % (OPENSEARCH_NS))[0].text)
                    paging["offset"] = int(root.findall('{%s}startIndex' % (OPENSEARCH_NS))[0].text)
                    paging["total"] = int(root.findall('{%s}totalResults' % (OPENSEARCH_NS))[0].text)
                except:
                    paging["total"] = None
                    # TODO
                    pass
                  
                # We might not have a total_count field, so we have to check
                # if it is "none" or actually
                # 0, since they are both false-y values
                if paging["total"] is None:
                    paging["count"] = len(entries)
                    paging["total"] = paging["count"]
                else:
                    paging["count"] = min(paging["total"], len(entries))
                
                try:
                    
                    collection["origin"] = root.findall('{%s}id' % (ATOM_NS))[0].text
              
                    links = {}
                    collection["links"] = links
                    
                    for link in root.findall('{%s}link' % (ATOM_NS)):
                        links[link.get('rel')] = link.get('href')
                        
                    collection["updated"] = root.findall('{%s}updated' % (ATOM_NS))[0].text
                except:
                    pass
            except:
                # TODO
                raise
        
            time_end = time.time()
            timings["collection_metadata"] = time_end - time_start
    collection["timings"] = timings
    collection["messages"] = messages
    
    return collection
    

def from_entry(root, messages):
    entry = {}
    
    # Extract the content
    contents = {}
    tentative_content = root.findall('{%s}content' % (ATOM_NS))
    if (len(tentative_content) > 0):
        if (len(tentative_content[0]) > 0):
            content_node = tentative_content[0][0]
            contents = node_to_primitive(content_node)
        else:
            contents = {"data": tentative_content[0].text}
    entry["content"] = contents
    
    # We have the metadata in line with the content, so lets get rid of it
    if isinstance(contents, dict):
        to_delete = []
        for k in contents.keys():
            if k == "eai:acl":
                entry["acl"] = contents[k]
                del contents[k]
            elif k == "eai:attributes":
                entry["fields"] = from_attributes(contents[k])
                del contents[k]
                
    # Get the links
    links = {}
    entry["links"] = links
    
    for link in root.findall('{%s}link' % (ATOM_NS)):
        links[link.get('rel')] = link.get('href')
        
    # Get the rest of the metadata
    entry["id"] = root.findall('{%s}id' % (ATOM_NS))[0].text
    entry["name"] = contents.get("name", root.findall('{%s}title' % (ATOM_NS))[0].text)
    
    published_info = root.findall('{%s}published' % (ATOM_NS))
    if published_info:
        entry["published"] = published_info[0].text
        
    updated_info = root.findall('{%s}updated' % (ATOM_NS))
    if updated_info:
        entry["updated"] = updated_info[0].text
        
    author_info = root.findall('{%s}author/{%s}name' % (ATOM_NS, ATOM_NS))
    if author_info:
        entry["author"] = author_info[0].text
    
    return entry
        

def from_attributes(attr_dict):
    required = attr_dict.get("requiredFields", [])
    optional = attr_dict.get("optionalFields", [])
    wildcard = attr_dict.get("wildcardFields", [])
    
    return {
        "required": required,
        "optional": optional,
        "wildcard": wildcard
    }


def from_job_results(root, format=ResultFormat.ROW, timings={}):

    
    if isinstance(root, str):    
        # When we have a oneshot search with no results,
        # we get back an invalid XML string. We simply
        # replace it with an empty results tag
        if root.strip() == XML_HEADER:
            root = "<results preview='0'/>"
            
        time_start = time.time()
        root = et.fromstring(root)
        time_end = time.time()
        timings["job_results_parse"] = time_end - time_start
    elif isinstance(root, file):
        time_start = time.time()
        root = et.parse(root).getroot()
        time_end = time.time()
        timings["job_results_parse"] = time_end - time_start
    
    results = {}
    messages = {}
    
    try:
        extracted_messages = extract_messages(root)
        if extracted_messages:
            combine_messages(messages, extracted_messages)
    except:
        # TODO
        pass
            
    field_list = []
    data = []
    offsets = []

    time_start = time.time()
    for node in root.findall('meta/fieldOrder/field'):
        field_list.append(unicode(node.text))
    time_end = time.time()
    timings["job_results_extract_fields"] = time_end - time_start
    
    time_start = time.time()
    for node in root.findall('result'):
        row = {}
        
        offsets.append(node.get('offset'))
        for field in node.findall('field'):
            field_struct = []
            for subfield in field.findall('value'):
                field_struct.append({
                    'value': subfield.findtext('text'),
                    #'tags': [x.text for x in subfield.findall('tag')]
                })
            for subfield in field.findall('v'):
                field_struct.append({
                    'value': extract_result_inner_text(subfield)
                })
            row[field.get('k')] = field_struct
        data.append(row)
    time_end = time.time()
    timings["job_results_extract_data"] = time_end - time_start
        
    time_start = time.time()
    if format is ResultFormat.VERBOSE:
        results = results_to_verbose(field_list, data)
    elif format is ResultFormat.ROW:
        results = results_to_rows(field_list, data)
    elif format is ResultFormat.COLUMN:
        results = results_to_columns(field_list, data)
    time_end = time.time()
    timings["job_results_mold_data"] = time_end - time_start
    
    messages = {}
    try:
        extracted_messages = extract_messages(root)
        if extracted_messages:
            combine_messages(messages, extracted_messages)
    except:
        # TODO
        pass
    
    if format is not ResultFormat.VERBOSE:
        results["preview"] = util.normalize_boolean(root.get("preview"))
        results["init_offset"] = int(offsets[0] if len(offsets) else 0)
        results["messages"] = messages
        results["timings"] = timings
        
                    
    return results
    

def results_to_verbose(field_list, data):
    results = []
    for row_data in data:
        row = {}
        for field_name in field_list:
            field_data = row_data.get(field_name, [{"value": []}])
            values = []
            
            for field_datum in field_data:
                value = field_datum['value'] or None
                if isinstance(value, list) and len(value) == 1:
                    value = value[0]
                    
                values.append(value)
                
            row[field_name] = values[0] if len(values) == 1 else values
            
        results.append(row)
    
    return results
    

def results_to_rows(field_list, data):
    results = {}
    results['fields'] = field_list
    results['rows'] = []
    
    for row_data in data:
        row = {
            "data": [],
        }
        
        for field_name in field_list:
            field_data = row_data.get(field_name, [{"value": []}])
            values = []
            
            for field_datum in field_data:
                value = field_datum['value'] or None
                if isinstance(value, list) and len(value) == 1:
                    value = value[0]
                    
                values.append(value)
                
            values = values[0] if len(values) == 1 else values
            
            row['data'].append(values or None)
            
        results['rows'].append(row['data'])
        
    return results
    

def results_to_columns(field_list, data):
    results = {}
    results['fields'] = field_list
    results['columns'] = []
    
    for field_name in field_list:
        def extract(row_data):
            field_data = row_data.get(field_name, [{"value": []}])
            values = []
            tags = []
            
            for field_datum in field_data:
                value = field_datum['value'] or None
                if isinstance(value, list) and len(value) == 1:
                    value = value[0]
                    
                values.append(value)
                
            values = values[0] if len(values) == 1 else values
            
            return values or None
            
        column_data = map(extract, data)
        results['columns'].append(column_data)
        
    return results
    

def from_search_timeline(root, timings={}):
    if isinstance(root, str):
        time_start = time.time()
        root = et.fromstring(root)
        time_end = time.time()
        timings["search_timeline_parse"] = time_end - time_start
    elif isinstance(root, file):
        time_start = time.time()
        root = et.parse(root).getroot()
        time_end = time.time()
        timings["search_timeline_parse"] = time_end - time_start
        
    entry = {
        'event_count': int(root.get('c', 0)),
        'cursor_time': float(root.get('cursor', 0)),
        'buckets': []
    }
    
    time_start = time.time()
    for node in root.findall('bucket'):
        entry['buckets'].append({
            'available_count': int(node.get('a', 0)),
            'duration': float(node.get('d', 0)),
            'earliest_time': float(node.get('t', 0)),
            'earliest_time_offset': int(node.get('etz', 0)),
            'is_finalized': True if (node.get('f', False)) == '1' else False,
            'latest_time_offset': int(node.get('ltz', 0)),
            'earliest_strftime': node.text,
            'total_count': int(node.get('c', 0))
        })
    time_end = time.time()
    timings["search_timeline_buckets"] = time_end - time_start
    
    messages = {}
    try:
        extracted_messages = extract_messages(root)
        if extracted_messages:
            combine_messages(messages, extracted_messages)
    except:
        # TODO
        pass
    
    return entry
    

def from_search_summary(root, timings={}):
    if isinstance(root, str):
        time_start = time.time()
        root = et.fromstring(root)
        time_end = time.time()
        timings["search_timeline_parse"] = time_end - time_start
    elif isinstance(root, file):
        time_start = time.time()
        root = et.parse(root).getroot()
        time_end = time.time()
        timings["search_timeline_parse"] = time_end - time_start
        
    summary = {
        'earliest_time': root.get('earliest_time', ''),
        'latest_time': root.get('latest_time', ''),
        'duration': float(root.get('duration', 0)),
        'event_count': int(root.get('c', 0)),
        'fields': {}
    }
    
    time_start = time.time()
    for node in root.findall('field'):
        field = {
            'name': node.get('k'),
            'count': int(node.get('c', 0)),
            'nc': int(node.get('nc', 0)),
            'distinct_count': int(node.get('dc', 0)),
            'is_exact': True if (node.get('exact', False)) == '1' else False,
            'min': float(node.findtext('min')) if node.findtext('min', None) else None,
            'max': float(node.findtext('max')) if node.findtext('max', None) else None,
            'mean': float(node.findtext('mean')) if node.findtext('mean', None) else None,
            'stdev': float(node.findtext('stdev')) if node.findtext('stdev', None) else None,
            'modes': []
        }
        for val in node.findall('modes/value'):
            v = val.findtext('text')
            if field['mean'] != None:
                try:
                    v = float(v)
                except:
                    pass
            field['modes'].append({
                'value': v,
                'count': int(val.get('c', 0)),
                'is_exact': True if (node.get('exact', False)) == '1' else False
            })
        summary['fields'][node.get('k')] = field
    time_end = time.time()
    timings["search_summary_fields"] = time_end - time_start
    
    messages = {}
    try:
        extracted_messages = extract_messages(root)
        if extracted_messages:
            combine_messages(messages, extracted_messages)
    except:
        # TODO
        pass
    
    return summary
    

def from_auth(root):
    if isinstance(root, str):
        root = et.fromstring(root)
    elif isinstance(root, file):
        root = et.parse(root).getroot()
        
    session_key = root.findtext("sessionKey")
    
    messages = {}
    try:
        extracted_messages = extract_messages(root)
        if extracted_messages:
            combine_messages(messages, extracted_messages)
    except:
        # TODO
        pass
        
    return {
        "sessionKey": session_key
    }
    

def from_job_create(root):
    if isinstance(root, str):
        root = et.fromstring(root)
    elif isinstance(root, file):
        root = et.parse(root).getroot()
        
    sid = root.findtext("sid")
    
    messages = {}
    try:
        extracted_messages = extract_messages(root)
        if extracted_messages:
            combine_messages(messages, extracted_messages)
    except:
        # TODO
        pass
        
    return {
        "sid": sid
    }
    

def from_http_simple_input(root):
    if isinstance(root, str):
        root = et.fromstring(root)
    elif isinstance(root, file):
        root = et.parse(root).getroot()
        
    entry = {}
    
    for field in root.findall("results/result/field"):
        entry[field.get("k")] = field.findtext("value/text")
        
    messages = {}
    try:
        extracted_messages = extract_messages(root)
        if extracted_messages:
            combine_messages(messages, extracted_messages)
    except:
        # TODO
        pass
        
    return entry
    

def from_typeahead(root):
    if isinstance(root, str):
        root = json.loads(root)
    elif isinstance(root, file):
        root = json.loads(root.read())
        
    return root
    

def from_search_parser(root):
    if isinstance(root, str):
        root = et.fromstring(root)
    elif isinstance(root, file):
        root = et.parse(root).getroot()
        
    entry = {}
    entry["commands"] = []
    
    for node in root.findall("dict/key"):
        entry[node.get("name")] = node.text or ""
    
    for node in root.findall("list/item"):
        command = {}
        for key in node.findall("dict/key"):
            if key.get("name") == "args":
                args = {}
                for arg_key in key.findall("dict/key"):
                    if arg_key.get("name") == "search":
                        search_items = []
                        for search_item in arg_key.findall("list/item"):
                            search_items.append(search_item.text or "")
                        args["search"] = search_items
                    else:
                        args[arg_key.get("name")] = arg_key.text or ""
                command["args"] = args
            else:
                command[key.get("name")] = key.text or ""
        entry["commands"].append(command)
        
    messages = {}
    try:
        extracted_messages = extract_messages(root)
        if extracted_messages:
            combine_messages(messages, extracted_messages)
    except:
        # TODO
        pass
        
    return entry
    

def from_propertizes_stanza_key(root, key):
    messages = {}
    try:
        extracted_messages = extract_messages(root)
        if extracted_messages:
            combine_messages(messages, extracted_messages)
    except:
        # TODO
        pass
        
    return root

def from_propertizes_stanza(root):
    if isinstance(root, str):
        root = et.fromstring(root)
    elif isinstance(root, file):
        root = et.parse(root).getroot()
        
    collection = {}
    
    collection['entry'] = parse_stanza(root)
    
    collection['id'] = root.findall('{%s}id' % (ATOM_NS))[0].text
    collection['name'] = root.findall('{%s}title' % (ATOM_NS))[0].text
    
    published_info = root.findall('{%s}published' % (ATOM_NS))
    if published_info:
        collection['published'] = published_info[0].text
        
    updated_info = root.findall('{%s}updated' % (ATOM_NS))
    if updated_info:
        collection['updated'] = updated_info[0].text
        
    author_info = root.findall('{%s}author/{%s}name' % (ATOM_NS, ATOM_NS))
    if author_info:
        collection['author'] = author_info[0].text
            
    messages = {}
    try:
        extracted_messages = extract_messages(root)
        if extracted_messages:
            combine_messages(messages, extracted_messages)
    except:
        # TODO
        pass
    collection['messages'] = messages
    
    return collection
    

def parse_stanza(root):
    content = {}
    stanza = {"content": content}
    
    for entry in root.findall('{%s}entry' % (ATOM_NS)):
        try:
            key = entry.findall("{%s}title" % (ATOM_NS))[0].text
            value = entry.findall("{%s}content" % (ATOM_NS))[0].text
            content[key] = value
        except:
            logger.info("Error parsing KV-pair from stanza")
            
    return stanza
    

def from_messages_only(root):
    if not root:
        return { "messages": {} };
    
    if isinstance(root, str):
        root = et.fromstring(root)
    elif isinstance(root, file):
        root = et.parse(root).getroot()
        
    messages = {}
    
    try:
        extracted_messages = extract_messages(root)
        if extracted_messages:
            combine_messages(messages, extracted_messages)
    except:
        # TODO
        pass
        
    return {
        "messages": messages
    }
    

if __name__ == "__main__":
    #time_start = time.time()
    #incoming = sys.stdin.read()
    #time_end = time.time()
    #print "Read: %s" % (time_end - time_start)
    #print json.dumps(from_job_results(incoming, format=ResultFormat.VERBOSE))
    #print json.dumps(from_feed(incoming))
    #data = from_job_results(sys.stdin, format=ResultFormat.ROW)
    #print json.dumps(data["timings"], sort_keys=True, indent = 4)
    #print len(data["rows"])
    data = from_search_parser(sys.stdin)
    print json.dumps(data, indent=4)
    pass
