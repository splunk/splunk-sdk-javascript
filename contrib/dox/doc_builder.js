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

// Originally modified from Davis.js:
// https://github.com/olivernn/davis.js
// MIT/X11 Licensed

(function() {
  var path = require('path');
  var fs = require('fs');
  var mustache = require('mustache');
  var counter = 0;
  var URL_ROOT = "https://github.com/splunk/splunk-sdk-javascript/blob/master/";

  var formatCode = function(doc) {
        var code = doc.code || "";
        var split = code.split("\n");
        if (split.length > 1) {
            var leftAlign = 0;
            while(true) {
                var fail = false;
                
                for(var i = 1; i < split.length; i++) {
                    var line = split[i];
                    if (line.trim() !== "" && line[leftAlign] !== " ") {
                        fail = true;
                        break;
                    }
                }
                
                if (fail) {
                    break;
                }
                else {
                    leftAlign++;
                }
            }
            
            for(var i = 1; i < split.length; i++) {
                split[i] = split[i].slice(leftAlign);
            }
            
            code = split.join("\n");
        }
        
        return code;
  };

  var getCommentContext = function(doc) {
    // Ignore ignored and private blocks
    if (doc.ignore || doc.isPrivate) {
        return;
    }

    // Find the parent module and note the name
    var parent = function () {
        var module = "Global";
        for(var i = 0; i < doc.tags.length; i++) {
            var tag = doc.tags[i];
            if (tag.type === "method") {
                module = tag.content;
            }
            else if (tag.type === "function") {
                module = tag.content;
            }
        }
        
        return module.trim();
    }

    // Find any related tags, and create the structure for it
    var relatedTag = doc.tags.filter(function (tag) { return tag.type === "see"; })[0]
    if (relatedTag) {
        var related = {
            name: relatedTag.local,
            href: relatedTag.local ? relatedTag.local : ''
        }
    };
    
    var code = formatCode(doc);
    
    // Is this a constructor?
    var isConstructor = doc.tags.some(function(tag) {
        return (tag.type === "constructor");
    });

    // Is this a module definition, and if so, what is the
    // name of this module?
    var moduleName = "";
    var isModule = doc.tags.some(function (tag) { 
        if (tag.type === "class") {
            moduleName = tag.content;
            return true;
        }
        else if (tag.type === "module") {
            moduleName = tag.content;
            return true;
        }
        
        return false;
    });
    
    // Is this a global, and if so, what is the name of the
    // containing module?
    var globalName = "";
    var isGlobal = doc.tags.some(function (tag) { 
        if (tag.type === "function") {
            globalName = tag.content;
            return true;
        }
        
        return false;
    });
    
    var extendsName = "";
    var isExtends = doc.tags.some(function(tag) {
        if (tag.type === "extends") {
            extendsName = tag.content;
            return true;
        }
        
        return false;
    });
    
    var endpointName = "";
    var hasEndpoint = doc.tags.some(function(tag) {
        if (tag.type === "endpoint") {
            endpointName = tag.content;
            return true;
        }
        
        return false;
    });
    
    var isPrivate = doc.tags.some(function(tag) {
        if (tag.type === "private") {
            return true;
        }
        
        return false;
    });
    
    var name = moduleName || doc.ctx && doc.ctx.name;
    var signature = (isGlobal || !isModule) ? parent() + "." + name : doc.ctx && doc.ctx.string;
    
    var firstLine = code.split("\n")[0].trim();
    var syntax = firstLine.substr(0, firstLine.lastIndexOf("{") - 1);

    if (isModule) {
    }

    return {
        id: [counter++, Date.now()].join('-'),
        name: name,
        signature: signature,
        line: doc.line,
        filename: doc.filename,
        url: URL_ROOT + doc.filename,
        type: isConstructor ? "constructor" : (doc.ctx && doc.ctx.type),
        ctx: doc.ctx,
        description: doc.description,
        full_description: doc.description.full.replace(/<br( \/)?>/g, ' '),
        code: code,
        params: doc.tags.filter(function (tag) { return tag.type === 'param' }),
        has_params: !!doc.tags.filter(function (tag) { return tag.type === 'param' }).length,
        examples: doc.tags.filter(function (tag) { return tag.type === 'example' }),
        has_examples: !!doc.tags.filter(function (tag) { return tag.type === 'example' }).length,
        returns: doc.tags.filter(function (tag) { return tag.type === 'return' })[0],
        has_returns: !!doc.tags.filter(function (tag) { return tag.type === 'return' }).length,
        tags: doc.tags,
        module: isModule,
        parent: parent(),
        related: related,
        has_related: !!related,
        is_global: isGlobal,
        global: globalName,
        is_extends: isExtends,
        "extends": extendsName,
        is_private: isPrivate,
        has_endpoint: hasEndpoint,
        endpoint: endpointName,
        syntax: syntax,
        has_syntax: !!syntax
    };
  }

  var filterUndefined = function(elem) {
    return !!elem
  }

  exports.generate = function(docs, version, callback) {
    var transformedDocs = docs.map(getCommentContext).filter(filterUndefined)

    var modules = transformedDocs.filter(function (doc) {
      return doc.module
    });

    modules.forEach(function (module) {
        module.methods = transformedDocs.filter(function (doc) {
            return doc.parent === module.name && !doc.is_global
        });
      
        module.methods = module.methods.sort(function(method1, method2) {
            if (method1.type === "constructor") {
                return -1;
            }
            
            return 1;
        });
        
        module.has_methods = module.methods.length > 0;
      
        module.helpers = transformedDocs.filter(function(doc) {
            return doc.is_global && doc.global === module.name;
        });
      
        module.has_globals = (module.helpers || []).length > 0;
    });
    
    var moduleStore = {};
    modules.forEach(function (module) {
        moduleStore[module.name.trim()] = module;
    });
    
    var getParentMethods = function(module) {
        if (!module) {
            return [];
        }
        
        var newMethods = module.methods.slice();
        var methodNames = {};
        module.methods.forEach(function(method) {
            methodNames[method.name] = true; 
        });
        
        if (module.is_extends) {
            // Get our parent name and his methods
            var parentName = module["extends"].trim();
            var parent = moduleStore[parentName];
            var parentMethods = getParentMethods(parent);
            
            // For each method we got from our parent (and thus their
            // parent and so on), we look at it. If we don't have
            // a method with the same name, we note it.
            for(var i = 0; i < parentMethods.length; i++) {
                var parentMethod = parentMethods[i];
                
                // Check to see if we have a method of the same name
                if (!methodNames[parentMethod.name] && !parentMethod.ignore && !parentMethod.is_private) {
                    // Copy over the method
                    var newMethod = {};
                    for(var k in parentMethod) { 
                        newMethod[k] = parentMethod[k]; 
                    }
                    newMethod.parent = module.name;
                    newMethod.is_inherited = true;
                    newMethod.id += module.id;
                    
                    // Push it
                    newMethods.push(newMethod);
                }
            }
        }
        
        return newMethods;
    }
    
    modules.forEach(function (module) {
        // Get the methods from the parent that are applicable to us
        var newMethods = getParentMethods(module);
        
        // If we have a parent, add those methods in
        // but only if it isn't StormService, which we special case for now
        var isStormService = module.name === "splunkjs.StormService";
        if (module.is_extends && !isStormService) {
            module.inherited = newMethods.filter(function(method) {
                return (module.methods.indexOf(method) < 0);
            });
            module.has_inherited = module.inherited.length;
        }
    });
    
    var ref_template = fs.readFileSync(path.resolve(__dirname, 'ref_template.mustache')).toString("utf-8");
    var context = {
        modules: modules,
        version: version
    }
    
    var comparator = function(a,b) {
        return (a.name < b.name ? -1 : (a.name === b.name ? 0 : 1)); 
    };
    
    var outputs = {};
    modules.sort(comparator).forEach(function(module) {
        var moduleList = [];
        for(var i = 0; i < modules.length; i++) {
            if (modules[i] === module) {
                moduleList.push(module);
                
                (module.methods || []).sort(comparator);
                (module.inherited || []).sort(comparator);
                (module.helpers || []).sort(comparator);
            }
            else {
                moduleList.push({name: modules[i].name});
            }
        }
        
        var context = {
            modules: moduleList,
            module: module,
            version: version
        }
        
        outputs[module.name] = mustache.render(ref_template, context, null);
    });
    
    // Generate index
    var context = {
        modules: modules.map(function(mod) { return {name: mod.name, full_description: mod.full_description}; }),
        version: version
    }
    var ref_index_template = fs.readFileSync(path.resolve(__dirname, 'ref_index_template.mustache')).toString("utf-8");
    outputs["index"] = mustache.render(ref_index_template, context, null);
    
    //var output = mustache.render(template, context, null);
    callback(null, outputs);
  };
})();