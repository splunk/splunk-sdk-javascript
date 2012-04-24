// The MIT License
// Copyright (c) 2010 Atsuya Takagi
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED ‘AS IS’, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var fs      = require("fs");
var path    = require("path");
var sys     = null;

try {
    sys = require("util");
}
catch(ex) {
    sys = require("sys");
}

Handler = module.exports = function(rootPath) {
    this.rootPath = rootPath;
    this.defaultContentType = 'application/octet-stream';
    this.contentTypes = {
        '.json': 'application/json',
        '.js': 'application/javascript',
        '.gif': 'image/gif',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.css': 'text/css',
        '.html': 'text/html',
        '.txt': 'text/plain',
        '.xml': 'text/xml'
    };
};

Handler.prototype.handle = function(requestPath, request, response) {
    var handled = false;
    var resourcePath = this._normalizePath(this.rootPath+requestPath);

    try {
        var stat = fs.statSync(resourcePath);
        if(stat.isFile()) {
            var contentType = this._getContentType(resourcePath);
            response.writeHead(200, {'Content-Type': contentType});
            this._streamFile(resourcePath, request, response);
            response.end();

            handled = true;
        }
    } catch(error) {
        //console.log(sys.inspect(error));
    }

    return handled;
};

Handler.prototype.addContentType = function(extension, contentType) {
    var key = extension.toLowerCase();
    if(!(key in this.contentTypes)) {
        this.contentTypes[key] = contentType;
    }
}

Handler.prototype.removeContentType = function(extension) {
    var key = extension.toLowerCase();
    if(key in this.contentTypes) {
        delete this.contentTypes[key];
    }
}

Handler.prototype._streamFile = function(resourcePath, request, response) {
    // todo: do streaming instead of reading in entire file contents at once
    response.write(fs.readFileSync(resourcePath));
    /*
    var buffer = new Buffer(1024);
    //console.log(sys.inspect(buffer));
    var bytesRead = 0;
    var position = 0;
    
    var fd = fs.openSync(resourcePath, 'r');
    if(fd) {
        while((bytesRead = fs.readSync(fd, buffer, 0, 1024, position)) > 0) {
            console.log('bytesRead: '+bytesRead+', position: '+position);
            response.write(buffer.toString('binary', 0, bytesRead));
            //response.write(buffer.toString('binary', 0, bytesRead));
            //response.write(buffer);
            position += bytesRead;
        }
        fs.closeSync(fd);
    }
    */
};

Handler.prototype._getContentType = function(resourcePath) {
    var contentType = null;
    
    var extension = path.extname(resourcePath).toLowerCase();
    for(var key in this.contentTypes) {
        if(extension == key) {
            contentType = this.contentTypes[key];
            break;
        }
    }
    if(contentType == null) {
        contentType = this.defaultContentType;
    }

    return contentType;
};

Handler.prototype._normalizePath = function(resourcePath) {
  segments = resourcePath.split('/');
  newSegments = [];
  for(var i = 0; i < segments.length; i++) {
    if(segments[i] != '..') {
      newSegments.push(segments[i]);
    }
  }

  newResourcePath = newSegments.join('/');

  return path.normalize(newResourcePath);
};
