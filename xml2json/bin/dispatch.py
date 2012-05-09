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

# TODO: add origin check

# internal
import forward
import xml2json
import route
import formatters

# stdlib
import re
import json
from urlparse import urlparse, parse_qs

import xml.etree.cElementTree as et

import logging
logger = logging.getLogger('splunk.xml2json.dispatch')
        
REMOTEORIGIN_HEADER = "x-remoteorigin"

# TODO UNDONE
# def extract_allowed_domains(request):
#     allowed_domains = None
    
#     settings = splunk.clilib.cli_common.getConfStanza(CONF_FILE, SETTINGS_STANZA)
#     allowed_domains = map(lambda s: s.strip(), settings.get(ALLOWED_DOMAINS_KEY).split(","))

# def get_origin_error(self):
#     output = ODataEntity()
#     output.messages.append({
#         "type": "HTTP",
#         "text": "Origin '%s' is not allowed. Please check json.conf" % self.remote_origin
#     })
    
#     return 403, self.render_odata(output)

def extract_path(request):
    scrubbed_path = request['path'].replace("/services/json/v2", "")
    if re.match(r"^/servicesNS/[^/]*/[^/]*", scrubbed_path):
        scrubbed_path = re.sub(r"^(/servicesNS/[^/]*/[^/]*)(/.*)", r"\2", scrubbed_path)
    elif re.match(r"^/services/.*", scrubbed_path):
        scrubbed_path = re.sub(r"^(/services)(/.*)", r"\2", scrubbed_path)
        
    if scrubbed_path.endswith("/"):
        scrubbed_path = scrubbed_path[:-1]
        
    if scrubbed_path.endswith("?"):
        scrubbed_path = scrubbed_path[:-1]
        
    return scrubbed_path

def extract_session_key(request):        
    return request["headers"].get("authorization", "").replace("Splunk", "").strip() or None
    
def extract_origin(request):
    remote_origin = None
    if request["headers"].has_key(REMOTEORIGIN_HEADER):
        parsed = urlparse(request["headers"][REMOTEORIGIN_HEADER])
        remote_origin = parsed.netloc.replace(":" + str(parsed.port), "")
    else:
        remote_origin = request["origin"]
        
    return remote_origin
    
def is_basicauth(request):
    return request["headers"].get("authorization", "").startswith("Basic ")
    
def get_authorization(request):
    return request["headers"].get("authorization", "")

def render_response(data):
    if not isinstance(data, dict) and not isinstance(data, list):
        return data
    
    formatter = formatters.get_formatter()
    formatter.format(data)
    return json.dumps(data, sort_keys=True, indent=4)

def dispatch(request):
    # Request should have:
    # self['path'] = str
    # self['get'] = query args
    # self['post'] = post args
    # self['payload'] = body (in non-url encoded case)
    # self['headers'] = headers
    # self['origin'] = request origin
    # self['base_path'] = headers
    status = 500
    messages = {"ERROR": []}
    data = {"messages": messages}
    
    try:
        method = request['method']
        scrubbed_path = extract_path(request)
        origin = extract_origin(request)
        session_key = extract_session_key(request)
        
        request['session_key'] = session_key
        
        # Get the appropriate handler
        handler, args, kwargs = router.match(scrubbed_path)
        
        if isinstance(handler, dict):
            if method in handler:
                handler = handler[method]
            else:
                status = 400
                messages["ERROR"].append("No handler found for path %s" % scrubbed_path)
                
                return status, render_response(data)
        
        status, data = handler(request, *args, **kwargs)
    except Exception, e:
        raise
        
    return status, render_response(data)

def forward_request(request):
    path = request['path'].replace("/services/json/v2", "")                
    method = request['method']
    
    messages = {"ERROR": []}
    content = {"messages": messages}
    
    response, content = forward.make_request(
        request["base_path"] + path,
        headers=request['headers'],
        get=request['get'],
        post=request['post'],
        payload=request['payload'],
        method=request['method'],
        session_key=request['session_key'],
        basic_auth=get_authorization(request) if is_basicauth(request) else None
    )
    if response.status == 401:
        messages["ERROR"].append("Login Failed")
    elif response.status == 402:
        messages["ERROR"].append("License Restriction")    
    elif response.status == 403:
        messages["ERROR"].append("Authorization Failed: %s" % uri)  
    elif response.status == 404:
        # Some 404 reponses, such as those for expired jobs which were originally
        # run by the scheduler return extra data about the original resource.
        # In this case we add that additional info into the exception object
        # as the resourceInfo parameter so others might use it.
        try:
            body = et.fromstring(content)
            resource_info = body.find('dict')
            if resource_info is not None:
                messages["ERROR"].append("Resource not found: %s" % xml2json.node_to_primitive(resource_info))
            else:
                extracted_messages = xml2json.extract_messages(body)
                xml2json.combine_messages(messages, extracted_messages)
        except Exception, e:
            logger.info(e);
            pass
    elif response.status < 200 or response.status > 299:
        # service may return messages in the body; try to parse them
        try:
            body = et.fromstring(content)
            extracted_messages = xml2json.extract_messages(body)
            xml2json.combine_messages(messages, extracted_messages)
        except:
            pass
    
    return response.status, content
    
def status_ok(status):
    return status >= 200 and status <= 299
    
def create_job(request, *args, **kwargs):    
    status, content = forward_request(request)
    if status_ok(status):
        if request["post"].get("exec_mode", "").lower() == "oneshot":
            return status, xml2json.from_job_results(content, format=xml2json.ResultFormat.ROW)
        else:
            return status, xml2json.from_job_create(content)
    else:
        return status, xml2json.from_messages_only(content)


def job_data(request, sid, data_source, *args, **kwargs):
    """Handle requests to /search/jobs/<sid>/<data_source>.
    """
    # This replicates some of the code in unless_error, but it has
    # many more special cases than the other endpoints, and introduces
    # much more complexity into unless_error than is justified by
    # repeating a couple of lines here.
    mode = request["get"].get("output_mode", "")
    request = output_mode('xml')(request)
    status, content = forward_request(request)

    if status_ok(status):
        if data_source == "search.log":
            return status, content
        if not content:
            return status, content    
        root = et.fromstring(content)
        if root.tag in ('events', 'results', 'results_preview'):
            if mode == "json_rows":
                format = xml2json.ResultFormat.ROW
            elif mode == "json_cols":
                format = xml2json.ResultFormat.COLUMN
            elif mode == "json":
                format = xml2json.ResultFormat.VERBOSE
            else:
                format = xml2json.ResultFormat.ROW
  
            return status, xml2json.from_job_results(root, format=format)
        elif root.tag == 'timeline':
            return status, xml2json.from_search_timeline(root)
        elif root.tag == 'summary':
            return status, xml2json.from_search_summary(root)
        else:
            return status, xml2json.from_messages_only(root)
    else:
        return status, xml2json.from_messages_only(content)

def stanza_key(request, file, stanza, key, *args, **kwargs):
    # This function will be removed when the wrapping of the stanza
    # returns changes.
    status, content = forward_request(request)
    if status_ok(status):
        return status, xml2json.from_propertizes_stanza_key(content, key)
    else:
        return status, xml2json.from_messages_only(content)

        
def unless_error(ok_handler, request_filter=lambda x: x):
    """Create a wrapper to handle a particular route.

    The wrapper takes a request and any other optional arguments, and
    dispatches a request to Splunk. If the status code of the response
    from the server is 2xx (200-299), then runs *ok_handler* and
    returns (status, return value of *ok_handler*). If the status code
    is not in 200-299, then it extracts messages and returns status
    and messages.

    The request can be filtered by a function before being dispatched
    by passing a single function to the *request_filter* argument. The
    function should take the request as its single argument and return
    a request.
    """
    def f(request, *args, **kwargs):
        request = request_filter(request)
        status, content = forward_request(request)
        if status_ok(status):
            return status, ok_handler(content)
        else:
            return status, xml2json.from_messages_only(content)
    return f

only_messages = unless_error(xml2json.from_messages_only)
eai = unless_error(xml2json.from_feed)

def output_mode(output_type):
    def f(request, **kwargs):
        request["get"]["output_mode"] = output_type
        return request
    return f


router = route.Router()

router.add(route.Route('/search/jobs/<sid>/control', {"POST": only_messages}, 'job_control'))
router.add(route.Route('/search/jobs/<sid>/<data_source>', {"GET": job_data}, 'job_data'))
router.add(route.Route('/search/jobs/<sid>', {"GET": eai, "DELETE": only_messages}, 'job_info')) 
router.add(route.Route('/search/jobs', {"GET": eai, "POST": create_job}, 'jobs'))
router.add(route.Route('/search/parser', unless_error(xml2json.from_search_parser, output_mode('xml')), 'parse_query'))
router.add(route.Route('/search/typeahead', unless_error(xml2json.from_typeahead, output_mode('json')), 'typeahead'))
router.add(route.Route('/search/tags', {"GET": eai}, 'tags'))
router.add(route.Route('/search/tags/<name>', {"GET": eai, "DELETE": only_messages, "POST": only_messages}, 'tag_info'))
router.add(route.Route('/saved/searches/<name>/dispatch', {"POST": unless_error(xml2json.from_job_create)}, 'dispatch_saved_search'))
router.add(route.Route(
    '/properties/<file>/<stanza>', 
    {
        "GET": unless_error(xml2json.from_propertizes_stanza), 
        "POST": only_messages,
        "DELETE": only_messages
    },
    'properties_stanza_info')
)
router.add(route.Route('/properties/<file>/<stanza>/<key>', stanza_key, 'properties_stanza_key')) # Underlying response is going to change...
router.add(route.Route('/receivers/simple', unless_error(xml2json.from_http_simple_input), 'http_simple_input'))
router.add(route.Route('/auth/login', {"POST": unless_error(xml2json.from_auth)}, 'auth'))
router.add(route.Route('/<:.*>', eai, 'eai'))
