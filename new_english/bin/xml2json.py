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

import time
import json

#import xml.etree.cElementTree as et
import lxml.etree as et

ATOM_NS         = 'http://www.w3.org/2005/Atom'
SPLUNK_NS       = 'http://dev.splunk.com/ns/rest'
OPENSEARCH_NS   = 'http://a9.com/-/spec/opensearch/1.1/'

SPLUNK_TAGF = '{%s}%%s' % SPLUNK_NS

def extract_messages(node):
    '''
    Inspects an XML node and extracts any messages that have been passed through
    the standard XML messaging spec
    '''

    output = []
    messages = node.find('messages')
    if messages == None:
        # logger.debug("The atom feed uses the splunk namespace, so check there too")
        messages = node.find(SPLUNK_TAGF % 'messages')
        
    if messages is not None:
        for child in messages:
            item = {
                'type': child.get('type'),
                'code': child.get('code'),
                'text': child.text
            }
            output.append(item)
    return output

def unesc(str):
    if not str: return str    
    return su.unescape(str, {'&quot;': '"', '&apos;': "'"})
    
def node_to_primitive(N, fail_on_non_node=False):
    if N == None: return None
    if isinstance(N, et._Element):
        if N.tag in (SPLUNK_TAGF % 'dict', 'dict'):
            return _dict_node_to_primitive(N)
        elif N.tag in (SPLUNK_TAGF % 'list', 'list'):
            return _list_node_to_primitive(N)
    if fail_on_non_node:
        raise Exception, 'Expected Element object type; got %s' % N
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

####################

def from_feed(content, timings = {}, messages = {}):
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
                messages.extend(extracted_messages);
        except:
            # TODO
            raise
        time_end = time.time()
        timings["extract_messages"] = time_end - time_start
        
        # Handle the case of a single <entry> node (i.e. the feed is an entry)
        if root.tag == '{http://www.w3.org/2005/Atom}entry':
            time_start = time.time()
            collection["entry"] = from_entry(root, messages, timings)
            time_end = time.time()
            timings["single_entry_convert"] = time_end - time_start    
        else:
            # Since we have a proper collection, let's convert each item
            time_start = time.time()
            
            entries = []
            collection["entry"] = entries
            
            for node in root.xpath('a:entry', namespaces={'a': ATOM_NS}):
                entries.append(from_entry(node))
                
            time_end = time.time()
            timings["collection_convert"] = time_end - time_start
            
            # OK, we've converted all the items, now we convert the feed metadata
            # set collection data
            try:
                paging = {}
                collection["paging"] = paging
                
                try:
                    paging["offset"] = int(root.xpath('o:startIndex', namespaces={'o': OPENSEARCH_NS})[0].text)
                    paging["total"] = int(root.xpath('o:totalResults', namespaces={'o': OPENSEARCH_NS})[0].text)
                except:
                    output.total_count = None
                    pass
                  
                # We might not have a total_count field, so we have to check if it is "none" or actually
                # 0, since they are both false-y values
                if paging["total"] is None:
                    paging["count"] = len(entries)
                    paging["total"] = paging["count"]
                else:
                    paging["count"] = min(paging["total"], entries)
                
                  
                collection["origin"] = root.xpath('a:id', namespaces={'a': ATOM_NS})[0].text
              
                links = {}
                collection["links"] = links
                
                for link in root.xpath('a:link', namespaces={'a': ATOM_NS}):
                    links[link.get('rel')] = link.get('href') 
            except:
                pass
        
    collection["timings"] = timings
    collection["messages"] = messages
    
    return collection
    
def from_entry(root):
    entry = {}
    
    # Extract the content
    contents = {}
    tentative_content = root.xpath('a:content', namespaces={'a': ATOM_NS})
    if (len(tentative_content) > 0):
        if (len(tentative_content[0]) > 0):
            content_node = tentative_content[0][0]
            contents = nodeToPrimitive(content_node)
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
    
    for link in root.xpath('a:link', namespaces={'a': ATOM_NS}):
        links[link.get('rel')] = link.get('href') 
        
    # Get the rest of the metadata
    entry["id"] = root.xpath('a:id', namespaces={'a': ATOM_NS})[0].text
    entry["name"] = contents.get("name", root.xpath('a:title', namespaces={'a': ATOM_NS})[0].text)
    
    published_info = root.xpath('a:published', namespaces={'a': ATOM_NS})
    if published_info:
        entry["published"] = published_info[0].text
        
    updated_info = root.xpath('a:updated', namespaces={'a': ATOM_NS})
    if updated_info:
        entry["updated"] = updated_info[0].text
        
    author_info = root.xpath('a:author/a:name', namespaces={'a': ATOM_NS})
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
    
sample_xml = """
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:s="http://dev.splunk.com/ns/rest" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <title datatype="string">savedsearch</title>
  <id datatype="string">https://127.0.0.1:8079/services/saved/searches</id>
  <updated datatype="string">2012-03-13T15:22:54-07:00</updated>
  <generator build="120438" version="20120313" datatype="string"/>
  <author>
    <name datatype="string">Splunk</name>
  </author>
  <link href="/services/saved/searches/_new" rel="create"/>
  <link href="/services/saved/searches/_reload" rel="_reload"/>
  <opensearch:totalResults datatype="number">6</opensearch:totalResults>
  <opensearch:itemsPerPage datatype="number">30</opensearch:itemsPerPage>
  <opensearch:startIndex datatype="number">0</opensearch:startIndex>
  <s:messages/>
  <entry>
    <title datatype="string">Errors in the last 24 hours</title>
    <id datatype="string">https://127.0.0.1:8079/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%2024%20hours</id>
    <updated datatype="string">2012-03-13T15:22:54-07:00</updated>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%2024%20hours" rel="alternate"/>
    <author>
      <name datatype="string">nobody</name>
    </author>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%2024%20hours" rel="list"/>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%2024%20hours/_reload" rel="_reload"/>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%2024%20hours" rel="edit"/>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%2024%20hours/disable" rel="disable"/>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%2024%20hours/dispatch" rel="dispatch"/>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%2024%20hours/history" rel="history"/>
    <content type="text/xml">
      <s:dict>
        <s:key name="action.email" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.email.sendresults" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.email.to" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.populate_lookup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.rss" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.script" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.summary_index" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert.digest_mode" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="alert.expires" datatype="DATATYPE_NOT_SET">24h</s:key>
        <s:key name="alert.severity" datatype="DATATYPE_NOT_SET">3</s:key>
        <s:key name="alert.suppress" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.fields" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.period" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.track" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert_comparator" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_condition" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_threshold" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_type" datatype="DATATYPE_NOT_SET">always</s:key>
        <s:key name="auto_summarize" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="auto_summarize.command" datatype="DATATYPE_NOT_SET">| summarize override=partial timespan=$auto_summarize.timespan$ [ $search$ ]</s:key>
        <s:key name="auto_summarize.cron_schedule" datatype="DATATYPE_NOT_SET">0 */4 * * *</s:key>
        <s:key name="auto_summarize.dispatch.earliest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.dispatch.latest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.timespan" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="cron_schedule" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="description" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="disabled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.buckets" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.earliest_time" datatype="DATATYPE_NOT_SET">-1d</s:key>
        <s:key name="dispatch.latest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="dispatch.lookups" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.max_count" datatype="DATATYPE_NOT_SET">500000</s:key>
        <s:key name="dispatch.max_time" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.reduce_freq" datatype="DATATYPE_NOT_SET">10</s:key>
        <s:key name="dispatch.rt_backfill" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.spawn_process" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.time_format" datatype="DATATYPE_NOT_SET">%FT%T.%Q%:z</s:key>
        <s:key name="dispatch.ttl" datatype="DATATYPE_NOT_SET">2p</s:key>
        <s:key name="displayview" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="eai:acl"><s:dict><s:key name="app" datatype="string">search</s:key><s:key name="can_change_perms" datatype="boolean">1</s:key><s:key name="can_list" datatype="boolean">1</s:key><s:key name="can_share_app" datatype="boolean">1</s:key><s:key name="can_share_global" datatype="boolean">1</s:key><s:key name="can_share_user" datatype="boolean">0</s:key><s:key name="can_write" datatype="boolean">1</s:key><s:key name="modifiable" datatype="boolean">1</s:key><s:key name="owner" datatype="string">nobody</s:key><s:key name="perms"><s:dict><s:key name="read"><s:list><s:item datatype="string">*</s:item></s:list></s:key><s:key name="write"><s:list><s:item datatype="string">admin</s:item></s:list></s:key></s:dict></s:key><s:key name="removable" datatype="boolean">0</s:key><s:key name="sharing" datatype="string">app</s:key></s:dict></s:key>
        <s:key name="is_scheduled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="is_visible" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="max_concurrent" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="next_scheduled_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="qualifiedSearch" datatype="DATATYPE_NOT_SET">search error OR failed OR severe OR ( sourcetype=access_* ( 404 OR 500 OR 503 ) )</s:key>
        <s:key name="realtime_schedule" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="request.ui_dispatch_app" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="request.ui_dispatch_view" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="restart_on_searchpeer_add" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="run_on_startup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="search" datatype="DATATYPE_NOT_SET">error OR failed OR severe OR ( sourcetype=access_* ( 404 OR 500 OR 503 ) )</s:key>
        <s:key name="vsid" datatype="DATATYPE_NOT_SET"></s:key>
      </s:dict>
    </content>
  </entry>
  <entry>
    <title datatype="string">Errors in the last hour</title>
    <id datatype="string">https://127.0.0.1:8079/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%20hour</id>
    <updated datatype="string">2012-03-13T15:22:54-07:00</updated>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%20hour" rel="alternate"/>
    <author>
      <name datatype="string">nobody</name>
    </author>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%20hour" rel="list"/>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%20hour/_reload" rel="_reload"/>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%20hour" rel="edit"/>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%20hour/disable" rel="disable"/>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%20hour/dispatch" rel="dispatch"/>
    <link href="/servicesNS/nobody/search/saved/searches/Errors%20in%20the%20last%20hour/history" rel="history"/>
    <content type="text/xml">
      <s:dict>
        <s:key name="action.email" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.email.sendresults" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.email.to" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.populate_lookup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.rss" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.script" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.summary_index" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert.digest_mode" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="alert.expires" datatype="DATATYPE_NOT_SET">24h</s:key>
        <s:key name="alert.severity" datatype="DATATYPE_NOT_SET">3</s:key>
        <s:key name="alert.suppress" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.fields" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.period" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.track" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert_comparator" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_condition" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_threshold" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_type" datatype="DATATYPE_NOT_SET">always</s:key>
        <s:key name="auto_summarize" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="auto_summarize.command" datatype="DATATYPE_NOT_SET">| summarize override=partial timespan=$auto_summarize.timespan$ [ $search$ ]</s:key>
        <s:key name="auto_summarize.cron_schedule" datatype="DATATYPE_NOT_SET">0 */4 * * *</s:key>
        <s:key name="auto_summarize.dispatch.earliest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.dispatch.latest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.timespan" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="cron_schedule" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="description" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="disabled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.buckets" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.earliest_time" datatype="DATATYPE_NOT_SET">-1h</s:key>
        <s:key name="dispatch.latest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="dispatch.lookups" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.max_count" datatype="DATATYPE_NOT_SET">500000</s:key>
        <s:key name="dispatch.max_time" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.reduce_freq" datatype="DATATYPE_NOT_SET">10</s:key>
        <s:key name="dispatch.rt_backfill" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.spawn_process" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.time_format" datatype="DATATYPE_NOT_SET">%FT%T.%Q%:z</s:key>
        <s:key name="dispatch.ttl" datatype="DATATYPE_NOT_SET">2p</s:key>
        <s:key name="displayview" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="eai:acl"><s:dict><s:key name="app" datatype="string">search</s:key><s:key name="can_change_perms" datatype="boolean">1</s:key><s:key name="can_list" datatype="boolean">1</s:key><s:key name="can_share_app" datatype="boolean">1</s:key><s:key name="can_share_global" datatype="boolean">1</s:key><s:key name="can_share_user" datatype="boolean">0</s:key><s:key name="can_write" datatype="boolean">1</s:key><s:key name="modifiable" datatype="boolean">1</s:key><s:key name="owner" datatype="string">nobody</s:key><s:key name="perms"><s:dict><s:key name="read"><s:list><s:item datatype="string">*</s:item></s:list></s:key><s:key name="write"><s:list><s:item datatype="string">admin</s:item></s:list></s:key></s:dict></s:key><s:key name="removable" datatype="boolean">0</s:key><s:key name="sharing" datatype="string">app</s:key></s:dict></s:key>
        <s:key name="is_scheduled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="is_visible" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="max_concurrent" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="next_scheduled_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="qualifiedSearch" datatype="DATATYPE_NOT_SET">search error OR failed OR severe OR ( sourcetype=access_* ( 404 OR 500 OR 503 ) )</s:key>
        <s:key name="realtime_schedule" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="request.ui_dispatch_app" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="request.ui_dispatch_view" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="restart_on_searchpeer_add" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="run_on_startup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="search" datatype="DATATYPE_NOT_SET">error OR failed OR severe OR ( sourcetype=access_* ( 404 OR 500 OR 503 ) )</s:key>
        <s:key name="vsid" datatype="DATATYPE_NOT_SET"></s:key>
      </s:dict>
    </content>
  </entry>
  <entry>
    <title datatype="string">Indexing workload</title>
    <id datatype="string">https://127.0.0.1:8079/servicesNS/nobody/search/saved/searches/Indexing%20workload</id>
    <updated datatype="string">2012-03-13T15:22:54-07:00</updated>
    <link href="/servicesNS/nobody/search/saved/searches/Indexing%20workload" rel="alternate"/>
    <author>
      <name datatype="string">nobody</name>
    </author>
    <link href="/servicesNS/nobody/search/saved/searches/Indexing%20workload" rel="list"/>
    <link href="/servicesNS/nobody/search/saved/searches/Indexing%20workload/_reload" rel="_reload"/>
    <link href="/servicesNS/nobody/search/saved/searches/Indexing%20workload" rel="edit"/>
    <link href="/servicesNS/nobody/search/saved/searches/Indexing%20workload/disable" rel="disable"/>
    <link href="/servicesNS/nobody/search/saved/searches/Indexing%20workload/dispatch" rel="dispatch"/>
    <link href="/servicesNS/nobody/search/saved/searches/Indexing%20workload/history" rel="history"/>
    <content type="text/xml">
      <s:dict>
        <s:key name="action.email" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.email.sendresults" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.email.to" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.populate_lookup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.rss" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.script" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.summary_index" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert.digest_mode" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="alert.expires" datatype="DATATYPE_NOT_SET">24h</s:key>
        <s:key name="alert.severity" datatype="DATATYPE_NOT_SET">3</s:key>
        <s:key name="alert.suppress" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.fields" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.period" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.track" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert_comparator" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_condition" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_threshold" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_type" datatype="DATATYPE_NOT_SET">always</s:key>
        <s:key name="auto_summarize" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="auto_summarize.command" datatype="DATATYPE_NOT_SET">| summarize override=partial timespan=$auto_summarize.timespan$ [ $search$ ]</s:key>
        <s:key name="auto_summarize.cron_schedule" datatype="DATATYPE_NOT_SET">0 */4 * * *</s:key>
        <s:key name="auto_summarize.dispatch.earliest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.dispatch.latest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.timespan" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="cron_schedule" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="description" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="disabled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.buckets" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.earliest_time" datatype="DATATYPE_NOT_SET">-1445m</s:key>
        <s:key name="dispatch.latest_time" datatype="DATATYPE_NOT_SET">-5m</s:key>
        <s:key name="dispatch.lookups" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.max_count" datatype="DATATYPE_NOT_SET">500000</s:key>
        <s:key name="dispatch.max_time" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.reduce_freq" datatype="DATATYPE_NOT_SET">10</s:key>
        <s:key name="dispatch.rt_backfill" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.spawn_process" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.time_format" datatype="DATATYPE_NOT_SET">%FT%T.%Q%:z</s:key>
        <s:key name="dispatch.ttl" datatype="DATATYPE_NOT_SET">2p</s:key>
        <s:key name="displayview" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="eai:acl"><s:dict><s:key name="app" datatype="string">search</s:key><s:key name="can_change_perms" datatype="boolean">1</s:key><s:key name="can_list" datatype="boolean">1</s:key><s:key name="can_share_app" datatype="boolean">1</s:key><s:key name="can_share_global" datatype="boolean">1</s:key><s:key name="can_share_user" datatype="boolean">0</s:key><s:key name="can_write" datatype="boolean">1</s:key><s:key name="modifiable" datatype="boolean">1</s:key><s:key name="owner" datatype="string">nobody</s:key><s:key name="perms"><s:dict><s:key name="read"><s:list><s:item datatype="string">admin</s:item></s:list></s:key><s:key name="write"><s:list><s:item datatype="string">admin</s:item></s:list></s:key></s:dict></s:key><s:key name="removable" datatype="boolean">0</s:key><s:key name="sharing" datatype="string">app</s:key></s:dict></s:key>
        <s:key name="is_scheduled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="is_visible" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="max_concurrent" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="next_scheduled_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="qualifiedSearch" datatype="DATATYPE_NOT_SET">search index=_internal (source=*/metrics.log* OR source=*\\metrics.log*) group=per_sourcetype_thruput | timechart span=10m per_second(kb) by series</s:key>
        <s:key name="realtime_schedule" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="request.ui_dispatch_app" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="request.ui_dispatch_view" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="restart_on_searchpeer_add" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="run_on_startup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="search" datatype="DATATYPE_NOT_SET">index=_internal (source=*/metrics.log* OR source=*\\metrics.log*) group=per_sourcetype_thruput | timechart span=10m per_second(kb) by series</s:key>
        <s:key name="vsid" datatype="DATATYPE_NOT_SET"></s:key>
      </s:dict>
    </content>
  </entry>
  <entry>
    <title datatype="string">Messages by minute last 3 hours</title>
    <id datatype="string">https://127.0.0.1:8079/servicesNS/nobody/search/saved/searches/Messages%20by%20minute%20last%203%20hours</id>
    <updated datatype="string">2012-03-13T15:22:54-07:00</updated>
    <link href="/servicesNS/nobody/search/saved/searches/Messages%20by%20minute%20last%203%20hours" rel="alternate"/>
    <author>
      <name datatype="string">nobody</name>
    </author>
    <link href="/servicesNS/nobody/search/saved/searches/Messages%20by%20minute%20last%203%20hours" rel="list"/>
    <link href="/servicesNS/nobody/search/saved/searches/Messages%20by%20minute%20last%203%20hours/_reload" rel="_reload"/>
    <link href="/servicesNS/nobody/search/saved/searches/Messages%20by%20minute%20last%203%20hours" rel="edit"/>
    <link href="/servicesNS/nobody/search/saved/searches/Messages%20by%20minute%20last%203%20hours/disable" rel="disable"/>
    <link href="/servicesNS/nobody/search/saved/searches/Messages%20by%20minute%20last%203%20hours/dispatch" rel="dispatch"/>
    <link href="/servicesNS/nobody/search/saved/searches/Messages%20by%20minute%20last%203%20hours/history" rel="history"/>
    <content type="text/xml">
      <s:dict>
        <s:key name="action.email" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.email.sendresults" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.email.to" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.populate_lookup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.rss" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.script" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.summary_index" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert.digest_mode" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="alert.expires" datatype="DATATYPE_NOT_SET">24h</s:key>
        <s:key name="alert.severity" datatype="DATATYPE_NOT_SET">3</s:key>
        <s:key name="alert.suppress" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.fields" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.period" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.track" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert_comparator" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_condition" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_threshold" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_type" datatype="DATATYPE_NOT_SET">always</s:key>
        <s:key name="auto_summarize" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="auto_summarize.command" datatype="DATATYPE_NOT_SET">| summarize override=partial timespan=$auto_summarize.timespan$ [ $search$ ]</s:key>
        <s:key name="auto_summarize.cron_schedule" datatype="DATATYPE_NOT_SET">0 */4 * * *</s:key>
        <s:key name="auto_summarize.dispatch.earliest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.dispatch.latest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.timespan" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="cron_schedule" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="description" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="disabled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.buckets" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.earliest_time" datatype="DATATYPE_NOT_SET">-3h</s:key>
        <s:key name="dispatch.latest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="dispatch.lookups" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.max_count" datatype="DATATYPE_NOT_SET">500000</s:key>
        <s:key name="dispatch.max_time" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.reduce_freq" datatype="DATATYPE_NOT_SET">10</s:key>
        <s:key name="dispatch.rt_backfill" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.spawn_process" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.time_format" datatype="DATATYPE_NOT_SET">%FT%T.%Q%:z</s:key>
        <s:key name="dispatch.ttl" datatype="DATATYPE_NOT_SET">2p</s:key>
        <s:key name="displayview" datatype="DATATYPE_NOT_SET">report_builder_display</s:key>
        <s:key name="eai:acl"><s:dict><s:key name="app" datatype="string">search</s:key><s:key name="can_change_perms" datatype="boolean">1</s:key><s:key name="can_list" datatype="boolean">1</s:key><s:key name="can_share_app" datatype="boolean">1</s:key><s:key name="can_share_global" datatype="boolean">1</s:key><s:key name="can_share_user" datatype="boolean">0</s:key><s:key name="can_write" datatype="boolean">1</s:key><s:key name="modifiable" datatype="boolean">1</s:key><s:key name="owner" datatype="string">nobody</s:key><s:key name="perms"><s:dict><s:key name="read"><s:list><s:item datatype="string">admin</s:item></s:list></s:key><s:key name="write"><s:list><s:item datatype="string">admin</s:item></s:list></s:key></s:dict></s:key><s:key name="removable" datatype="boolean">0</s:key><s:key name="sharing" datatype="string">app</s:key></s:dict></s:key>
        <s:key name="is_scheduled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="is_visible" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="max_concurrent" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="next_scheduled_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="qualifiedSearch" datatype="DATATYPE_NOT_SET">search index=_internal source="*metrics.log" eps "group=per_source_thruput" NOT filetracker | eval events=eps*kb/kbps | timechart fixedrange=t span=1m limit=5 sum(events) by series</s:key>
        <s:key name="realtime_schedule" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="request.ui_dispatch_app" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="request.ui_dispatch_view" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="restart_on_searchpeer_add" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="run_on_startup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="search" datatype="DATATYPE_NOT_SET">index=_internal source="*metrics.log" eps "group=per_source_thruput" NOT filetracker | eval events=eps*kb/kbps | timechart fixedrange=t span=1m limit=5 sum(events) by series</s:key>
        <s:key name="vsid" datatype="DATATYPE_NOT_SET"></s:key>
      </s:dict>
    </content>
  </entry>
  <entry>
    <title datatype="string">Splunk errors last 24 hours</title>
    <id datatype="string">https://127.0.0.1:8079/servicesNS/nobody/search/saved/searches/Splunk%20errors%20last%2024%20hours</id>
    <updated datatype="string">2012-03-13T15:22:54-07:00</updated>
    <link href="/servicesNS/nobody/search/saved/searches/Splunk%20errors%20last%2024%20hours" rel="alternate"/>
    <author>
      <name datatype="string">nobody</name>
    </author>
    <link href="/servicesNS/nobody/search/saved/searches/Splunk%20errors%20last%2024%20hours" rel="list"/>
    <link href="/servicesNS/nobody/search/saved/searches/Splunk%20errors%20last%2024%20hours/_reload" rel="_reload"/>
    <link href="/servicesNS/nobody/search/saved/searches/Splunk%20errors%20last%2024%20hours" rel="edit"/>
    <link href="/servicesNS/nobody/search/saved/searches/Splunk%20errors%20last%2024%20hours/disable" rel="disable"/>
    <link href="/servicesNS/nobody/search/saved/searches/Splunk%20errors%20last%2024%20hours/dispatch" rel="dispatch"/>
    <link href="/servicesNS/nobody/search/saved/searches/Splunk%20errors%20last%2024%20hours/history" rel="history"/>
    <content type="text/xml">
      <s:dict>
        <s:key name="action.email" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.email.sendresults" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.email.to" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.populate_lookup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.rss" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.script" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.summary_index" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert.digest_mode" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="alert.expires" datatype="DATATYPE_NOT_SET">24h</s:key>
        <s:key name="alert.severity" datatype="DATATYPE_NOT_SET">3</s:key>
        <s:key name="alert.suppress" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.fields" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.period" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.track" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert_comparator" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_condition" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_threshold" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_type" datatype="DATATYPE_NOT_SET">always</s:key>
        <s:key name="auto_summarize" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="auto_summarize.command" datatype="DATATYPE_NOT_SET">| summarize override=partial timespan=$auto_summarize.timespan$ [ $search$ ]</s:key>
        <s:key name="auto_summarize.cron_schedule" datatype="DATATYPE_NOT_SET">0 */4 * * *</s:key>
        <s:key name="auto_summarize.dispatch.earliest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.dispatch.latest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.timespan" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="cron_schedule" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="description" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="disabled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.buckets" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.earliest_time" datatype="DATATYPE_NOT_SET">-24h</s:key>
        <s:key name="dispatch.latest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="dispatch.lookups" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.max_count" datatype="DATATYPE_NOT_SET">500000</s:key>
        <s:key name="dispatch.max_time" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.reduce_freq" datatype="DATATYPE_NOT_SET">10</s:key>
        <s:key name="dispatch.rt_backfill" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.spawn_process" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.time_format" datatype="DATATYPE_NOT_SET">%FT%T.%Q%:z</s:key>
        <s:key name="dispatch.ttl" datatype="DATATYPE_NOT_SET">2p</s:key>
        <s:key name="displayview" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="eai:acl"><s:dict><s:key name="app" datatype="string">search</s:key><s:key name="can_change_perms" datatype="boolean">1</s:key><s:key name="can_list" datatype="boolean">1</s:key><s:key name="can_share_app" datatype="boolean">1</s:key><s:key name="can_share_global" datatype="boolean">1</s:key><s:key name="can_share_user" datatype="boolean">0</s:key><s:key name="can_write" datatype="boolean">1</s:key><s:key name="modifiable" datatype="boolean">1</s:key><s:key name="owner" datatype="string">nobody</s:key><s:key name="perms"><s:dict><s:key name="read"><s:list><s:item datatype="string">admin</s:item></s:list></s:key><s:key name="write"><s:list><s:item datatype="string">admin</s:item></s:list></s:key></s:dict></s:key><s:key name="removable" datatype="boolean">0</s:key><s:key name="sharing" datatype="string">app</s:key></s:dict></s:key>
        <s:key name="is_scheduled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="is_visible" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="max_concurrent" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="next_scheduled_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="qualifiedSearch" datatype="DATATYPE_NOT_SET">search index=_internal " error " NOT debug source=*splunkd.log*</s:key>
        <s:key name="realtime_schedule" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="request.ui_dispatch_app" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="request.ui_dispatch_view" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="restart_on_searchpeer_add" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="run_on_startup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="search" datatype="DATATYPE_NOT_SET">index=_internal " error " NOT debug source=*splunkd.log*</s:key>
        <s:key name="vsid" datatype="DATATYPE_NOT_SET"></s:key>
      </s:dict>
    </content>
  </entry>
  <entry>
    <title datatype="string">Top five sourcetypes</title>
    <id datatype="string">https://127.0.0.1:8079/servicesNS/nobody/search/saved/searches/Top%20five%20sourcetypes</id>
    <updated datatype="string">2012-03-13T15:22:54-07:00</updated>
    <link href="/servicesNS/nobody/search/saved/searches/Top%20five%20sourcetypes" rel="alternate"/>
    <author>
      <name datatype="string">nobody</name>
    </author>
    <link href="/servicesNS/nobody/search/saved/searches/Top%20five%20sourcetypes" rel="list"/>
    <link href="/servicesNS/nobody/search/saved/searches/Top%20five%20sourcetypes/_reload" rel="_reload"/>
    <link href="/servicesNS/nobody/search/saved/searches/Top%20five%20sourcetypes" rel="edit"/>
    <link href="/servicesNS/nobody/search/saved/searches/Top%20five%20sourcetypes/disable" rel="disable"/>
    <link href="/servicesNS/nobody/search/saved/searches/Top%20five%20sourcetypes/dispatch" rel="dispatch"/>
    <link href="/servicesNS/nobody/search/saved/searches/Top%20five%20sourcetypes/history" rel="history"/>
    <content type="text/xml">
      <s:dict>
        <s:key name="action.email" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.email.sendresults" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.email.to" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="action.populate_lookup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.rss" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.script" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="action.summary_index" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert.digest_mode" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="alert.expires" datatype="DATATYPE_NOT_SET">24h</s:key>
        <s:key name="alert.severity" datatype="DATATYPE_NOT_SET">3</s:key>
        <s:key name="alert.suppress" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.fields" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.suppress.period" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert.track" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="alert_comparator" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_condition" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_threshold" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="alert_type" datatype="DATATYPE_NOT_SET">always</s:key>
        <s:key name="auto_summarize" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="auto_summarize.command" datatype="DATATYPE_NOT_SET">| summarize override=partial timespan=$auto_summarize.timespan$ [ $search$ ]</s:key>
        <s:key name="auto_summarize.cron_schedule" datatype="DATATYPE_NOT_SET">0 */4 * * *</s:key>
        <s:key name="auto_summarize.dispatch.earliest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.dispatch.latest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="auto_summarize.timespan" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="cron_schedule" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="description" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="disabled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.buckets" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.earliest_time" datatype="DATATYPE_NOT_SET">-24h</s:key>
        <s:key name="dispatch.latest_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="dispatch.lookups" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.max_count" datatype="DATATYPE_NOT_SET">500000</s:key>
        <s:key name="dispatch.max_time" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.reduce_freq" datatype="DATATYPE_NOT_SET">10</s:key>
        <s:key name="dispatch.rt_backfill" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="dispatch.spawn_process" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="dispatch.time_format" datatype="DATATYPE_NOT_SET">%FT%T.%Q%:z</s:key>
        <s:key name="dispatch.ttl" datatype="DATATYPE_NOT_SET">2p</s:key>
        <s:key name="displayview" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="eai:acl"><s:dict><s:key name="app" datatype="string">search</s:key><s:key name="can_change_perms" datatype="boolean">1</s:key><s:key name="can_list" datatype="boolean">1</s:key><s:key name="can_share_app" datatype="boolean">1</s:key><s:key name="can_share_global" datatype="boolean">1</s:key><s:key name="can_share_user" datatype="boolean">0</s:key><s:key name="can_write" datatype="boolean">1</s:key><s:key name="modifiable" datatype="boolean">1</s:key><s:key name="owner" datatype="string">nobody</s:key><s:key name="perms"><s:dict><s:key name="read"><s:list><s:item datatype="string">admin</s:item></s:list></s:key><s:key name="write"><s:list><s:item datatype="string">admin</s:item></s:list></s:key></s:dict></s:key><s:key name="removable" datatype="boolean">0</s:key><s:key name="sharing" datatype="string">app</s:key></s:dict></s:key>
        <s:key name="is_scheduled" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="is_visible" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="max_concurrent" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="next_scheduled_time" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="qualifiedSearch" datatype="DATATYPE_NOT_SET">search index=_internal (source=*/metrics.log* OR source=*\\metrics.log*) group=per_sourcetype_thruput | chart sum(kb) by series | sort -sum(kb) | head 5</s:key>
        <s:key name="realtime_schedule" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="request.ui_dispatch_app" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="request.ui_dispatch_view" datatype="DATATYPE_NOT_SET"></s:key>
        <s:key name="restart_on_searchpeer_add" datatype="DATATYPE_NOT_SET">1</s:key>
        <s:key name="run_on_startup" datatype="DATATYPE_NOT_SET">0</s:key>
        <s:key name="search" datatype="DATATYPE_NOT_SET">index=_internal (source=*/metrics.log* OR source=*\\metrics.log*) group=per_sourcetype_thruput | chart sum(kb) by series | sort -sum(kb) | head 5</s:key>
        <s:key name="vsid" datatype="DATATYPE_NOT_SET"></s:key>
      </s:dict>
    </content>
  </entry>
</feed>
"""

if __name__ == "__main__":
    print json.dumps(from_feed(sample_xml))