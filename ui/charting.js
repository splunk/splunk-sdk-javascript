
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
    var utils = require('../lib/utils');
    var Class   = require('../lib/jquery.class').Class;
    
    this.SplunkCharting = this.SplunkCharting || {}
    var i18n = require('../external-nocheckin/i18n.js');
    for(var key in i18n) {
        if (i18n.hasOwnProperty(key)) {
            this[key] = i18n[key];
        }
    }
    
    require('../external-nocheckin/i18n_locale.js');
    require('../external-nocheckin/lowpro_for_jquery.js');
    require('../external-nocheckin/splunk.js');
    require('../external-nocheckin/util.js');
    require('../external-nocheckin/highcharts.js');
    require('../external-nocheckin/js_charting.js');
    
    var root = exports || this;
        
    var JSCharting = this.SplunkCharting.JSCharting;
    root.ChartType = {
        LINE: "line",
        AREA: "area",
        COLUMN: "column",
        BAR: "bar",
        PIE: "pie",
        SCATTER: "scatter",
        HYBRID: "hybrid",
        RADIALGAUGE: "radialGauge",
        FILLERGAUGE: "fillerGauge",
        MARKERGAUGE: "markerGauge"
    };
    
    root.Chart = Class.extend({
        init: function(el, chartType, orientation, isSplitSeries) {
            this.el = $(el);
            this.chart = JSCharting.createChart(this.el.eq(0)[0], {
                chart: chartType,
                "chart.orientation": orientation,
                "layout.splitSeries": isSplitSeries
            });
        },
        
        destroy: function() {
            this.chart.destroy();
            this.chart = null;
        },
        
        setColumnData: function(data, properties) {
            var series = [];
            for(var i = 0; i < data.fields.length; i++) {
                var column = {
                    field: data.fields[i],
                    data: data.columns[i] 
                };
                series.push(column);
            }
            
            this.setData(series, properties);
        },
        
        setData: function(series, properties) {
            fieldInfo = JSCharting.extractFieldInfo({series: series});
            chartData = JSCharting.extractChartReadyData({series: series}, fieldInfo);
            this.chart.prepare(chartData, fieldInfo, properties);
        },
        
        draw: function() {
            this.chart.draw();
        }
    });
})();