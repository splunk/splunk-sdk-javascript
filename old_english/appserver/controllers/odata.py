#
# OData wrapper classes
#

import copy
import formatters


class ODataResponse(object):
    '''
    Standardized JSON response wrapper
    '''

    def __init__(self):
        self.results = None

    def to_json(self):
        output = {
            'd': {
                'results': self.results.to_json()
            }
        }
        if hasattr(self.results, 'total_count'):
            output['d']['__total_count'] = self.results.total_count
        if hasattr(self.results, 'offset'):
            output['d']['__offset'] = self.results.offset
        if hasattr(self.results, 'count'):
            output['d']['__count'] = self.results.count
        if hasattr(self.results, 'messages'):
            output['d']['__messages'] = self.results.messages
        if hasattr(self.results, 'timings'):
            output['d']['__timings'] = []
            for i, item in enumerate(self.results.timings):
                if i > 0:
                    delta = item[1] - self.results.timings[i-1][1]
                else:
                    delta = 0
                output['d']['__timings'].append((item[0], item[1], delta))
                    
        return output


class ODataCollection(object):

    def __init__(self):
        self.metadata = ODataMetadata()
        self.items = []
        self.total_count = 0
        self.offset = 0
        self.count = 0
        self.timings = []
        self.messages = []

    def to_json(self):
        # TODO: figure out if metadata is support on collections
        return [x.to_json() for x in self.items]


class ODataEntity(object):
    
    def __init__(self):
        self.metadata = ODataMetadata()
        self.entity_class = None
        self._data = {}
        self.name = None
        self.id = None
        self.messages = []
        
    def normalize(self):
        fm = formatters.get_formatter(self.entity_class)
        if fm:
            fm.format(self._data)
        
    def __set_data(self, value):
        self._data = value
        self.normalize()
    def __get_data(self):
        return self._data
    data = property(__get_data, __set_data)

    def to_json(self):
        output = copy.deepcopy(self._data)
        if self.id:
            output['__id'] = self.id
        if self.name:
            output['__name'] = self.name
        output['__metadata'] = self.metadata.to_json()
        return output


class ODataMetadata(object):

    def __init__(self):
        self._acl = {}
        self._field_specs = {}
        self.links = []

    def normalize(self):
        fm = formatters.Metadata()
        fm.format(self._acl)

    def __set_acl(self, value):
        self._acl = value
        self.normalize()
    def __get_acl(self):
        return self._acl
    acl = property(__get_acl, __set_acl)
    
    def __set_field_specs(self, value):
        self._field_specs = value
        self.normalize()
    def __get_field_specs(self):
        return self._field_specs
    field_specs = property(__get_field_specs, __set_field_specs)
    attributes = property(__get_field_specs, __set_field_specs)
    
    def to_json(self):
        output = {}
        if self._acl:
            output['acl'] = copy.deepcopy(self._acl)
        if self._field_specs:
            output['field_specs'] = copy.deepcopy(self._field_specs)
        if self.links:
            output['links'] = copy.deepcopy(self.links)
        return output
