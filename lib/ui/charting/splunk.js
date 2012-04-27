
// Copyright 2011 Splunk, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"): you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

(function() {
    var Splunk = {};
    
    /**
     * Returns the namespace specified and creates it if it doesn't exist
     * <pre>
     * Splunk.namespace("property.package");
     * Splunk.namespace("Splunk.property.package");
     * </pre>
     * Either of the above would create Splunk.property, then
     * Splunk.property.package
     *
     * @method namespace
     * @static
     * @param  {String} name A "." delimited namespace to create
     * @return {Object} A reference to the last namespace object created
     */
    Splunk.namespace = function(name) {
        var parts = name.split(".");
        var obj = Splunk;
        for (var i=(parts[0]=="Splunk")?1:0; i<parts.length; i=i+1) {
            obj[parts[i]] = obj[parts[i]] || {};
            obj = obj[parts[i]];
        }
        return obj;
    };
    
    /****** DON'T CHANGE ANYTHING BELOW THIS LINE ******/
    
    module.exports = Splunk;
})();