try {
    module.exports = require('../../../node-runforcover');
}
catch(err) {
    // Stub out the coverage module so that it does not cause any errors.
    module.exports.cover = function() {
        var noneFunc = function() {};
        noneFunc.release = function() {};

        return noneFunc;
    };
}