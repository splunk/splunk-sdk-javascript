import splunk
import splunk.rest
import traceback
import json
import dispatch

import logging
logger = logging.getLogger('splunk.xml2json.intercept')

class JsonIntercept(splunk.rest.BaseRestHandler):
    def get_basepath(self):
        host = splunk.getDefault('host')
        if ':' in host:
            host = '[%s]' % host
            
        uri = '%s://%s:%s' % \
            (splunk.getDefault('protocol'), host, splunk.getDefault('port'))
            
        return uri
    
    def get_request(self):
        headers = {}
        for key, value in self.request["headers"].iteritems():
            headers[key.lower()] = value
                
        return {
            "path": self.request["path"],
            "get": self.request["query"],
            "post": self.request["form"],
            "payload": self.request["payload"],
            "headers": headers,
            "origin": self.request["remoteAddr"],
            "method": self.method,
            "base_path": self.get_basepath()
        }
    
    def handle(self):
        status = None
        content = None
        try:
            status, content = dispatch.dispatch(self.get_request())
        except Exception, e:
            # Log the exception
            logger.exception(e)
            
            # Return a 500 and the exception
            status = 500
            exc = traceback.format_exc()
            content = json.dumps({
                "messages": {
                    "ERROR": ["%s" % (str(exc))]
                }
            })
        finally:
            self.response.setHeader('Content-Type', 'application/json')
        
        self.response.setStatus(status)
        self.response.write(content)
        
        authorization = self.request["headers"].get("authorization", "");
        is_regular_authorized = authorization.startswith("Splunk");
        if status == 401 and not is_regular_authorized:
            self.response.setHeader("www-authenticate", 'Basic realm="/splunk"')
    
    def handle_GET(self):
        return self.handle()
        
    def handle_POST(self):
        return self.handle()
        
    def handle_DELETE(self):
        return self.handle()
        