module.exports = {
    parseParameters: function (node) {
        var params = {};

        for (var tag in node) {
            if (tag === "$") {
                // Skip the attributes
                continue;
            }
            else if (tag === "param") {
                for (var singleValue in node[tag]) {
                    if (node[tag][singleValue]) {
                        params[node[tag][singleValue]["$"].name] = node[tag][singleValue]["_"];
                    }
                }
            }
            else if (tag === "param_list") {
                for (var multiValue in node[tag]) {
                    if (node[tag][multiValue]) {
                        params[node[tag][multiValue]["$"].name] = node[tag][multiValue].value;
                    }
                }
            }
            else {
                throw new Error("Invalid configuration scheme, " + node + " tag unexpected.");
            }
        }

        return params;
    }
};