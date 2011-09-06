#!/usr/bin/env node
// Copyright 2011 Splunk, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"): you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

(function() {
    /*var Trailer = require('./external/trailer/Trailer');
    var path    = require('path');
    var url     = require('url');
    
    console.log(path.dirname(__filename));
    var hitched = Trailer.hitch({
        root: path.dirname(__filename)
    });
    
    hitched.listen(6969);*/
    
    var path    = require('path');
var http = require('http');
var fs = require('fs');
var url = require('url');
var staticResource = require('./external/static-resource/index');

// passing where is going to be the document root of resources.
var handler = staticResource.createHandler(fs.realpathSync(path.dirname(__filename)));

var server = http.createServer(function(request, response) {
    var path = url.parse(request.url).pathname;
    // handle method returns true if a resource specified with the path
    // has been handled by handler and returns false otherwise.
    if(!handler.handle(path, request, response)) {
        response.writeHead(404);
        response.write('404');
        response.end();
    }
});
server.listen(6969);

})();