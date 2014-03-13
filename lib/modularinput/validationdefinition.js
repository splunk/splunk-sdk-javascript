//(function() {
    var parser = require("xml2js");

    //TODO: temporary:
    var fs = require("fs");
    //

    function ValidationDefinition(object) {
        this.metadata = {};
        this.parameters = {};
    }

    ValidationDefinition.prototype.equals = function(other) {
        if(others instanceof ValidationDefinition) {

        }
        return (JSON.stringify(others.metadata) === JSON.stringify(this.metadata) 
            && JSON.stringify(others.parameters) === JSON.stringify(this.parameters))
    };

    ValidationDefinition.prototype.parse = function(stream) {
        var definition = new ValidationDefinition();

        var that = this;

        parser.parseString(stream, function(err, result) {
            var root = result["items"];
            for (var node in root) {
                if(node === "$")
                    continue; // Skip the schema attributes
                if (node === "item") {
                    var item = root[node][0];

                    for (var property in item) {

                        if (property === "name") {
                            // Get the name from the attributes
                            that.matadata.name = item[property];
                        }
                        else if (property === "param") {
                            for (var value in property) {
                                if (item[property][value]) {
                                    that.parameters[item[property][value]["$"].name] = item[property][value]["_"];
                                }
                            }
                        }
                        else if (property === "param_list") {
                            for (var value in property) {
                                if (item[property][value]) {
                                    that.parameters[item[property][value]["$"].name] = item[property][value].value;
                                }
                            }
                        }
                        else {
                            // TODO: raise an error
                        }
                    }
                }
                else {
                    // Store anything else in metadata
                    that.metadata[node] = root[node];
                }
            }
        });

        console.log("Params", this.parameters);
        console.log("Meta", this.metadata);
    };

    //module.exports = ValidationDefinition;
//});

var v = new ValidationDefinition();
//v.parse("<root>Hello xml2js!</root>");
v.parse(fs.readFileSync("../../tests/modularinput/data/validation.xml"));