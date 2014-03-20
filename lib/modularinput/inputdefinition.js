(function() {
    var parser = require("xml2js");
    var utils = require("./utils");

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
                else if (node === "configuration") {
                    var configuration = root[node][0];
                    if (typeof configuration === "string") {
                        // No inputs
                        continue;
                    }
                    else {
                        var stanzas = configuration.stanza;
                        for (var stanza in stanzas) {
                            var input = stanzas[stanza];
                            var inputName = input["$"].name;
                            that.inputs[inputName] = utils.parseParameters(input);
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