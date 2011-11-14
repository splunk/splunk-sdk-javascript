#
# Type hinting for EAI endpoint keys
#

import splunk.util
import logging

logger = logging.getLogger('splunk.olde.formatters')


def get_formatter(endpoint):
    if not endpoint:
        logger.warn('get_formatter called on non-formattable object')
        return
    if endpoint.startswith('search/jobs'):
        return SearchJob()
    elif endpoint.startswith('saved/searches'):
        return SavedSearch()
    else:
        return None
    
    
class BaseFormatter(object):
    
    bool_keys = []
    int_keys = []
    float_keys = []
    bool_prefixes = ['is_', 'can_', 'disabled']

    
    def process_bools(self, D, keys=[], prefixes=[]):
        keys = keys or self.bool_keys
        prefixes = prefixes or self.bool_prefixes
        for k in D:
            if k in keys or any(map(k.startswith, prefixes)):
                D[k] = splunk.util.normalizeBoolean(D[k])
        
    def process_ints(self, D, keys=[]):
        keys = keys or self.int_keys
        for k in D:
            if k in keys:
                try:
                    D[k] = int(D[k])
                except:
                    logger.warn('unable to cast key "%s" to int' % k)
                    
    def process_floats(self, D, keys=[]):
        keys = keys or self.float_keys
        for k in D:
            if k in keys:
                try:
                    D[k] = float(D[k])
                except:
                    logger.warn('unable to cast key "%s" to float' % k)
        
    
    def format(self, D):
        self.process_bools(D)
        self.process_ints(D)
        self.process_floats(D)
        
    
    
class SavedSearch(BaseFormatter):
    
    bool_keys = [
        'action.email',
        'action.populate_lookup',
        'action.rss',
        'action.script',
        'action.summary_index',
        'dispatch.spawn_process',
        'restart_on_searchpeer_add',
        'run_on_startup'
    ]
    
    int_keys = [
        'alert.severity',
        'dispatch.buckets',
        'dispatch.max_count',
        'dispatch.max_time',
        'dispatch.reduce_freq',
        'max_concurrent'
    ]
    

class SearchJob(BaseFormatter):
    
    bool_keys = [
        'eventIsStreaming',
        'eventIsTruncated',
        'resultIsStreaming',
    ]
    bool_prefixes = ['is']
    
    int_keys = [
        'diskUsage',
        'dropCount',
        'eventAvailableCount',
        'eventCount',
        'eventFieldCount',
        'numPreviews',
        'priority',
        'resultCount',
        'resultPreviewCount',
        'scanCount',
        'statusBuckets',
        'ttl'
    ]
    
    float_keys = [
        'doneProgress',
        'runDuration',
        'searchEarliestTime',
        'searchLatestTime'
    ]
    

class Metadata(BaseFormatter):
    
    bool_keys = [
        'can_change_perms', 
        'can_share_global', 
        'modifiable', 
        'can_share_user', 
        'can_share_app', 
        'can_write'
    ]
