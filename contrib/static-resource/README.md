# Static Resource: node.js module for static resource handling

The `Static Resource` is a module for node.js to handle static resources such as html, image, css files.


## How to use

    var http = require('http');
    var fs = require('fs');
    var url = require('url');
    var staticResource = require('../');

    // passing where is going to be the document root of resources.
    var handler = staticResource.createHandler(fs.realpathSync('./static'));

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
    server.listen(8080);

`Static Resource` is designed to handle resources you choose to let `Static Resource` handle and don't do anything else. This leaves you with a choice of handling certain resources by yourself yet letting other resources handled by `Static Resource`.

Adding/removing content types is easy.

    var handler = staticResource.createHandler(fs.realpathSync('./static'));
    handler.addContentType('.zip', 'application/zip');
    handler.removeContentType('.html');

For adding a new content type, just pass file extension with '.' and content type along with it. For removing existing content type, you only need to pass the file extension.

The content types that I think very common are added by default in its constructor, so add/remove by yourself. When it doesn't know which content type to use, it defaults to `application/octet-stream`. 


## Notes

`Static Resource` is meant to be experimental! It might be useful for testing but is not probably a good idea to use it in production.


## Demo

To run a demo, go to `example` directory and run the following command:

    $ node server.js

Then open up web browser and go to [http://localhost:8080/index.html](http://localhost:8080/index.html). That `index.html` is handled by `Static Resource`.


## Credits

[Socket.IO Node.JS Server](http://labs.learnboost.com/socket.io/) - I followed his model for the layout of this module, and this README.


## License

`Static Resource` is licensed under the MIT license.

The MIT License

Copyright (c) 2010 Atsuya Takagi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED ‘AS IS’, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
