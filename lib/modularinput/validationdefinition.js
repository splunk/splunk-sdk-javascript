(function() {
    var parser = require("xml2js");
    var utils = require("./utils");

    function ValidationDefinition(object) {
        this.metadata = {};
        this.parameters = {};
    }

    ValidationDefinition.prototype.equals = function(other) {
        return (JSON.stringify(other.metadata) === JSON.stringify(this.metadata) &&
            JSON.stringify(other.parameters) === JSON.stringify(this.parameters));
    };

    ValidationDefinition.prototype.parse = function(stream) {
        var that = this;

        parser.parseString(stream, function(err, result) {

            var root = result["items"];
            for (var node in root) {
                // Skip the schema attributes
                if (node === "$") {
                    continue;
                }
                // There should only be one item node
                else if (node === "item") {
                    var item = root[node][0];
                    that.metadata.name = item["$"].name;
                    that.parameters = utils.parseParameters(item);
                }
                else {
                    // Store anything else in metadata
                    that.metadata[node] = root[node][0];
                }
            }
        });
    };
    
    module.exports = ValidationDefinition;
})();