var sys = require('sys');
var fs = require('fs');
var path = require('path');

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
