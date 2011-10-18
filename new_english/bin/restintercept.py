import time
import json

import lxml.etree as et

from odata import ODataCollection, ODataResponse, ODataEntity

import splunk
import splunk.rest
import splunk.auth
import pprint
import re
import urllib

import logging
logger = logging.getLogger('splunk.queens_english.intercept')

from route import Router, Route

ATOM_NS = splunk.rest.format.ATOM_NS
SPLUNK_NS = splunk.rest.format.ATOM_NS
OPENSEARCH_NS = splunk.rest.format.OPENSEARCH_NS

class ResultFormat(object):
    VERBOSE = 0
    ROW = 1
    COLUMN = 2

class JsonProxyRestHandler(splunk.rest.BaseRestHandler):
    def __init__(self, *args, **kwargs):
        super(JsonProxyRestHandler, self).__init__(*args, **kwargs)
        
        self.router = Router()
        
        self.router.add(Route('/search/jobs/<sid>/control', {"POST": self.job_control}, 'job_control'))
        self.router.add(Route('/search/jobs/<sid>/<data_source>', {"GET": self.job_data}, 'job_data'))
        self.router.add(Route('/search/jobs/<sid>', {"GET": self.eai, "DELETE": self.delete_job}, 'job_info'))
        self.router.add(Route('/search/jobs', {"GET": self.eai, "POST": self.create_job}, 'jobs'))
        self.router.add(Route('/auth/login', {"POST": self.auth}, 'auth'))
        self.router.add(Route('/<:.*>', self.eai, 'eai'))
    
    def extract_path(self):
        self.scrubbed_path = self.request['path'].replace("/services/json/v1", "")
        if re.match(r"^/servicesNS/[^/]*/[^/]*", self.scrubbed_path):
            self.scrubbed_path = re.sub(r"^(/servicesNS/[^/]*/[^/]*)(/.*)", r"\2", self.scrubbed_path)
        elif re.match(r"^/services/.*", self.scrubbed_path):
            self.scrubbed_path = re.sub(r"^(/services)(/.*)", r"\2", self.scrubbed_path)
            
        if self.scrubbed_path.endswith("/"):
            self.scrubbed_path = self.scrubbed_path[:-1]
    
    def handle(self):
        self.extract_path();
        handler, args, kwargs = self.router.match(self.scrubbed_path)
        
        if isinstance(handler, dict):
            if handler.has_key(self.method):
                handler = handler[self.method]
            else:
                self.set_response(404, "")
                return
        
        status, content = handler(*args, **kwargs)
        self.set_response(status, content)
    
    def handle_GET(self):
        self.handle()    
        
    def handle_POST(self):
        self.handle()
        
    def handle_DELETE(self):
        self.handle()
    
    ## Endpoint Handlers
    
    def eai(self, *args,  **kwargs):
        responseCode = None
        serverResponse = None
        responseCode = None
        messages = []
        timings = []
        path = ""
    
        try:
            serverStatus, serverResponse = self.forward_request()
            responseCode = serverStatus.status            
        except splunk.RESTException, e:
            responseCode = e.statusCode
            messages.append({
                'type': 'HTTP',
                'text': '%s %s' % (e.statusCode, e.msg)
            })
            if hasattr(e, 'extendedMessages') and e.extendedMessages:
                for message in e.extendedMessages:
                    messages.append(message)
        except Exception, e:
            responseCode = 500
            messages.append({
                'type': 'ERROR',
                'text': '%s' % e
            })
        
        odata = self.atom2odata(serverResponse, entity_class=self.scrubbed_path, timings=timings, messages=messages)
        return (responseCode, self.render_odata(odata))
                
    def job_control(self, *args, **kwargs):
        output = ODataEntity()
        responseCode = 500

        try:
            serverStatus, serverResponse = self.forward_request()
            responseCode = serverStatus.status
            # service may return messages in the body; try to parse them
            try:
                msg = splunk.rest.extractMessages(et.fromstring(serverResponse))
                if msg:
                    output.messages.extend(msg)
            except:
                pass
        except splunk.RESTException, e:
            responseCode = e.statusCode
            output.messages.append({
                'type': 'HTTP',
                'text': '%s %s' % (e.statusCode, e.msg)
            })
            if e.extendedMessages:
                output.messages.extend(e.extendedMessages)

        return (responseCode, self.render_odata(output))
        
    def job_data(self, data_source, *args, **kwargs):
        # init
        output = ODataEntity()
        responseCode = 500
        serverResponse = None
        messages = []
        
        # Modify the arguments
        self.request["query"]["output_mode"] = "xml"
        if data_source == 'summary':            
            self.request["query"]["output_time_format"] = "%s"
        
        # fetch data
        try:
            serverStatus, serverResponse = self.forward_request()
            responseCode = serverStatus.status
        except splunk.RESTException, e:
            responseCode = e.statusCode
            messages.append({
                'type': 'HTTP',
                'text': '%s %s' % (e.statusCode, e.msg)
            })
            if e.extendedMessages:
                messages.extend(e.extendedMessages)
        
        # convert XML to struct
        if serverResponse:
            root = et.fromstring(serverResponse)
            if root.tag in ('events', 'results', 'results_preview'):
                json_mode = self.request["query"].get("json_mode", "row")
                if json_mode == "row":
                    format = ResultFormat.ROW
                elif json_mode == "column":
                    format = ResultFormat.COLUMN
                elif json_mode == "verbose":
                    format = ResultFormat.VERBOSE
                else:
                    format = ResultFormat.ROW
                    
                output.data = self._parseResultData(root, format=format)
            elif root.tag == 'timeline':
                output.data = self._parseTimelineData(root)
            elif root.tag == 'summary':
                output.data = self._parseFieldSummary(root)
            
            # service may return messages in the body; try to parse them
            try:
                msg = splunk.rest.extractMessages(root)
                if msg:
                    messages.append(msg)
            except:
                raise
                
        # package and return
        output.messages = messages
        return responseCode, self.render_odata(output)
        
    def create_job(self, *args, **kwargs):        
        output = ODataEntity()
        responseCode = 500

        try:
            serverStatus, serverResponse = self.forward_request()
            responseCode = serverStatus.status

            root = et.fromstring(serverResponse)
            if root.findtext('sid'):
                output.data = {
                    'sid': root.findtext('sid')
                }
                
            # service may return messages in the body; try to parse them
            try:
                msg = splunk.rest.extractMessages(root)
                if msg:
                    output.messages.extend(msg)
            except:
                pass
        except splunk.RESTException, e:
            responseCode = e.statusCode
            output.messages.append({
                'type': 'HTTP',
                'text': '%s %s' % (e.statusCode, e.msg)
            })
            if e.extendedMessages:
                output.messages.extend(e.extendedMessages)

        return responseCode, self.render_odata(output)
        
    def delete_job(self, *args, **kwargs): 
        output = ODataEntity()
        responseCode = 500
        
        try:
            serverStatus, serverResponse = self.forward_request()
            responseCode = serverStatus.status
            # service may return messages in the body; try to parse them
            try:
                msg = splunk.rest.extractMessages(et.fromstring(serverResponse))
                if msg:
                    output.messages.extend(msg)
            except:
                pass
        except splunk.RESTException, e:
            responseCode = e.statusCode
            output.messages.append({
                'type': 'HTTP',
                'text': '%s %s' % (e.statusCode, e.msg)
            })
            if e.extendedMessages:
                output.messages.extend(e.extendedMessages)

        
        return responseCode, self.render_odata(output)

    def auth(self):
        sessionKey = None
        try:
           username = self.request["form"]["username"]
           password = self.request["form"]["password"]
           sessionKey = splunk.auth.getSessionKey(username, password)
        except splunk.AuthenticationFailed:
           pass
        
        result = ODataEntity()
        result.data['sessionKey'] = sessionKey
        status = 200
        if not sessionKey:
            result.messages.append({
                'type': 'ERROR',
                'text': 'login failed'
            })
            status = 401
            
        return status, self.render_odata(result)
    
    ## Helper Functions
    
    def forward_request(self):
        base_url = "https://" + self.request['headers']['host'] + "/"
        path = self.request['path'].replace("/services/json/v1", "")
        query = self.request["query"] 
        query_string = ""
        if len(query): 
            query_string = "?" + urllib.urlencode(query)
        url = base_url + path + query_string
        method = self.method
        sessionKey = self.request["headers"].get("authorization", "").replace("Splunk ", "")
        
        return splunk.rest.simpleRequest(
            path, 
            getargs=self.request["query"], 
            postargs=self.request["form"], 
            method=method,
            sessionKey=self.sessionKey or sessionKey,
            raiseAllErrors=True
        )
        
    def set_response(self, status, content):
        self.response.setStatus(status)
        self.response.setHeader('Content-Type', 'application/json')
            
        self.response.write(content)

    def render_odata(self, thing):
        '''
        Default outputter for odata wrapped response
        '''
        # TODO
        #cherrypy.response.headers['Content-Type'] = 'application/json'

        output = ODataResponse()
        output.results = thing
        jsonOutput = json.dumps(output.to_json(), indent=2, sort_keys=True)        
        return jsonOutput
        


    def atom2odata(self, atom_root, entity_class=None, timings=[], messages=[]):
        '''
        Converts standard EAI Atom feed into odata collection object
        '''
        
        output = ODataCollection()
        
        if atom_root:
            timings.append(('app.xml_parse_start', time.time()))
            root = et.fromstring(atom_root)

            timings.append(('app.odata_create_start', time.time()))

            # handle the single entry mode
            if root.tag == '{http://www.w3.org/2005/Atom}entry':
                output = self.entry2odata(root, entity_class)
                
            # otherwise assume collection
            else:
                for node in root.xpath('a:entry', namespaces={'a': ATOM_NS}):
                    output.items.append(self.entry2odata(node, entity_class))
                
                # set collection data
                try:
                    output.offset = int(root.xpath('o:startIndex', namespaces={'o': OPENSEARCH_NS})[0].text)
                    output.total_count = int(root.xpath('o:totalResults', namespaces={'o': OPENSEARCH_NS})[0].text)
                    output.count = min(output.total_count, len(root.xpath('a:entry', namespaces={'a': ATOM_NS})))
                except:
                    pass
                
            timings.append(('app.odata_create_end', time.time()))
            
        output.timings = timings
        output.messages = messages
        return output


    def entry2odata(self, entry_node, entity_class):
        '''
        parses lxml <entry> node to odata struct
        '''
        
        node = entry_node
        
        tmpEntity = ODataEntity()
        tmpEntity.entity_class = entity_class
        tmpEntity.data = splunk.rest.format.nodeToPrimitive(node.xpath('a:content', namespaces={'a': ATOM_NS})[0][0])
    
        # move the metadata around
        if isinstance(tmpEntity.data, dict):
            to_delete = []
            for k in tmpEntity.data:

                if k.startswith('eai:') and k != 'eai:data':
                    to_delete.append(k)
                    if hasattr(tmpEntity.metadata, k[4:]):
                        setattr(tmpEntity.metadata, k[4:], tmpEntity.data[k])
                    else:
                        logger.warn('encountered unknown EAI attribute: %s' % k)

            # the one exception
            if 'eai:data' in tmpEntity.data:
                tmpEntity.data['rawdata'] = tmpEntity.data['eai:data']
                to_delete.append('eai:data')

            for k in to_delete:
                del tmpEntity.data[k]
            
        # pull in all the links
        for link in node.xpath('a:link', namespaces={'a': ATOM_NS}):
            tmpEntity.metadata.links.append({
                'href': link.get('href'),
                'rel': link.get('rel')
            })
        
        # set other randoms
        tmpEntity.id = node.xpath('a:id', namespaces={'a': ATOM_NS})[0].text
        tmpEntity.name = node.xpath('a:title', namespaces={'a': ATOM_NS})[0].text
        
        published_info = node.xpath('a:published', namespaces={'a': ATOM_NS})
        if published_info:
            tmpEntity.data["published"] = published_info[0].text
        tmpEntity.data["updated"] = node.xpath('a:updated', namespaces={'a': ATOM_NS})[0].text
        tmpEntity.data["author"] = node.xpath('a:author/a:name', namespaces={'a': ATOM_NS})[0].text
        
        return tmpEntity
        
    def _parseResultData(self, root, format=ResultFormat.ROW):
        '''
        parses job result data
        '''
        results = {}
                
        field_list = []
        data = []
    
        for node in root.findall('meta/fieldOrder/field'):
            field_list.append(unicode(node.text))
        for node in root.findall('result'):
            row = {
                '__offset': node.get('offset')
            }
            for field in node.findall('field'):
                field_struct = []
                for subfield in field.findall('value'):
                    field_struct.append({
                        'value': subfield.findtext('text'),
                        'tags': [x.text for x in subfield.findall('tag')]
                    })
                for subfield in field.findall('v'):
                    field_struct.append({
                        'value': self._getInnerText(subfield)
                    })
                row[field.get('k')] = field_struct
            data.append(row)
            
        
        if format is ResultFormat.VERBOSE:
            results['field_list'] = field_list
            results['data'] = data
        elif format is ResultFormat.ROW:
            results = self._rowify(field_list, data)
        elif format is ResultFormat.COLUMN:
            results = self._columnify(field_list, data)

        results["is_preview"] = splunk.util.normalizeBoolean(root.get("preview"))

        return results
    
    def _rowify(self, field_list, data):
        results = {}
        results['fields'] = field_list
        results['rows'] = []
        
        for row_data in data:
            row = {
                "data": [],
            }
        
            for field_name in field_list:
                field_data = row_data.get(field_name, [{ "value": []}])
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
    
    def _columnify(self, field_list, data):
        results = {}
        results['fields'] = field_list
        results['columns'] = []
        
        for field_name in field_list:
            def extract(row_data):
                field_data = row_data.get(field_name, [{ "value": []}])
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
        
    def _getInnerText(self, node):
        '''
        TODO: fails if segementation is enabled
        '''
        output = []
        for innernode in node.iter():
            if innernode.text and innernode.text.strip():
                output.append(innernode.text)
            elif innernode != node:
                output.append(self._getInnerText(innernode))
            if innernode.tail and innernode.tail.strip():
                output.append(innernode.tail)
        return output
        

    def _parseTimelineData(self, root):
        '''
        parses timeline data
        '''
        output = {
            'event_count': int(root.get('c', 0)),
            'cursor_time': float(root.get('cursor', 0)),
            'buckets': []
        }
    
        for node in root.findall('bucket'):
            output['buckets'].append({
                'available_count': int(node.get('a', 0)),
                'duration': float(node.get('d', 0)),
                'earliest_time': float(node.get('t', 0)),
                'earliest_time_offset': int(node.get('etz', 0)),
                'is_finalized': True if (node.get('f', False)) == '1' else False,
                'latest_time_offset': int(node.get('ltz', 0)),
                'earliest_strftime': node.text,
                'total_count': int(node.get('c', 0))
            })
        return output
        
        
    def _parseFieldSummary(self, root):
        '''
        parses the search job field summaries
        '''
        
        output = {
            'earliest_time': float(root.get('earliest_time', 0)),
            'latest_time': float(root.get('latest_time', 0)),
            'duration': float(root.get('duration', 0)),
            'event_count': int(root.get('c', 0)),
            'fields': {}
        }
        
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
                    v = float(v)
                field['modes'].append({
                    'value': v,
                    'count': int(val.get('c', 0)),
                    'is_exact': True if (node.get('exact', False)) == '1' else False
                })
            output['fields'][node.get('k')] = field
                
        return output


class JsonWrapper(JsonProxyRestHandler):
    pass