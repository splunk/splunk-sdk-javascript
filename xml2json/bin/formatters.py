#
# Type hinting for EAI endpoint keys
#
import re, util
from mappings import mappings, bool_regexes, number_regexes

import logging
logger = logging.getLogger('splunk.xml2json.format')

def get_formatter(*args, **kwargs):
    return BaseFormatter()
        
class BaseFormatter(object):
    converters = {
        "bool": util.normalize_boolean,
        "number": float,
        "string": lambda x: x,
    }
        
    def is_bool(self, k):
        for pattern in bool_regexes:
            if pattern.match(k):
                return True
        
    def is_number(self, k):
        for pattern in number_regexes:
            if pattern.match(k):
                return True
    
    def format(self, D, prefix=""):
        if isinstance(D, list):
            for i, elem in enumerate(D):
                D[i] = self.format(D[i])
        else:
            for k in D:            
                datatype = "string"
                composite = prefix + k
                
                if isinstance(D[k], dict):
                    self.format(D[k], prefix=composite + ".")
                    continue
                elif isinstance(D[k], list):
                    def iterate(el):
                        if isinstance(el, dict):
                            self.format(el, prefix=composite + ".")
                    map(iterate, D[k])
                    continue
                
                if mappings.has_key(k):
                    datatype = mappings[k]
                elif mappings.has_key(composite):
                    datatype = mappings[composite]
                elif self.is_bool(k) or self.is_bool(composite):
                    datatype = "bool"
                elif self.is_number(k) or self.is_number(composite):
                    datatype = "number"
                    
                try:
                    D[k] = self.converters[datatype](D[k])
                except:
                    pass
