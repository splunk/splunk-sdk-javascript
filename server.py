#!/usr/bin/env python
#
# Copyright 2011 Splunk, Inc.
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

import SimpleHTTPServer
import SocketServer
import urllib2
import sys
import StringIO

PORT = 8080

class StaticHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    pass
        
class ReuseableSocketTCPServer(SocketServer.TCPServer):
    def __init__(self, *args, **kwargs):
        self.allow_reuse_address = True
        SocketServer.TCPServer.__init__(self, *args, **kwargs)

def serve(port = PORT):
    Handler = StaticHandler
    
    httpd = ReuseableSocketTCPServer(("", int(port)), Handler)
    
    print "Static File Server -- Port: %s" % int(port)
    
    httpd.serve_forever()

def main(argv):
    if (len(argv) > 0):
        port = argv[0]
        serve(port = PORT)
    else:
        serve()
        
if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except KeyboardInterrupt:
        pass
    except:
        raise