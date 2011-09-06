#
# Temporary OData JSON service for Splunk EAI and search interfaces
#
# This endpoint is expected to go away once splunkd starts providing JSON
# natively for all endpoints, which is why it's not terribly clean.
#


import json
import logging
import cgi
import time

import cherrypy
import lxml.etree as et

import splunk.auth
import splunk.entity
import splunk.rest
import splunk.rest.format
import splunk.appserver.mrsparkle.controllers as controllers
from splunk.appserver.mrsparkle.lib.decorators import expose_page
from splunk.appserver.mrsparkle.lib.routes import route
from odata import ODataCollection, ODataResponse, ODataEntity

logger = logging.getLogger('splunk.olde')

ATOM_NS = splunk.rest.format.ATOM_NS
SPLUNK_NS = splunk.rest.format.ATOM_NS
OPENSEARCH_NS = splunk.rest.format.OPENSEARCH_NS

class ODataController(controllers.BaseController):
    '''
    OData JSON proxy for splunkd
    '''

    @route('/=auth/=login')
    @expose_page(must_login=False)
    def auth(self, username=None, password=None):
        sessionKey = None
        try:
            sessionKey = splunk.auth.getSessionKey(username, password)
        except splunk.AuthenticationFailed:
            pass
        result = ODataEntity()
        result.data['sessionKey'] = sessionKey
        if not sessionKey:
            result.messages.append({
                'type': 'ERROR',
                'text': 'login failed'
            })
            cherrypy.response.status = 401
        return self.render_odata(result)
        
    @route('/:owner/:namespace/*path')
    @expose_page(must_login=False)
    def eai(self, owner='-', namespace='-', path=None, **kwargs):
        timings = []
        messages = []
        serverResponse = None
        responseCode = None./r
        
        # translate odata args
        if '$skip' in kwargs:
            kwargs['offset'] = kwargs['$skip']
            del kwargs['$skip']
        if '$count' in kwargs:
            kwargs['count'] = kwargs['$count']
            del kwargs['$count']

        # clean inputs
        kwargs.setdefault('count', 0)
        try:
            int(kwargs['count'])
        except:
            responseCode = 400
            messages.append({
                'type': 'ERROR',
                'text': 'count must be an integer'
            })
        try:
            if int(kwargs.get('offset', 0)) < 0:
                raise Exception
        except:
            responseCode = 400
            messages.append({
                'type': 'ERROR',
                'text': 'offset must be an integer 0 or greater'
            })
                    
        # make proxy call
        if not responseCode:
            uri = splunk.entity.buildEndpoint(path, entity=None, namespace=namespace, owner=owner)
            timings.append(('splunkd.eai_start', time.time()))
            try:
                serverStatus, serverResponse = self.simpleRequest(uri, getargs=kwargs, raiseAllErrors=True)
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
                
            timings.append(('splunkd.eai_end', time.time()))

        # dump output
        odata = self.atom2odata(serverResponse, entity_class=path, timings=timings, messages=messages)
        cherrypy.response.status = responseCode
        return self.render_odata(odata)
        
    #
    # search job management
    #

    @route('/:owner/:namespace/=search/=jobs')
    @expose_page(must_login=False)
    def list_jobs(self, owner='-', namespace='-', **kwargs):
        '''
        /search/jobs
        /search/jobs/events
        /search/jobs/results
        /search/jobs/timeline
        /search/jobs/summary
        /search/jobs/results_preview
        /search/jobs/log
        /search/jobs/control
        
        '''        
        if cherrypy.request.method == 'POST':
            return self.dispatch_job(owner=owner, namespace=namespace, kwargs=kwargs)
            
        return self.eai(owner=owner, namespace=namespace, path='search/jobs', **kwargs)
        
        
    def dispatch_job(self, owner, namespace, kwargs):

        output = ODataEntity()
        responseCode = 500

        uri = splunk.entity.buildEndpoint('search', 'jobs', owner=owner, namespace=namespace)

        try:
            serverStatus, serverResponse = self.simpleRequest(uri, postargs=kwargs, method='POST', raiseAllErrors=True)
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

        cherrypy.response.status = responseCode
        return self.render_odata(output)

    def delete_job(self, owner, namespace, sid, **kwargs):
        uri = splunk.entity.buildEndpoint('search', 'jobs', owner=owner, namespace=namespace) + "/" + sid  
        output = ODataEntity()
        responseCode = 500
        
        try:
            serverStatus, serverResponse = self.simpleRequest(uri, postargs=kwargs, method="DELETE", raiseAllErrors=True)
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

        cherrypy.response.status = responseCode
        return self.render_odata(output)
        
    @route('/:owner/:namespace/=search/=jobs/:sid', methods = ["GET", "DELETE"])
    @expose_page(must_login=False)
    def job_info(self, owner, namespace, sid, **kwargs):
        if cherrypy.request.method == "DELETE":
            return self.delete_job(owner, namespace, sid, **kwargs)

        return self.eai(p='', owner=owner, namespace=namespace, path=('search/jobs/%s' % sid), **kwargs)


    @route('/:owner/:namespace/=search/=jobs/:sid/:data_source')
    @expose_page(must_login=False)
    def job_data(self, owner, namespace, sid, data_source, **kwargs):
        # redirect on control
        if data_source == 'control':
            return self.job_control(owner, namespace, sid, **kwargs)
            
        # init
        output = ODataEntity()
        responseCode = 500
        serverResponse = None
        messages = []
        
        # create API uri
        uri = splunk.entity.buildEndpoint('search/jobs/%s' % sid, data_source, owner=owner, namespace=namespace)
        kwargs['output_mode'] = 'xml'
        if data_source == 'summary':
            kwargs['output_time_format'] = '%s'
        
        # fetch data
        try:
            serverStatus, serverResponse = self.simpleRequest(uri, getargs=kwargs, raiseAllErrors=True)
            responseCode = serverStatus.status
        except splunk.RESTException, e:
            responseCode = e.statusCode
            messages.append({
                'type': 'HTTP',
                'text': '%s %s' % (e.statusCode, e.msg)
            })
            if e.extendedMessages:
                logger.error('ERROR: %s' % e.extendedMessages)
                messages.extend(e.extendedMessages)
        
        # convert XML to struct
        if serverResponse:
            root = et.fromstring(serverResponse)
            if root.tag in ('events', 'results', 'results_preview'):
                output.data = self._parseResultData(root)
            elif root.tag == 'timeline':
                output.data = self._parseTimelineData(root)
            elif root.tag == 'summary':
                output.data = self._parseFieldSummary(root)
            else:
                logger.error('unknown XML, skipping parse')
                
        # package and return
        output.messages = messages
        return self.render_odata(output)
        
        
    def _parseResultData(self, root):
        '''
        parses job result data
        '''
        results = {
            'field_list': [],
            'data': []
        }
    
        for node in root.findall('meta/fieldOrder/field'):
            results['field_list'].append(unicode(node.text))
        for node in root.findall('result'):
            data = {
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
                data[field.get('k')] = field_struct
            results['data'].append(data)

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
        
        
        
    def job_control(self, owner, namespace, sid, **kwargs):
        '''
        provides individual job control
        '''

        output = ODataEntity()
        responseCode = 500

        if cherrypy.request.method != 'POST':
            raise cherrypy.HTTPError(405)

        uri = splunk.entity.buildEndpoint('search/jobs/%s' % sid, 'control', owner=owner, namespace=namespace)

        try:
            serverStatus, serverResponse = self.simpleRequest(uri, postargs=kwargs, raiseAllErrors=True)
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

        cherrypy.response.status = responseCode
        return self.render_odata(output)




    #
    # helper functions
    #

    def render_odata(self, thing):
        '''
        Default outputter for odata wrapped response
        '''
        cherrypy.response.headers['Content-Type'] = 'application/json'

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
        tmpEntity.data["published"] = node.xpath('a:published', namespaces={'a': ATOM_NS})[0].text
        tmpEntity.data["updated"] = node.xpath('a:updated', namespaces={'a': ATOM_NS})[0].text
        tmpEntity.data["author"] = node.xpath('a:author/a:name', namespaces={'a': ATOM_NS})[0].text
        
        return tmpEntity


    def simpleRequest(self, *a, **kw):
        """
        Makes a simpleRequest and forwards the sessionKey if supplied
        by the client as an X-SessionKey header
        """
        sessionKey = cherrypy.request.headers.get('x-sessionkey')
        if sessionKey:
            kw['sessionKey'] = sessionKey

        response, content = splunk.rest.simpleRequest(*a, **kw)
        return response, content
