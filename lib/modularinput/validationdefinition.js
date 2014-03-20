(function() {

    var parser = require("xml2js");

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
                if (node === "item") {
                    var item = root[node][0];

                    for (var property in item) {
                        // Get the name from the item node's attributes
                        if (property === "$") {
                            that.metadata.name = item[property].name;
                        }
                        else if (property === "param") {
                            // Get single value parameters
                            for (var singleValue in property) {
                                if (item[property][singleValue]) {
                                    that.parameters[item[property][singleValue]["$"].name] = item[property][singleValue]["_"];
                                }
                            }
                        }
                        else if (property === "param_list") {
                            // Get multi-value parameters
                            for (var multiValue in property) {
                                if (item[property][multiValue]) {
                                    that.parameters[item[property][multiValue]["$"].name] = item[property][multiValue].value;
                                }
                            }
                        }
                    }
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