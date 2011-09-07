exports.Handler = require('./lib/staticresource/handler');
exports.createHandler = function(rootPath) {
    return new exports.Handler(rootPath);
};
