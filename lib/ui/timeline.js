
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
    
    // Import the timeline code
    var jg_global   = require('./timeline/jg_global.js');
    var time        = require('./timeline/splunk_time.js');
    var timeline    = require('./timeline/splunk_timeline.js');
    var format      = require('./timeline/format.js');
        
    var Class = require('../jquery.class').Class;
    var utils = require('../utils');
    
    var root = exports || this;

    var SplunkTimeline = timeline.splunk.Timeline;
    var DateTime = time.splunk.time.DateTime;
    var SimpleTimeZone = time.splunk.time.SimpleTimeZone;
    
    // Setup the exports and our timeline wrapper class
    root.DateTime = DateTime;
    root.SimpleTimeZone = SimpleTimeZone;
    root.Timeline = Class.extend({
        init: function(el) {
            this.timeline = new SplunkTimeline();
            this.timeline.setSeriesColor(0x73A550);    
            $(this.timeline.element).addClass("Timeline");
            
            this.timeline.appendTo($(el).get(0));

            // Add the external interface formatting functions
            this.timeline.externalInterface.formatNumericString = format.formatNumericString;
            this.timeline.externalInterface.formatNumber        = format.formatNumber;
            this.timeline.externalInterface.formatDate          = format.formatDate;
            this.timeline.externalInterface.formatTime          = format.formatTime;
            this.timeline.externalInterface.formatDateTime      = format.formatDateTime;
            this.timeline.externalInterface.formatTooltip       = format.formatTooltip;

            // We perform the bindings so that every function works 
            // properly when it is passed as a callback.
            this.updateWithJSON = utils.bind(this, this.updateWithJSON);
            this.updateWithXML  = utils.bind(this, this.updateWithXML);
            this.updateWithData = utils.bind(this, this.updateWithData);
        },
        
        updateWithJSON: function(timelineData) {
            var data = {
              buckets: [],
              cursorTime: new DateTime(timelineData.cursor_time),
              eventCount: timelineData.event_count,
              earliestOffset: timelineData.earliestOffset || 0
            };
            
            if (data.cursorTime) {
              data.cursorTime = data.cursorTime.toTimeZone(new SimpleTimeZone(data.earliestOffset));
            }
            
            for(var i = 0; i < timelineData.buckets.length; i++) {
              var oldBucket = timelineData.buckets[i];
              var newBucket = {
                earliestTime: new DateTime(oldBucket.earliest_time),
                duration: oldBucket.duration,
                eventCount: oldBucket.total_count,
                eventAvailableCount: oldBucket.available_count,
                isComplete: oldBucket.is_finalized
              };

              if (isNaN(newBucket.duration)) {
                newBucket.duration = 0;
              }
              if (isNaN(newBucket.earliestOffset)) {
                newBucket.earliestOffset = 0;
              }
              if (isNaN(newBucket.latestOffset)) {
                newBucket.latestOffset = 0;
              }

              if (newBucket.earliestTime) {
                newBucket.latestTime = new DateTime(newBucket.earliestTime.getTime() + newBucket.duration);
              }
              
              if (newBucket.earliestTime) {
                newBucket.earliestTime = newBucket.earliestTime.toTimeZone(new SimpleTimeZone(oldBucket.earliest_time_offset));
              }
              if (newBucket.latestTime) {
                newBucket.latestTime = newBucket.latestTime.toTimeZone(new SimpleTimeZone(oldBucket.latest_time_offset));
              }
              
              data.buckets.push(newBucket);
            }
            
            this.timeline._updateTimelineData(data);
        },
        
        updateWithXML: function(xmlNode) {
            this.timeline._parseTimelineData(xmlNode);
        },
        
        updateWithData: function(data) {
            this.timeline._updateTimelineData(data);
        }
    });
})();