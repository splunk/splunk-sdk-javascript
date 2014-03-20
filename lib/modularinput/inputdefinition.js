(function() {
    var parser = require("xml2js");

    function InputDefinition(object) {
        this.metadata = {};
        this.inputs = {};
    }

    InputDefinition.prototype.equals = function(other) {
        return (JSON.stringify(other.metadata) === JSON.stringify(this.metadata) &&
            JSON.stringify(other.inputs) === JSON.stringify(this.inputs));
    };

    InputDefinition.prototype.parse = function(stream) {
        var that = this;
        parser.parseString(stream, function(err, result) {
            if (err) {
                throw new Error("Invalid input definition", err);
            }

            var root = result["input"];
            for (var node in root) {
                // Skip the schema attributes
                if (node === "$") {
                    continue;
                }
                // There should only be one configuration node
                if (node === "configuration") {
                    var configuration = root[node][0];
                    if (typeof configuration === "string") {
                        // No inputs
                        continue;
                    }
                    else {
                        var stanzas = configuration.stanza;
                        for (var stanza in stanzas) {
                            var input = stanzas[stanza];
                            var name = input["$"].name;
                            that.inputs[name] = {};

                            for (var property in input) {
                                if (property === "$") {
                                    continue;
                                }
                                else if (property === "param") {
                                    for (var singleValue in property) {
                                        if (input[property][singleValue]) {
                                            var singlePropertyName = input[property][singleValue]["$"].name;
                                            that.inputs[name][singlePropertyName] = input[property][singleValue]["_"];
                                        }
                                    }
                                }
                                else if (property === "param_list") {
                                    for (var multiValue in input[property]) {
                                        if (input[property][multiValue]) {
                                            var multiPropertyName = input[property][multiValue]["$"].name;
                                            that.inputs[name][multiPropertyName] = input[property][multiValue].value;
                                        }
                                    }
                                }
                                else {
                                    throw new Error("Invalid configuration scheme, " + property + " tag unexpected.");
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

    module.exports = InputDefinition;
})();