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

import urllib
import httplib2

import logging
logger = logging.getLogger('splunk.xml2json.forward')

SPLUNKD_CONNECTION_TIMEOUT = 30

def safe_urlquote(string, safe='/', decodeFrom='utf-8', encodeFrom='utf-8'):
    '''
    Safely encode high byte characters from unicode or
    some other encoding to UTF-8 url strings.

    For some reason urllib.quote can't handle high byte unicode strings,
    although urllib.unquote can unquote anything. Awesome.

    Always returns STR objects!
    '''
    return urllib.quote(to_utf8(string, decodeFrom, encodeFrom), safe)

def url_encodedict(query):
    '''
    Convert a dictionary to a url-encoded" string.
    Multi-values keys can be assigned using a list (eg., {"foo": ["bar1", "bar2"]}.
    
    Note: None type values are removed.
    '''
    qargs = []
    [ qargs.extend([(k, e) for e in v]) for k,v in [ (k, v if isinstance(v, (list, tuple)) else (v,) ) for k, v in query.iteritems() if v != None ] ]
    return '&'.join( [ '%s=%s' % ( safe_urlquote(unicode(k)),safe_urlquote(unicode(v)) ) for k,v in qargs ] )

def to_utf8(obj, decodeFrom='utf-8', encodeTo='utf-8'):
    '''
    Attempts to return a utf-8 encoded str object if obj is an instance of basestring,
    otherwise just returns obj.
    
    Can be used to safely print out high byte unicode characters.
    Example:
    '''
    if isinstance(obj, unicode):
        return obj.encode(encodeTo)

    elif isinstance(obj, str):
        return obj.decode(decodeFrom).encode(encodeTo)
        
    elif '__str__' in dir(obj):
        return to_utf8(unicode(obj))

    return obj

def make_request(url, headers={}, get=None, post=None, payload=None, method={}, 
                session_key=None, basic_auth=None, *args, **kwargs):
    try:
        # In Splunk 4.3's version of httplib, we have the new
        # disable_ssl_certificate_validation kwarg. However,
        # it will throw an error if it isn't available, so we try
        # without it.
        h = httplib2.Http(
            timeout=SPLUNKD_CONNECTION_TIMEOUT, 
            disable_ssl_certificate_validation=True)
    except:
        h = httplib2.Http(
            timeout=SPLUNKD_CONNECTION_TIMEOUT) 
    
    if "authorization" in headers:
        del headers["authorization"]
    
    auth = None
    if session_key:
        auth = "Splunk %s" % session_key
    if basic_auth:
        auth = basic_auth
    headers["authorization"] = auth
    
    if not headers["authorization"]:
        del headers["authorization"]
    
    if get:
        get = dict([(k,v) for (k,v) in get.items() if v != None])
        url += '?' + url_encodedict(get)
    
    if post and not payload:
        payload = url_encodedict(post)
    
    status, response = h.request(
        url, 
        method=method,
        body=payload,
        headers=headers)
    
    return status, response
