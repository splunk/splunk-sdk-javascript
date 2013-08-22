
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
    var utils        = require('../utils');
    var Class        = require('../jquery.class').Class;
    var SplunkCharts = require('./charting/js_charting').Splunk;
    
    var root = exports || this;
        
    var JSCharting = SplunkCharts.JSCharting;
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
            this.chartType = chartType;
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
        
        setData: function(data, properties) {
            var fieldInfo = JSCharting.extractFieldInfo(data);
            var chartData = JSCharting.extractChartReadyData(data, fieldInfo);
            
            if (!properties.chart) {
                properties.chart = this.chartType;
            }
            
            this.chart.prepare(chartData, fieldInfo, properties);
        },
        
        draw: function() {
            this.chart.draw(function(){});
        }
    });
})();