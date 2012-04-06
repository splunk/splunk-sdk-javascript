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
    
    var Splunk     = require('./splunk');
    var i18n       = require('./i18n');
    var Highcharts = require('./highcharts').Highcharts;
    
    require('./util');
    require('./lowpro_for_jquery');
    
    var format_decimal               = i18n.format_decimal;
    var format_percent               = i18n.format_percent;
    var format_scientific            = i18n.format_scientific;
    var format_date                  = i18n.format_date;
    var format_datetime              = i18n.format_datetime;
    var format_time                  = i18n.format_time;
    var format_datetime_microseconds = i18n.format_datetime_microseconds;
    var format_time_microseconds     = i18n.format_time_microseconds;
    var format_datetime_range        = i18n.format_datetime_range;
    
    exports.Splunk = Splunk;

    ////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting
    //
    // Adding some basic methods/fields to the JSCharting namespace for creating charts
    // and manipulating data from splunkd

    Splunk.JSCharting = {
            
        // this is copied from the Highcharts source, line 38
        hasSVG: !!document.createElementNS &&
                    !!document.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGRect,
            
        createChart: function(container, properties) {
            // this is a punt to verify that container is a valid dom element
            // not an exhaustive check, but verifies the existence of the first
            // methods HC will call in an attempt to catch the problem here
            if(!container.appendChild || !container.cloneNode) {
                throw new Error("Invalid argument to createChart, container must be a valid DOM element");
            }
            var getConstructorByType = function(chartType) {
                    switch(chartType) {
                        case 'line':
                            return Splunk.JSCharting.LineChart;
                        case 'area':
                            return Splunk.JSCharting.AreaChart;
                        case 'column':
                            return Splunk.JSCharting.ColumnChart;
                        case 'bar':
                            return Splunk.JSCharting.BarChart;
                        case 'pie':
                            return Splunk.JSCharting.PieChart;
                        case 'scatter':
                            return Splunk.JSCharting.ScatterChart;
                        case 'hybrid':
                            return Splunk.JSCharting.HybridChart;
                        case 'radialGauge':
                            return Splunk.JSCharting.RadialGauge;
                        case 'fillerGauge':
                            return (properties['chart.orientation'] === 'x') ? 
                                    Splunk.JSCharting.HorizontalFillerGauge : Splunk.JSCharting.VerticalFillerGauge;
                        case 'markerGauge':
                            return (properties['chart.orientation'] === 'x') ? 
                                    Splunk.JSCharting.HorizontalMarkerGauge : Splunk.JSCharting.VerticalMarkerGauge;
                        default:
                            return Splunk.JSCharting.ColumnChart;
                    }
                },
                chartConstructor = getConstructorByType(properties.chart);
                
            // split series only applies to bar/column/line/area charts
            if(properties['layout.splitSeries'] === 'true'
                    && (!properties.chart || properties.chart in {bar: true, column: true, line: true, area: true})) {
                return new Splunk.JSCharting.SplitSeriesChart(container, chartConstructor);
            }
            return new chartConstructor(container);
        },
        
        extractFieldInfo: function(rawData) {
            if(!rawData || !rawData.columns) {
                return {
                    fieldNames: []
                };
            }
            var i, loopField, xAxisKey, xAxisSeriesIndex, spanSeriesIndex,
                xAxisKeyFound = false,
                isTimeData = false,
                fieldNames = [];

            for(i = 0; i < rawData.columns.length; i++) {
                loopField = rawData.fields[i];
                if(loopField == '_span') {
                    spanSeriesIndex = i;
                    continue;
                }
                if(loopField.charAt(0) == '_' && loopField != "_time") {
                    continue;
                }
                if(!xAxisKeyFound) {
                    xAxisKey = loopField;
                    xAxisSeriesIndex = i;
                    xAxisKeyFound = true;
                    if(xAxisKey === '_time' && ($.inArray('_span', rawData.fields) > -1 || rawData.columns[i].length === 1)) {
                        // we only treat the data as time data if it has been discretized by the back end 
                        // (indicated by the existence of a '_span' field)
                        isTimeData = true;
                    }
                }
                else {
                    fieldNames.push(loopField);
                }
            }
            return {
                fieldNames: fieldNames,
                xAxisKey: xAxisKey,
                xAxisSeriesIndex: xAxisSeriesIndex,
                spanSeriesIndex: spanSeriesIndex,
                isTimeData: isTimeData
            };
        },
        
        extractChartReadyData: function(rawData, fieldInfo) {
            if(!rawData || !rawData.columns) {
                return false;
            }
            var i, j, 
                xAxisKey = fieldInfo.xAxisKey,
                xAxisSeriesIndex = fieldInfo.xAxisSeriesIndex, 
                xSeries = rawData.columns[xAxisSeriesIndex], 
                _spanSeries, xAxisType, categories,
                loopSeries, loopYVal, loopDataPoint,
                series = {};

            if(xAxisKey === '_time' && ($.inArray('_span', rawData.fields) > -1 || xSeries.length === 1)) {
                xAxisType = "time";
                for(i = 0; i < rawData.columns.length; i++) {
                    if(rawData.fields[i] === '_span') {
                        _spanSeries = rawData.columns[i];
                        break;
                    }
                }
            }
            else {
                xAxisType = "category";
                categories = $.extend(true, [], xSeries);
            }
            
            // extract the data
            for(i = 0; i < rawData.columns.length; i++) {
                loopSeries = rawData.columns[i];
                series[rawData.fields[i]] = [];
                for(j = 0; j < loopSeries.length; j++) {
                    loopYVal = this.MathUtils.parseFloat(loopSeries[j]);
                    loopDataPoint = {
                        name: xSeries[j],
                        y: loopYVal,
                        rawY: loopYVal
                    };
                    if(xAxisType === "time" && _spanSeries) {
                        loopDataPoint._span = _spanSeries[j];
                    }
                    series[rawData.fields[i]].push(loopDataPoint);
                }
            }
            return {
                series: series,
                fieldNames: fieldInfo.fieldNames,
                xAxisKey: fieldInfo.xAxisKey,
                xAxisType: xAxisType,
                categories: categories,
                xSeries: xSeries,
                _spanSeries: _spanSeries
            };
        }
            
    };


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractVisualization


    Splunk.JSCharting.AbstractVisualization = $.klass({

        hasSVG: Splunk.JSCharting.hasSVG,
        
        initialize: function(container) {
            // some shortcuts to the util packages
            this.mathUtils = Splunk.JSCharting.MathUtils;
            this.parseUtils = Splunk.JSCharting.ParsingUtils;
            this.colorUtils = Splunk.JSCharting.ColorUtils;
            
            this.eventMap = {};

            this.renderTo = container;
            this.chartWidth = $(this.renderTo).width();
            this.chartHeight = $(this.renderTo).height();
            
            this.backgroundColor = "#ffffff";
            this.foregroundColor = "#000000";
            this.fontColor = "#000000";
            
            this.testMode = false;
            this.exportMode = false;
        },
        
        applyProperties: function(properties) {
            for(var key in properties) {
                if(properties.hasOwnProperty(key)) {
                    this.applyPropertyByName(key, properties[key], properties);
                }
            }
            this.performPropertyCleanup();
        },
        
        applyPropertyByName: function(key, value, properties) {
            switch(key) {
            
                case 'backgroundColor':
                    this.backgroundColor = value;
                    break;
                case 'foregroundColor':
                    this.foregroundColor = value;
                    break;
                case 'fontColor':
                    this.fontColor = value;
                    break;
                case 'testMode':
                    this.testMode = (value === true);
                    break;
                case 'exportMode':
                    if(value === "true") {
                        this.exportMode = true;
                        this.setExportDimensions();
                    }
                    break;
                default:
                    // no-op, ignore unrecognized properties
                    break;
            
            }
        },
        
        performPropertyCleanup: function() {
            this.foregroundColorSoft = this.colorUtils.addAlphaToColor(this.foregroundColor, 0.25);
            this.foregroundColorSofter = this.colorUtils.addAlphaToColor(this.foregroundColor, 0.15);
        },
        
        addEventListener: function(type, callback) {
            if(this.eventMap[type]) {
                this.eventMap[type].push(callback);
            }
            else {
                this.eventMap[type] = [callback];
            }
        },

        removeEventListener: function(type, callback) {
            if(this.eventMap[type] == undefined) {
                return;
            }
            var index = $.inArray(callback, this.eventMap[type]);
            if(this.eventMap[type][index]) {
                this.eventMap[type].splice(index, 1);
            }
        },

        dispatchEvent: function(type, event) {
            event = event || {};
            if(this.eventMap[type]) {
                for(var i in this.eventMap[type]) {
                    this.eventMap[type][i](event);
                }
            }
        },

        // TODO: this should be migrated to another object, formatting helper maybe?
        addClassToElement: function(elem, className) {
            // the className can potentially come from the search results, so make sure it is valid before
            // attempting to insert it...
            
            // if the className doesn't start with a letter or a '-' followed by a letter, don't insert
            if(!/^[-]?[A-Za-z]/.test(className)) {
                return;
            }
            // now filter out anything that is not a letter, number, '-', or '_'
            className = className.replace(/[^A-Za-z0-9_-]/g, "");
            if(this.hasSVG) {
                if(elem.className.baseVal) {
                    elem.className.baseVal += " " + className;
                }
                else {
                    elem.className.baseVal = className;
                }
            }
            else {
                $(elem).addClass(className);
            }  
        }
        
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractChart


    Splunk.JSCharting.AbstractChart = $.klass(Splunk.JSCharting.AbstractVisualization, {

        axesAreInverted: false,
        
        focusedElementOpacity: 1,
        fadedElementOpacity: 0.3,
        fadedElementColor: "rgba(150, 150, 150, 0.3)",

        // override
        initialize: function($super, container) {
            $super(container);
            
            this.needsLegendMapping = true;
            
            this.hcChart = false;
            this.chartIsDrawing = false;
            this.chartIsStale = false;
            this.processedData = false;
            this.pendingData = false;
            this.pendingColors = false;
            this.pendingCallback = false;
            this.customConfig = false;
            this.chartIsEmpty = false;

            this.logYAxis = false;
            this.legendMaxWidth = 300;
            this.legendEllipsizeMode = 'ellipsisMiddle';
            this.tooMuchData = false;
            
            this.fieldListMode = "hide_show";
            this.fieldHideList = [];
            this.fieldShowList = [];
            this.legendLabels = [];
            
            this.colorPalette = new Splunk.JSCharting.ListColorPalette();
        },

        prepare: function(data, fieldInfo, properties) {
            this.properties = properties;
            this.generateDefaultConfig();
            this.addRenderHooks();
            this.applyProperties(properties);
            this.processData(data, fieldInfo, properties);
            if(this.chartIsEmpty) {
                this.configureEmptyChart();
            }
            else {
                this.applyFormatting(properties, this.processedData);
                this.addEventHandlers(properties);
                if(this.customConfig) {
                    $.extend(true, this.hcConfig, this.customConfig);
                }
            }
        },
        
        getFieldList: function() {
            if(this.chartIsEmpty) {
                return [];
            }
            // response needs to be adjusted if the user has explicitly defined legend label list
            if(this.legendLabels.length > 0) {
                var adjustedList = $.extend(true, [], this.legendLabels);
                for(var i = 0; i < this.processedData.fieldNames.length; i++) {
                    var name = this.processedData.fieldNames[i];
                    if($.inArray(name, adjustedList) === -1) {
                        adjustedList.push(name);
                    }
                }
                return adjustedList;
            }
            return this.processedData.fieldNames;
        },
        
        setColorMapping: function(list, map, legendSize) {
            var i, color,
                newColors = [];
            
            for(i = 0; i < list.length; i++) {
                color = this.colorPalette.getColor(list[i], map[list[i]], legendSize);
                newColors.push(this.colorUtils.addAlphaToColor(color, this.focusedElementOpacity));
            }
            this.hcConfig.colors = newColors;
        },
        
        setColorList: function(list) {
            var i,
                newColors = [];
            
            for(i = 0; i < list.length; i++) {
                newColors.push(this.colorUtils.addAlphaToColor(list[i], this.focusedElementOpacity));
            }
            this.hcConfig.colors = newColors;
        },
        
        draw: function(callback) {
            if(this.chartIsDrawing) {
                this.chartIsStale = true;
                this.pendingCallback = callback;
                return;
            }
            this.chartIsDrawing = true;
            if(this.hcChart) {
                this.destroy();
            }
            this.hcChart = new Highcharts.Chart(this.hcConfig, function(chart) {
                if(this.chartIsStale) {
                    // if new data came in while the chart was rendering, re-draw immediately
                    this.chartIsStale = false;
                    this.draw(this.pendingCallback);
                }
                else {
                    if(!this.chartIsEmpty) {
                        this.onDrawFinished(chart, callback);
                    }
                }
            }.bind(this));
        },

        setData: function(data, fieldInfo) {
            clearTimeout(this.drawTimeout);
            this.prepare(data, fieldInfo, this.properties);
        },

        resize: function(width, height) {
            this.chartWidth = width;
            this.chartHeight = height;
            if(this.hcChart) {
                this.hcChart.setSize(width, height, false);
                // need to update the chart options or the stale value will be used
                this.hcChart.options.chart.height = height;
            }
        },

        destroy: function() {
            if(this.hcChart) {
                clearTimeout(this.drawTimeout);
                this.removeLegendHoverEffects();
                this.hcChart.destroy();
                this.hcChart = false;
            }
        },

        // a way to set custom config options on an instance specific basis,
        // will be applied after all other configurations
        setCustomConfig: function(config) {
            this.customConfig = config;
        },

        highlightIndexInLegend: function(index) {
            this.highlightSeriesInLegend(this.hcChart.series[index]);
        },

        unHighlightIndexInLegend: function(index) {
            this.unHighlightSeriesInLegend(this.hcChart.series[index]);
        },
        
        getChartObject: function() {
            return this.hcChart;
        },

        ///////////////////////////////////////////////////////////////////////////
        // end of "public" interface

        generateDefaultConfig: function() {
            this.hcConfig = $.extend(true, {}, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
                chart: {
                    renderTo: this.renderTo,
                    height: this.chartHeight,
                    className: this.typeName
                }
            });
            this.mapper = new Splunk.JSCharting.PropertyMapper(this.hcConfig);
            this.setColorList(Splunk.JSCharting.ListColorPalette.DEFAULT_COLORS);
        },
        
        addRenderHooks: function() {
            $.extend(true, this.hcConfig, {
                legend: {
                    hooks: {
                        placementHook: this.legendPlacementHook.bind(this),
                        labelRenderHook: this.legendLabelRenderHook.bind(this)
                    }
                }
            });
        },

        applyFormatting: function(properties, data) {
            this.formatXAxis(properties, data);
            this.formatYAxis(properties, data);
            this.formatTooltip(properties, data);
            this.formatLegend();
        },

        addEventHandlers: function(properties) {
            this.addClickHandlers();
            this.addHoverHandlers();
            this.addLegendHandlers(properties);
            this.addRedrawHandlers();
        },

        processData: function(rawData, fieldInfo, properties) {
            this.processedData = rawData;
            if(!this.processedData || this.processedData.fieldNames.length === 0) {
                this.chartIsEmpty = true;
            }
            else {
                this.addDataToConfig();
            }
        },

        onDrawFinished: function(chart, callback) {
            if(this.hcConfig.legend.enabled) {
                this.addLegendHoverEffects(chart);
            }
            if(this.testMode) {
                this.addTestingMetadata(chart);
            }
            this.onDrawOrResize(chart);
            this.chartIsDrawing = false;
            this.hcObjectId = chart.container.id;
            if(callback) {
                callback(chart);
            }
        },

        configureEmptyChart: function() {
            $.extend(true, this.hcConfig, {
                yAxis: {
                    tickColor: this.foregroundColorSoft,
                    lineWidth: 1,
                    lineColor: this.foregroundColorSoft,
                    gridLineColor: this.foregroundColorSofter,
                    tickWidth: 1,
                    tickLength: 25,
                    showFirstLabel: false,
                    min: 0,
                    max: (this.logYAxis) ? 2 : 100,
                    tickInterval: (this.logYAxis) ? 1 : 10,
                    labels: {
                        style: {
                            color: this.fontColor
                        },
                        y: 15,
                        formatter: (this.logYAxis) ?
                            function() {
                                return Math.pow(10, this.value);
                            } :
                            function() {
                                return this.value;
                            }
                    },
                    title: {
                        text: null
                    }
                },
                xAxis: {
                    lineColor: this.foregroundColorSoft
                },
                legend: {
                    enabled: false
                },
                series: [
                    {
                        data: [],
                        visible: false,
                        showInLegend: false
                    }
                ]
            });
        },

        ////////////////////////////////////////////////////////////////////////////
        // helper methods for managing chart properties
        
        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);
            
            switch(key) {

                case 'chart.stackMode':
                    this.mapStackMode(value, properties);
                    break;
                case 'legend.placement':
                    this.mapLegendPlacement(value);
                    break;
                case 'chart.nullValueMode':
                    if(value === 'connect') {
                        this.mapper.mapValue(true, ["plotOptions", "series", "connectNulls"]);
                    }
                    // the distinction between omit and zero is handled by the
                    // extractProcessedData method
                    break;
                case 'secondaryAxis.scale':
                    if(!properties['axisY.scale']) {
                        this.logYAxis = (value === 'log');
                    }
                    break;
                case 'axisY.scale':
                    this.logYAxis = (value === 'log');
                    break;
                case "enableChartClick":
                    this.enableChartClick = value;
                    break;
                case "enableLegendClick":
                    this.enableLegendClick = value;
                    break;
                case 'legend.labelStyle.overflowMode':
                    this.legendEllipsizeMode = value;
                    break;
                case 'legend.masterLegend':
                    // at this point in the partial implementation, the fact that legend.masterLegend is set means 
                    // that it has been explicitly disabled
                    this.needsLegendMapping = false;
                    break;
                case 'legend.labels':
                    this.legendLabels = this.parseUtils.stringToArray(value) || [];
                    break;
                case 'seriesColors':
                    var hexArray = this.parseUtils.stringToHexArray(value);
                    if(hexArray) {
                        this.colorPalette = new Splunk.JSCharting.ListColorPalette(hexArray);
                        this.setColorList(hexArray);
                    }
                    break;
                case 'data.fieldListMode':
                    this.fieldListMode = value;
                    break;
                case 'data.fieldHideList':
                    this.fieldHideList = Splunk.util.stringToFieldList(value) || [];
                    break;
                case 'data.fieldShowList':
                    this.fieldShowList = Splunk.util.stringToFieldList(value) || [];
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },
        
        // override
        // this method's purpose is to post-process the properties and resolve any that are interdependent
        performPropertyCleanup: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    backgroundColor: this.backgroundColor,
                    borderColor: this.backgroundColor
                },
                legend: {
                    itemStyle: {
                        color: this.fontColor
                    },
                    itemHoverStyle: {
                        color: this.fontColor
                    }
                },
                tooltip: {
                    borderColor: this.foregroundColorSoft
                }
            });
            if(this.exportMode) {
                $.extend(true, this.hcConfig, {
                    plotOptions: {
                        series: {
                            enableMouseTracking: false,
                            shadow: false
                        }
                    }
                });
            }
        },

        mapStackMode: function(name, properties) {
            if(properties['layout.splitSeries'] == 'true') {
                name = 'default';
            }
            var translation = {
                "default": null,
                "stacked": "normal",
                "stacked100": "percent"
            };
            this.mapper.mapValue(translation[name], ["plotOptions", "series", "stacking"]);
        },

        mapLegendPlacement: function(name) {
            if(name in {left: 1, right: 1}) {
                this.mapper.mapObject({
                    legend: {
                        enabled: true,
                        verticalAlign: 'middle',
                        align: name,
                        layout: 'vertical'
                    }
                });
            }
            else if(name in {bottom: 1, top: 1}) {
                var margin = (name == 'top') ? 30 : 15;
                this.mapper.mapObject({
                    legend: {
                        enabled: true,
                        verticalAlign: name,
                        align: 'center',
                        layout: 'horizontal',
                        margin: margin
                    }
                });
            }
            else {
                this.mapper.mapObject({
                    legend: {
                        enabled: false
                    }
                });
            }
        },
        
        setExportDimensions: function() {
            this.chartWidth = 600;
            this.chartHeight = 400;
            this.mapper.mapObject({
                chart: {
                width: 600,
                height: 400
                }
            });
        },

        ////////////////////////////////////////////////////////////////////////////
        // helper methods for handling label and axis formatting

        formatXAxis: function(properties, data) {
            var axisType = data.xAxisType,
                axisProperties = this.parseUtils.getXAxisProperties(properties),
                orientation = (this.axesAreInverted) ? 'vertical' : 'horizontal',
                colorScheme = this.getAxisColorScheme();
            
            // add some extra info to the axisProperties as needed
            axisProperties.chartType = properties.chart;
            axisProperties.axisLength = $(this.renderTo).width();
            
            switch(axisType) {
                
                case 'category':
                    this.xAxis = new Splunk.JSCharting.CategoryAxis(axisProperties, data, orientation, colorScheme);
                    break;
                case 'time':
                    this.xAxis = new Splunk.JSCharting.TimeAxis(axisProperties, data, orientation, colorScheme);
                    break;
                default:
                    // assumes a numeric axis
                    this.xAxis = new Splunk.JSCharting.NumericAxis(axisProperties, data, orientation, colorScheme);
                    break;
            
            }
            this.hcConfig.xAxis = this.xAxis.getConfig();
            
            if(this.hcConfig.xAxis.title.text === null) {
                this.hcConfig.xAxis.title.text = this.processedData.xAxisKey;
            }
        },

        formatYAxis: function(properties, data) {
            var axisProperties = this.parseUtils.getYAxisProperties(properties),
                orientation = (this.axesAreInverted) ? 'horizontal' : 'vertical',
                colorScheme = this.getAxisColorScheme();
            
            // add some extra info to the axisProperties as needed
            axisProperties.chartType = properties.chart;
            axisProperties.axisLength = $(this.renderTo).height();
            
            this.yAxis = new Splunk.JSCharting.NumericAxis(axisProperties, data, orientation, colorScheme);
            this.hcConfig.yAxis = this.yAxis.getConfig();
            if(this.hcConfig.yAxis.title.text === null && this.processedData.fieldNames.length === 1) {
                this.hcConfig.yAxis.title.text = this.processedData.fieldNames[0];
            }
        },
        
        getAxisColorScheme: function() {
            return {
                foregroundColorSoft: this.foregroundColorSoft,
                foregroundColorSofter: this.foregroundColorSofter,
                fontColor: this.fontColor
            };
        },

        formatTooltip: function(properties, data) {
            var xAxisKey = this.xAxis.getKey(),
                resolveX = this.xAxis.formatTooltipValue.bind(this.xAxis),
                resolveY = this.yAxis.formatTooltipValue.bind(this.yAxis);
                
            this.mapper.mapObject({
                tooltip: {
                    formatter: function() {
                        var seriesColorRgb = Splunk.JSCharting.ColorUtils.removeAlphaFromColor(this.point.series.color);
                        return [
                          '<span style="color:#cccccc">', ((data.xAxisType == 'time') ? 'time: ' : xAxisKey + ': '), '</span>',
                          '<span style="color:#ffffff">', resolveX(this, "x"), '</span>', '<br/>',
                          '<span style="color:', seriesColorRgb, '">', this.series.name, ': </span>',
                          '<span style="color:#ffffff">', resolveY(this, "y"), '</span>'
                        ].join('');
                    }
                }
            });
        },

        formatLegend: function() {
            
        },
        
        legendPlacementHook: function(options, width, height, spacingBox) {
            if(this.hcConfig.legend.layout === 'vertical') {
                if(height >= spacingBox.height) {
                    // if the legend is taller than the chart height, clip it to the top of the chart
                    options.verticalAlign = 'top';
                    options.y = 0;
                }
                else if(this.properties['layout.splitSeries'] !== "true") {
                    // a bit of a hack here...
                    // at this point in the HighCharts rendering process we don't know the height of the x-axis 
                    // and can't factor it into the vertical alignment of the legend
                    // so we make an educated guess based on what we know about the charting configuration
                    var bottomSpacing, timeSpan;
                    if(this.processedData.xAxisType === "time" && !this.axesAreInverted) {
                        timeSpan = (this.processedData._spanSeries) ? parseInt(this.processedData._spanSeries[0], 10) : 1;
                        bottomSpacing = (timeSpan >= (24 * 60 * 60)) ? 28 : 42;
                    }
                    else {
                        bottomSpacing = 13; 
                    }
                    options.y = -bottomSpacing / 2;
                }
            }
        },
        
        legendLabelRenderHook: function(items, options, itemStyle, spacingBox, renderer) {
            var i, adjusted, fixedWidth, maxWidth,
                horizontalLayout = (options.layout === 'horizontal'),
                defaultFontSize = 12,
                minFontSize = 10,
                symbolWidth = options.symbolWidth,
                symbolPadding = options.symbolPadding,
                itemHorizSpacing = 10,
                labels = [],
                formatter = new Splunk.JSCharting.FormattingHelper(renderer),
                ellipsisModeMap = {
                    'default': 'start',
                    'ellipsisStart': 'start',
                    'ellipsisMiddle': 'middle',
                    'ellipsisEnd': 'end',
                    'ellipsisNone': 'none'
                };
            
            if(horizontalLayout) {
                maxWidth = (items.length > 5) ? Math.floor(spacingBox.width / 6) :
                                Math.floor(spacingBox.width / items.length) - (symbolWidth + symbolPadding + itemHorizSpacing);
            }
            else {
                maxWidth = Math.floor(spacingBox.width / 6);
            }
            // make a copy of the original formatting function, since we're going to clobber it
            if(!options.originalFormatter) {
                options.originalFormatter = options.labelFormatter;
            }
            // get all of the legend labels
            for(i = 0; i < items.length; i++) {
                labels.push(options.originalFormatter.call(items[i]));
            }
            
            adjusted = formatter.adjustLabels(labels, maxWidth, minFontSize, defaultFontSize, 
                    ellipsisModeMap[this.legendEllipsizeMode] || 'middle');
            
            // in case of horizontal layout with ellipsized labels, set a fixed width for nice alignment
            if(adjusted.areEllipsized && horizontalLayout && items.length > 5) {
                fixedWidth = maxWidth + symbolWidth + symbolPadding + itemHorizSpacing;
                options.itemWidth = fixedWidth;
            }
            else {
                options.itemWidth = undefined;
            }
            
            // set the new labels to the name field of each item
            for(i = 0; i < items.length; i++) {
                items[i].ellipsizedName = adjusted.labels[i];
                // if the legendItem is already set this is a resize event, so we need to explicitly reformat the item
                if(items[i].legendItem) {
                    formatter.setElementText(items[i].legendItem, adjusted.labels[i]);
                    items[i].legendItem.css({'font-size': adjusted.fontSize + 'px'});
                }
            }
            // now that the ellipsizedName field has the pre-formatted labels, update the label formatter
            options.labelFormatter = function() {
                return this.ellipsizedName;
            };
            // adjust the font size
            itemStyle['font-size'] = adjusted.fontSize + 'px';
            formatter.destroy();
        },

        ////////////////////////////////////////////////////////////////////////////
        // helper methods for attaching event handlers

        addClickHandlers: function() {
            if(this.enableChartClick) {
                var self = this;

                $.extend(true, this.hcConfig, {
                    plotOptions: {
                        series: {
                            point: {
                                events: {
                                    click: function(event) {
                                        self.onPointClick.call(self, this, event);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        },

        addHoverHandlers: function() {
            var self = this;
            $.extend(true, this.hcConfig, {
                plotOptions: {
                    series: {
                        point: {
                            events: {
                                mouseOver: function() {
                                    self.onPointMouseOver.call(self, this);
                                },
                                mouseOut: function() {
                                    self.onPointMouseOut.call(self, this);
                                }
                            }
                        }
                    }
                }
            });
        },

        onPointClick: function(point, domEvent) {
            var xAxisKey = this.processedData.xAxisKey,
                xAxisType = this.processedData.xAxisType,
                event = {
                    fields: [xAxisKey, point.series.name],
                    data: {},
                    domEvent: domEvent
                };
            
            event.data[point.series.name] = point.y;
            if(xAxisType == "time") {
                event.data._span = point._span;
                event.data[xAxisKey] = Splunk.util.getEpochTimeFromISO(point.name);
            }
            else {
                event.data[xAxisKey] = (xAxisType == 'category') ? point.name : point.x;
            }
            this.dispatchEvent('chartClicked', event);
        },

        onPointMouseOver: function(point) {
            var series = point.series;
            this.highlightThisSeries(series);
            this.highlightSeriesInLegend(series);
        },

        onPointMouseOut: function(point) {
            var series = point.series;
            this.unHighlightThisSeries(series);
            this.unHighlightSeriesInLegend(series);
        },

        addLegendHandlers: function(properties) {
            var self = this;
            if(this.enableLegendClick) {
                $.extend(true, this.hcConfig, {
                    plotOptions: {
                        series: {
                            events: {
                                legendItemClick: function(event) {
                                    return self.onLegendClick.call(self, this, event);
                                }
                            }
                        }
                    },
                    legend: {
                        itemStyle: {
                            cursor: 'pointer'
                        },
                        itemHoverStyle: {
                            cursor: 'pointer'
                        }
                    }
                });
            }
        },

        onLegendClick: function(series, domEvent) {
            var event = {
                text: series.name,
                domEvent: domEvent
            };
            this.dispatchEvent('legendClicked', event);
            return false;
        },

        addLegendHoverEffects: function(chart) {
            var self = this;
            $(chart.series).each(function(i, loopSeries) {
                $(self.getSeriesLegendElements(loopSeries)).each(function(j, element) {
                    $(element).bind('mouseover.splunk_jscharting', function() {
                        self.onLegendMouseOver(loopSeries);
                    });
                    $(element).bind('mouseout.splunk_jscharting', function() {
                        self.onLegendMouseOut(loopSeries);
                    });
                });
            });
        },
        
        removeLegendHoverEffects: function() {
            if(this.hcChart) {
                var self = this;
                $(this.hcChart.series).each(function(i, loopSeries) {
                    $(self.getSeriesLegendElements(loopSeries)).each(function(j, element) {
                        $(element).unbind('.splunk_jscharting');
                    });
                });
            }
        },

        onLegendMouseOver: function(series) {
            this.highlightThisSeries(series);
            this.highlightSeriesInLegend(series);
        },

        onLegendMouseOut: function(series) {
            this.unHighlightThisSeries(series);
            this.unHighlightSeriesInLegend(series);
        },
        
        addRedrawHandlers: function(chart) {
            var self = this;
            $.extend(true, this.hcConfig, {
                chart: {
                    events: {
                        redraw: function() {
                            self.onDrawOrResize.call(self, this);
                        }
                    }
                }
            });
        },
        
        onDrawOrResize: function(chart) {
            var formatter = new Splunk.JSCharting.FormattingHelper(chart.renderer);
            if(this.xAxis) {
                this.xAxis.onDrawOrResize(chart, formatter);
            }
            if(this.yAxis) {
                this.yAxis.onDrawOrResize(chart, formatter);
            }
            formatter.destroy();
        },

        highlightThisSeries: function(series) {
            if(!series || !series.chart) {
                return;
            }
            var chart = series.chart,
                index = series.index;
            
            $(chart.series).each(function(i, loopSeries) {
                if(i !== index) {
                    this.fadeSeries(loopSeries);
                }
            }.bind(this));
        },
        
        fadeSeries: function(series) {
            if(!series || !series.data) {
                return;
            }
            for(var i = 0; i < series.data.length; i++) {
                this.fadePoint(series.data[i], series);
            }
        },
        
        fadePoint: function(point, series) {
            if(!point) {
                return;
            }
            point.graphic.attr('fill', this.fadedElementColor);
        },

        unHighlightThisSeries: function(series) {
            if(!series || !series.chart) {
                return;
            }
            var chart = series.chart,
                index = series.index;
            
            $(chart.series).each(function(i, loopSeries) {
                if(i !== index) {
                    this.focusSeries(loopSeries);
                }
            }.bind(this));
        },
        
        focusSeries: function(series) {
            if(!series || !series.data) {
                return;
            }
            for(var i = 0; i < series.data.length; i++) {
                this.focusPoint(series.data[i], series);
            }
        },
        
        focusPoint: function(point, series) {
            if(!point) {
                return;
            }
            series = series || point.series;
            point.graphic.attr({'fill': series.color});
        },
        
        highlightSeriesInLegend: function(series) {
            if(!series || !series.chart) {
                return;
            }
            var i, loopSeries,
                chart = series.chart,
                index = series.index;
            
            for(i = 0; i < chart.series.length; i++) {
                if(i !== index) {
                    loopSeries = chart.series[i];
                    if(!loopSeries) {
                        break;
                    }
                    if(loopSeries.legendItem) {
                        loopSeries.legendItem.attr('fill-opacity', this.fadedElementOpacity);
                    }
                    if(loopSeries.legendLine) {
                        loopSeries.legendLine.attr('stroke', this.fadedElementColor);
                    }
                    if(loopSeries.legendSymbol) {
                        loopSeries.legendSymbol.attr('fill', this.fadedElementColor);
                    }
                }
            }
        },
        
        unHighlightSeriesInLegend: function(series) {
            if(!series || !series.chart) {
                return;
            }
            var i, loopSeries,
                chart = series.chart,
                index = series.index;
            
            for(i = 0; i < chart.series.length; i++) {
                if(i !== index) {
                    loopSeries = chart.series[i];
                    if(!loopSeries) {
                        break;
                    }
                    if(loopSeries.legendItem) {
                        loopSeries.legendItem.attr('fill-opacity', 1.0);
                    }
                    if(loopSeries.legendLine) {
                        loopSeries.legendLine.attr({'stroke': loopSeries.color, 'stroke-opacity': 1.0});
                    }
                    if(loopSeries.legendSymbol) {
                        loopSeries.legendSymbol.attr({'fill': loopSeries.color, 'fill-opacity': 1.0});
                    }
                }
            }
        },

        getSeriesLegendElements: function(series) {
            var elements = [];
            if(series.legendItem) {
                elements.push(series.legendItem.element);
            }
            if(series.legendSymbol) {
                elements.push(series.legendSymbol.element);
            }
            if(series.legendLine) {
                elements.push(series.legendLine.element);
            }
            return elements;
        },

        ////////////////////////////////////////////////////////////////////////////
        // helper methods for processing data
        
        addDataToConfig: function() {
            var i, seriesObject,
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series;

            for(i = 0; i < fieldNames.length; i++) {
                if(this.shouldShowSeries(fieldNames[i], this.properties)) {
                    seriesObject = this.constructSeriesObject(fieldNames[i], series[fieldNames[i]], this.properties);
                    this.hcConfig.series.push(seriesObject);
                }
            }
            // if the legend labels have been set by the user, honor them here
            if(this.legendLabels.length > 0) {
                var label, loopSeries, name,
                    newSeriesList = [],
                    
                    // helper function for finding a series by its name
                    findInSeriesList = function(name) {
                        for(var j = 0; j < this.hcConfig.series.length; j++) {
                            if(this.hcConfig.series[j].name === name) {
                                return this.hcConfig.series[j];
                            }
                        }
                        return false;
                    }.bind(this);
                
                // first loop through the legend labels, either get the series for that field if it already exists
                // or add an empty field if it doesn't
                for(i = 0; i < this.legendLabels.length; i++) {
                    label = this.legendLabels[i];
                    loopSeries = findInSeriesList(label);
                    if(loopSeries) {
                        newSeriesList.push(loopSeries);
                    }
                    else {
                        newSeriesList.push({
                            name: label,
                            data: []
                        });
                    }
                }
                
                // then loop through the series data and add back any series that weren't in the legend label list
                for(i = 0; i < this.hcConfig.series.length; i++) {
                    name = this.hcConfig.series[i].name;
                    if($.inArray(name, this.legendLabels) === -1) {
                        newSeriesList.push(this.hcConfig.series[i]);
                    }
                }
                this.hcConfig.series = newSeriesList;
            }
        },
        
        // returns false if series should not be added to the chart
        shouldShowSeries: function(name, properties) {
            // first respect the field hide list that came from the parent module
            if(properties.fieldHideList && $.inArray(name, properties.fieldHideList) > -1) {
                return false;
            }
            // next process the field visibility lists from the xml
            if(this.fieldListMode === 'show_hide') {
                if($.inArray(name, this.fieldHideList) > -1 && $.inArray(name, this.fieldShowList) < 0) {
                    return false;
                }
            }
            else { 
                // assumes 'hide_show' mode
                if($.inArray(name, this.fieldHideList) > -1) {
                    return false;
                }
            }
            return true;
        },

        constructSeriesObject: function(name, data, properties) {
            for(var i = 0; i < data.length; i++) {
                if(isNaN(data[i].rawY)) {
                    if(properties['chart.nullValueMode'] === 'zero') {
                        data[i].y = 0;
                    }
                    else {
                        // the distinction between gaps and connect is handled by
                        // the applyPropertyByName method
                        data[i].y = null;
                    }
                }
                else if(this.logYAxis) {
                    data[i].y = this.mathUtils.absLogBaseTen(data[i].rawY);
                }
                else {
                    data[i].y = data[i].rawY;
                }
            }
            return {
                name: name,
                data: data
            };
        },

        ////////////////////////////////////////////////////////////////////////////
        // methods for adding testing metadata
        //
        // no other code should rely on the classes added here!

        addTestingMetadata: function(chart) {
            var tooltipRefresh = chart.tooltip.refresh,
                decorateTooltip = (this.processedData.xAxisType === 'time') ? 
                        this.addTimeTooltipClasses.bind(this) : this.addTooltipClasses.bind(this);
            
            this.addDataClasses(chart);
            this.addAxisClasses(chart);
            if(chart.options.legend.enabled) {
                this.addLegendClasses(chart);
            }
            chart.tooltip.refresh = function(point) {
                tooltipRefresh(point);
                decorateTooltip(chart);
            }.bind(this);
        },

        addDataClasses: function(chart) {
            var seriesName, dataElements;

            $('.highcharts-series', $(this.renderTo)).each(function(i, series) {
                seriesName = chart.series[i].name;
                $(series).attr('id', seriesName + '-series');
                if(this.hasSVG) {
                    dataElements = $('rect, path', $(series));
                }
                else {
                    dataElements = $('shape', $(series));
                }
                dataElements.each(function(j, elem) {
                    this.addClassToElement(elem, 'spl-display-object');
                }.bind(this));
            }.bind(this));
        },

        addAxisClasses: function(chart) {
            var i, labelElements;

            $('.highcharts-axis', $(this.renderTo)).each(function(i, elem) {
                if(this.hasSVG) {
                    var loopBBox = elem.getBBox();
                    if(loopBBox.width > loopBBox.height) {
                        this.addClassToElement(elem, 'horizontal-axis');
                    }
                    else {
                        this.addClassToElement(elem, 'vertical-axis');
                    }
                    labelElements = $('text', $(elem));
                }
                else {
                    var firstSpan, secondSpan,
                        $spans = $('span', $(elem));
                    if($spans.length < 2) {
                        return;
                    }
                    firstSpan = $spans[0];
                    secondSpan = $spans[1];
                    if(firstSpan.style.top == secondSpan.style.top) {
                        this.addClassToElement(elem, 'horizontal-axis');
                    }
                    else {
                        this.addClassToElement(elem, 'vertical-axis');
                    }
                    labelElements = $('span', $(elem));
                }
                labelElements.each(function(j, label) {
                    this.addClassToElement(label, 'spl-text-label');
                }.bind(this));
            }.bind(this));

            for(i = 0; i < chart.xAxis.length; i++) {
                if(chart.xAxis[i].axisTitle) {
                    this.addClassToElement(chart.xAxis[i].axisTitle.element, 'x-axis-title');
                }
            }
            for(i = 0; i < chart.yAxis.length; i++) {
                if(chart.yAxis[i].axisTitle) {
                    this.addClassToElement(chart.yAxis[i].axisTitle.element, 'y-axis-title');
                }
            }
        },

        addTooltipClasses: function(chart) {
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) : 
                                                  $('span > span', $tooltip);

            for(i = 0; i < tooltipElements.length; i += 2) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        },
        
        addTimeTooltipClasses: function(chart) {
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) : 
                                              $('span > span', $tooltip);
            
            this.addClassToElement(tooltipElements[1], 'time-value');
            this.addClassToElement(tooltipElements[1], 'value');

            for(i = 2; i < tooltipElements.length; i += 2) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        },

        addLegendClasses: function(chart) {
            var loopSeriesName;
            $(chart.series).each(function(i, series) {
                loopSeriesName = (this.hasSVG) ? series.legendItem.textStr : 
                                                 $(series.legendItem.element).html();
                if(series.legendSymbol) {
                    this.addClassToElement(series.legendSymbol.element, 'symbol');
                    this.addClassToElement(series.legendSymbol.element, loopSeriesName + '-symbol');
                }
                if(series.legendLine) {
                    this.addClassToElement(series.legendLine.element, 'symbol');
                    this.addClassToElement(series.legendLine.element, loopSeriesName + '-symbol');
                }
                if(series.legendItem) {
                    this.addClassToElement(series.legendItem.element, 'legend-label');
                }
            }.bind(this));
        }

    });

    Splunk.JSCharting.DEFAULT_HC_CONFIG = {
        chart: {
            animation: false,
            showAxes: true,
            reflow: true
        },
        plotOptions: {
            series: {
                animation: false,
                stickyTracking: false,
                events: {
                    legendItemClick: function() {
                        return false;
                    }
                },
                borderWidth: 0
            }
        },
        series: [],
        title: {
            text: null
        },
        legend: {
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0,
            layout: 'vertical',
            enabled: true,
            itemStyle: {
                cursor: 'auto'
            },
            itemHoverStyle: {
                cursor: 'auto'
            }
        },
        tooltip: {
            backgroundColor: '#000000'
        },
        credits: {
            enabled: false
        }
    };


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.SeriesBasedChart
    //
    // super-class for line and area charts


    Splunk.JSCharting.SeriesBasedChart = $.klass(Splunk.JSCharting.AbstractChart, {
        
        // override
        generateDefaultConfig: function($super) {
            $super();
            this.mapper.mapValue(true, ['plotOptions', 'series', 'stickyTracking']);
        },

        // override
        highlightThisSeries: function($super, series) {
            $super(series);
            if(series && series.group) {
                series.group.toFront();
            }
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.PointBasedChart
    //
    // super-class for column, bar, scatter and pie charts


    Splunk.JSCharting.PointBasedChart = $.klass(Splunk.JSCharting.AbstractChart, {
        
        fadedElementBorderColor: 'rgba(200, 200, 200, 0.3)',

        // override
        // point-based charts need to defensively ignore null-value mode, 
        // since 'connect' will lead to unexpected results
        applyPropertyByName: function($super, key, value, properties) {
            var keysToIgnore = {
                'chart.nullValueMode': true
            };
            
            if(key in keysToIgnore) {
                return;
            }
            $super(key, value, properties);
        },
        
        // override
        generateDefaultConfig: function($super) {
            $super();
            this.mapper.mapValue(false, ['plotOptions', 'series', 'enableMouseTracking']);
        },
        
        // override
        addEventHandlers: function($super, properties) {
            $super(properties);
            var self = this;
            $.extend(true, this.hcConfig, {
                chart: {
                    events: {
                        load: function() {
                            var chart = this,
                                tooltipSelector = ".highcharts-tooltip *",
                                hoveredPoint = null,
                                tooltipHide = chart.tooltip.hide,
                                // re-usable function to extract the corresponding point from an event
                                extractPoint = function(event) {
                                    var $target = $(event.target);
                                    if(!$target.is(self.pointCssSelector)) {
                                        return false;
                                    }
                                    return (chart.series[$target.attr('data-series')].data[$target.attr('data-point')]);
                                };
                                
                            // with the VML renderer, have to explicitly destroy the tracker so it doesn't block mouse events
                            if(!self.hasSVG && chart.tracker) {
                                chart.tracker.destroy();
                            }
                            // create a closure around the tooltip hide method so that we can make sure we always hide the selected series when it is called
                            // this is a work-around for the situation when the mouse moves out of the chart container element without triggering a mouse event
                            chart.tooltip.hide = function(silent) {
                                tooltipHide();
                                if(!silent && hoveredPoint) {
                                    hoveredPoint.firePointEvent('mouseOut');
                                    hoveredPoint = null;
                                }
                            };
                                
                            // decorate each point element with the info we need to map it to its corresponding data object
                            $(chart.series).each(function(i, series) {
                                $(series.data).each(function(j, point) {
                                    if(point.graphic && point.graphic.element) {
                                        $(point.graphic.element).attr('data-series', i);
                                        $(point.graphic.element).attr('data-point', j);
                                    }
                                });
                            });
                            // we are not using mouse trackers, so attach event handlers to the chart's container element
                            $(chart.container).bind('click.splunk_jscharting', function(event) { 
                                var point = extractPoint(event);
                                if(point) {
                                    point.firePointEvent('click', event);
                                }
                            });
                            // handle all mouseover events in the container here
                            // if they are over the tooltip, ignore them (this avoids the dreaded tooltip flicker)
                            // otherwise hide any point that is currently in a 'hover' state and 'hover' the target point as needed
                            $(chart.container).bind('mouseover.splunk_jscharting', function(event) {
                                if($(event.target).is(tooltipSelector)) {
                                    return;
                                }
                                var point = extractPoint(event);
                                if(hoveredPoint && !(point && hoveredPoint === point)) {
                                    hoveredPoint.firePointEvent('mouseOut');
                                    chart.tooltip.hide(true);
                                    hoveredPoint = null;
                                }
                                if(point) {
                                    point.firePointEvent('mouseOver');
                                    chart.tooltip.refresh(point);
                                    hoveredPoint = point;
                                }
                            });
                        }
                    }
                }
            });
        },
        
        // override
        destroy: function($super) {
            if(this.hcChart) {
                $(this.hcChart.container).unbind('splunk_jscharting');
            }
            $super();
        },

        // override
        onPointMouseOver: function($super, point) {
            $super(point);
            this.highlightPoint(point);
        },

        // override
        onPointMouseOut: function($super, point) {
            $super(point);
            this.unHighlightPoint(point);
        },

        highlightPoint: function(point) {
            if(!point || !point.series) {
                return;
            }
            var i, loopPoint,
                series = point.series;
            
            for(i = 0; i < series.data.length; i++) {
                loopPoint = series.data[i];
                if(loopPoint !== point && loopPoint.graphic) {
                    this.fadePoint(loopPoint, series);
                }
            }
        },

        unHighlightPoint: function(point) {
            if(!point || !point.series) {
                return;
            }
            var series = point.series;
            
            for(i = 0; i < series.data.length; i++) {
                loopPoint = series.data[i];
                if(loopPoint !== point && loopPoint.graphic) {
                    this.focusPoint(loopPoint, series);
                }
            }
        },
        
        // doing full overrides here to avoid a double-repaint, even though there is some duplicate code
        // override
        fadePoint: function(point, series) {
            if(!point || !point.graphic) {
                return;
            }
            point.graphic.attr({'fill': this.fadedElementColor, 'stroke-width': 1, 'stroke': this.fadedElementBorderColor});
        },
        
        // override
        focusPoint: function(point, series) {
            if(!point || !point.graphic) {
                return;
            }
            series = series || point.series;
            
            point.graphic.attr({
                'fill': series.color,
                'stroke-width': 0,
                'stroke': series.color
            });
        },
        
        fadeAllPoints: function() {
            if(!this.hcChart) {
                return;
            }
            for(var i = 0; i < this.hcChart.series.length; i++) {
                this.fadeSeries(this.hcChart.series[i]);
            }
        },
        
        unFadeAllPoints: function() {
            if(!this.hcChart) {
                return;
            }
            for(var i = 0; i < this.hcChart.series.length; i++) {
                this.focusSeries(this.hcChart.series[i]);
            }
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.LineChart


    Splunk.JSCharting.LineChart = $.klass(Splunk.JSCharting.SeriesBasedChart, {
        
        typeName: 'line-chart',
        fadedElementColor: 'rgba(200, 200, 200, 1.0)',
        fadedLineColor: 'rgba(150, 150, 150, 0.3)',
        
        // override
        initialize: function($super, container) {
            $super(container);
            this.markerRadius = 8;
            this.showMarkers = false;
        },

        // override
        generateDefaultConfig: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'line'
                }
            });
            this.hcConfig.plotOptions.line.marker.states.hover.radius = this.markerRadius;
        },
        
        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);
            
            switch(key) {

                case 'chart.showMarkers':
                    this.showMarkers = (value === 'true');
                    this.mapper.mapValue((value === 'true' ? this.markerRadius : 0), ["plotOptions", "line", "marker", "radius"]);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            
            }
        },
        
        fadeSeries: function($super, series) {
            if(!series || !series.graph) {
                return;
            }
            series.graph.attr({'stroke': this.fadedLineColor});
            if(this.showMarkers) {
                $super(series);
            }
        },
        
        focusSeries: function($super, series) {
            if(!series || !series.graph) {
                return;
            }
            series.graph.attr({'stroke': series.color, 'stroke-opacity': this.focusedElementOpacity});
            if(this.showMarkers) {
                $super(series);
            }
        }

    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            line: {
                marker: {
                    states: {
                        hover: {
                            enabled: true,
                            symbol: 'square'
                        }
                    },
                    radius: 0,
                    symbol: 'square'
                },
                shadow: false
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AreaChart


    Splunk.JSCharting.AreaChart = $.klass(Splunk.JSCharting.SeriesBasedChart, {
        
        typeName: 'area-chart',
        focusedElementOpacity: 0.75,

        // override
        generateDefaultConfig: function($super) {
            $super();
            this.showLines = true;
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'area'
                },
                plotOptions: {
                    area: {
                        fillOpacity: this.focusedElementOpacity
                    }
                }   
            });
        },
        
        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);
            switch(key) {
                
                case 'chart.showLines':
                    this.showLines = (value === 'false');
                    this.mapper.mapValue((value === 'false') ? 0 : 1, ["plotOptions", "area", "lineWidth"]);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            
            }
        },
        
        // override
        fadeSeries: function(series) {
            if(!series || !series.area) {
                return;
            }
            series.area.attr({'fill': this.fadedElementColor});
            if(this.showLines) {
                series.graph.attr({'stroke': this.fadedElementColor});
            }
        },
        
        // override
        focusSeries: function(series) {
            if(!series || !series.area) {
                return;
            }
            series.area.attr({'fill': series.color, 'fill-opacity': this.focusedElementOpacity});
            if(this.showLines) {
                series.graph.attr({'stroke': series.color, 'stroke-opacity': this.focusedElementOpacity});
            }
        }

    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            area: {
                marker: {
                    symbol: 'square',
                    radius: 0,
                    states: {
                        hover: {
                            enabled: true,
                            symbol: 'square',
                            radius: 8
                        }
                    }
                },
                lineWidth: 1,
                shadow: false
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.ColumnChart


    Splunk.JSCharting.ColumnChart = $.klass(Splunk.JSCharting.PointBasedChart, {
        
        typeName: 'column-chart',
        pointCssSelector: (Splunk.JSCharting.hasSVG) ? '.highcharts-series rect' : '.highcharts-series shape',

        // override
        generateDefaultConfig: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'column'
                }
            });
        },
        
        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);
            
            switch(key) {
            
                case 'chart.columnSpacing':
                    this.mapColumnSpacing(value);
                    break;
                case 'chart.seriesSpacing':
                    this.mapSeriesSpacing(value);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },
        
        mapColumnSpacing: function(valueStr) {
            var value = parseFloat(valueStr, 10);
            if(!isNaN(value)) {
                this.mapper.mapValue((value < 3) ? 0.05 + ((value - 1) / 5) : 0.05 + ((value - 1) / 15), ["plotOptions", "column", "groupPadding"]);
            }
        },
        
        mapSeriesSpacing: function(valueStr) {
            var value = parseFloat(valueStr, 10);
            if(!isNaN(value)) {
                this.mapper.mapValue(0.2 * Math.pow(value, 0.25), ["plotOptions", "column", "pointPadding"]);
            }
        }
        
    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            column: {
                pointPadding: 0,
                groupPadding: 0.05,
                shadow: false
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.BarChart


    Splunk.JSCharting.BarChart = $.klass(Splunk.JSCharting.PointBasedChart, {

        axesAreInverted: true,
        typeName: 'bar-chart',
        pointCssSelector: (Splunk.JSCharting.hasSVG) ? '.highcharts-series rect' : '.highcharts-series shape',
        
        // override
        generateDefaultConfig: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'bar'
                }
            });
        },
        
        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);
            
            switch(key) {
            
                case 'chart.barSpacing':
                    this.mapBarSpacing(value);
                    break;
                case 'chart.seriesSpacing':
                    this.mapSeriesSpacing(value);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },
        
        mapBarSpacing: function(valueStr) {
            var value = parseFloat(valueStr, 10);
            if(!isNaN(value)) {
                this.mapper.mapValue(0.05 + ((value - 1) / 20), ["plotOptions", "bar", "groupPadding"]);
            }
        },
        
        mapSeriesSpacing: function(valueStr) {
            var value = parseFloat(valueStr, 10);
            if(!isNaN(value)) {
                this.mapper.mapValue(0.2 * Math.pow(value, 0.25), ["plotOptions", "bar", "pointPadding"]);
            }
        },

        // override
        configureEmptyChart: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                yAxis: {
                    labels: {
                        align: 'right',
                        x: -5
                    }
                }
            });
        }

    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            bar: {
                pointPadding: 0,
                groupPadding: 0.05,
                shadow: false
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.ScatterChart


    Splunk.JSCharting.ScatterChart = $.klass(Splunk.JSCharting.PointBasedChart, {
        
        typeName: 'scatter-chart',
        pointCssSelector: (Splunk.JSCharting.hasSVG) ? '.highcharts-series path' : '.highcharts-series shape',
        
        initialize: function($super, container) {
            $super(container);
            this.mode = 'multiSeries';
            this.legendFieldNames = [];
            this.logXAxis = false;
        },
        
        // override
        getFieldList: function() {
            return this.legendFieldNames;
        },

        // override
        generateDefaultConfig: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'scatter'
                }
            });
        },
        
        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);
            switch(key) {
                
                case 'chart.markerSize':
                    this.mapMarkerSize(value);
                    break;
                case 'primaryAxis.scale':
                    if(!properties['axisX.scale']) {
                        this.logXAxis = (value === 'log');
                    }
                    break;
                case 'axisX.scale':
                    this.logXAxis = (value === 'log');
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },
        
        mapMarkerSize: function(valueStr) {
            var value = parseInt(valueStr, 10);
            if(!isNaN(value)) {
                this.mapper.mapValue(Math.ceil(value * 7 / 4), ["plotOptions", "scatter", "marker", "radius"]);
            }
        },
        
        setMode: function(mode) {
            this.mode = mode;
            if(mode === 'singleSeries') {
                $.extend(true, this.hcConfig, {
                    legend: {
                        enabled: false
                    }
                });
            }
        },
        
        // override
        // force the x axis to be numeric
        formatXAxis: function(properties, data) {
            var axisProperties = this.parseUtils.getXAxisProperties(properties),
                orientation = (this.axesAreInverted) ? 'vertical' : 'horizontal',
                colorScheme = this.getAxisColorScheme();
            
            // add some extra info to the axisProperties as needed
            axisProperties.chartType = properties.chart;
            axisProperties.axisLength = $(this.renderTo).width();
            
            this.xAxis = new Splunk.JSCharting.NumericAxis(axisProperties, data, orientation, colorScheme);
            this.hcConfig.xAxis = $.extend(true, this.xAxis.getConfig(), {
                startOnTick: true,
                endOnTick: true,
                minPadding: 0,
                maxPadding: 0
            });
        },
        
        // override
        // remove the min/max padding from the y-axis
        formatYAxis: function($super, properties, data) {
            $super(properties, data);
            $.extend(true, this.hcConfig.yAxis, {
                minPadding: 0,
                maxPadding: 0
            });
        },

        // override
        formatTooltip: function(properties, data) {
            var xAxisKey = this.xAxis.getKey(),
                useTimeNames = (data.xAxisType === 'time'),
                xFieldName = data.fieldNames[0],
                yFieldName = data.fieldNames[1],
                resolveX = this.xAxis.formatTooltipValue.bind(this.xAxis),
                resolveY = this.yAxis.formatTooltipValue.bind(this.yAxis),
                resolveName = this.getTooltipName.bind(this);

            if(this.mode === 'multiSeries') {
                $.extend(true, this.hcConfig, {
                    tooltip: {
                        formatter: function() {
                            var seriesColorRgb = Splunk.JSCharting.ColorUtils.removeAlphaFromColor(this.series.color);
                            return [
                               '<span style="color:#cccccc">', (useTimeNames ? 'time: ' : xAxisKey + ': '), '</span>',
                               '<span style="color:', seriesColorRgb, '">', resolveName(this, useTimeNames), '</span> <br/>',
                               '<span style="color:#cccccc">', xFieldName, ': </span>',
                               '<span style="color:#ffffff">', resolveX(this, "x"), '</span> <br/>',
                               '<span style="color:#cccccc">', yFieldName, ': </span>',
                               '<span style="color:#ffffff">', resolveY(this, "y"), '</span>'
                            ].join('');
                        }
                    }
                });
            }
            else {
                $.extend(true, this.hcConfig, {
                    tooltip: {
                        formatter: function() {
                            return [
                               '<span style="color:#cccccc">', xAxisKey, ': </span>',
                               '<span style="color:#ffffff">', resolveX(this, "x"), '</span> <br/>',
                               '<span style="color:#cccccc">', xFieldName, ': </span>',
                               '<span style="color:#ffffff">', resolveY(this, "y"), '</span>'
                            ].join('');
                        }
                    }
                });
            }
        },

        getTooltipName: function(element, useTimeNames) {
            if(useTimeNames) {
                var isoString = element.series.name,
                    span = element.point._span || 1;
                return Splunk.JSCharting.TimeUtils.formatIsoStringAsTooltip(isoString, span);
            }
            return element.series.name;
        },

        // override
        formatLegend: function() {
            var xAxisKey = this.xAxis.getKey(),
                useTimeNames = (this.processedData.xAxisType === 'time'),
                resolveLabel = this.getLegendName.bind(this);
            $.extend(true, this.hcConfig, {
                legend: {
                    labelFormatter: function() {
                        return resolveLabel(this, useTimeNames);
                    }
                }
            });
        },

        getLegendName: function(element, useTimeNames) {
            if(useTimeNames) {
                var isoString = element.name,
                    span = this.processedData._spanSeries[0] || 1;
                return Splunk.JSCharting.TimeUtils.formatIsoStringAsTooltip(isoString, span);
            }
            return element.name;
        },
        
        // override
        onPointClick: function(point, domEvent) {
            var xAxisKey = this.processedData.xAxisKey,
                xAxisType = this.processedData.xAxisType,
                xFieldName = (this.mode === 'multiSeries') ? this.processedData.fieldNames[0] : xAxisKey,
                yFieldName = (this.mode === 'multiSeries') ? this.processedData.fieldNames[1] : this.processedData.fieldNames[0],
                event = {
                    fields: (this.mode === 'multiSeries') ? [xAxisKey, xFieldName, yFieldName] : [xFieldName, yFieldName],
                    data: {},
                    domEvent: domEvent
                };
            
            event.data[xAxisKey] = (xAxisType == 'time') ? Splunk.util.getEpochTimeFromISO(point.series.name) : point.series.name;
            event.data[yFieldName] = point.rawY;
            if(xAxisType == "time") {
                event.data._span = point._span;
            }
            event.data[xFieldName] = point.rawX;
            this.dispatchEvent('chartClicked', event);
        },

        // override
        addDataToConfig: function() {
            var fieldNames = this.processedData.fieldNames;

            if(fieldNames.length < 1 || (fieldNames.length === 1 && this.processedData.xAxisType === 'time')) {
                this.chartIsEmpty = true;
                return;
            }
            this.hcConfig.series = [];
            this.legendFieldNames = [];

            if(fieldNames.length === 1) {
                this.setMode('singleSeries');
                this.addSingleSeriesData();
            }
            else {
                this.setMode('multiSeries');
                this.addMultiSeriesData(); 
            }
        },
        
        addMultiSeriesData: function() {
            var i, fieldName, loopYVal, loopXVal, loopName, loopDataPoint,
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series,
                collapsedSeries = {},
                fieldsAdded = {};
            
            for(i = 0; i < series[fieldNames[0]].length; i++) {
                loopXVal = series[fieldNames[0]][i].rawY;
                loopYVal = series[fieldNames[1]][i].rawY;
                if(this.logYAxis) {
                    loopYVal = this.mathUtils.absLogBaseTen(loopYVal);
                }
                if(this.logXAxis) {
                    loopXVal = this.mathUtils.absLogBaseTen(loopXVal);
                }
                loopName = series[fieldNames[0]][i].name;
                loopDataPoint = {
                    x: loopXVal,
                    y: loopYVal,
                    rawY: series[fieldNames[1]][i].rawY,
                    rawX: series[fieldNames[0]][i].rawY
                };
                if(this.processedData.xAxisType == 'time') {
                    loopDataPoint._span = series[fieldNames[0]][i]._span;
                }
                if(collapsedSeries[loopName]) {
                    collapsedSeries[loopName].push(loopDataPoint);
                }
                else {
                    collapsedSeries[loopName] = [loopDataPoint];
                }
            }
            for(i = 0; i < series[fieldNames[0]].length; i++) {
                fieldName = series[fieldNames[0]][i].name;
                if(fieldName && !fieldsAdded[fieldName]) {
                    this.hcConfig.series.push({
                        name: fieldName,
                        data: collapsedSeries[fieldName]
                    });
                    this.legendFieldNames.push(fieldName);
                    fieldsAdded[fieldName] = true;
                }
            }
        },
        
        addSingleSeriesData: function() {
            var i, xValue, loopDataPoint,
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series,
                xSeries = this.processedData.xSeries;
            
            this.hcConfig.series.push({
                name: 'undefined',
                data: []
            });
            
            for(i = 0; i < xSeries.length; i++) {
                xValue = this.mathUtils.parseFloat(xSeries[i], 10);
                if(!isNaN(xValue)) {
                    loopDataPoint = {
                        rawX: xValue,
                        rawY: series[fieldNames[0]][i].rawY
                    };
                    if(this.logYAxis) {
                        loopDataPoint.y = this.mathUtils.absLogBaseTen(loopDataPoint.rawY);
                    }
                    else {
                        loopDataPoint.y = loopDataPoint.rawY;
                    }
                    if(this.logXAxis) {
                        loopDataPoint.x = this.mathUtils.absLogBaseTen(loopDataPoint.rawX);
                    }
                    else {
                        loopDataPoint.x = loopDataPoint.rawX;
                    }
                    this.hcConfig.series[0].data.push(loopDataPoint);
                }
            }
            // generate a unique field name
            this.legendFieldNames.push(this.hcObjectId + '_scatter');
        },

        addLegendClasses: function() {
            // empty placeholder to avoid errors caused by superclass method
        },

        // we have to override here because the tooltip structure is different
        addTooltipClasses: function($super) {
            if(!this.hasSVG) {
                $super();
                return;
            }
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) : 
                                                  $('span > span', $tooltip);
        
            for(i = 0; i < tooltipElements.length; i += 3) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        },
        
        // see above
        addTimeTooltipClasses: function($super) {
            if(!this.hasSVG) {
                $super();
                return;
            }
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) : 
                                              $('span > span', $tooltip);
            
            this.addClassToElement(tooltipElements[1], 'time-value');
            this.addClassToElement(tooltipElements[1], 'value');
        
            for(i = 3; i < tooltipElements.length; i += 3) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        }

    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            scatter: {
                marker: {
                    radius: 7,
                    symbol: 'square'
                }
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.PieChart


    Splunk.JSCharting.PieChart = $.klass(Splunk.JSCharting.PointBasedChart, {
        
        typeName: 'pie-chart',
        pointCssSelector: (Splunk.JSCharting.hasSVG) ? '.highcharts-point path' : '.highcharts-point shape',
        
        // override
        initialize: function($super, container) {
            $super(container);
            this.collapseFieldName = 'other';
            this.collapsePercent = 0.01;
            this.showPercent = false;
            this.useTotalCount = false;
            this.legendFieldNames = [];
        },
        
        // override
        getFieldList: function() {
            return this.legendFieldNames;
        },

        // override
        generateDefaultConfig: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                chart: {
                    type: 'pie'
                },
                xAxis: {
                    lineWidth: 0
                },
                yAxis: {
                    lineWidth: 0,
                    title: {
                        text: null
                    }
                },
                plotOptions: {
                    pie: {
                        dataLabels: {
                            hooks: {
                                xPositionHook: this.labelXPositionHook.bind(this),
                                connectorPositionHook: this.connectorPositionHook.bind(this)
                            }
                        },
                        hooks: {
                            plotRenderHook: this.plotRenderHook.bind(this),
                            beforeLabelRender: this.beforeLabelRenderHoook.bind(this)
                        }
                    }
                }
            });
        },
        
        destroy: function($super) {
            if(this.hcChart) {
                this.removeLabelHoverEffects();
            }
            $super();
        },
        
        applyPropertyByName: function($super, key, value, properties) {
            var keysToIgnore = {
                'secondaryAxis.scale': true,
                'axisY.scale': true,
                'primaryAxisTitle.text': true,
                'axisTitleX.text': true
            };
            
            if(key in keysToIgnore) {
                return;
            }
            $super(key, value, properties);
            switch(key) {
                
                case 'chart.sliceCollapsingThreshold':
                    this.mapSliceCollapsingThreshold(value);
                    break;
                case 'chart.sliceCollapsingLabel':
                    this.collapseFieldName = value;
                    break;
                case 'chart.showLabels':
                    this.mapper.mapValue((value === 'true'), ["plotOptions", "pie", "dataLabels", "enabled"]);
                    break;
                case 'chart.showPercent':
                    this.showPercent = (value === 'true');
                    break;
                case 'secondaryAxisTitle.text':
                    // secondaryAxisTitle.text is trumped by axisTitleY.text
                    if(!properties['axisTitleY.text']) {
                        this.mapper.mapValue(((value || value === '') ? value : null), ["yAxis", "title", "text"]);
                    }
                    break;
                case 'axisTitleY.text':
                    this.mapper.mapValue(((value || value === '') ? value : null), ["yAxis", "title", "text"]);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },
        
        performPropertyCleanup: function($super) {
            $super();
            $.extend(true, this.hcConfig, {
                yAxis: {
                    title: {
                        style: {
                            color: this.fontColor
                        }
                    }
                },
                plotOptions: {
                    pie: {
                        dataLabels: {
                            color: this.fontColor,
                            connectorColor: this.foregroundColorSoft
                        }
                    }
                }
            });
        },
        
        // override
        // doing a full override here to avoid double-repaint
        focusPoint: function(point, series) {
            point.graphic.attr({
                'fill': point.color,
                'stroke-width': 0,
                'stroke': point.color
            });
        },
        
        mapSliceCollapsingThreshold: function(valueStr) {
            var value = parseFloat(valueStr, 10);
            if(!isNaN(value)) {
                value = (value > 1) ? 1 : value;
                this.collapsePercent = value;
            }
        },

        // override
        // not calling super class method, pie charts don't have axes or legend
        applyFormatting: function(properties, data) {
            var useTimeNames = (this.processedData.xAxisType === 'time'),
                resolveLabel = this.getLabel.bind(this);
            this.formatTooltip(properties, data);
            $.extend(true, this.hcConfig, {
                plotOptions: {
                    pie: {
                        dataLabels: {
                            formatter: function() {
                                return resolveLabel(this, useTimeNames);
                            }
                        }
                    }
                }
            });
        },
        
        // override
        onDrawFinished: function($super, chart, callback) {
            if(this.hcConfig.plotOptions.pie.dataLabels.enabled !== false) {
                this.addLabelHoverEffects(chart);
            }
            $super(chart, callback);
        },
        
        addLabelHoverEffects: function(chart) {
            var labelElement,
                self = this;
            $(chart.series[0].data).each(function(i, slice) {
                labelElement = slice.dataLabel.element;
                $(labelElement).bind('mouseover.splunk_jscharting', function() {
                    self.onLabelMouseOver(slice);
                });
                $(labelElement).bind('mouseout.splunk_jscharting', function() {
                    self.onLabelMouseOut(slice);
                });
            });
        },
        
        removeLabelHoverEffects: function() {
            if(this.hcChart) {
                var self = this;
                $(this.hcChart.series[0].data).each(function(i, slice) {
                    labelElement = slice.dataLabel.element;
                    $(labelElement).unbind('.splunk_jscharting');
                });
            }
        },
        
        onPointMouseOver: function($super, point) {
            $super(point);
            this.highlightLabel(point);
        },
        
        onPointMouseOut: function($super, point) {
            $super(point);
            this.unHighlightLabel(point);
        },
        
        onLabelMouseOver: function(slice) {
            this.highlightPoint(slice);
            this.highlightLabel(slice);
        },
        
        onLabelMouseOut: function(slice) {
            this.unHighlightPoint(slice);
            this.unHighlightLabel(slice);
        },
        
        highlightLabel: function(point) {
            if(!point || !point.series) {
                return;
            }
            var i, loopPoint,
                series = point.series;
            for(i = 0; i < series.data.length; i++) {
                loopPoint = series.data[i];
                if(!loopPoint.dataLabel) {
                    break;
                }
                if(loopPoint !== point) {
                    loopPoint.dataLabel.attr('fill-opacity', this.fadedElementOpacity);
                }
            }
        },
        
        unHighlightLabel: function(point) {
            if(!point || !point.series) {
                return;
            }
            var i, loopPoint,
                series = point.series;
            for(i = 0; i < series.data.length; i++) {
                loopPoint = series.data[i];
                if(!loopPoint.dataLabel) {
                    break;
                }
                if(loopPoint !== point) {
                    loopPoint.dataLabel.attr('fill-opacity', 1.0);
                }
            }
        },
        
        plotRenderHook: function(series) {
            var chart = series.chart;
            series.options.size = Math.min(chart.plotHeight * 0.75, chart.plotWidth / 3);
        },
        
        labelXPositionHook: function(series, options, radius, isRightSide) {
            
            var chart = series.chart,
                distance = options.distance;
            return (chart.plotLeft + series.center[0] + (isRightSide ? (radius + distance / 2) : (-radius - distance)));
        },
        
        connectorPositionHook: function(path) {
            // the default path consists of three points that create a two-segment line
            // we are going to move the middle point so the outer segment is horizontal
            // first extract the actual points from the SVG-style path declaration
            var firstPoint = {
                    x: path[1],
                    y: path[2]
                },
                secondPoint = {
                    x: path[4],
                    y: path[5]
                },
                thirdPoint = {
                    x: path[7],
                    y: path[8]
                };
            // find the slope of the second line segment, use it to calculate the new middle point
            var secondSegmentSlope = (thirdPoint.y - secondPoint.y) / (thirdPoint.x - secondPoint.x),
                newSecondPoint = {
                    x: thirdPoint.x + (firstPoint.y - thirdPoint.y) / secondSegmentSlope,
                    y: firstPoint.y
                };
            
            // define the update path and swap it into the original array
            // if the resulting path would back-track on the x-axis (or is a horizontal line), 
            // just draw a line directly from the first point to the last
            var wouldBacktrack = isNaN(newSecondPoint.x) || (firstPoint.x >= newSecondPoint.x && newSecondPoint.x <= thirdPoint.x)
                                    || (firstPoint.x <= newSecondPoint.x && newSecondPoint.x >= thirdPoint.x),
                newPath = (wouldBacktrack) ?
                    [
                        "M", firstPoint.x, firstPoint.y,
                        "L", thirdPoint.x, thirdPoint.y
                    ] :
                    [
                        "M", firstPoint.x, firstPoint.y,
                        "L", newSecondPoint.x, newSecondPoint.y,
                        "L", thirdPoint.x, thirdPoint.y
                    ];
            path.length = 0;
            Array.prototype.push.apply(path, newPath);
        },
        
        beforeLabelRenderHoook: function(series) {
            var i, adjusted,
                options = series.options,
                labelDistance = options.dataLabels.distance,
                size = options.size, // assumes size in pixels TODO: handle percents
                chart = series.chart,
                renderer = chart.renderer,
                formatter = new Splunk.JSCharting.FormattingHelper(renderer),
                
                defaultFontSize = 11,
                minFontSize = 9,
                maxWidth = (chart.plotWidth - (size + 2 * labelDistance)) / 2,
                labels = [];
            
            for(i = 0; i < series.data.length; i++) {
                labels.push(series.data[i].rawName);
            }
            adjusted = formatter.adjustLabels(labels, maxWidth, minFontSize, defaultFontSize, 'middle');
            
            for(i = 0; i < series.data.length; i++) {
                series.data[i].name = adjusted.labels[i];
                // check for a redraw, update the font size in place
                if(series.data[i].dataLabel && series.data[i].dataLabel.css) {
                    series.data[i].dataLabel.css({'font-size': adjusted.fontSize + 'px'});
                }
            }
            $.extend(true, options.dataLabels, {
                style: {
                    'font-size': adjusted.fontSize + 'px'
                },
                y: adjusted.fontSize / 4
            });
            formatter.destroy();
        },

        getLabel: function(element, useTimeNames) {
            if(useTimeNames) {
                var isoString = element.point.name,
                    span = element.point._span || 1,
                    formattedTime = Splunk.JSCharting.TimeUtils.formatIsoStringAsTooltip(isoString, span);
                
                return formattedTime || element.point.name;
            }
            return element.point.name;
        },

        // override
        formatTooltip: function(properties, data) {
            var xAxisKey = data.xAxisKey,
                useTimeNames = (data.xAxisType === 'time'),
                resolveName = this.getTooltipName.bind(this),
                useTotalCount = this.useTotalCount;

            $.extend(true, this.hcConfig, {
                tooltip: {
                    formatter: function() {
                        var seriesColorRgb = Splunk.JSCharting.ColorUtils.removeAlphaFromColor(this.point.color);
                        return [
                            '<span style="color:#cccccc">', (useTimeNames ? 'time: ' : xAxisKey + ': '), '</span>',
                            '<span style="color:', seriesColorRgb, '">', resolveName(this, useTimeNames), '</span> <br/>',
                            '<span style="color:#cccccc">', this.series.name, ': </span>',
                            '<span style="color:#ffffff">', this.y, '</span> <br/>',
                            '<span style="color:#cccccc">', ((useTotalCount) ? 'percent' : this.series.name + '%'), ': </span>',
                            '<span style="color:#ffffff">', format_percent(this.percentage / 100), '</span>'
                        ].join('');
                    }
                }
            });
        },

        //override
        getTooltipName: function(element, useTimeNames) {
            if(useTimeNames) {
                var isoString = element.point.name,
                    span = element.point._span || 1;
                    formattedTime = Splunk.JSCharting.TimeUtils.formatIsoStringAsTooltip(isoString, span);
                
                return formattedTime || element.point.name;
            }
            return element.point.rawName;    
        },
        
        // override
        processData: function($super, rawData, fieldInfo, properties) {
            // at the moment disabling "total count" mode, need a more sophisticated way to handle it
            if(false && rawData.series['_tc'] && rawData.series['_tc'].length > 0) {
                this.useTotalCount = true;
                this.totalCount = parseInt(rawData.series['_tc'][0].rawY, 10);
            }
            else { 
                this.useTotalCount = false;
            }
            $super(rawData, fieldInfo, properties);
        },

        // override
        addDataToConfig: function() {
            this.legendFieldNames = [];
            // total-count mode is currently disabled
            if(false && this.useTotalCount) {
                this.addDataWithTotalCount();
            }
            else {
                this.addDataWithCollapsing();
            }
        },
        
        addDataWithCollapsing: function() {
            var i, loopObject, loopPercent, labelWidth,
                totalY = 0,
                numCollapsed = 0,
                collapsedY = 0,
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series,
                firstSeries = series[fieldNames[0]],
                prunedData = [];

            for(i = 0; i < firstSeries.length; i++) {
                totalY += firstSeries[i].rawY;
            }
            for(i = 0; i < firstSeries.length; i++) {
                loopObject = firstSeries[i];
                loopObject.y = loopObject.rawY;
                if(loopObject.y > 0) {
                    loopPercent = loopObject.y / totalY;
                    if(loopPercent < this.collapsePercent) {
                        collapsedY += loopObject.y;
                        numCollapsed++;
                    }
                    else {
                        // push the field name to the legend name list before we possibly decorate it
                        this.legendFieldNames.push(loopObject.name);
                        if(this.showPercent) {
                            loopObject.name += ', ' + format_percent(loopPercent);
                        }
                        // store a raw name which will be used later by the ellipsization routine
                        loopObject.rawName = loopObject.name;
                        prunedData.push(loopObject);
                    }
                }
            }
            if(numCollapsed > 0) {
                var otherFieldName = this.collapseFieldName + ' (' + numCollapsed + ')' 
                        + ((this.showPercent) ? ', ' + format_percent(collapsedY / totalY) : '');
                
                prunedData.push({
                    name: otherFieldName,
                    rawName: otherFieldName,
                    y: collapsedY
                });
                this.legendFieldNames.push('__other');
            }
            this.hcConfig.series = [
                {
                    name: fieldNames[0],
                    data: prunedData
                }
            ];
        },
        
        /*
         * un-comment this block when total count mode is reactivated
         * 
        addDataWithTotalCount: function() {
            var i, loopObject, loopPercent, labelWidth,
                totalY = 0,
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series,
                firstSeries = series[fieldNames[0]],
                adjustedData = [];
        
            for(i = 0; i < firstSeries.length; i++) {
                loopObject = firstSeries[i];
                loopObject.y = loopObject.rawY;
                loopPercent = loopObject.y / this.totalCount;
                loopObject.rawName = loopObject.name;
                totalY += loopObject.y;
                if(this.showPercent) {
                    loopObject.name += ', ' + format_percent(loopPercent);
                }
                adjustedData.push(loopObject);
                this.legendFieldNames.push(loopObject.rawName);
            }
            if(totalY < this.totalCount) {
                adjustedData.push({
                    name: this.collapseFieldName + ((this.showPercent) ? 
                                ', ' + format_percent((this.totalCount - totalY) / this.totalCount) : ''),
                    rawName: this.collapseFieldName,
                    y: this.totalCount - totalY
                });
                this.legendFieldNames.push('__other');
            }
            this.hcConfig.series = [
                {
                    name: fieldNames[0],
                    data: adjustedData
                }
            ];
        },
        */
        
        addLegendClasses: function() {
            // empty placeholder to avoid errors caused by superclass method
        },

        // we have to override here because the tooltip structure is different
        addTooltipClasses: function($super) {
            if(!this.hasSVG) {
                $super();
                return;
            }
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) : 
                                                  $('span > span', $tooltip);
        
            for(i = 0; i < tooltipElements.length; i += 3) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        },
        
        // see above
        addTimeTooltipClasses: function($super) {
            if(!this.hasSVG) {
                $super();
                return;
            }
            var i, loopSplit, loopKeyName, loopKeyElem, loopValElem,
                $tooltip = $('.highcharts-tooltip', $(this.renderTo)),
                tooltipElements = (this.hasSVG) ? $('tspan', $tooltip) : 
                                              $('span > span', $tooltip);
            
            this.addClassToElement(tooltipElements[1], 'time-value');
            this.addClassToElement(tooltipElements[1], 'value');
        
            for(i = 3; i < tooltipElements.length; i += 3) {
                loopKeyElem =tooltipElements[i];
                if(tooltipElements.length < i + 2) {
                    break;
                }
                loopValElem = tooltipElements[i + 1];
                loopSplit = (this.hasSVG) ? loopKeyElem.textContent.split(':') :
                                            $(loopKeyElem).html().split(':');
                loopKeyName = loopSplit[0];
                this.addClassToElement(loopKeyElem, 'key');
                this.addClassToElement(loopKeyElem, loopKeyName + '-key');
                this.addClassToElement(loopValElem, 'value');
                this.addClassToElement(loopValElem, loopKeyName + '-value');
            }
        }

    });

    $.extend(true, Splunk.JSCharting.DEFAULT_HC_CONFIG, {
        plotOptions: {
            pie: {
                borderWidth: 0,
                shadow: false,
                dataLabels: {
                    softConnector: false,
                    style: {
                        cursor: 'default'
                    }
                }
            }
        }
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.HybridChart


    Splunk.JSCharting.HybridChart = $.klass(Splunk.JSCharting.PointBasedChart, {
        
        seriesTypeMap: {},
        defaultSeriesType: 'column',
        
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);
            
            switch(key) {
            
                case 'chart.seriesTypeMap':
                    this.seriesTypeMap = this.parseUtils.stringToMap(value) || {};
                    break;
                case 'chart.defaultSeriesType':
                    this.defaultSeriesType = value || this.defaultSeriesType;
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;    
            }
        },
        
        constructSeriesObject: function($super, name, data, properties) {
            var obj = $super(name, data, properties);
            
            if(this.seriesTypeMap[name]) {
                obj.type = this.seriesTypeMap[name];
            }
            else {
                obj.type = this.defaultSeriesType;
            }
            return obj;
        }
        
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.SplitSeriesChart


    Splunk.JSCharting.SplitSeriesChart = $.klass(Splunk.JSCharting.AbstractChart, {
        
        interChartSpacing: 5,
        hiddenAxisConfig: {
            labels: {
                enabled: false
            },
            tickLength: 0,
            lineWidth: 0,
            title: {
                style: {
                    color: this.fontColor
                }
            }
        },
        
        // override
        initialize: function($super, container, seriesConstructor) {
            $super(container);
            this.seriesConstructor = seriesConstructor;
            this.innerConstructor = this.generateInnerConstructor(seriesConstructor);
            this.innerHeights = [];
            this.innerTops = [];
            this.innerWidth = 0;
            this.innerLeft = 0;
            this.innerCharts = [];
            this.bottomSpacing = 0;

            this.yMin = Infinity;
            this.yMax = -Infinity;
            
            this.colorList = Splunk.JSCharting.ListColorPalette.DEFAULT_COLORS;
        },
        
        // override
        prepare: function($super, data, fieldInfo, properties) {
            $super(data, fieldInfo, properties);
            this.data = data;
            this.fieldInfo = fieldInfo;
            if(!this.chartIsEmpty) {
                this.calculateYExtremes();
                // guessing the bottom spacing based on the data usually gets us pretty close, 
                // we'll go through and finalize this after the chart draws
                this.bottomSpacing = this.guessBottomSpacing(data);
            }
        },
        
        // override
        // the inner charts will handle adding opacity to their color schemes
        setColorMapping: function(list, map, legendSize) {
            var hexColor;
            this.colorList = [];
            this.hcConfig.colors = [];
            for(i = 0; i < list.length; i++) {
                hexColor = this.colorPalette.getColor(list[i], map[list[i]], legendSize);
                this.colorList.push(hexColor);
                this.hcConfig.colors.push(this.colorUtils.addAlphaToColor(hexColor, 1.0));
            }
        },
        
        setColorList: function($super, list) {
            $super(list);
            this.colorList = list;
        },
        
        guessBottomSpacing: function(data) {
            if(this.properties['chart'] !== 'bar' && data.xAxisType === "time") {
                var timeSpan = (data._spanSeries) ? parseInt(data._spanSeries[0], 10) : 1;
                return (timeSpan >= (24 * 60 * 60)) ? 28 : 42;
            }
            return 13;
        },
        
        resize: function($super, width, height) {
            $super(width, height);
            
            // re-calculate the inner sizes based on the new outer chart size, then resize
            this.calculateInnerSizes();
            this.resizeInnerCharts();
        },
        
        // override
        generateDefaultConfig: function($super) {
            $super();
            // have to do this to get the legend items to correspond to the series type
            $.extend(true, this.hcConfig, {
                chart: {
                    type: this.properties['chart']
                },
                plotOptions: {
                    line: {
                        marker: {
                            radius: (this.properties['chart.showMarkers'] === 'true') ? 8 : 0
                        }
                    }
                }
            });
        },
        
        // to the outside world, want this chart object to appear to be a single chart with its own series objects,
        // so we delay the callback until the inner charts exist
        onDrawFinished: function($super, chart, callback) {
            this.drawCallback = callback;
            $super(chart);
        },
        
        onDrawOrResize: function($super, chart) {
            this.calculateInnerSizes(chart);
            // if we already created the inner charts, resize them
            if(this.innerCharts && this.innerCharts.length > 0) {
                this.resizeInnerCharts();
            }
            else {
                // otherwise create them
                this.insertInnerContainers(chart);
                this.drawInnerCharts();
            }
            $super(chart);
        },
        
        resizeInnerCharts: function() {
            var i, iInverse,
                $innerContainers = $('.sschart-inner-container', $(this.renderTo));
            
            // loop through and adjust, keeping in mind that we reversed the order of indices for the chart containers
            for(i = 0; i < $innerContainers.length; i++) {
                iInverse = $innerContainers.length - 1 - i;
                $innerContainers.eq(i).css({
                    left: this.innerLeft + 'px',
                    top: this.innerTops[iInverse] + 'px',
                    width: this.innerWidth + 'px',
                    height: this.innerHeights[iInverse] + 'px'
                });
                this.innerCharts[i].resize(this.innerWidth, this.innerHeights[iInverse]);
            }
        },
        
        destroy: function($super) {
            for(var i = 0; i < this.innerCharts.length; i++) {
                this.innerCharts[i].destroy();
            }
            this.innerCharts = [];
            $super();
            $(this.renderTo).empty();
        },
        
        // override
        addDataToConfig: function($super) {
            this.fieldsToShow = [];
            $super();
            this.numSeries = this.fieldsToShow.length;
        },
        
        calculateYExtremes: function() {
            var i, j, fieldName, dataPoint;
            
            for(i = 0; i < this.data.fieldNames.length; i++) {
                fieldName = this.data.fieldNames[i];
                for(j = 0; j < this.data.series[fieldName].length; j++) {
                    dataPoint = this.data.series[fieldName][j];
                    if(!isNaN(dataPoint.y)) {
                        this.yMin = Math.min(this.yMin, dataPoint.y);
                        this.yMax = Math.max(this.yMax, dataPoint.y);
                    }
                }
            }
            if(this.logYAxis) {
                this.yMin = this.mathUtils.absLogBaseTen(this.yMin);
                this.yMax = this.mathUtils.absLogBaseTen(this.yMax);
            }
        },
        
        // override
        // return an empty array for each data field, we just want to create an outer shell chart with the correct legend
        constructSeriesObject: function(name, data, properties) {
            this.fieldsToShow.push(name);
            return {
                name: name,
                data: []
            };
        },
        
        // override
        // only format the x-axis and y-axis (to hide them) and legend
        applyFormatting: function(properties, data) {
            this.formatXAxis(properties, data);
            this.formatYAxis(properties, data);
            this.formatLegend();
        },
        
        // override
        // only want to add legend and redraw handlers
        addEventHandlers: function(properties, data) {
            this.addLegendHandlers(properties);
            this.addRedrawHandlers();
        },
        
        formatXAxis: function($super, properties, data) {
            var titleText = null;
            if(properties['axisTitleX.text'] !== undefined) {
                titleText = properties['axisTitleX.text'];
            }
            else if(properties['primaryAxisTitle.text'] !== undefined) {
                titleText = properties['primaryAxisTitle.text'];
            }
            else {
                titleText = this.processedData.xAxisKey;
            }
            $.extend(true, this.hcConfig, {
                xAxis: $.extend(true, this.hiddenAxisConfig, {
                    title: {
                        text: titleText,
                        style: {
                            color: this.fontColor
                        }
                    }
                })
            });
        },
        
        formatYAxis: function(properties, data) {
            var titleText = null;
            if(properties['axisTitleY.text'] !== undefined) {
                titleText = properties['axisTitleY.text'];
            }
            else if(properties['secondaryAxisTitle.text'] !== undefined) {
                titleText = properties['secondaryAxisTitle.text'];
            }
            else if(this.processedData.fieldNames.length === 1) {
                titleText = this.processedData.fieldNames[0];
            }
            $.extend(true, this.hcConfig, {
                yAxis: $.extend(true, this.hiddenAxisConfig, {
                    title: {
                        text: titleText,
                        style: {
                            color: this.fontColor
                        }
                    }
                })
            });
        },
        
        calculateInnerSizes: function(chart) {
            chart = chart || this.hcChart;
            var i, loopHeight, loopTop,
                totalHeight = chart.chartHeight - this.bottomSpacing,
                unadjustedInnerHeight = ((totalHeight - (this.numSeries - 2) * this.interChartSpacing) / this.numSeries),
                // using numSeries - 2 as a multiplier above because we are also adding an interChartSpacing below the chart
                firstTop = chart.plotTop + totalHeight - unadjustedInnerHeight - this.interChartSpacing;
            
            this.innerWidth = chart.plotWidth;
            this.innerLeft = chart.plotLeft;
            this.innerHeights = [unadjustedInnerHeight + this.bottomSpacing];
            this.innerTops = [firstTop];
            
            for(i = 1; i < this.fieldsToShow.length; i++) {
                this.innerHeights.push(unadjustedInnerHeight);
                loopTop = firstTop - (i * (unadjustedInnerHeight + this.interChartSpacing));
                this.innerTops.push(loopTop);
            }
        },
        
        insertInnerContainers: function(chart) {
            // this loop goes backward so that when the charts are added the first field ends up at the top of the display
            for(var i = this.fieldsToShow.length - 1; i >= 0; i--) {
                $('#' + chart.container.id).append(
                    $('<div class="sschart-inner-container"></div>')
                        .css({
                            position: 'absolute',
                            left: this.innerLeft + 'px',
                            top: this.innerTops[i] + 'px',
                            width: this.innerWidth + 'px',
                            height: this.innerHeights[i] + 'px'
                        })
                );
            }
        },
        
        drawInnerCharts: function() {
            var i, j, innerData, innerProps, loopChart,
                $innerContainers = $('.sschart-inner-container', $(this.renderTo)),
                fieldNames = this.processedData.fieldNames,
                series = this.processedData.series,
                numDrawn = 0,
                innerCallback = function() {
                    numDrawn++;
                    if(numDrawn === this.numSeries) {
                        // timing issue here, callback fires before assignment is made
                        setTimeout(this.onInnerChartsDrawn.bind(this), 15);
                    }
                }.bind(this);
            
            for(i = 0; i < this.fieldsToShow.length; i++) {
                // make a deep copy of the data and reduce it to a single field name
                innerData = $.extend(true, {}, this.data);    
                innerData.fieldNames = [fieldNames[i]];
                
                // loop through and remove fields that are not being used
                for(j = 0; j < fieldNames.length; j++) {
                    if(j !== i) {
                        delete innerData.series[fieldNames[j]];
                    }
                }
                // make a deep copy of the properties and force the legend to hidden
                innerProps = $.extend(true, {}, this.properties, {
                    'legend.placement': 'none'
                });
                // passing the legend labels to the inner charts will disrupt hover effects
                delete(innerProps['legend.labels']);
                
                loopChart = new this.innerConstructor($innerContainers[i], i, (i === fieldNames.length - 1));
                this.innerCharts.push(loopChart);
                loopChart.prepare(innerData, this.fieldInfo, innerProps);
                // by passing two copies of the same color, make sure the right color will show up in all cases
                loopChart.setColorList([this.colorList[i], this.colorList[i]]);
                loopChart.draw(innerCallback);
            }
        },
        
        // override to avoid errors from superclass method
        addTestingMetadata: function(chart) {
            
        },
        
        onInnerChartsDrawn: function() {
            var i;
            // add event listeners to pass click events up
            for(i = 0; i < this.innerCharts.length; i++) {            
                var loopChart = this.innerCharts[i];
                loopChart.addEventListener('chartClicked', function(event) {
                    this.dispatchEvent('chartClicked', event);
                }.bind(this));
            }
            // here is where we create a new chart object for external reference and call the original draw callback
            var externalChartReference = {
                series: []
            };
            for(i = 0; i < this.innerCharts.length; i++) {            
                externalChartReference.series.push({
                    data: this.innerCharts[i].hcChart.series[0].data
                });
            }
            if(this.drawCallback) {
                this.drawCallback(externalChartReference);
            }
        },
        
        // override
        onLegendMouseOver: function(series) {
            this.highlightThisChild(series.index);
            this.highlightSeriesInLegend(series);
        },
        
        // overide
        onLegendMouseOut: function(series) {
            this.unHighlightThisChild(series.index);
            this.unHighlightSeriesInLegend(series);
        },
        
        highlightThisChild: function(index) {
            var i, innerChart;
            for(i = 0; i < this.innerCharts.length; i++) {
                if(i !== index) {
                    innerChart = this.innerCharts[i];
                    innerChart.fadeSeries(innerChart.hcChart.series[0]);
                }
            }
        },
        
        unHighlightThisChild: function(index) {
            var i, innerChart;
            for(i = 0; i < this.innerCharts.length; i++) {
                if(i !== index) {
                    innerChart = this.innerCharts[i];
                    innerChart.focusSeries(innerChart.hcChart.series[0]);
                }
            }
        },
        
        generateInnerConstructor: function(seriesConstructor) {
            var parent = this,
                axesInverted = (seriesConstructor === Splunk.JSCharting.BarChart);
            
            return $.klass(seriesConstructor, {
                
                initialize: function($super, container, index, isBottom) {
                    $super(container);
                    this.index = index;
                    this.isBottom = isBottom;
                },
                
                generateDefaultConfig: function($super) {
                    $super();
                    $.extend(true, this.hcConfig, {
                        chart: {
                            ignoreHiddenSeries: false,
                            // the parent chart will handle window resize events
                            reflow: false
                        }
                    });
                },
                
                formatXAxis: function($super, properties, data) {
                    $super(properties, data);
                    if(!this.isBottom && !axesInverted) {
                        $.extend(true, this.hcConfig, {
                            xAxis: parent.hiddenAxisConfig
                        });
                    }
                    $.extend(true, this.hcConfig, {
                        xAxis: {
                            title: {
                                text: null
                            }
                        }
                    });
                },
                
                formatYAxis: function($super, properties, data) {
                    $super(properties, data);
                    if(!this.isBottom && axesInverted) {
                        $.extend(true, this.hcConfig, {
                            yAxis: parent.hiddenAxisConfig
                        });
                    }
                    $.extend(true, this.hcConfig, {
                        yAxis: {
                            title: {
                                text: null
                            }
                        }
                    });
                },
                
                addDataToConfig: function($super) {
                    $super();
                    // we add a dummy series with the global min and max values in order to force the charts to have the same y-range
                    this.hcConfig.series.push({
                        name: 'placeholder',
                        data: [parent.yMin, parent.yMax],
                        showInLegend: false,
                        visible: false
                    }); 
                },
                
                onPointMouseOver: function($super, point) {
                    $super(point);
                    parent.highlightThisChild(this.index);
                    parent.highlightIndexInLegend(this.index);
                },
                
                onPointMouseOut: function($super, point) {
                    $super(point);
                    parent.unHighlightThisChild(this.index);
                    parent.unHighlightIndexInLegend(this.index);
                }
                
            });
        }
        
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractAxis


    Splunk.JSCharting.AbstractAxis = $.klass({
        
        hasSVG: Splunk.JSCharting.hasSVG,
        
        initialize: function(properties, data, orientation, colorScheme) {
            this.properties = properties;
            this.data = data;
            this.isVertical = (orientation === 'vertical');
            this.hcAxis = false;
            
            this.foregroundColorSoft = colorScheme.foregroundColorSoft;
            this.foregroundColorSofter = colorScheme.foregroundColorSofter;
            this.fontColor = colorScheme.fontColor;

            this.extendsAxisRange = false;
            
            this.id = "js-charting-axis-" + Splunk.JSCharting.AbstractAxis.idCounter;
            Splunk.JSCharting.AbstractAxis.idCounter++;
            this.mathUtils = Splunk.JSCharting.MathUtils;
            
            this.generateConfig();
            this.applyProperties();
            this.addRenderHooks();
        },
        
        getKey: function() {
            return this.data.xAxisKey;
        },
        
        getType: function() {
            return this.type;
        },
        
        getConfig: function() {
            return this.hcConfig;
        },
        
        // FOR TESTING ONLY
        getExtremes: function(chart) {
            if(!this.hcAxis) {
                if(!chart) {
                    return undefined;
                }
                this.hcAxis = this.getAxis(chart);
            }
            return this.hcAxis.getExtremes();
        },
        
        getAxis: function(chart) {
            return chart.get(this.id);
        },
        
        formatTooltipValue: function(element, valueKey) {
            
        },
        
        onDrawOrResize: function(chart, formatter) {
            this.hcAxis = chart.get(this.id);
            this.postDrawCleanup(this.hcAxis, formatter, chart);
        },
        
        ////////////////////////////////////////
        // end of "public" interface
        
        generateConfig: function() {
            var self = this;
            if(this.isVertical) {
                this.hcConfig = $.extend(true, {}, Splunk.JSCharting.AbstractAxis.DEFAULT_VERT_CONFIG);
            }
            else {
                this.hcConfig = $.extend(true, {}, Splunk.JSCharting.AbstractAxis.DEFAULT_HORIZ_CONFIG);
            }
            // apply the color scheme
            $.extend(true, this.hcConfig, {
                lineColor: this.foregroundColorSoft,
                gridLineColor: this.foregroundColorSofter,
                tickColor: this.foregroundColorSoft,
                minorTickColor: this.foregroundColorSoft,
                title: {
                    style: {
                        color: this.fontColor
                    }
                },
                labels: {
                    style: {
                        color: this.fontColor
                    }
                }
            });
            this.mapper = new Splunk.JSCharting.PropertyMapper(this.hcConfig);
            this.hcConfig.id = this.id;
            this.hcConfig.labels.formatter = function() {
                return self.formatLabel.call(self, this);
            };
        },
        
        applyProperties: function() {
            for(var key in this.properties) {
                if(this.properties.hasOwnProperty(key)) {
                    this.applyPropertyByName(key, this.properties[key]);
                }
            }
            this.postProcessProperties();
        },
        
        applyPropertyByName: function(key, value) {
            switch(key) {
            
                case 'axisTitle.text':
                    this.mapper.mapValue(((value || value === '') ? value : null), ["title", "text"]);
                    break;
                case 'axisLabels.axisVisibility':
                    this.mapper.mapValue(((value === 'hide') ? 0 : 1), ["lineWidth"]);
                    break;
                case 'axisLabels.majorTickSize':
                    this.mapper.mapIfInt(value, ["tickLength"]);
                    break;
                case 'axisLabels.majorTickVisibility':
                    this.mapper.mapValue(((value === 'hide') ? 0 : 1), ["tickWidth"]);
                    break;
                case 'axisLabels.majorLabelVisibility':
                    this.mapper.mapValue((value !== 'hide'), ["labels", "enabled"]);
                    break;
                case 'axisLabels.majorUnit':
                    this.mapper.mapIfInt(value, ["tickInterval"]);
                    break;
                case 'axisLabels.minorTickSize':
                    this.mapper.mapIfInt(value, ["minTickLength"]);
                    break;
                case 'axisLabels.minorTickVisibility':
                    var visible = (value !== 'hide');
                    this.mapper.mapValue((visible ? 1 : 0), ["minorTickWidth"]);
                    this.mapper.mapValue((visible ? 'auto' : null), ["minorTickInterval"]);
                    break;
                case 'axisLabels.extendsAxisRange':
                    this.extendsAxisRange = (value === 'true');
                    this.mapper.mapValue(this.extendsAxisRange, ["endOnTick"]);
                    break;
                case 'gridLines.showMajorLines':
                    this.mapper.mapValue(((value === 'false') ? 0 : 1), ["gridLineWidth"]);
                    break;
                case 'gridLines.showMinorLines':
                    this.mapper.mapValue(((value === 'true') ? 1 : 0), ["minorGridLineWidth"]);
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },
        
        postProcessProperties: function() {
            
        },
        
        addRenderHooks: function() {
            
        },
        
        formatLabel: function(element) {
            return element.value;
        },
        
        postDrawCleanup: function(axis, formatter, chart) {
            
        },
        
        ///////////////////////////////////////////////////////////////////////////////
        // some reusable methods for dealing with the HighCharts ticks object
        
        getFirstTick: function(ticks) {
            var key, firstTick;
            
            // iterate over the ticks, keep track of the lowest 'pos' value
            for(key in ticks) {
                if(ticks.hasOwnProperty(key)) {
                    if(!firstTick || ticks[key].pos < firstTick.pos) {
                        firstTick = ticks[key];
                    }
                }
            }
            return firstTick;
        },
        
        getLastTick: function(ticks) {
            var key, lastTick;
            
            // iterate over the ticks, keep track of the highest 'pos' value
            for(key in ticks) {
                if(ticks.hasOwnProperty(key)) {
                    if(!lastTick || ticks[key].pos > lastTick.pos) {
                        lastTick = ticks[key];
                    }
                }
            }
            return lastTick;
        },
        
        // returns the ticks in an array in ascending order by 'pos'
        getTicksAsOrderedArray: function(ticks) {
            var key,
                tickArray = [];
            
            for(key in ticks) {
                if(ticks.hasOwnProperty(key)) {
                    tickArray.push(ticks[key]);
                }
            }
            tickArray.sort(function(t1, t2) {
                return (t1.pos - t2.pos);
            });
            return tickArray;
        }
        
    });

    Splunk.JSCharting.AbstractAxis.idCounter = 0;

    Splunk.JSCharting.AbstractAxis.DEFAULT_HORIZ_CONFIG = {
        lineWidth: 1,
        tickLength: 25,
        tickWidth: 1,
        minorTickLength: 10,
        tickPlacement: 'between',
        minorGridLineWidth: 0,
        minPadding: 0,
        maxPadding: 0,
        showFirstLabel: true,
        showLastLabel: true,
        x: 0,
        labels: {
            align: 'left',
            x: 3
        },
        title: {
            text: null,
            margin: 20
        },
        min: null,
        max: null
    };

    Splunk.JSCharting.AbstractAxis.DEFAULT_VERT_CONFIG = {
        title: {
            text: null
        },
        tickWidth: 1,
        tickLength: 25,
        minorTickLength: 10,
        showFirstLabel: true,
        showLastLabel: true,
        lineWidth: 1,
        minorGridLineWidth: 0,
        minPadding: 0,
        maxPadding: 0,
        labels: {
            y: (this.hasSVG ? 11 : 13)
        },
        min: null,
        max: null
    };


    /////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.NumericAxis


    Splunk.JSCharting.NumericAxis = $.klass(Splunk.JSCharting.AbstractAxis, {
        
        type: 'numeric',
        
        // override
        initialize: function($super, properties, data, orientation, colorScheme) {
            this.includeZero = (orientation === 'vertical' && properties.chartType !== 'scatter');
            this.logScale = false;
            this.userMin = -Infinity;
            this.userMax = Infinity;
            $super(properties, data, orientation, colorScheme);
        },
        
        // override
        generateConfig: function($super) {
            $super();
            this.mapper.mapObject({
                minPadding: 0.01,
                maxPadding: 0.01
            });
        },
        
        // override
        applyPropertyByName: function($super, key, value) {
            $super(key, value);
            var floatVal;
            switch(key) {
                case 'axis.minimumNumber':
                    floatVal = parseFloat(value, 10);
                    if(!isNaN(floatVal)) {
                        this.userMin = floatVal;
                        if(floatVal > 0) {
                            this.includeZero = false;
                        }
                    }
                    break;
                case 'axis.maximumNumber':
                    floatVal = parseFloat(value, 10);
                    if(!isNaN(floatVal)) {
                        this.userMax = floatVal;
                        if(floatVal < 0) {
                            this.includeZero = false;
                        }
                    }
                    break;
                case 'axis.includeZero':
                    this.includeZero = (value === 'true');
                    break;
                case 'axisLabels.integerUnits':
                    this.mapper.mapValue((value !== 'true'), ["allowDecimals"]);
                    break;
                case 'axis.scale':
                    this.logScale = (value === 'log');
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
            
        },
        
        // override
        postProcessProperties: function($super) {
            $super();
            // if the user-specified min is greater than the max, switch them
            if(this.userMin > this.userMax) {
                var temp = this.userMin;
                this.userMin = this.userMax;
                this.userMax = temp;
            }
            this.adjustUserMin();
            this.adjustUserMax();
        },
        
        adjustUserMin: function() {
            var minWasSet = (!(isNaN(this.userMin)) && this.userMin !== -Infinity);
            if(this.includeZero && minWasSet && this.userMin > 0) {
                this.userMin = 0;
            }
            if(this.logScale && minWasSet) {
                this.userMin = this.mathUtils.absLogBaseTen(this.userMin);
            }
            if(minWasSet) {
                this.mapper.mapObject({
                    min: this.userMin,
                    minPadding: 0,
                    startOnTick: false
                });
            }
        },
        
        adjustUserMax: function() {
            var maxWasSet = (!(isNaN(this.userMax)) && this.userMax !== Infinity);
            if(this.includeZero && maxWasSet && this.userMax < 0) {
                this.userMax = 0;
            }
            if(this.logScale && maxWasSet) {
                this.userMax = this.mathUtils.absLogBaseTen(this.userMax);
            }
            if(maxWasSet) {
                this.mapper.mapObject({
                    max: this.userMax,
                    maxPadding: 0,
                    endOnTick: false
                });
            }
        },
        
        // override
        formatLabel: function(element) {
            if(this.logScale) {
                value = this.mathUtils.absPowerTen(element.value);
            }
            else {
                value = element.value;
            }
            return this.formatNumber(value);
        },
        
        formatTooltipValue: function(element, valueKey) {
            // TODO: this is a little hacked up, maybe the axis object itself should create and store the rawY value?
            if(this.logScale) {
                var toRawMap = {
                    "y": "rawY",
                    "x": "rawX"
                };
                return this.formatNumber(element.point[toRawMap[valueKey]]);
            }
            return this.formatNumber(element[valueKey]);
        },
        
        formatNumber: function(value) {
            return format_decimal(value);
        },
        
        addRenderHooks: function() {
            $.extend(this.hcConfig, {
                hooks: {
                    tickRenderStart: this.tickRenderStartHook.bind(this)
                }
            });
        },
        
        tickRenderStartHook: function(options, extremes, chart) {
            var formatter = Splunk.JSCharting.FormattingHelper(chart.renderer);
            
            extremes.min = options.min || extremes.dataMin;
            extremes.max = options.max || extremes.dataMax;
            if(this.logScale) {
                this.formatLogAxes(options, extremes);
            }
            else if(this.hcConfig.tickInterval) {
                this.checkMajorUnitFit(this.hcConfig.tickInterval, extremes, options, formatter, chart); 
            }
            if(this.includeZero) {
                this.enforceIncludeZero(options, extremes);
            }
            else {
                this.adjustAxisRange(options, extremes);
            }
            formatter.destroy();
        },
        
        formatLogAxes: function(options, extremes) {
            var firstTickValue = Math.ceil(extremes.min),
                lastTickValue = (options.endOnTick) ? Math.ceil(extremes.max) : extremes.max;
            
            // if we can show two or more tick marks, we'll clip to a tickInterval of 1
            if(Math.abs(lastTickValue - firstTickValue) >= 1) {
                options.tickInterval = 1;
            }
            else {
                options.tickInterval = null;
            }
        },
        
        checkMajorUnitFit: function(unit, extremes, options, formatter, chart) {
            var range = Math.abs(extremes.max - extremes.min),
                axisLength = (this.isVertical) ? chart.plotHeight : chart.plotWidth,
                tickSpacing = unit * axisLength / range,
                largestExtreme = Math.max(Math.abs(extremes.min), Math.abs(extremes.max)),
                tickLabelPadding = (this.isVertical) ? 2 : 5,
                fontSize = parseInt((options.labels.style.fontSize.split('px'))[0], 10),
                
                translatePixels = function(pixelVal) {
                    return (pixelVal * range / axisLength);
                };
            
            if(this.isVertical) {
                var maxHeight = formatter.predictTextHeight(largestExtreme, fontSize);
                if(tickSpacing < (maxHeight + 2 * tickLabelPadding)) {
                    options.tickInterval = Math.ceil(translatePixels((maxHeight + 2 * tickLabelPadding), true));
                }
            }
            else {
                var maxWidth = formatter.predictTextWidth(largestExtreme, fontSize);
                if(tickSpacing < (maxWidth + 2 * tickLabelPadding)) {
                    options.tickInterval = Math.ceil(translatePixels((maxWidth + 2 * tickLabelPadding), true));
                }
            }
        },
        
        enforceIncludeZero: function(options, extremes) {
            // if there are no extremes (i.e. no meaningful data was extracted), go with 0 to 100
            if(!extremes.min && !extremes.max) {
                options.min = 0;
                options.max = 100;
                return;
            }
            if(extremes.min >= 0) {
                options.min = 0;
                options.minPadding = 0;
            }
            else if(extremes.max <= 0) {
                options.max = 0;
                options.maxPadding = 0;
            }
        },
        
        // clean up various issues that can arise from the axis extremes
        adjustAxisRange: function(options, extremes) {
            // if there are no extremes (i.e. no meaningful data was extracted), go with 0 to 100
            if(!extremes.min && !extremes.max) {
                options.min = 0;
                options.max = 100;
                return;
            }
            // if the min or max is such that no data makes it onto the chart, we hard-code some reasonable extremes
            if(extremes.min > extremes.dataMax && extremes.min > 0 && this.userMax === Infinity) {
                options.max = (this.logScale) ? extremes.min + 2 : extremes.min * 2;
                return;
            }
            if(extremes.max < extremes.dataMin && extremes.max < 0 && this.userMin === -Infinity) {
                options.min = (this.logScale) ? extremes.max - 2 : extremes.max * 2;
                return;
            }
            // if either data extreme is exactly zero, remove the padding on that side so the axis doesn't extend beyond zero
            if(extremes.dataMin === 0 && this.userMin === -Infinity) {
                options.min = 0;
                options.minPadding = 0;
            }
            if(extremes.dataMax === 0 && this.userMax === Infinity) {
                options.max = 0;
                options.maxPadding = 0;
            }
        },
        
        // override
        postDrawCleanup: function($super, axis, formatter, chart) {
            $super(axis, formatter, chart);
            var fontSize = 11,
                tickLabelPadding = 2;
            
            if(this.isVertical) {
                this.checkFirstLabelFit(axis, formatter, chart, fontSize);
            }
            else {
                this.checkLastLabelFit(axis, formatter, chart, fontSize);
            }
        },
        
        checkLastLabelFit: function(axis, formatter, chart, fontSize) {
            var lastTick = this.getLastTick(axis.ticks);
            
            if(!lastTick || !lastTick.label) {
                return;
            }
            var tickLabelPadding = 5,
                availableWidth = (chart.plotWidth - axis.translate(lastTick.pos)) - tickLabelPadding;
            if(availableWidth <= 0 || lastTick.label.getBBox().width > availableWidth) {
                lastTick.label.hide();
            }
            else {
                lastTick.label.show();
            }
        },
        
        checkFirstLabelFit: function(axis, formatter, chart, fontSize) {
            var firstTick = this.getFirstTick(axis.ticks);
            
            if(!firstTick || !firstTick.label) {
                return;
            }
            var tickLabelPadding = 2,
                availableHeight = axis.translate(firstTick.pos) - tickLabelPadding;
            if(availableHeight <= 0 || firstTick.label.getBBox().height > availableHeight) {
                firstTick.label.hide();
            }
            else {
                firstTick.label.show();
            }
        }

    });
            
            
    /////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.CategoryAxis
            
            
    Splunk.JSCharting.CategoryAxis = $.klass(Splunk.JSCharting.AbstractAxis, {
        
        type: 'category',
        
        applyPropertyByName: function($super, key, value) {
            $super(key, value);
            switch(key) {
                case 'axisLabels.hideCategories':
                    if(value === true) {
                        this.mapper.mapValue(false, ['labels', 'enabled']);
                        this.mapper.mapValue(0, ['tickWidth']);
                        break;
                    }
                default:
                    // no-op for unsupported keys
                    break;
            }
        },
        
        // override
        generateConfig: function($super) {
            $super();
            this.chartIsLineBased = (this.properties.chartType in {line: 1, area: 1});
            
            this.mapper.mapObject({
                categories: this.data.categories,
                startOnTick: this.chartIsLineBased,
                tickmarkPlacement: (this.chartIsLineBased) ? 'on' : 'between',
                hooks: {
                    tickLabelsRenderStart: this.tickLabelsRenderStartHook.bind(this)
                }
            });
            
            if(this.isVertical) {
                this.mapper.mapObject({
                    labels: {
                        align: 'right',
                        x: -8
                    }
                });
            }
            else {
                this.mapper.mapObject({
                    labels: {
                        align: 'left'
                    },
                    // pad the x-axis for line-based charts so there will be room for the last label
                    max: (this.chartIsLineBased) ? this.data.categories.length : null,
                    endOnTick: this.chartIsLineBased,
                    showLastLabel: false
                });
            }
        },
        
        tickLabelsRenderStartHook: function(options, categories, chart) {
            if(!options.labels.enabled) {
                return;
            }
            var maxWidth,
                formatter = new Splunk.JSCharting.FormattingHelper(chart.renderer);
            
            if(!options.originalCategories) {
                options.originalCategories = $.extend(true, [], categories);
            }
            if(this.isVertical) {
                var adjustedFontSize, labelHeight;
                
                maxWidth = Math.floor(chart.chartWidth / 6);
                adjustedFontSize = this.fitLabelsToWidth(options, categories, formatter, maxWidth);
                labelHeight = formatter.predictTextHeight("Test", adjustedFontSize);
                options.labels.y = (labelHeight / 3);
            }
            else {
                var tickLabelPadding = 5,
                    axisWidth = chart.plotWidth,
                    tickSpacing = (categories.length > 0) ? (axisWidth / categories.length) : axisWidth;
                
                maxWidth = tickSpacing - (2 * tickLabelPadding);
                this.fitLabelsToWidth(options, categories, formatter, maxWidth);
                if(options.tickmarkPlacement === 'between') {  
                    options.labels.align = 'left';
                    options.labels.x = -(tickSpacing / 2) + tickLabelPadding;
                }
                else {
                    options.labels.align = 'left';
                    options.labels.x = tickLabelPadding;
                }
            }
            formatter.destroy();
        },
        
        // override
        formatTooltipValue: function(element, valueKey) {
            return element.point.name;
        },
        
        fitLabelsToWidth: function(options, categories, formatter, maxWidth) {
            var i, label,
                defaultFontSize = 11,
                minFontSize = 9,
                adjusted = formatter.adjustLabels(options.originalCategories, maxWidth, minFontSize, defaultFontSize, 'middle');
            
            for(i = 0; i < adjusted.labels.length; i++) {
                categories[i] = adjusted.labels[i];
            }
            options.labels.style['font-size'] = adjusted.fontSize + 'px';
            return adjusted.fontSize;
        }
        
    });


    Splunk.JSCharting.TimeAxis = $.klass(Splunk.JSCharting.CategoryAxis, {
        
        numLabelCutoff: 6,
        type: 'time',
        
        // override
        initialize: function($super, properties, data, orientation, colorScheme) {
            this.timeUtils = Splunk.JSCharting.TimeUtils;
            $super(properties, data, orientation, colorScheme);
        },
        
        // override
        generateConfig: function($super) {
            var xSeries = this.data.xSeries,
                _spanSeries = this.data._spanSeries,
                categoryInfo = this.timeUtils.convertTimeToCategories(xSeries, _spanSeries, this.numLabelCutoff);
            
            this.data.categories = categoryInfo.categories;
            this.rawLabels = categoryInfo.rawLabels;
            $super();
            this.mapper.mapObject({
                hooks: {
                    tickPositionsSet: this.tickPositionsSetHook.bind(this)
                }
            });
        },
        
        formatTooltipValue: function(element, valueKey) {
            var isoString = element.point.name,
                span = parseInt(element.point._span, 10) || 1;
            
            return this.timeUtils.formatIsoStringAsTooltip(isoString, span);
        },
        
        tickLabelsRenderStartHook: function(options, categories, chart) {
            var tickLabelPadding = (this.isVertical) ? 2 : 5,
                axisLength = (this.isVertical) ? chart.plotHeight : chart.plotWidth,
                tickSpacing = (categories.length > 0) ? (axisLength / categories.length) : axisWidth;
                
            if(this.isVertical) {
                var labelFontSize = parseInt((options.labels.style.fontSize.split('px'))[0], 10);
                options.labels.y = (tickSpacing / 2) + labelFontSize + tickLabelPadding;
            }
            else {
                if(options.tickmarkPlacement === 'on') {
                    options.labels.align = 'left';
                    options.labels.x = tickLabelPadding;
                }
                else {
                    options.labels.align = 'left';
                    options.labels.x = (tickSpacing / 2) + tickLabelPadding;
                }
            }
            // for the VML renderer we have to make sure our tick labels won't wrap unnecessarily
            // and will accurately report their own widths
            if(!this.hasSVG) {
                options.labels.style['white-space'] = 'nowrap';
                options.labels.style.width = 'auto';
            }
        },
        
        tickPositionsSetHook: function(options, categories, tickPositions, chart) {
            if(!options.originalCategories) {
                options.originalCategories = $.extend(true, [], categories);
            }
            var i,
                originalCategories = options.originalCategories;
            
            // empty the tickPostions array without reassigning the reference
            tickPositions.length = 0;
            for(i = 0; i < originalCategories.length; i++) {
                if(originalCategories[i] && originalCategories[i] !== " ") {
                    if(options.tickmarkPlacement === 'on') {
                        tickPositions.push(i);
                    }
                    else {
                        // if the tickmark placement is 'between', we shift everything back one
                        // interestingly, HighCharts will allow negatives here, and in fact that's what we need to label the first point
                        tickPositions.push(i - 1);
                        categories[i - 1] = originalCategories[i];
                    }
                }
            }
        },
        
        postDrawCleanup: function($super, axis, formatter, chart) {
            $super(axis, formatter, chart);
            if(!axis.options.labels.enabled) {
                return;
            }
            var i,
                tickArray = this.getTicksAsOrderedArray(axis.ticks),
                lastTick = tickArray[tickArray.length - 1]; 
            
            this.resolveLabelCollisions(tickArray, this.rawLabels, formatter, chart);
            // if resolving label collisions did not hide the last tick, make sure its label fits
            if(formatter.elementIsVisible(lastTick.mark)) {
                if(!this.lastLabelFits(lastTick, axis, chart)) {
                    lastTick.label.hide();
                }
                else {
                    lastTick.label.show();
                }
            }
        },
        
        lastLabelFits: function(lastTick, axis, chart) {
            if(!lastTick.label) {
                return;
            }
            var tickLabelPadding;
            if(this.isVertical) {
                var availableHeight;
                    
                tickLabelPadding = 3;
                availableHeight = (chart.plotTop + chart.plotHeight - lastTick.label.getBBox().y) - tickLabelPadding;
                if(lastTick.labelBBox.height > availableHeight) {
                    return false;
                }
            }
            else {
                var availableWidth;
                    
                tickLabelPadding = 5;
                availableWidth = (chart.plotLeft + chart.plotWidth - lastTick.label.getBBox().x) - tickLabelPadding;
                if(lastTick.labelBBox.width > availableWidth) {
                    return false;
                }  
            }
            return true;
        },
        
        resolveLabelCollisions: function(ticks, rawLabels, formatter, chart) {
            if(ticks.length < 2) {
                return;
            }
            var i, bBox1, bBox2, bdTime, prevBdTime, labelText,
                horizontalPadding = 10,
                verticalPadding = 5,
                collisionExists = false,
                dataSpan = this.data._spanSeries[0],
                tickSpacing = (ticks.length > 1) ? (ticks[1].pos - ticks[0].pos) : 1,
                // get a rough estimate of the seconds between tickmarks
                labelSpan = dataSpan * tickSpacing,
                
                bBoxesCollide = (this.isVertical) ? 
                    function(bBox1, bBox2) {
                        return (bBox2.y <= bBox1.y + bBox1.height + verticalPadding);
                    } :
                    function(bBox1, bBox2) {
                        return (bBox2.x <= bBox1.x + bBox1.width + horizontalPadding);
                    };
            
            for(i = 0; i < ticks.length - 2; i++) {
                bBox1 = formatter.getTickLabelBBox(ticks[i]);
                bBox2 = formatter.getTickLabelBBox(ticks[i + 1]);
                if(bBoxesCollide(bBox1, bBox2)) {
                    collisionExists = true;
                    break;
                }
            }
            if(collisionExists) {
                for(i = 1; i < ticks.length; i++) {
                    if(i % 2 === 0) {
                        bdTime = this.timeUtils.extractBdTime(rawLabels[i]);
                        prevBdTime = this.timeUtils.extractBdTime(rawLabels[i - 2]);
                        formatter.setElementText(ticks[i].label, this.timeUtils.formatBdTimeAsLabel(bdTime, labelSpan, prevBdTime));
                    }
                    else {
                        ticks[i].label.hide();
                        if(ticks[i].mark) {
                            ticks[i].mark.hide();
                        }
                    }
                }
            }
            else {
                for(i = 1; i < ticks.length; i++) {
                    if(i % 2 === 0) {
                        bdTime = this.timeUtils.extractBdTime(rawLabels[i]);
                        prevBdTime = this.timeUtils.extractBdTime(rawLabels[i - 1]);
                        formatter.setElementText(ticks[i].label, this.timeUtils.formatBdTimeAsLabel(bdTime, labelSpan, prevBdTime));
                    }
                    else {
                        ticks[i].label.show();
                        if(ticks[i].mark) {
                            ticks[i].mark.show();
                        }
                    }
                }
            }
        }
        
    });


    /////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.PropertyMapper

    Splunk.JSCharting.PropertyMapper = function(configObject) {
        
        var mapper = this;
        
        mapper.mapIfInt = function(value, path) {
            var intVal = parseInt(value, 10);
            if(isNaN(intVal)) {
                return;
            }
            mapper.mapValue(intVal, path);
        };
        
        mapper.mapIfFloat = function(value, path) {
            var floatVal = parseFloat(value);
            if(isNaN(floatVal)) {
                return;
            }
            mapper.mapValue(floatVal, path);
        };
        
        mapper.mapValue = function(value, configPath) {
            var i, loopObject,
                extendObject = {},
                pathHead = extendObject;
            
            for(i = 0; i < configPath.length - 1; i++) {
                loopObject = pathHead;
                loopObject[configPath[i]] = {};
                pathHead = loopObject[configPath[i]];
            }
            pathHead[configPath[configPath.length - 1]] = value;
            $.extend(true, configObject, extendObject);
        };
        
        mapper.mapObject = function(extendObject) {
            $.extend(true, configObject, extendObject);
        };
        
        return mapper;
    };


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.FormattingHelper


    Splunk.JSCharting.FormattingHelper = function(renderer) {
        
        var formatter = this,
            hasSVG = Splunk.JSCharting.hasSVG;
        
        // a cross-renderer way to read out an wrapper's element text content
        formatter.getElementText = function(wrapper) {
            return (hasSVG) ? wrapper.textStr : $(wrapper.element).html();
        };
        
        // a renderer-indpendent way to update an wrapper's element text content
        formatter.setElementText = function(wrapper, text) {
            wrapper.added = true; // the SVG renderer needs this
            wrapper.attr({text: text});
        };
        
        // a cross-renderer way to find out if a wrapper's element is visible
        formatter.elementIsVisible = function(wrapper) {
            if(hasSVG) {
                return wrapper.attr('visibility') !== "hidden";
            }
            return wrapper.element.style.visibility !== "hidden";
        };
        
        // a cross-renderer way to get a tick label bounding box, sometimes the VML renderer doesn't
        // accurately report its x and y co-ordinates
        formatter.getTickLabelBBox = function(tick) {
            var labelBBox = tick.label.getBBox();
            if(!hasSVG) {
                labelBBox.x = tick.label.x;
                labelBBox.y = tick.label.y;
            } 
            return labelBBox;
        };
        
        formatter.ellipsize = function(text, width, fontSize, mode) {
            if(text.length <= 3) {
                return text;
            }
            if(!width || isNaN(parseFloat(width, 10))) {
                return "...";
            }
            if(!fontSize || isNaN(parseFloat(fontSize, 10))) {
                return text;
            }
            if(formatter.predictTextWidth(text, fontSize) <= width) {
                return text;
            }
            // memoize the width of the ellipsis
            if(!formatter.ellipsisWidth) {
                formatter.ellipsisWidth = formatter.predictTextWidth("...", fontSize);
            }
            switch(mode) {
                case 'start':
                    var reversedText = formatter.reverseString(text),
                        reversedTrimmed = formatter.trimStringToWidth(reversedText, (width - formatter.ellipsisWidth), fontSize);
                    return "..." + formatter.reverseString(reversedTrimmed);
                case 'end':
                    return formatter.trimStringToWidth(text, (width - formatter.ellipsisWidth), fontSize) + "...";
                default:
                    // default to middle ellipsization
                    var firstHalf = text.substr(0, Math.ceil(text.length / 2)),
                        secondHalf = text.substr(Math.floor(text.length / 2)),
                        halfFitWidth = (width - formatter.ellipsisWidth) / 2,
                        secondHalfReversed = formatter.reverseString(secondHalf),
                        firstHalfTrimmed = formatter.trimStringToWidth(firstHalf, halfFitWidth, fontSize),
                        secondHalfTrimmedReversed = formatter.trimStringToWidth(secondHalfReversed, halfFitWidth, fontSize);
                    
                    return firstHalfTrimmed + "..." + formatter.reverseString(secondHalfTrimmedReversed);
            }
        };
        
        // NOTE: it is up to caller to test that the entire string does not already fit
        // even if it does, this method will do log N work and may or may not truncate the last character
        formatter.trimStringToWidth = function(text, width, fontSize) {
            var binaryFindEndIndex = function(start, end) {
                    var testIndex;
                    while(end > start + 1) {
                        testIndex = Math.floor((start + end) / 2);
                        if(formatter.predictTextWidth(text.substr(0, testIndex), fontSize) > width) {
                            end = testIndex;
                        }
                        else {
                            start = testIndex;
                        }
                    }
                    return start;
                },
                endIndex = binaryFindEndIndex(0, text.length);
                
            return text.substr(0, endIndex);
        };
        
        formatter.reverseString = function(str) {
            return str.split("").reverse().join("");
        };
        
        formatter.predictTextWidth = function(text, fontSize) {
            if(!fontSize || !text) {
                return 0;
            }
            var bBox = (formatter.getTextBBox(text, fontSize));
            return (bBox) ? bBox.width : 0;
        };
        
        formatter.predictTextHeight = function(text, fontSize) {
            if(!fontSize || !text) {
                return 0;
            }
            var bBox = (formatter.getTextBBox(text, fontSize));
            return (bBox) ? bBox.height : 0;
        };
        
        formatter.getTextBBox = function(text, fontSize) {
            if(isNaN(parseFloat(fontSize, 10))) {
                return undefined;
            }
            if(formatter.textPredicter) {
                formatter.textPredicter.destroy();
            }
            formatter.textPredicter = renderer.text(text, 0, 0)
                .attr({
                    visibility: 'hidden'
                })
                .css({
                    fontSize: fontSize + 'px'
                })
                .add();
            return formatter.textPredicter.getBBox();
        };
        
        formatter.adjustLabels = function(originalLabels, width, minFont, maxFont, ellipsisMode) {
            var i, fontSize, ellipsize,
                labels = $.extend(true, [], originalLabels),
                longestLabel = "",
                longestFits = false;
            // find the longest label
            for(i = 0; i < labels.length; i++) {
                if(labels[i] && labels[i].length > longestLabel.length) {
                    longestLabel = labels[i];
                }
            }
            // adjust font and try to fit longest
            for(fontSize = maxFont; fontSize > minFont; fontSize--) {
                longestFits = (formatter.predictTextWidth(longestLabel, fontSize) <= width);
                if(longestFits) {
                    break;
                }
            }
            var shouldEllipsize = (!longestFits && ellipsisMode !== 'none');
            if(shouldEllipsize) {
                for(i = 0; i < labels.length; i++) {
                    labels[i] = formatter.ellipsize(labels[i], width, fontSize, ellipsisMode);
                }
            }
            return {
                labels: labels,
                fontSize: fontSize,
                areEllipsized: shouldEllipsize,
                longestWidth: formatter.predictTextWidth(longestLabel, fontSize)
            };
        };
        
        formatter.bBoxesOverlap = function(bBox1, bBox2, marginX, marginY) {
            marginX = marginX || 0;
            marginY = marginY || 0;
            var box1Left = bBox1.x - marginX,
                box2Left = bBox2.x - marginX,
                box1Right = bBox1.x + bBox1.width + 2 * marginX,
                box2Right = bBox2.x + bBox2.width + 2 * marginX,
                box1Top = bBox1.y - marginY,
                box2Top = bBox2.y - marginY,
                box1Bottom = bBox1.y + bBox1.height + 2 * marginY,
                box2Bottom = bBox2.y + bBox2.height + 2 * marginY;
            
            return ((box1Left < box2Right) && (box1Right > box2Left) 
                        && (box1Top < box2Bottom) && (box1Bottom > box2Top));
        };
        
        formatter.destroy = function() {
            if(formatter.textPredicter) {
                formatter.textPredicter.destroy();
                formatter.textPredicter = false;
            }
        };
        
        return formatter;
        
    };


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.ListColorPalette


    Splunk.JSCharting.ListColorPalette = function(colors, useInterpolation) {

        colors = colors || Splunk.JSCharting.ListColorPalette.DEFAULT_COLORS;
        useInterpolation = (useInterpolation) ? true : false;
        var self = this;

        self.getColor = function(field, index, count) {
            var p, index1, index2,
                numColors = colors.length;
            
            if(numColors == 0) {
                return 0x000000;
            }
            if(index < 0) {
                index = 0;
            }
            if(!useInterpolation) {
                return colors[index % numColors];
            }
            if (count < 1) {
                count = 1;
            }
            if (index > count) {
                index = count;
            }
            p = (count == 1) ? 0 : (numColors - 1) * (index / (count - 1));
            index1 = Math.floor(p);
            index2 = Math.min(index1 + 1, numColors - 1);
            p -= index1;
            
            return self.interpolateColors(colors[index1], colors[index2], p);
        };

        // this is a direct port from the Flash library, ListColorPalette.as line 85
        self.interpolateColors = function(color1, color2, p) {
            var r1 = (color1 >> 16) & 0xFF,
                g1 = (color1 >> 8) & 0xFF,
                b1 = color1 & 0xFF,

                r2 = (color2 >> 16) & 0xFF,
                g2 = (color2 >> 8) & 0xFF,
                b2 = color2 & 0xFF,

                rInterp = r1 + Math.round((r2 - r1) * p),
                gInterp = g1 + Math.round((g2 - g1) * p),
                bInterp = b1 + Math.round((b2 - b1) * p);

            return ((rInterp << 16) | (gInterp << 8) | bInterp);
        };

        //implicit return this (aka self)
    };

    Splunk.JSCharting.ListColorPalette.DEFAULT_COLORS = [
        0x6BB7C8,
        0xFAC61D,
        0xD85E3D,
        0x956E96,
        0xF7912C,
        0x9AC23C,
        0x998C55,
        0xDD87B0,
        0x5479AF,
        0xE0A93B,
        0x6B8930,
        0xA04558,
        0xA7D4DF,
        0xFCDD77,
        0xE89E8B,
        0xBFA8C0,
        0xFABD80,
        0xC2DA8A,
        0xC2BA99,
        0xEBB7D0,
        0x98AFCF,
        0xECCB89,
        0xA6B883,
        0xC68F9B,
        0x416E79,
        0x967711,
        0x823825,
        0x59425A,
        0x94571A,
        0x5C7424,
        0x5C5433,
        0x85516A,
        0x324969,
        0x866523,
        0x40521D,
        0x602935
    ];


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractGauge


    Splunk.JSCharting.AbstractGauge = $.klass(Splunk.JSCharting.AbstractVisualization, {

        DEFAULT_COLORS: [0x69a847, 0xd5c43b, 0xa6352d],

        needsLegendMapping: false,
        maxTicksPerRange: 10,

        // override
        initialize: function($super, container) {
            $super(container);

            this.gaugeIsRendered = false;
            this.elements = {};
            this.colors = this.DEFAULT_COLORS;
            this.ranges = false;
            this.rangesCameFromXML = false;
            this.showMajorTicks = true;
            this.showMinorTicks = true;
            this.showLabels = true;
            this.showValue = true;
            this.showRangeBand = true;
            this.usePercentageRange = false;
            this.usePercentageValue = false;
            this.isShiny = true;
            this.propertiesAreStale = false;
            this.pendingData = false;
            this.pendingFieldInfo = false;
            
            $(window).resize(function() {
                var newWidth = $(this.renderTo).width(),
                    newHeight = $(this.renderTo).height();
                if((newWidth && newWidth !== this.chartWidth) || (newHeight && newHeight !== this.chartHeight)) {
                    clearTimeout(this.windowResizeTimeout);
                    this.windowResizeTimeout = setTimeout(function() {
                        this.onWindowResized(newWidth, newHeight);
                    }.bind(this), 100);
                }
            }.bind(this));

        },
        
        prepare: function(data, fieldInfo, properties) {
            this.properties = properties;
            this.applyProperties(properties);
            this.processData(data, fieldInfo, properties);
            this.colorPalette = new Splunk.JSCharting.ListColorPalette(this.colors, true);
            this.propertiesAreStale = true;
        
        // in export mode, hard-code a height and width for gauges
        if(this.exportMode) {
            this.chartWidth = 600;
            this.chartHeight = 400;
        }
        },

        draw: function(callback) {
            var needsRedraw = true;
            if(!this.propertiesAreStale && this.pendingData && this.pendingFieldInfo) {
                var oldValue = this.value,
                    oldRanges = this.ranges;
                    
                this.processData(this.pendingData, this.pendingFieldInfo, this.properties);
                // if the ranges haven't changed, we can do an animated update in place
                if(this.parseUtils.arraysAreEquivalent(oldRanges, this.ranges)) {
                    this.updateValue(oldValue, this.value);
                    needsRedraw = false;
                }
                this.pendingData = false;
                this.pendingFieldInfo = false;
            }
            if(needsRedraw) {
                this.destroy();
                this.renderer = new Highcharts.Renderer(this.renderTo, this.chartWidth, this.chartHeight);
                this.formatter = new Splunk.JSCharting.FormattingHelper(this.renderer);
                $(this.renderTo).css('backgroundColor', this.backgroundColor);
                this.renderGauge();
                this.nudgeChart();
                this.gaugeIsRendered = true; 
            $(this.renderTo).addClass('highcharts-container');
                // add this class and attribute on successful draw for UI testing
                if(this.testMode) {
                    $(this.renderTo).addClass(this.typeName);
                    $(this.renderTo).attr('data-gauge-value', this.value);
                    if(this.elements.valueDisplay) {
                        this.addClassToElement(this.elements.valueDisplay.element, 'gauge-value');
                    }
                }
            
            // in export mode, need to make sure each circle element has cx and cy attributes
            if(this.exportMode) {
                $(this.renderTo).find('circle').each(function(i, elem) {
                    var $elem = $(elem);
                    $elem.attr('cx', $elem.attr('x'));
                    $elem.attr('cy', $elem.attr('y'));
                });
            }
                this.propertiesAreStale = false;
            }
            if(callback) {
                var chartObject = this.getChartObject();
                callback(chartObject);
            }
        },

        setData: function(data, fieldInfo) {
            this.pendingData = data;
            this.pendingFieldInfo = fieldInfo;
        },
        
        onWindowResized: function(newWidth, newHeight) {
            if(this.gaugeIsRendered) {
                this.resize(newWidth, newHeight);
            }
        },

        resize: function(width, height) {
            this.chartWidth = width;
            this.chartHeight = height;
            this.destroy();
            this.renderer = new Highcharts.Renderer(this.renderTo, this.chartWidth, this.chartHeight);
            this.formatter = new Splunk.JSCharting.FormattingHelper(this.renderer);
            this.renderGauge();
            this.nudgeChart();
            this.gaugeIsRendered = true;
        },

        destroy: function() {
            // stop any running animations
            this.stopWobble();
            $(this.renderTo).stop();
            for(var key in this.elements) {
                if(this.elements.hasOwnProperty(key)) {
                    this.elements[key].destroy();
                }
            }
            this.elements = {};
            $(this.renderTo).empty();
            $(this.renderTo).css('backgroundColor', '');
            // remove the UI testing hooks
            if(this.testMode) {
                $(this.renderTo).removeClass('highcharts-container').removeClass(this.typeName);
            }
            this.gaugeIsRendered = false;
        },
        
        // this is just creating a stub interface so automated tests won't fail
        getChartObject: function() {
            return {
                series: [
                    {
                        data: [
                               {
                                   y: this.value,
                                   onMouseOver: function() { }
                               }
                        ]
                    }
                ]
            };
        },

        // override
        applyPropertyByName: function($super, key, value, properties) {
            $super(key, value, properties);
            switch(key) {

                case 'gaugeColors':
                    this.mapGaugeColors(value);
                    break;
                case 'chart.rangeValues':
                    this.mapRangeValues(value);
                    break;
                case 'chart.majorUnit':
                    this.majorUnit = parseInt(value, 10);
                    break;
                case 'chart.showMajorTicks':
                    this.showMajorTicks = (value === 'true');
                    break;
                case 'chart.showMinorTicks':
                    this.showMinorTicks = (value === 'true');
                    break;
                case 'chart.showLabels':
                    this.showLabels = (value === 'true');
                    break;
                case 'chart.showValue':
                    this.showValue = (value === 'true');
                    break;
                case 'chart.showRangeBand':
                    this.showRangeBand = (value === 'true');
                    break;
                case 'chart.usePercentageRange':
                    this.usePercentageRange = (value === 'true');
                    break;
                case 'chart.usePercentageValue':
                    this.usePercentageValue = (value === 'true');
                    break;
                case 'chart.style':
                    this.isShiny = (value !== 'minimal');
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },
        
        mapGaugeColors: function(value) {
            if(!value) {
                return;
            }
            var colors = this.parseUtils.stringToHexArray(value);
            if(colors && colors.length > 0) {
                this.colors = colors;
            }
        },
        
        mapRangeValues: function(value) {
            var i, rangeNumber,
                prevRange = -Infinity,
                unprocessedRanges = this.parseUtils.stringToArray(value),
                ranges = [];
            
            for(i = 0; i < unprocessedRanges.length; i++) {
                rangeNumber = this.mathUtils.parseFloat(unprocessedRanges[i]);
                if(isNaN(rangeNumber)) {
                    // ignore the entire range list if an invalid entry is present
                    return;
                }
                // de-dupe the ranges and ensure ascending order
                if(rangeNumber > prevRange) {
                    ranges.push(rangeNumber);
                    prevRange = rangeNumber;
                }
            }
            // if we couldn't extract at least two valid range numbers, ignore the list altogether
            if(!ranges || ranges.length < 2) {
                return;
            }
            this.ranges = ranges;
            this.rangesCameFromXML = true;
        },

        setExportDimensions: function() {
            this.chartWidth = 600;
            this.chartHeight = 400;
        },
        
        processData: function(data, fieldInfo, properties) {
            if(!data || !data.series || !data.xSeries) {
                this.value = 0;
                if(!this.rangesCameFromXML) {
                    this.ranges = [0, 30, 70, 100];
                }
                return;
            }
            
            var i, prevValue, loopField, loopValue, value,
                fieldNames = data.fieldNames,
                xSeries = data.xSeries,
                ranges = [];
            
            // about to do a bunch of work to make sure we draw a reasonable gauge even if the data
            // is not what we expected, but only if there were no ranges specified in the XML
            if(!this.rangesCameFromXML) {
                prevValue = -Infinity;
                for(i = 0; i < fieldNames.length; i++) {
                    loopField = fieldNames[i];
                    if(data.series[loopField].length > 0) {
                        loopValue = data.series[loopField][0].rawY;
                        if(!isNaN(loopValue) && loopValue > prevValue) {
                            ranges.push(loopValue);
                            prevValue = loopValue;
                        }
                    }
                }
                // if we were not able to extract at least two range values, punt to ranges of [0, 30, 70, 100]
                if(ranges.length < 2) {
                    ranges = [0, 30, 70, 100];
                }
                
                this.ranges = ranges;
            }
            // javascript likes to incorrectly parse timestamps as the year value, so explicitly set value to NaN for time axes
            value = (data.xAxisType === 'time') ? NaN : parseFloat(xSeries[0]);
            if(isNaN(value)) {
                value = (!this.rangesCameFromXML) ? ranges[0] : 0;
            }
            this.value = value;
        },

        updateValue: function(oldValue, newValue) {
            // if the value didn't change, do nothing
            if(oldValue === newValue) {
                return;
            }
            if(this.shouldAnimateTransition(oldValue, newValue)) {
                this.stopWobble();
                this.animateTransition(oldValue, newValue, this.drawIndicator.bind(this), this.onAnimationFinished.bind(this));
            }
            if(this.showValue) {
                var valueText = this.formatValue(newValue);
                this.updateValueDisplay(valueText);
            }
            if(this.testMode) {
                $(this.renderTo).attr('data-gauge-value', newValue);
            }
        },
        
        shouldAnimateTransition: function(oldValue, newValue) {
            // if we were already out of range, no need to animate the indicator
            return (this.normalizedTranslateValue(oldValue) !== this.normalizedTranslateValue(newValue));
        },
        
        drawTicks: function() {
            var i, loopTranslation, loopText,
                tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.maxTicksPerRange);
            
            for(i = 0; i < tickValues.length; i++) {
                loopTranslation = this.translateValue(tickValues[i]);
                if(this.showMajorTicks) {
                    this.elements['tickMark_' + tickValues[i]] = this.drawMajorTick(loopTranslation);
                }
                if(this.showLabels) {
                    loopText = this.formatTickLabel(tickValues[i]);
                    this.elements['tickLabel_' + tickValues[i]] = this.drawMajorTickLabel(loopTranslation, loopText);
                }
            }
            // if the labels are visible, check for collisions and remove ticks if needed before drawing the minors
            if(this.showLabels) {
                tickValues = this.removeTicksIfOverlap(tickValues);
            }
            
            if(this.showMinorTicks) {
                var majorInterval = tickValues[1] - tickValues[0],
                    minorInterval = majorInterval / this.minorsPerMajor,
                    startValue = (this.usePercentageRange) ? 
                            this.ranges[0] : 
                            tickValues[0] - Math.floor((tickValues[0] - this.ranges[0]) / minorInterval) * minorInterval;
                
                for(i = startValue; i <= this.ranges[this.ranges.length - 1]; i += minorInterval) {
                    if(!this.showMajorTicks || $.inArray(i, tickValues) < 0) {
                        loopTranslation = this.translateValue(i);
                        this.elements['minorTickMark_' + i] = this.drawMinorTick(loopTranslation);
                    }
                }
            }
        },
        
        removeTicksIfOverlap: function(tickValues) {
            while(tickValues.length > 2 && this.tickLabelsOverlap(tickValues)) {
                tickValues = this.removeEveryOtherTick(tickValues);
            }
            return tickValues;
        },
        
        tickLabelsOverlap: function(tickValues) {
            var i, labelOne, labelTwo,
                marginX = 3,
                marginY = 1;
            
            for(i = 0; i < tickValues.length - 1; i++) {
                labelOne = this.elements['tickLabel_' + tickValues[i]];
                labelTwo = this.elements['tickLabel_' + tickValues[i + 1]];
                if(this.formatter.bBoxesOverlap(labelOne.getBBox(), labelTwo.getBBox(), marginX, marginY)) {
                    return true;
                }
            }
            return false;
        },
        
        removeEveryOtherTick: function(tickValues) {
            var i,
                newTickValues = [];
            
            for(i = 0; i < tickValues.length; i++) {
                if(i % 2 === 0) {
                    newTickValues.push(tickValues[i]);
                }
                else {
                    this.elements['tickMark_' + tickValues[i]].destroy();
                    this.elements['tickLabel_' + tickValues[i]].destroy();
                    delete this.elements['tickMark_' + tickValues[i]];
                    delete this.elements['tickLabel_' + tickValues[i]];
                }
            }
            return newTickValues;
        },

        // we can't use the jQuery animation library explicitly to perform complex SVG animations, but
        // we can take advantage of their implementation using a meaningless css property and a custom step function
        animateTransition: function(startVal, endVal, drawFn, finishCallback) {
            var animationRange = endVal - startVal,
                duration = 500,
                animationProperties = {
                    duration: duration,
                    step: function(now, fx) {
                        drawFn(startVal + now);
                        this.nudgeChart();
                    }.bind(this)
                };
            
            if(finishCallback) {
                animationProperties.complete = function() {
                    finishCallback(endVal);
                };
            }
            // for the animation start and end values, use 0 and animationRange for consistency with the way jQuery handles
            // css properties that it doesn't recognize
            $(this.renderTo)
                .stop(true, true)
                .css({'animation-progress': 0})
                .animate({'animation-progress': animationRange}, animationProperties);
        },
        
        onAnimationFinished: function(val) {
            this.checkOutOfRange(val);
        },

        checkOutOfRange: function(val) {
            var totalRange, wobbleCenter, wobbleRange;

            if(val < this.ranges[0]) {
                totalRange = this.ranges[this.ranges.length - 1] - this.ranges[0];
                wobbleRange = totalRange * 0.005;
                wobbleCenter = this.ranges[0] + wobbleRange;
                this.wobble(wobbleCenter, wobbleRange, this.drawIndicator);
            }
            else if(val > this.ranges[this.ranges.length - 1]) {
                totalRange = this.ranges[this.ranges.length - 1] - this.ranges[0];
                wobbleRange = totalRange * 0.005;
                wobbleCenter = this.ranges[this.ranges.length - 1] - wobbleRange;
                this.wobble(wobbleCenter, wobbleRange, this.drawIndicator);
            }
        },
        
        translateValue: function(val) {
            // to be implemented by subclass
        },
        
        normalizedTranslateValue: function(val) {
            // to be implemented by subclass
        },
        
        formatValue: function(val) {
            return (this.usePercentageValue) ?  
                    this.formatPercent(((val - this.ranges[0]) / (this.ranges[this.ranges.length - 1] - this.ranges[0]))) : 
                    this.formatNumber(val);
        },
        
        formatTickLabel: function(val) {
            return (this.usePercentageRange) ?  
                    this.formatPercent(((val - this.ranges[0]) / (this.ranges[this.ranges.length - 1] - this.ranges[0]))) : 
                    this.formatNumber(val);
        },
        
        formatNumber: function(val) {
            var parsedVal = parseFloat(val),
                absVal = Math.abs(parsedVal);
            // if the magnitude is 1 billion or greater or less than one thousandth (and non-zero), express it in scientific notation
            if(absVal >= 1e9 || (absVal !== 0 && absVal < 1e-3)) {
                return format_scientific(parsedVal, "#.###E0");
            }
            return format_decimal(parsedVal);
        },
        
        formatPercent: function(val) {
            return format_percent(val);
        },

        wobble: function(center, range, drawFn) {
            var self = this,
                wobbleCounter = 0;
            
            this.wobbleInterval = setInterval(function() {
                var wobbleVal = center + (wobbleCounter % 3 - 1) * range;
                drawFn.call(self, wobbleVal);
                self.nudgeChart();
                wobbleCounter = (wobbleCounter + 1) % 3;
            }, 75);
            
        },
        
        stopWobble: function() {
            clearInterval(this.wobbleInterval);
        },

        nudgeChart: function() {
            // sometimes the VML renderer needs a "nudge" in the form of adding an invisible
            // element, this is a no-op for the SVG renderer
            if(this.hasSVG) {
                return;
            }
            if(this.elements.nudgeElement) {
                this.elements.nudgeElement.destroy();
            }
            this.elements.nudgeElement = this.renderer.rect(0, 0, 0, 0).add();
        },

        predictTextWidth: function(text, fontSize) {
            return this.formatter.predictTextWidth(text, fontSize);
        },

        calculateTickValues: function(start, end, numTicks) {
            var i, loopStart,
                range = end - start,
                rawTickInterval = range / (numTicks - 1),
                nearestPowerOfTen = this.mathUtils.nearestPowerOfTen(rawTickInterval),
                roundTickInterval = nearestPowerOfTen,
                tickValues = [];
                
            if(this.usePercentageRange) {
                roundTickInterval = (this.majorUnit && !isNaN(this.majorUnit)) ? this.majorUnit : 10;
                for(i = 0; i <= 100; i += roundTickInterval) {
                    tickValues.push(start + (i / 100) * range);
                }
            }
            else {
                if(this.majorUnit && !isNaN(this.majorUnit)) {
                    roundTickInterval = this.majorUnit;
                }
                else {
                    if(range / roundTickInterval > numTicks) {
                        // if the tick interval creates too many ticks, bump up to a factor of two
                        roundTickInterval *= 2;
                    }
                    if(range / roundTickInterval > numTicks) {
                        // if there are still too many ticks, bump up to a factor of five (of the original)
                        roundTickInterval *= (5 / 2);
                    }
                    if(range / roundTickInterval > numTicks) {
                        // if there are still too many ticks, bump up to a factor of ten (of the original)
                        roundTickInterval *= 2;
                    }
                }
                // in normal mode we label in whole numbers, so the tick discovery loop starts at 0 or an appropriate negative number
                // but in percent mode we force it to label the first range value and go from there
                loopStart = (this.usePercentageRange) ? 
                                start : 
                                (start >= 0) ? 0 : (start - start % roundTickInterval);
                for(i = loopStart; i <= end; i += roundTickInterval) {
                    if(i >= start) {
                        // work-around to deal with floating-point rounding errors
                        tickValues.push(parseFloat(i.toFixed(14)));
                    }
                }
            }
            return tickValues;
        },
        
        getColorByIndex: function(index) {
            return this.colorUtils.colorFromHex(this.colorPalette.getColor(null, index, this.ranges.length - 1));
        },
        
        roundWithMin: function(value, min) {
            return Math.max(Math.round(value), min);
        },
        
        roundWithMinMax: function(value, min, max) {
            var roundVal = Math.round(value);
            if(roundVal < min) {
                return min;
            }
            if(roundVal > max) {
                return max;
            }
            return roundVal;
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.RadialGauge


    Splunk.JSCharting.RadialGauge = $.klass(Splunk.JSCharting.AbstractGauge, {
        
        typeName: 'radialGauge-chart',

        // override
        initialize: function($super, container) {
            $super(container);
            // since the gauge is circular, have to handle when the container is narrower than it is tall
            this.chartHeight = (this.chartWidth < this.chartHeight) ? this.chartWidth : this.chartHeight;
            this.verticalPadding = 10;
            this.minorsPerMajor = 10;
            this.tickWidth = 1;
            
            this.showMinorTicks = false;
        },

        updateValueDisplay: function(valueText) {
            this.elements.valueDisplay.attr({
                text: valueText
            });
        },
        
        // override
        // since the gauge is circular, have to handle when the container is narrower than it is tall
        resize: function($super, width, height) {
            height = (width < height) ? width : height;
            $super(width, height);
        },

        // override
        applyPropertyByName: function($super, key, value, properties) {
            var angle;
            $super(key, value, properties);
            switch(key) {

                case 'chart.rangeStartAngle':
                    angle = parseInt(value, 10);
                    if(!isNaN(angle)) {
                        // add 90 to startAngle because we start at south instead of east
                        this.startAngle = this.degToRad(angle + 90);
                    }
                    break;
                case 'chart.rangeArcAngle':
                    angle = parseInt(value, 10);
                    if(!isNaN(angle)) {
                        this.arcAngle = this.degToRad(angle);
                    }
                    break;
                default:
                    // no-op, ignore unsupported properties
                    break;
            }
        },

        // override
        renderGauge: function() {
            this.borderWidth = this.roundWithMin(this.chartHeight / 60, 3);
            this.tickOffset = this.roundWithMin(this.chartHeight / 100, 3);
            this.tickLabelOffset = this.borderWidth;
            this.tickFontSize = this.roundWithMin(this.chartHeight / 25, 10);  // in pixels
            if(!this.startAngle) {
                this.startAngle = this.degToRad(45 + 90); // specify in degrees for legibility, + 90 because we start at south
            }
            if(!this.arcAngle) {
                this.arcAngle = this.degToRad(270);  // ditto above comment
            }
            this.valueFontSize = this.roundWithMin(this.chartHeight / 15, 15);  // in pixels
            if(this.isShiny) {
                this.needleTailLength = this.roundWithMin(this.chartHeight / 15, 10);
                this.needleTailWidth = this.roundWithMin(this.chartHeight / 50, 6);
                this.knobWidth = this.roundWithMin(this.chartHeight / 30, 7);
            }
            else {
                this.needleWidth = this.roundWithMin(this.chartHeight / 60, 3);
            }
            if(!this.isShiny) {
                this.bandOffset = 0;
                this.bandThickness = this.roundWithMin(this.chartHeight / 30, 7);
            }
            else {
                this.bandOffset = this.borderWidth;
                this.bandThickness = this.roundWithMin(this.chartHeight / 40, 4);
            }
            this.tickColor = (!this.isShiny) ? this.foregroundColor : 'silver';
            this.tickFontColor = (!this.isShiny) ? this.fontColor : 'silver';
            this.valueColor = (!this.isShiny) ? this.fontColor : '#b8b167';
            this.tickLength = this.roundWithMin(this.chartHeight / 20, 4);
            this.minorTickLength = this.tickLength / 2;
            this.radius = (this.chartHeight - 2 * (this.verticalPadding + this.borderWidth)) / 2;
            this.valueHeight = this.chartHeight - ((this.radius / 4) + this.verticalPadding + this.borderWidth);
            this.needleLength = (!this.isShiny) ? this.radius - (this.bandThickness) / 2 : this.radius;
           
            this.tickStart = this.radius - this.bandOffset - this.bandThickness - this.tickOffset;
            this.tickEnd = this.tickStart - this.tickLength;
            this.tickLabelPosition = this.tickEnd - this.tickLabelOffset;
            this.minorTickEnd = this.tickStart - this.minorTickLength;
            
            if(this.isShiny) {
                this.elements.border = this.renderer.circle(this.chartWidth / 2,
                            this.chartHeight / 2, this.radius + this.borderWidth)
                    .attr({
                        fill: '#edede7',
                        stroke: 'silver',
                        'stroke-width': 1
                    })
                    .add();
        
                this.elements.background = this.renderer.circle(this.chartWidth / 2,
                            this.chartHeight / 2, this.radius)
                    .attr({
                        fill: '#000000'
                    })
                    .add();
            }

            if(this.showRangeBand) {
                this.drawColorBand();
            }
            this.drawTicks();
            this.drawIndicator(this.value);
            if(this.showValue) {
                this.drawValueDisplay();
            }

            this.checkOutOfRange(this.value);
        },

        drawColorBand: function() {
            var i, startAngle, endAngle,
                outerRadius = this.radius - this.bandOffset,
                innerRadius = outerRadius - this.bandThickness;

            for(i = 0; i < this.ranges.length - 1; i++) {
                startAngle = this.translateValue(this.ranges[i]);
                endAngle = this.translateValue(this.ranges[i + 1]);
                
                this.elements['colorBand' + i] = this.renderer.arc(this.chartWidth / 2, this.chartHeight / 2,
                            outerRadius, innerRadius, startAngle, endAngle)
                    .attr({
                        fill: this.getColorByIndex(i)
                    })
                    .add();
            }
        },
        
        drawMajorTick: function(angle) {
            var element = this.renderer.path([
                    'M', (this.chartWidth / 2) + this.tickStart * Math.cos(angle),
                         (this.chartHeight / 2) + this.tickStart * Math.sin(angle),
                    'L', (this.chartWidth / 2) + this.tickEnd * Math.cos(angle),
                         (this.chartHeight / 2) + this.tickEnd * Math.sin(angle)
                ])
                .attr({
                    stroke: this.tickColor,
                    'stroke-width': this.tickWidth
                })
                .add();
            
            return element;
        },
        
        drawMajorTickLabel: function(angle, text) {
            var sin = Math.sin(angle),
                labelWidth = this.predictTextWidth(text, this.tickFontSize),
                textAlignment = (angle < (1.5 * Math.PI)) ? 'left' : 'right',
                xOffset = (angle < (1.5 * Math.PI)) ? (-labelWidth / 2) * sin *  sin :
                                (labelWidth / 2) * sin * sin,
                yOffset = (this.tickFontSize / 4) * sin,
                element = this.renderer.text(text,
                    (this.chartWidth / 2) + (this.tickLabelPosition) * Math.cos(angle)
                        + xOffset,
                    (this.chartHeight / 2) + (this.tickLabelPosition - 4) * sin
                        + (this.tickFontSize / 4) - yOffset
                )
                .attr({
                    align: textAlignment
                })
                .css({
                    color: this.tickFontColor,
                    fontSize: this.tickFontSize + 'px'
                })
                .add();
            
            return element;
        },
        
        drawMinorTick: function(angle) {
            var element = this.renderer.path([
                 'M', (this.chartWidth / 2) + this.tickStart * Math.cos(angle),
                      (this.chartHeight / 2) + this.tickStart * Math.sin(angle),
                 'L', (this.chartWidth / 2) + this.minorTickEnd * Math.cos(angle),
                      (this.chartHeight / 2) + this.minorTickEnd * Math.sin(angle)
             ])
             .attr({
                 stroke: this.tickColor,
                 'stroke-width': this.tickWidth
             })
             .add();
            
            return element;
        },

        drawIndicator: function(val) {
            var needlePath, needleStroke, needleStrokeWidth,
                needleFill, needleRidgePath, knobFill,
                valueAngle = this.normalizedTranslateValue(val),
                myCos = Math.cos(valueAngle),
                mySin = Math.sin(valueAngle);
            
            if(!this.isShiny) {
                needlePath = [
                    'M', (this.chartWidth / 2), 
                            (this.chartHeight / 2),
                    'L', (this.chartWidth / 2) + myCos * this.needleLength,
                            (this.chartHeight / 2) + mySin * this.needleLength
                ];
                needleStroke = this.foregroundColor;
                needleStrokeWidth = this.needleWidth;
            }
            else {
                needlePath = [
                   'M', (this.chartWidth / 2) - this.needleTailLength * myCos,
                            (this.chartHeight / 2) - this.needleTailLength * mySin,
                   'L', (this.chartWidth / 2) - this.needleTailLength * myCos + this.needleTailWidth * mySin,
                            (this.chartHeight / 2) - this.needleTailLength * mySin - this.needleTailWidth * myCos,
                        (this.chartWidth / 2) + this.needleLength * myCos,
                            (this.chartHeight / 2) + this.needleLength * mySin,
                        (this.chartWidth / 2) - this.needleTailLength * myCos - this.needleTailWidth * mySin,
                            (this.chartHeight / 2) - this.needleTailLength * mySin + this.needleTailWidth * myCos,
                        (this.chartWidth / 2) - this.needleTailLength * myCos,
                            (this.chartHeight / 2) - this.needleTailLength * mySin
                ];
                needleFill = {
                    linearGradient: [(this.chartWidth / 2) - this.needleTailLength * myCos,
                                        (this.chartHeight / 2) - this.needleTailLength * mySin,
                                    (this.chartWidth / 2) - this.needleTailLength * myCos - this.needleTailWidth * mySin,
                                        (this.chartHeight / 2) - this.needleTailLength * mySin + this.needleTailWidth * myCos],
                    stops: [
                        [0, '#999999'],
                        [0.2, '#cccccc']
                    ]
                };
                needleRidgePath = [
                    'M', (this.chartWidth / 2) - (this.needleTailLength - 2) * myCos,
                            (this.chartHeight / 2) - (this.needleTailLength - 2) * mySin,
                    'L', (this.chartWidth / 2) + (this.needleLength - (this.bandOffset / 2)) * myCos,
                            (this.chartHeight / 2) + (this.needleLength - (this.bandOffset / 2)) * mySin
                ];
                knobFill = {
                    linearGradient: [(this.chartWidth / 2) + this.knobWidth * mySin,
                                         (this.chartHeight / 2) - this.knobWidth * myCos,
                                     (this.chartWidth / 2) - this.knobWidth * mySin,
                                         (this.chartHeight / 2) + this.knobWidth * myCos],
                    stops: [
                        [0, 'silver'],
                        [0.5, 'black'],
                        [1, 'silver']
                    ]
                };
            }
            if(this.isShiny) {
                if(this.elements.centerKnob) {
                    this.elements.centerKnob.destroy();
                }
                this.elements.centerKnob = this.renderer.circle(this.chartWidth / 2, this.chartHeight /2, this.knobWidth)
                    .attr({
                        fill: knobFill
                    })
                    .add();
            }
            if(this.elements.needle) {
                this.elements.needle.destroy();
            }
            this.elements.needle = this.renderer.path(needlePath)
               .attr({
                   fill: needleFill || '',
                   stroke: needleStroke || '',
                   'stroke-width': needleStrokeWidth || ''
               })
               .add();
            if(this.isShiny) {
                if(this.elements.needleRidge) {
                    this.elements.needleRidge.destroy();
                }
                this.elements.needleRidge = this.renderer.path(needleRidgePath)
                    .attr({
                        stroke: '#cccccc',
                        'stroke-width': 1
                    })
                    .add();
            }
        },

        drawValueDisplay: function() {
            var valueText = this.formatValue(this.value);
            this.elements.valueDisplay = this.renderer.text(valueText, this.chartWidth / 2, this.valueHeight)
                .css({
                    color: this.valueColor,
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                })
                .attr({
                    align: 'center'
                })
                .add();
        },

        normalizedTranslateValue: function(val) {
            if(val < this.ranges[0]) {
                return this.translateValue(this.ranges[0]);
            }
            if(val > this.ranges[this.ranges.length - 1]) {
                return this.translateValue(this.ranges[this.ranges.length - 1]);
            }
            return this.translateValue(val);
        },

        translateValue: function(val) {
            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
                normalizedValue = val - this.ranges[0];

            return this.startAngle + ((normalizedValue / dataRange) * this.arcAngle);
        },

        degToRad: function(deg) {
            return (deg * Math.PI) / 180;
        }

    });


    ///////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractFillerGauge


    Splunk.JSCharting.AbstractFillerGauge = $.klass(Splunk.JSCharting.AbstractGauge, {
        
        typeName: 'fillerGauge-chart',
        
        // override
        initialize: function($super, container) {
            $super(container);
            this.minorsPerMajor = 5;
            this.minorTickWidth = 1;
        },

        // override
        onAnimationFinished: function(val) {
            // no-op for filler gauges
        },
        
        // override
        renderGauge: function() {
            this.tickColor = this.foregroundColor;
            this.tickFontColor = this.fontColor;
            this.defaultValueColor = (this.isShiny) ? 'black' : this.fontColor;
            this.drawBackground();
            this.drawTicks();
            this.drawIndicator(this.value);
        },
        
        // override
        // use the decimal precision of the old and new values to set things up for a smooth animation
        updateValue: function($super, oldValue, newValue) {
            var oldPrecision = this.mathUtils.getDecimalPrecision(oldValue, 3),
                newPrecision = this.mathUtils.getDecimalPrecision(newValue, 3);
            
            this.valueAnimationPrecision = Math.max(oldPrecision, newPrecision);
            $super(oldValue, newValue);
        },
        
        getDisplayValue: function(rawVal) {
            // unless this we are displaying a final value, round the value to the animation precision for a smooth transition
            var multiplier = Math.pow(10, this.valueAnimationPrecision);
            return ((rawVal !== this.value) ? (Math.round(rawVal * multiplier) / multiplier) : rawVal);
        },
        
        // override
        updateValueDisplay: function(valueText) {
            // no-op, value display is updated as part of drawIndicator
        },
        
        // filler gauges animate the change in the value display, 
        // so they always animate transitions, even when the values are out of range
        shouldAnimateTransition: function(oldValue, newValue) {
            return true;
        },
        
        getFillColor: function(val) {
            var i;
            for(i = 0; i < this.ranges.length - 2; i++) {
                if(val < this.ranges[i + 1]) {
                    break;
                }
            }
            return this.getColorByIndex(i);
        },

        // use the value to determine the fill color, then use that color's luminance determine
        // if a light or dark font color should be used
        getValueColor: function(fillColor) {
            var fillColorHex = this.colorUtils.hexFromColor(fillColor),
                luminanceThreshold = 128,
                darkColor = 'black',
                lightColor = 'white',
                fillLuminance = this.colorUtils.getLuminance(fillColorHex);

            return (fillLuminance < luminanceThreshold) ? lightColor : darkColor;
        }
        
    });


    ///////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.VerticalFillerGauge


    Splunk.JSCharting.VerticalFillerGauge = $.klass(Splunk.JSCharting.AbstractFillerGauge, {
        
        // overrride
        initialize: function($super, container) {
            $super(container);
            this.tickWidth = 1;
        },
        
        // override
        renderGauge: function($super) {
            this.tickOffset = this.roundWithMin(this.chartHeight / 100, 3);
            this.tickLength = this.roundWithMin(this.chartHeight / 20, 4);
            this.tickLabelOffset = this.roundWithMin(this.chartHeight / 60, 3);
            this.tickFontSize = this.roundWithMin(this.chartHeight / 20, 10);  // in pixels
            this.minorTickLength = this.tickLength / 2;
            this.backgroundCornerRad = this.roundWithMin(this.chartHeight / 60, 3);
            this.valueBottomPadding = this.roundWithMin(this.chartHeight / 30, 5);
            this.valueFontSize = this.roundWithMin(this.chartHeight / 20, 12);  // in pixels
            $super();
        },

        drawBackground: function() {
            this.verticalPadding = 10 + this.tickFontSize / 2;
            this.backgroundWidth = this.roundWithMin(this.chartHeight / 4, 50);
            this.backgroundHeight = this.chartHeight - (2 * this.verticalPadding);

            // rather than trying to dynamically increase the width as the values come in, we
            // provide enough room for an order of magnitude greater than the highest range value
            var maxValueWidth = this.determineMaxValueWidth(this.ranges, this.valueFontSize) + 10;
            
            this.backgroundWidth = Math.max(this.backgroundWidth, maxValueWidth);

            if(this.isShiny) {
                this.elements.background = this.renderer.rect((this.chartWidth - this.backgroundWidth) / 2,
                        this.verticalPadding, this.backgroundWidth, this.backgroundHeight,
                        this.backgroundCornerRad)
                    .attr({
                        fill: '#edede7',
                        stroke: 'silver',
                        'stroke-width': 1
                    })
                    .add();
            }
            
            // these values depend on the adjusted width of the background
            this.tickStartX = (this.chartWidth + this.backgroundWidth) / 2 + this.tickOffset;
            this.tickEndX = this.tickStartX + this.tickLength;
            this.tickLabelStartX = this.tickEndX + this.tickLabelOffset;
        },

        determineMaxValueWidth: function(ranges, fontSize) {
            // in percent mode, we can hard-code what the max-width value can be
            if(this.usePercentageValue) {
                return this.predictTextWidth("100.00%", fontSize);
            }
            var i, valueString,
                maxWidth = 0;
                
            // loop through all ranges and determine which has the greatest width (because of scientific notation, we can't just look at the extremes)
            // additionally add an extra digit to the min and max ranges to accomodate out-of-range values
            for(i = 0; i < ranges.length; i++) {
                valueString = "" + ranges[i];
                if(i === 0 || i === ranges.length - 1) {
                    valueString += "0";
                }
                maxWidth = Math.max(maxWidth, this.predictTextWidth(valueString, fontSize));
            }
            return maxWidth;
        },
        
        drawMajorTick: function(height) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - height;
            
            var element = this.renderer.path([
                    'M', this.tickStartX, tickHeight,
                    'L', this.tickEndX, tickHeight
                ])
                .attr({
                    stroke: this.tickColor,
                    'stroke-width': this.tickWidth
                })
                .add();
            
            return element;
        },
        
        drawMajorTickLabel: function(height, text) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - height;
            
            var element = this.renderer.text(text,
                    this.tickLabelStartX, tickHeight + (this.tickFontSize / 4)
                )
                .attr({
                    align: 'left'
                })
                .css({
                    color: this.tickFontColor,
                    fontSize: this.tickFontSize + 'px'
                })
                .add();
            
            return element;
        },
        
        drawMinorTick: function(height) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - height;
            
            var element = this.renderer.path([
                     'M', this.tickStartX, tickHeight,
                     'L', this.tickStartX + this.minorTickLength, tickHeight
                 ])
                 .attr({
                     stroke: this.tickColor,
                     'stroke-width': this.minorTickWidth
                 })
                 .add();
            
            return element;
        },

        drawIndicator: function(val) {
            // TODO: implement calculation of gradient based on user-defined colors
            // for now we are using solid colors
            
            var //fillGradient = this.getFillGradient(val),
                fillColor = this.getFillColor(val),
                fillHeight = this.normalizedTranslateValue(val),
                fillTopY,
                fillPath;
                if(fillHeight > 0) {
                    fillHeight = Math.max(fillHeight, this.backgroundCornerRad);
                    fillTopY = this.verticalPadding + this.backgroundHeight - fillHeight;
                    if(!this.isShiny) {
                        fillPath = [
                            'M', (this.chartWidth - this.backgroundWidth) / 2,
                                    this.chartHeight - this.verticalPadding,
                            'L', (this.chartWidth + this.backgroundWidth) / 2,
                                    this.chartHeight - this.verticalPadding,
                                 (this.chartWidth + this.backgroundWidth) / 2,
                                    fillTopY,
                                 (this.chartWidth - this.backgroundWidth) / 2,
                                    fillTopY,
                                 (this.chartWidth - this.backgroundWidth) / 2,
                                    this.chartHeight - this.verticalPadding
                        ];
                    }
                    else {
                        fillPath = [
                            'M', (this.chartWidth - this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding - this.backgroundCornerRad,
                            'C', (this.chartWidth - this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding - this.backgroundCornerRad,
                                 (this.chartWidth - this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding,
                                 (this.chartWidth - this.backgroundWidth - 2) / 2 + this.backgroundCornerRad,
                                    this.chartHeight - this.verticalPadding,
                            'L', (this.chartWidth + this.backgroundWidth - 2) / 2 - this.backgroundCornerRad,
                                    this.chartHeight - this.verticalPadding,
                            'C', (this.chartWidth + this.backgroundWidth - 2) / 2 - this.backgroundCornerRad,
                                    this.chartHeight - this.verticalPadding,
                                 (this.chartWidth + this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding,
                                 (this.chartWidth + this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding - this.backgroundCornerRad,
                            'L', (this.chartWidth + this.backgroundWidth - 2) / 2,
                                    fillTopY,
                                 (this.chartWidth - this.backgroundWidth - 2) / 2,
                                    fillTopY,
                                 (this.chartWidth - this.backgroundWidth - 2) / 2,
                                    this.chartHeight - this.verticalPadding - this.backgroundCornerRad
                        ];
                    }
                }
                else {
                    fillPath = [];
                }

            if(this.elements.fill) {
                this.elements.fill.destroy();
            }
            this.elements.fill = this.renderer.path(fillPath)
                .attr({
                    fill: fillColor
                })
                .add();
            if(this.showValue) {
                this.drawValueDisplay(val, fillColor);
            }
        },

        drawValueDisplay: function(val, fillColor) {
            var displayVal = this.getDisplayValue(val),
                fillHeight = this.normalizedTranslateValue(val),
                fillTopY = this.verticalPadding + this.backgroundHeight - fillHeight,
                valueTotalHeight = this.valueFontSize + this.valueBottomPadding,
                
                valueColor = this.getValueColor(fillColor),
                valueBottomY,
                valueText = this.formatValue(displayVal);
            
            // determine if the value display can (vertically) fit inside the fill,
            // if not orient it to the bottom of the fill
            if(fillHeight >= valueTotalHeight) {
                valueBottomY = fillTopY + valueTotalHeight - this.valueBottomPadding;
            }
            else {
                valueBottomY = fillTopY - this.valueBottomPadding;
                valueColor = this.defaultValueColor;
            }
            if(this.elements.valueDisplay) {
                this.elements.valueDisplay.attr({
                    text: valueText,
                    y: valueBottomY
                })
                .css({
                    color: valueColor,
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                }).toFront();
            }
            else {
                this.elements.valueDisplay = this.renderer.text(
                    valueText, this.chartWidth / 2, valueBottomY
                )
                .css({
                    color: valueColor,
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                })
                .attr({
                    align: 'center'
                })
                .add();
            }
        },

        normalizedTranslateValue: function(val) {
            if(val < this.ranges[0]) {
                return 0;
            }
            if(val > this.ranges[this.ranges.length - 1]) {
                return this.translateValue(this.ranges[this.ranges.length - 1]) + 5;
            }
            return this.translateValue(val);
        },

        translateValue: function(val) {
            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
                normalizedValue = val - this.ranges[0];

            return Math.round((normalizedValue / dataRange) * this.backgroundHeight);
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.HorizontalFillerGauge


    Splunk.JSCharting.HorizontalFillerGauge = $.klass(Splunk.JSCharting.AbstractFillerGauge, {
        
        // override
        initialize: function($super, container) {
            $super(container);
            this.horizontalPadding = 20;
            this.tickOffset = 5;
            this.tickLength = 15;
            this.tickWidth = 1;
            this.tickLabelOffset = 5;
            this.minorTickLength = Math.floor(this.tickLength / 2);
        },
        
        renderGauge: function($super) {
            this.tickFontSize = this.roundWithMinMax(this.chartWidth / 50, 10, 20);  // in pixels
            this.backgroundCornerRad = this.roundWithMinMax(this.chartWidth / 120, 3, 5);
            this.valueFontSize = this.roundWithMinMax(this.chartWidth / 40, 15, 25);  // in pixels
            this.backgroundHeight = this.valueFontSize * 3;
            this.valueBottomPadding = this.roundWithMinMax(this.chartWidth / 100, 5, 10);
            $super();
        },
        
        drawBackground: function() {
            var tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.maxTicksPerRange),
                maxTickValue = tickValues[tickValues.length - 1],
                maxTickWidth = this.predictTextWidth(this.formatValue(maxTickValue), this.tickFontSize);
            
            this.horizontalPadding = Math.max(this.horizontalPadding, maxTickWidth);
            this.backgroundWidth = this.chartWidth - (2 * this.horizontalPadding);

            if(this.isShiny) {
                this.elements.background = this.renderer.rect(this.horizontalPadding,
                        (this.chartHeight - this.backgroundHeight) / 2, this.backgroundWidth, this.backgroundHeight,
                        this.backgroundCornerRad)
                    .attr({
                        fill: '#edede7',
                        stroke: 'silver',
                        'stroke-width': 1
                    })
                    .add();
            }
            
            // no actual dependency here, but want to be consistent with sibling class
            this.tickStartY = (this.chartHeight + this.backgroundHeight) / 2 + this.tickOffset;
            this.tickEndY = this.tickStartY + this.tickLength;
            this.tickLabelStartY = this.tickEndY + this.tickLabelOffset;
        },
        
        drawMajorTick: function(offset) {
            var tickOffset = this.horizontalPadding + offset;
            
            var element = this.renderer.path([
                    'M', tickOffset, this.tickStartY,
                    'L', tickOffset, this.tickEndY
                ])
                .attr({
                    stroke: this.tickColor,
                    'stroke-width': this.tickWidth
                })
                .add();
            
            return element;
        },
        
        drawMajorTickLabel: function(offset, text) {
            var tickOffset = this.horizontalPadding + offset;
            
            var element = this.renderer.text(text,
                    tickOffset, this.tickLabelStartY + this.tickFontSize
                )
                .attr({
                    align: 'center'
                })
                .css({
                    color: this.tickFontColor,
                    fontSize: this.tickFontSize + 'px'
                })
                .add();
            
            return element;
        },
        
        drawMinorTick: function(offset) {
            var tickOffset = this.horizontalPadding + offset;
            
            var element = this.renderer.path([
                     'M', tickOffset, this.tickStartY,
                     'L', tickOffset, this.tickStartY + this.minorTickLength
                 ])
                 .attr({
                     stroke: this.tickColor,
                     'stroke-width': this.minorTickWidth
                 })
                 .add();
            
            return element;
        },

        drawIndicator: function(val) {
            // TODO: implement calculation of gradient based on user-defined colors
            // for not we are using solid colors
            
            var //fillGradient = this.getFillGradient(val),
                fillColor = this.getFillColor(val),
                fillOffset = this.normalizedTranslateValue(val),
                fillTopX,
                fillPath;
                if(fillOffset > 0) {
                    fillOffset = Math.max(fillOffset, this.backgroundCornerRad);
                    fillTopX = this.horizontalPadding + fillOffset;
                    if(!this.isShiny) {
                        fillPath = [
                            'M', this.horizontalPadding,
                                    (this.chartHeight - this.backgroundHeight) / 2,
                            'L', fillTopX,
                                    (this.chartHeight - this.backgroundHeight) / 2,
                                 fillTopX,
                                     (this.chartHeight + this.backgroundHeight) / 2,
                                 this.horizontalPadding,
                                     (this.chartHeight + this.backgroundHeight) / 2,
                                 this.horizontalPadding,
                                     (this.chartHeight - this.backgroundHeight) / 2
                        ];
                    }
                    else {
                        fillPath = [
                            'M', this.horizontalPadding + this.backgroundCornerRad,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2,
                            'C', this.horizontalPadding + this.backgroundCornerRad,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2,
                                 this.horizontalPadding,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2,
                                 this.horizontalPadding,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2 + this.backgroundCornerRad,
                            'L', this.horizontalPadding,
                                    (this.chartHeight + this.backgroundHeight) / 2 - this.backgroundCornerRad,
                            'C', this.horizontalPadding,
                                    (this.chartHeight + this.backgroundHeight) / 2 - this.backgroundCornerRad,
                                 this.horizontalPadding,
                                    (this.chartHeight + this.backgroundHeight) / 2,
                                 this.horizontalPadding + this.backgroundCornerRad,
                                    (this.chartHeight + this.backgroundHeight) / 2,
                            'L', fillTopX,
                                    (this.chartHeight + this.backgroundHeight) / 2,
                                 fillTopX,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2,
                                 this.horizontalPadding + this.backgroundCornerRad,
                                    (this.chartHeight - this.backgroundHeight - 2) / 2
                        ];
                    }
                }
                else {
                    fillPath = [];
                }

            if(this.elements.fill) {
                this.elements.fill.destroy();
            }
            this.elements.fill = this.renderer.path(fillPath)
                .attr({
                    fill: fillColor
                })
                .add();
            if(this.showValue) {
                this.drawValueDisplay(val, fillColor, fillOffset);
            }
        },

        drawValueDisplay: function(val, fillColor, fillOffset) {
            var displayVal = this.getDisplayValue(val),
                fillTopX = this.horizontalPadding + fillOffset,
                valueColor = this.getValueColor(fillColor),
                valueStartX,
                valueText = this.formatValue(displayVal),
                valueTotalWidth = this.predictTextWidth(valueText, this.valueFontSize) + this.valueBottomPadding;

            // determine if the value display can (horizontally) fit inside the fill,
            // if not orient it to the right of the fill
            if(fillOffset >= valueTotalWidth) {
                valueStartX = fillTopX - valueTotalWidth;
            }
            else {
                valueStartX = fillTopX + this.valueBottomPadding;
                valueColor = this.defaultValueColor;
            }
            if(this.elements.valueDisplay) {
                this.elements.valueDisplay.attr({
                    text: valueText,
                    x: valueStartX
                })
                .css({
                    color: valueColor,
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                }).toFront();
            }
            else {
                this.elements.valueDisplay = this.renderer.text(
                    valueText, valueStartX, (this.chartHeight / 2) + this.valueFontSize / 4
                )
                .css({
                    color: valueColor,
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                })
                .attr({
                    align: 'left'
                })
                .add();
            }
        },

        normalizedTranslateValue: function(val) {
            if(val < this.ranges[0]) {
                return 0;
            }
            if(val > this.ranges[this.ranges.length - 1]) {
                return this.translateValue(this.ranges[this.ranges.length - 1]);
            }
            return this.translateValue(val);
        },

        translateValue: function(val) {
            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
                normalizedValue = val - this.ranges[0];

            return Math.round((normalizedValue / dataRange) * this.backgroundWidth);
        }
        
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.AbstractMarkerGauge


    Splunk.JSCharting.AbstractMarkerGauge = $.klass(Splunk.JSCharting.AbstractGauge, {
        
        typeName: 'markerGauge-chart',

        // override
        initialize: function($super, container) {
            $super(container);
            this.bandCornerRad = 0;
            this.tickLabelPaddingRight = 10;
            this.minorsPerMajor = 5;
            this.minorTickWidth = 1;
            this.tickWidth = 1;
            
            this.showValue = false;
        },

        // override
        renderGauge: function() {
            this.tickColor = (this.isShiny) ? 'black' : this.foregroundColor;
            this.tickFontColor = (this.isShiny) ? 'black' : this.fontColor;
            this.valueOffset = (this.isShiny) ? this.markerSideWidth + 10 : this.valueFontSize;
            this.drawBackground();
            if(this.showRangeBand) {
                this.drawBand();
            }
            this.drawTicks();
            this.drawIndicator(this.value);
            this.checkOutOfRange(this.value);
        },
        
        // override
        updateValueDisplay: function(valueText) {
            // no-op, value display is updated as part of drawIndicator
        }
        
    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.VerticalMarkerGauge


    Splunk.JSCharting.VerticalMarkerGauge = $.klass(Splunk.JSCharting.AbstractMarkerGauge, {
        
        // override
        initialize: function($super, container) {
            $super(container);
            this.verticalPadding = 10;
        },
        
        // override
        renderGauge: function($super) {
            this.markerWindowHeight = this.roundWithMin(this.chartHeight / 7, 20);
            this.markerSideWidth = this.markerWindowHeight / 2;
            this.markerSideCornerRad = this.markerSideWidth / 3;
            this.bandOffsetBottom = 5 + this.markerWindowHeight / 2;
            this.bandOffsetTop = 5 + this.markerWindowHeight / 2;
            this.tickOffset = this.roundWithMin(this.chartHeight / 100, 3);
            this.tickLength = this.roundWithMin(this.chartHeight / 20, 4);
            this.tickLabelOffset = this.roundWithMin(this.chartHeight / 60, 3);
            this.tickFontSize = this.roundWithMin(this.chartHeight / 20, 10);  // in pixels
            this.minorTickLength = this.tickLength / 2;
            this.backgroundCornerRad = this.roundWithMin(this.chartHeight / 60, 3);
            this.valueFontSize = this.roundWithMin(this.chartHeight / 15, 15);  // in pixels
            
            this.bandOffsetX = (!this.isShiny) ? 0 : this.roundWithMin(this.chartHeight / 60, 3);
            $super();
        },
        
        drawBackground: function() {
            this.backgroundWidth = this.roundWithMin(this.chartHeight / 4, 50);
            var tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.maxTicksPerRange);
            this.backgroundHeight = this.chartHeight - (2 * this.verticalPadding);
            this.bandHeight = this.backgroundHeight - (this.bandOffsetBottom + this.bandOffsetTop);
            this.bandWidth = (!this.isShiny) ? 30 : 10;

            var maxLabelWidth, totalWidthNeeded,
                maxTickValue = tickValues[tickValues.length - 1];

            maxLabelWidth = this.predictTextWidth(this.formatValue(maxTickValue), this.tickFontSize);
            totalWidthNeeded = this.bandOffsetX + this.bandWidth + this.tickOffset + this.tickLength + this.tickLabelOffset
                    + maxLabelWidth + this.tickLabelPaddingRight;
            
            this.backgroundWidth = Math.max(this.backgroundWidth, totalWidthNeeded);
            
            if(this.isShiny) {
                this.elements.background = this.renderer.rect((this.chartWidth - this.backgroundWidth) / 2,
                        this.verticalPadding, this.backgroundWidth, this.backgroundHeight,
                        this.backgroundCornerRad)
                    .attr({
                        fill: '#edede7',
                        stroke: 'silver',
                        'stroke-width': 1
                    })
                    .add();
            }
            
            // these values depend on the adjusted background width
            this.tickStartX = (this.chartWidth - this.backgroundWidth) / 2 + (this.bandOffsetX + this.bandWidth)
                            + this.tickOffset;
            this.tickEndX = this.tickStartX + this.tickLength;
            this.tickLabelStartX = this.tickEndX + this.tickLabelOffset;
        },

        drawBand: function() {
            var i, startHeight, endHeight,
                bandLeftX = ((this.chartWidth - this.backgroundWidth) / 2) + this.bandOffsetX,
                bandBottomY = this.chartHeight - this.verticalPadding - this.bandOffsetBottom;

            for(i = 0; i < this.ranges.length - 1; i++) {
                startHeight = this.translateValue(this.ranges[i]);
                endHeight = this.translateValue(this.ranges[i + 1]);
                this.elements['colorBand' + i] = this.renderer.rect(
                        bandLeftX, bandBottomY - endHeight,
                        this.bandWidth, endHeight - startHeight, this.bandCornerRad
                    )
                    .attr({
                        fill: this.getColorByIndex(i)
                    })
                    .add();
            }
        },
        
        drawMajorTick: function(height) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - (this.bandOffsetBottom + height);
            
            var element = this.renderer.path([
                    'M', this.tickStartX, tickHeight,
                    'L', this.tickEndX, tickHeight
                ])
                .attr({
                    stroke: this.tickColor,
                    'stroke-width': this.tickWidth
                })
                .add();
            
            return element;
        },
        
        drawMajorTickLabel: function(height, text) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - (this.bandOffsetBottom + height);
            
            var element = this.renderer.text(text,
                    this.tickLabelStartX, tickHeight + (this.tickFontSize / 4)
                )
                .attr({
                    align: 'left'
                })
                .css({
                    color: this.tickFontColor,
                    fontSize: this.tickFontSize + 'px'
                })
                .add();
            
            return element;
        },
        
        drawMinorTick: function(height) {
            var tickHeight = this.verticalPadding + this.backgroundHeight - (this.bandOffsetBottom + height);
            
            var element = this.renderer.path([
                     'M', this.tickStartX, tickHeight,
                     'L', this.tickStartX + this.minorTickLength, tickHeight
                 ])
                 .attr({
                     stroke: this.tickColor,
                     'stroke-width': this.minorTickWidth
                 })
                 .add();
            
            return element;
        },

        drawIndicator: function(val) {
            var markerHeight = this.normalizedTranslateValue(val),
                markerStartY = this.verticalPadding + this.backgroundHeight
                                - (this.bandOffsetBottom + markerHeight),
                markerStartX = (!this.isShiny) ? (this.chartWidth - this.backgroundWidth) / 2 - 10 : (this.chartWidth - this.backgroundWidth) / 2,
                markerEndX = (!this.isShiny) ? markerStartX + this.bandWidth + 20 : markerStartX + this.backgroundWidth,
                markerLineStroke = this.foregroundColor, // will be changed to red for shiny
                markerLineWidth = 3, // wil be changed to 1 for shiny
                markerLinePath = [
                    'M', markerStartX, markerStartY,
                    'L', markerEndX, markerStartY
                ];
            if(this.isShiny) {
                var markerLHSPath = [
                    'M', markerStartX,
                            markerStartY - this.markerWindowHeight / 2,
                    'L', markerStartX - (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY - this.markerWindowHeight / 2,
                    'C', markerStartX - (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY - this.markerWindowHeight / 2,
                         markerStartX - this.markerSideWidth,
                            markerStartY - this.markerWindowHeight / 2,
                         markerStartX - this.markerSideWidth,
                            markerStartY - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
                    'L', markerStartX - this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                    'C', markerStartX - this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                         markerStartX - this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2),
                         markerStartX - (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY + (this.markerWindowHeight / 2),
                    'L', markerStartX,
                            markerStartY + this.markerWindowHeight / 2,
                         markerStartX,
                            markerStartY - this.markerWindowHeight / 2
                ],
                markerRHSPath = [
                    'M', markerEndX,
                            markerStartY - this.markerWindowHeight / 2,
                    'L', markerEndX + (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY - this.markerWindowHeight / 2,
                    'C', markerEndX + (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY - this.markerWindowHeight / 2,
                         markerEndX + this.markerSideWidth,
                            markerStartY - this.markerWindowHeight / 2,
                         markerEndX + this.markerSideWidth,
                            markerStartY - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
                    'L', markerEndX + this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                    'C', markerEndX + this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                         markerEndX + this.markerSideWidth,
                            markerStartY + (this.markerWindowHeight / 2),
                         markerEndX + (this.markerSideWidth - this.markerSideCornerRad),
                            markerStartY + (this.markerWindowHeight / 2),
                    'L', markerEndX,
                            markerStartY + this.markerWindowHeight / 2,
                         markerEndX,
                            markerStartY - this.markerWindowHeight / 2
                ],
                markerBorderPath = [
                    'M', markerStartX,
                            markerStartY - this.markerWindowHeight / 2,
                    'L', markerEndX,
                            markerStartY - this.markerWindowHeight / 2,
                         markerEndX,
                            markerStartY + this.markerWindowHeight / 2,
                         markerStartX,
                            markerStartY + this.markerWindowHeight / 2,
                         markerStartX,
                            markerStartY - this.markerWindowHeight / 2
                 ],
                 markerUnderlinePath = [
                     'M', markerStartX,
                             markerStartY + 1,
                     'L', markerEndX,
                             markerStartY + 1              
                ];
                markerLineStroke = 'red';
                markerLineWidth = 1;
            }

            if(this.isShiny) {
                if(this.elements.markerLHS) {
                    this.elements.markerLHS.destroy();
                }
                this.elements.markerLHS = this.renderer.path(markerLHSPath)
                    .attr({
                        fill: '#cccccc'
                    })
                    .add();
                if(this.elements.markerRHS) {
                    this.elements.markerRHS.destroy();
                }
                this.elements.markerRHS = this.renderer.path(markerRHSPath)
                    .attr({
                        fill: '#cccccc'
                    })
                    .add();
                if(this.elements.markerWindow) {
                    this.elements.markerWindow.destroy();
                }
                this.elements.markerWindow = this.renderer.rect(markerStartX,
                        markerStartY - this.markerWindowHeight / 2, this.backgroundWidth,
                                this.markerWindowHeight, 0)
                    .attr({
                        fill: 'rgba(255, 255, 255, 0.3)'
                    })
                    .add();
                if(this.elements.markerBorder) {
                    this.elements.markerBorder.destroy();
                }
                this.elements.markerBorder = this.renderer.path(markerBorderPath)
                    .attr({
                        stroke: 'white',
                        'stroke-width': 2
                    })
                    .add();
                if(this.elements.markerUnderline) {
                    this.elements.markerUnderline.destroy();
                }
                this.elements.markerUnderline = this.renderer.path(markerUnderlinePath)
                    .attr({
                        stroke: 'white',
                        'stroke-width': 2
                    })
                    .add();
            }
            if(this.elements.markerLine) {
                this.elements.markerLine.destroy();
            }
            this.elements.markerLine = this.renderer.path(markerLinePath)
                .attr({
                    stroke: markerLineStroke,
                    'stroke-width': markerLineWidth
                })
                .add();
            if(this.showValue) {
                this.drawValueDisplay(val);
            }

        },
        
        drawValueDisplay: function(val) {
            var valueText = this.formatValue(val),
                markerHeight = this.normalizedTranslateValue(val),
                valueY = this.verticalPadding + this.backgroundHeight - this.bandOffsetBottom - markerHeight;
            
            if(this.elements.valueDisplay) {
                this.elements.valueDisplay.attr({
                    text: valueText,
                    y: valueY + this.valueFontSize / 4
                });
            }
            else {
                this.elements.valueDisplay = this.renderer.text(
                     valueText, (this.chartWidth - this.backgroundWidth) / 2 - this.valueOffset, valueY + this.valueFontSize / 4
                )
                .css({
                    color: 'black',
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                })
                .attr({
                    align: 'right'
                })
                .add();
            }
            
        },

        normalizedTranslateValue: function(val) {
            if(val < this.ranges[0]) {
                return 0;
            }
            if(val > this.ranges[this.ranges.length - 1]) {
                return this.translateValue(this.ranges[this.ranges.length - 1]);
            }
            return this.translateValue(val);
        },

        translateValue: function(val) {
            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
                normalizedValue = val - this.ranges[0];

            return Math.round((normalizedValue / dataRange) * this.bandHeight);
        }

    });


    ////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.HorizontalMarkerGauge


    Splunk.JSCharting.HorizontalMarkerGauge = $.klass(Splunk.JSCharting.AbstractMarkerGauge, {
        
        // override
        initialize: function($super, container) {
            $super(container);
            this.horizontalPadding = 20;
            this.tickOffset = 5;
            this.tickLength = 15;
            this.tickWidth = 1;
            this.tickLabelOffset = 5;
            this.minorTickLength = Math.floor(this.tickLength / 2);
            this.bandHeight = (!this.isShiny) ? 35 : 15;
        },
        
        renderGauge: function($super) {
            this.markerWindowHeight = this.roundWithMinMax(this.chartWidth / 30, 30, 80);
            this.markerSideWidth = this.markerWindowHeight / 2;
            this.markerSideCornerRad = this.markerSideWidth / 3;
            this.bandOffsetBottom = 5 + this.markerWindowHeight / 2;
            this.bandOffsetTop = 5 + this.markerWindowHeight / 2;
            this.tickFontSize = this.roundWithMinMax(this.chartWidth / 50, 10, 20);  // in pixels
            this.backgroundCornerRad = this.roundWithMinMax(this.chartWidth / 120, 3, 5);
            this.valueFontSize = this.roundWithMinMax(this.chartWidth / 40, 15, 25);  // in pixels
            this.valueOffset = this.markerSideWidth + 10;
            this.tickLabelPadding = this.tickFontSize / 2;
            this.bandOffsetX = (!this.isShiny) ? 0 : this.tickLabelPadding;
            this.backgroundHeight = this.bandOffsetX + this.bandHeight + this.tickOffset + this.tickLength +
                                       + this.tickLabelOffset + this.tickFontSize + this.tickLabelPadding;
            $super();
        },
        
        drawBackground: function(tickValues) {
            tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.maxTicksPerRange);
            var maxTickValue = tickValues[tickValues.length - 1],
                maxTickWidth = this.predictTextWidth(this.formatValue(maxTickValue), this.tickFontSize);
            
            this.bandOffsetBottom = Math.max(this.bandOffsetBottom, maxTickWidth);
            this.bandOffsetTop = Math.max(this.bandOffsetTop, maxTickWidth);
            this.backgroundWidth = this.chartWidth - (2 * this.horizontalPadding);
            this.bandWidth = this.backgroundWidth - (this.bandOffsetBottom + this.bandOffsetTop);

            if(this.isShiny) {
                this.elements.background = this.renderer.rect(this.horizontalPadding,
                        (this.chartHeight - this.backgroundHeight) / 2, this.backgroundWidth, this.backgroundHeight,
                        this.backgroundCornerRad)
                    .attr({
                        fill: '#edede7',
                        stroke: 'silver',
                        'stroke-width': 1
                    })
                    .add();
            }
        },

        drawBand: function() {
            var i, startOffset, endOffset,
                bandStartX = this.horizontalPadding + this.bandOffsetBottom,
                bandTopY = ((this.chartHeight - this.backgroundHeight) / 2) + this.bandOffsetX;

            for(i = 0; i < this.ranges.length - 1; i++) {
                startOffset = this.translateValue(this.ranges[i]);
                endOffset = this.translateValue(this.ranges[i + 1]);
                this.elements['colorBand' + i] = this.renderer.rect(
                        bandStartX + startOffset, bandTopY,
                        endOffset - startOffset, this.bandHeight, this.bandCornerRad
                    )
                    .attr({
                        fill: this.getColorByIndex(i)
                    })
                    .add();
            }
            
            this.tickStartY = (this.chartHeight - this.backgroundHeight) / 2 + (this.bandOffsetX + this.bandHeight)
                    + this.tickOffset;
            this.tickEndY = this.tickStartY + this.tickLength;
            this.tickLabelStartY = this.tickEndY + this.tickLabelOffset;
        },
        
        drawMajorTick: function(offset) {
            var tickOffset = this.horizontalPadding + this.bandOffsetBottom + offset;
            
            var element = this.renderer.path([
                    'M', tickOffset, this.tickStartY,
                    'L', tickOffset, this.tickEndY
                ])
                .attr({
                    stroke: this.tickColor,
                    'stroke-width': this.tickWidth
                })
                .add();
            
            return element;
        },
        
        drawMajorTickLabel: function(offset, text) {
            var tickOffset = this.horizontalPadding + this.bandOffsetBottom + offset;
            
            var element = this.renderer.text(text,
                    tickOffset, this.tickLabelStartY + this.tickFontSize
                )
                .attr({
                    align: 'center'
                })
                .css({
                    color: this.tickFontColor,
                    fontSize: this.tickFontSize + 'px'
                })
                .add();
            
            return element;
        },
        
        drawMinorTick: function(offset) {
            var tickOffset = this.horizontalPadding + this.bandOffsetBottom + offset;
            
            var element = this.renderer.path([
                     'M', tickOffset, this.tickStartY,
                     'L', tickOffset, this.tickStartY + this.minorTickLength
                 ])
                 .attr({
                     stroke: this.tickColor,
                     'stroke-width': this.minorTickWidth
                 })
                 .add();
            
            return element;
        },

        drawIndicator: function(val) {
            var markerOffset = this.normalizedTranslateValue(val),
                markerStartY = (!this.isShiny) ? (this.chartHeight - this.backgroundHeight) / 2 - 10 : (this.chartHeight - this.backgroundHeight) / 2,
                markerEndY = (!this.isShiny) ? markerStartY + this.bandHeight + 20 : markerStartY + this.backgroundHeight,
                markerStartX = this.horizontalPadding + this.bandOffsetBottom + markerOffset,
                markerLineWidth = 3, // set to 1 for shiny
                markerLineStroke = this.foregroundColor, // set to red for shiny
                markerLinePath = [
                    'M', markerStartX, markerStartY,
                    'L', markerStartX, markerEndY
                ];
                
            if(this.isShiny) {
                var markerLHSPath = [
                    'M', markerStartX - this.markerWindowHeight / 2,
                            markerStartY,
                    'L', markerStartX - this.markerWindowHeight / 2,
                            markerStartY  - (this.markerSideWidth - this.markerSideCornerRad),
                    'C', markerStartX - this.markerWindowHeight / 2,
                            markerStartY  - (this.markerSideWidth - this.markerSideCornerRad),
                         markerStartX - this.markerWindowHeight / 2,
                            markerStartY - this.markerSideWidth,
                         markerStartX - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
                            markerStartY - this.markerSideWidth,
                    'L', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                            markerStartY - this.markerSideWidth,
                    'C', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                            markerStartY - this.markerSideWidth,
                         markerStartX + (this.markerWindowHeight / 2),
                            markerStartY - this.markerSideWidth,
                         markerStartX + (this.markerWindowHeight / 2),
                            markerStartY - (this.markerSideWidth - this.markerSideCornerRad),
                    'L', markerStartX + this.markerWindowHeight / 2,
                            markerStartY,
                         markerStartX - this.markerWindowHeight,
                            markerStartY
                ],
                markerRHSPath = [
                    'M', markerStartX - this.markerWindowHeight / 2,
                            markerEndY,
                    'L', markerStartX - this.markerWindowHeight / 2,
                            markerEndY + (this.markerSideWidth - this.markerSideCornerRad),
                    'C', markerStartX - this.markerWindowHeight / 2,
                            markerEndY + (this.markerSideWidth - this.markerSideCornerRad),
                         markerStartX - this.markerWindowHeight / 2,
                            markerEndY + this.markerSideWidth,
                         markerStartX - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
                            markerEndY + this.markerSideWidth,
                    'L', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                            markerEndY + this.markerSideWidth,
                    'C', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
                            markerEndY + this.markerSideWidth,
                         markerStartX + (this.markerWindowHeight / 2),
                             markerEndY + this.markerSideWidth,
                         markerStartX + (this.markerWindowHeight / 2),
                             markerEndY + (this.markerSideWidth - this.markerSideCornerRad),
                    'L', markerStartX + this.markerWindowHeight / 2,
                            markerEndY,
                         markerStartX - this.markerWindowHeight,
                            markerEndY
                ],
                markerBorderPath = [
                    'M', markerStartX - this.markerWindowHeight / 2,
                            markerStartY,
                    'L', markerStartX - this.markerWindowHeight / 2,
                            markerEndY,
                         markerStartX + this.markerWindowHeight / 2,
                            markerEndY,
                         markerStartX + this.markerWindowHeight / 2,
                            markerStartY,
                         markerStartX - this.markerWindowHeight / 2,
                            markerStartY
                ],
                markerUnderlinePath = [
                    'M', markerStartX - 1,
                            markerStartY,
                    'L', markerStartX - 1,
                            markerEndY       
                ];
                markerLineStroke = 'red';
                markerLineWidth = 1;

                if(this.elements.markerLHS) {
                    this.elements.markerLHS.destroy();
                }
                this.elements.markerLHS = this.renderer.path(markerLHSPath)
                    .attr({
                        fill: '#cccccc'
                    })
                    .add();
                if(this.elements.markerRHS) {
                    this.elements.markerRHS.destroy();
                }
                this.elements.markerRHS = this.renderer.path(markerRHSPath)
                    .attr({
                        fill: '#cccccc'
                    })
                    .add();
                if(this.elements.markerWindow) {
                    this.elements.markerWindow.destroy();
                }
                this.elements.markerWindow = this.renderer.rect(markerStartX - this.markerWindowHeight / 2,
                        markerStartY, this.markerWindowHeight, this.backgroundHeight, 0)
                    .attr({
                        fill: 'rgba(255, 255, 255, 0.3)'
                    })
                    .add();
                if(this.elements.markerBorder) {
                    this.elements.markerBorder.destroy();
                }
                this.elements.markerBorder = this.renderer.path(markerBorderPath)
                    .attr({
                        stroke: 'white',
                        'stroke-width': 2
                    })
                    .add();
                if(this.elements.markerUnderline) {
                    this.elements.markerUnderline.destroy();
                }
                this.elements.markerUnderline = this.renderer.path(markerUnderlinePath)
                    .attr({
                        stroke: 'white',
                        'stroke-width': 2
                    })
                    .add();
            }
            
            if(this.elements.markerLine) {
                this.elements.markerLine.destroy();
            }
            this.elements.markerLine = this.renderer.path(markerLinePath)
                .attr({
                    stroke: markerLineStroke,
                    'stroke-width': markerLineWidth
                })
                .add();
            if(this.showValue) {
                this.drawValueDisplay(val);
            }
        },
        
        drawValueDisplay: function(val) {
            var valueText = this.formatValue(val),
                markerOffset = this.normalizedTranslateValue(val),
                valueX = this.horizontalPadding + this.bandOffsetBottom + markerOffset;
            
            if(this.elements.valueDisplay) {
                this.elements.valueDisplay.attr({
                    text: valueText,
                    x: valueX
                });
            }
            else {
                this.elements.valueDisplay = this.renderer.text(
                     valueText, valueX, (this.chartHeight - this.backgroundHeight) / 2 - this.valueOffset
                )
                .css({
                    color: 'black',
                    fontSize: this.valueFontSize + 'px',
                    fontWeight: 'bold'
                })
                .attr({
                    align: 'center'
                })
                .add();
            }
            
        },

        normalizedTranslateValue: function(val) {
            if(val < this.ranges[0]) {
                return 0;
            }
            if(val > this.ranges[this.ranges.length - 1]) {
                return this.translateValue(this.ranges[this.ranges.length - 1]);
            }
            return this.translateValue(val);
        },

        translateValue: function(val) {
            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
                normalizedValue = val - this.ranges[0];

            return Math.round((normalizedValue / dataRange) * this.bandWidth);
        }
        
    });


    ////////////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.MathUtils


    Splunk.JSCharting.MathUtils = {

        // shortcut for base-ten log, also rounds to four decimal points of precision to make pretty numbers
        logBaseTen: function(num) {
            var result = Math.log(num) / Math.LN10;
            return (Math.round(result * 10000) / 10000);
        },

        // transforms numbers to a normalized log scale that can handle negative numbers
        // rounds to four decimal points of precision
        absLogBaseTen: function(num) {
            if(typeof num !== "number") {
                return NaN;
            }
            var isNegative = (num < 0),
                result;

            if(isNegative) {
                num = -num;
            }
            if(num < 10) {
                num += (10 - num) / 10;
            }
            result = this.logBaseTen(num);
            return (isNegative) ? -result : result;
        },

        // reverses the transformation made by absLogBaseTen above
        // rounds to three decimal points of precision
        absPowerTen: function(num) {
            if(typeof num !== "number") {
                return NaN;
            }
            var isNegative = (num < 0),
                result;

            if(isNegative) {
                num = -num;
            }
            result = Math.pow(10, num);
            if(result < 10) {
                result = 10 * (result - 1) / (10 - 1);
            }
            result = (isNegative) ? -result : result;
            return (Math.round(result * 1000) / 1000);
        },

        // calculates the power of ten that is closest to but not greater than the number
        // negative numbers are treated as their absolute value and the sign of the result is flipped before returning
        nearestPowerOfTen: function(num) {
            if(typeof num !== "number") {
                return NaN;
            }
            var isNegative = num < 0;
            num = (isNegative) ? -num : num;
            var log = this.logBaseTen(num),
                result = Math.pow(10, Math.floor(log));
            
            return (isNegative) ? -result: result;
        },
        
        // an extended version of parseFloat that will handle numbers encoded in hex format (i.e. "0xff")
        // and is stricter than that native JavaScript parseFloat for decimal numbers
        parseFloat: function(str) {
            // determine if the string is a hex number by checking if it begins with '0x' or '-0x', in which case delegate to parseInt with a 16 radix
            if(/^( )*(0x|-0x)/.test(str)) {
                return parseInt(str, 16);
            }
            // if the number is not in decimal or scientific format, return NaN explicitly instead of letting JavaScript do its loose parsing
            if(!(/^[-+]?[0-9]*[.]?[0-9]*$/.test(str) || (/^[-+]?[0-9][.]?[0-9]*e[-+]?[1-9][0-9]*$/).test(str))) {
                return NaN;
            }
            return parseFloat(str);
        },
        
        // returns the number of digits of precision after the decimal point
        // optionally accepts a maximum number, after which point it will stop looking and return the max
        getDecimalPrecision: function(num, max) {
            max = max || Infinity;
            var precision = 0;
            
            while(precision < max && num.toFixed(precision) !== num.toString()) {
                precision += 1;
            }
            
            return precision;
        }
    };


    ////////////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.TimeUtils

    Splunk.JSCharting.TimeUtils = {
            
        secsPerMin: 60,
        secsPerHour: 60 * 60,
        secsPerDay: 24 * 60 * 60,

        bdYear: 1,
        bdMonth: 2,
        bdDay: 3,
        bdHour: 4,
        bdMinute: 5,
        bdSecond: 6,
        
        convertTimeToCategories: function(timeData, spanSeries, numLabelCutoff) {
            var i, j, formatter, bdTime, label, monthIntervals,
                prevBdTime = [0, 0, 0, 0, 0, 0],
                
                pointSpan = (spanSeries) ? spanSeries[0] : 1,
                timeRange = pointSpan * timeData.length,
                categories = [],
                rawLabels = [],

                getFormatterFromSeconds = function(intervals, multiplier, bdIndex) {
                    for(i = intervals.length - 1; i >= 0; i--) {
                        if((timeRange / (intervals[i] * multiplier)) >= (numLabelCutoff + 1)) {
                            continue;
                        }
                        break;
                    }
                    // i is now equal to the index in intervals that we want for our step,
                    // use it as a mod value to find the first label
                    var startIndex = this.findClipIndex(timeData, bdIndex, {'mod': intervals[i]});
                    return { start: startIndex, step: Math.floor((intervals[i] * multiplier) / pointSpan) };
                }.bind(this),
                
                getFormatterFromSpans = function(intervals, bdIndex) {
                    for(i = intervals.length - 1; i >= 0; i--) {
                        if((timeData.length / intervals[i]) >= (numLabelCutoff + 1)) {
                            continue;
                        }
                        break;
                    }
                    // i is now equal to the index in intervals that we want for our step,
                    // if we need to, we clip the first label to the first of the month/year
                    if(bdIndex === this.bdDay) {
                        return { start: 0, step: intervals[i] };
                    }
                    else {
                        testIndex = ((pointSpan * intervals[i]) < 12) ? this.bdDay : this.bdMonth;
                        var startIndex = this.findClipIndex(timeData, testIndex, {value: /01/});
                        return { start: startIndex, step: intervals[i]};
                    }
                }.bind(this);
            
            if(timeData.length <= numLabelCutoff) {
                // set up the formatter to label every point
                formatter = {
                    start: 0,
                    step: 1
                };
            }
            else if(pointSpan < this.secsPerMin && timeRange < this.secsPerMin * numLabelCutoff) {
                // we are in the second domain
                var secIntervals = [60, 30, 15, 10, 5, 2, 1];
                formatter = getFormatterFromSeconds(secIntervals, 1, this.bdSecond);
            }
            else if(pointSpan < this.secsPerHour && timeRange < this.secsPerHour * numLabelCutoff) {
                // we are in the minute domain
                var minIntervals = [60, 30, 15, 10, 5, 2, 1];
                formatter = getFormatterFromSeconds(minIntervals, this.secsPerMin, this.bdMinute);
            }
            else if(pointSpan < 23 * this.secsPerHour && timeRange < this.secsPerDay * numLabelCutoff) {
                // we are in the hour domain
                var hourIntervals = [24, 12, 8, 6, 4, 2, 1];
                formatter = getFormatterFromSeconds(hourIntervals, this.secsPerHour, this.bdHour);
            }
            else if(pointSpan < 27 * this.secsPerDay) {
                // we are in the day domain
                var dayIntervals = [14, 7, 4, 2, 1];
                // work-around here for when the user has specified a small span for a large time range
                if(pointSpan < 23 * this.secsPerHour) {
                    if(timeRange < 14 * this.secsPerDay * numLabelCutoff) {
                        return this.formatCategoriesByFiltering(dayIntervals, this.secsPerDay, this.bdDay, timeRange, timeData, numLabelCutoff);               
                    }
                    else {
                        monthIntervals = [240, 120, 96, 72, 48, 24, 12, 6, 4, 2, 1];
                        return this.formatCategoriesByFiltering(monthIntervals, 30 * this.secsPerDay, this.bdMonth, timeRange, timeData, numLabelCutoff);   
                    }
                }
                formatter = getFormatterFromSpans(dayIntervals, this.bdDay);
            }
            else {
                // we are in the month domain
                monthIntervals = [240, 120, 96, 72, 48, 24, 12, 6, 4, 2, 1];
                formatter = getFormatterFromSpans(monthIntervals, this.bdMonth);
            }
            // ESCAPE HATCH
            // make sure that the formatter settings have a reasonable start index (a user-defined span can throw this off)
            // if not, force the start index to zero and don't worry about clipping
            if(formatter.start > formatter.step) {
                formatter.start = 0;
                // also need to make sure the labelling will show times since we can no longer clip to days
                if((formatter.step * pointSpan) >= (23 * this.secsPerHour)) {
                    pointSpan = 60;
                }
            }
            for(i = 0; i < timeData.length; i++) {
                if(i >= formatter.start && (i - formatter.start) % formatter.step == 0) {
                    bdTime = this.extractBdTime(timeData[i]);
                    label = this.formatBdTimeAsLabel(bdTime, formatter.step * pointSpan, prevBdTime);
                    categories.push(label);
                    prevBdTime = bdTime;
                    rawLabels.push(timeData[i]);
                }
                else {
                    categories.push(" ");
                }
            }
            return {
                categories: categories,
                rawLabels: rawLabels
            };
        },
        
        // this method is a catch-all that needs to be able to handle all cases when a user has chosen a small bucket size for a large time range
        // we do our best to clip the labels to whole time periods, but that might not always be possible
        formatCategoriesByFiltering: function(intervals, multiplier, bdTestIndex, timeRange, timeData, numLabelCutoff) {
            var i, j, k, testInterval, loopBdTime, 
                prevBdValue = -1,
                prevBdTime = [0, 0, 0, 0, 0, 0],
                counter = -1, 
                categories = [],
                rawLabels = [], 
                
                // filter function used to test if a time point clips to a whole unit specified by the bdTestIndex variable
                filterFn = function(bdTime) {
                    for(k = bdTestIndex + 1; k < bdTime.length; k++) {
                        if(k === 3) {
                            if(bdTime[k] !== "01") {
                                return false;
                            }
                        }
                        else if(parseInt(bdTime[k], 10)) {
                            return false;
                        }
                    }
                    return true;
                };
            
            for(i = 0; i < intervals.length - 1; i++) {
                testInterval = intervals[i + 1] * multiplier;
                if(!((timeRange / testInterval) < numLabelCutoff)) {
                    break;
                }
            }
            // i is now equal to the index in intervals that we want for our step
            for(j = 0; j < timeData.length; j++) {
                loopBdTime = this.extractBdTime(timeData[j]);
                
                if(filterFn(loopBdTime)) {
                    // this is a time point we might potentially label
                    if(loopBdTime[bdTestIndex] !== prevBdValue) {
                        // advance the counter if our time index of interest has changed
                        if(counter > -1) {
                            counter++;
                        }
                        prevBdValue = loopBdTime[bdTestIndex];
                    }
                    if(counter === -1 || counter % intervals[i] === 0) {
                        // either this is the first label-worthy point we've seen, or the counter has advanced far enough that it's time to label again
                        label = this.formatBdTimeAsLabel(loopBdTime, multiplier * intervals[i], prevBdTime);
                        categories.push(label);
                        prevBdTime = loopBdTime;
                        counter = 0;
                        rawLabels.push(timeData[j]);
                    }
                    else {
                        categories.push(" ");
                    }
                }
                else {
                    categories.push(" ");
                }
            }
            if(rawLabels.length < 3) {
                // ESCAPE HATCH: if we didn't label enough points above (meaning they couldn't be clipped to whole units)
                // then simply go through with a uniform label step and enforce verbose labeling
                rawLabels = [];
                var labelStep = Math.floor(categories.length / numLabelCutoff) || 1,
                    rawLabelSpan = (multiplier * intervals[i]),
                    labelSpan = (rawLabelSpan >= (23 * this.secsPerHour)) ? 60 : rawLabelSpan;
                
                for(j = 0; j < categories.length; j += labelStep) {
                    loopBdTime = this.extractBdTime(timeData[j]);
                    label = this.formatBdTimeAsLabel(loopBdTime, labelSpan, prevBdTime);
                    categories[j] = label;
                    prevBdTime = loopBdTime;
                    rawLabels.push(timeData[j]);
                }
            }
            return {
                categories: categories,
                rawLabels: rawLabels
            };
        },
        
        // generic method for applying a set of filter contraints to a time data series and finding the
        // first index where labels should start clipping
        findClipIndex: function(data, bdIndex, filter) {
            var i, isSatisfied, bdTimePoint,
            
                satisfiesMod = function(timePoint, index, mod) {
                    var bdValue = parseInt(timePoint[index], 10);
                    if((bdValue % mod) != 0) {
                        return false;
                    }
                    for(var j = index + 1; j <= this.bdSecond; j++) {
                        if(j == this.bdDay) {
                            if(timePoint[j] !== "01") {
                                return false;
                            }
                        }
                        else if(parseInt(timePoint[j], 10) != 0) {
                            return false;
                        }
                    }
                    return true;
                }.bind(this),
                
                satisfiesValueMatch = function(timePoint, index, regex) {
                    return regex.test(timePoint[index]);
                };
            
            for(i = 0; i < data.length; i++) {
                isSatisfied = false;
                bdTimePoint = this.extractBdTime(data[i]);
                if(filter.mod) {
                    isSatisfied = satisfiesMod(bdTimePoint, bdIndex, filter.mod);
                }
                if(isSatisfied && filter.value) {
                    isSatisfied = satisfiesValueMatch(bdTimePoint, bdIndex, filter.value);
                }
                if(isSatisfied) {
                    return i;
                }
            }
            // if we end up here we were unable to find any points that satisfy the constraints, so punt and return zero
            return 0;
        },

        formatBdTimeAsLabel: function(bdTime, labelSpan, prevBdTime) {
            var i18n = Splunk.JSCharting.i18nUtils,
                dateTime = this.bdTimeToDateObject(bdTime),

                showDay = (labelSpan < 28 * this.secsPerDay),
                showTimes = (labelSpan < (23 * this.secsPerHour) || 
                        ((bdTime[this.bdHour] != "00" && bdTime[this.bdMinute] != "00") || 
                         (prevBdTime[this.bdHour] != "00" && prevBdTime[this.bdMinute] != "00"))),
                showSeconds = (labelSpan < 60),

                timeFormat = (showSeconds) ? 'medium' : 'short',
                dateFormat = (showDay) ? 'ccc MMM d' : 'MMMM';

            if(labelSpan > 364 * this.secsPerDay) {
                return i18n.format_date(dateTime, 'YYYY');
            }
            if(bdTime[this.bdMonth] === prevBdTime[this.bdMonth] && bdTime[this.bdDay] === prevBdTime[this.bdDay]) {
                return format_time(dateTime, timeFormat);
            }
            if(bdTime[this.bdYear] !== prevBdTime[this.bdYear]) {
                dateFormat += '<br/>YYYY';
            }
            return (showTimes) ?
                format_time(dateTime, timeFormat) + '<br/>' + i18n.format_date(dateTime, dateFormat) :
                i18n.format_date(dateTime, dateFormat);
        },
        
        // returns false if string cannot be parsed
        formatIsoStringAsTooltip: function(isoString, pointSpan) {
            var i18n = Splunk.JSCharting.i18nUtils,
                bdTime = this.extractBdTime(isoString),
                dateObject;
            
            if(!bdTime) {
                return false;
            }
            dateObject = this.bdTimeToDateObject(bdTime);
            
            if (pointSpan >= 86400) { // day or larger
                return i18n.format_date(dateObject);
            } 
            else if (pointSpan >= 60) { // minute or longer
                return format_datetime(dateObject, 'medium', 'short');
            }
            return format_datetime(dateObject);
        },

        extractBdTime: function(timeString) {
            // assume time comes in ISO format
            if(!this.bdTimeRegex) {
                this.bdTimeRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.\d+[+-]{1}\d{2}:\d{2}$/;
            }
            return this.bdTimeRegex.exec(timeString);
        },
        
        bdTimeToDateObject: function(bdTime) {
            var year = parseInt(bdTime[this.bdYear], 10),
                month = parseInt(bdTime[this.bdMonth], 10) - 1,
                day = parseInt(bdTime[this.bdDay], 10),
                hour = parseInt(bdTime[this.bdHour], 10),
                minute = parseInt(bdTime[this.bdMinute], 10),
                second = parseInt(bdTime[this.bdSecond], 10);
            
            return new Date(year, month, day, hour, minute, second);
        }
            
    };


    ////////////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.ColorUtils


    Splunk.JSCharting.ColorUtils = {

        // converts a hex number to its css-friendly counterpart, with optional alpha transparency field
        // returns undefined if the input is cannot be parsed to a valid number or if the number is out of range
        colorFromHex: function(hexNum, alpha) {
            if(typeof hexNum !== "number") {
                hexNum = parseInt(hexNum, 16);
            }
            if(isNaN(hexNum) || hexNum < 0x000000 || hexNum > 0xffffff) {
                return undefined;
            }
            var r = (hexNum & 0xff0000) >> 16,
                g = (hexNum & 0x00ff00) >> 8,
                b = hexNum & 0x0000ff;

            return ((alpha === undefined) ? ("rgb(" + r + "," + g + "," + b + ")") : ("rgba(" + r + "," + g + "," + b + "," + alpha + ")"));
        },
        
        // coverts a color string in either hex or rgb format into its corresponding hex number
        // returns zero if the color string can't be parsed as either format
        hexFromColor: function(color) {
            var normalizedColor = Splunk.util.normalizeColor(color);
            
            return (normalizedColor) ? parseInt(normalizedColor.replace("#", "0x"), 16) : 0;
        },
        
        // given a color string (in hex or rgb form) or a hex number, formats the color as an rgba string with the given alpha transparency
        addAlphaToColor: function(color, alpha) {
            var colorAsHex = (typeof color === "number") ? color : this.hexFromColor(color);
            return this.colorFromHex(colorAsHex, alpha);
        },
        
        // given a color string in rgba format, returns the equivalent color in rgb format
        // if the color string is not in valid rgba format, returns the color string un-modified
        removeAlphaFromColor: function(rgbaStr) {
            // lazy create the regex
            if(!this.rgbaRegex) {
                this.rgbaRegex = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,[\s\d.]+\)\s*$/;
            }
            var colorComponents = this.rgbaRegex.exec(rgbaStr);
            if(!colorComponents) {
                return rgbaStr;
            }
            return ("rgb(" + colorComponents[1] + ", " + colorComponents[2] + ", " + colorComponents[3] + ")");
        },
        
        // calculate the luminance of a color based on its hex value
        // returns undefined if the input is cannot be parsed to a valid number or if the number is out of range
        // equation for luminance found at http://en.wikipedia.org/wiki/Luma_(video)
        getLuminance: function(hexNum) {
            if(typeof hexNum !== "number") {
                hexNum = parseInt(hexNum, 16);
            }
            if(isNaN(hexNum) || hexNum < 0x000000 || hexNum > 0xffffff) {
                return undefined;
            }
            var r = (hexNum & 0xff0000) >> 16,
                g = (hexNum & 0x00ff00) >> 8,
                b = hexNum & 0x0000ff;
                
            return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        }
    };

    //////////////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.ParsingUtils


    Splunk.JSCharting.ParsingUtils = {
            
        // returns a map of properties that apply either to the x-axis or to x-axis labels
        // all axis-related keys are renamed to 'axis' and all axis-label-related keys are renamed to 'axisLabels'
        getXAxisProperties: function(properties) {
            var key, newKey,
                remapped = {},
                axisProps = this.filterPropsByRegex(properties, /(axisX|primaryAxis|axisLabelsX|axisTitleX|gridLinesX)/);
            for(key in axisProps) {
                if(axisProps.hasOwnProperty(key)) {
                    if(!this.xAxisKeyIsTrumped(key, properties)) {
                        newKey = key.replace(/(axisX|primaryAxis)/, "axis");
                        newKey = newKey.replace(/axisLabelsX/, "axisLabels");
                        newKey = newKey.replace(/axisTitleX/, "axisTitle");
                        newKey = newKey.replace(/gridLinesX/, "gridLines");
                        remapped[newKey] = axisProps[key];
                    }
                }
            }
            return remapped;
        },
        
        // checks if the given x-axis key is deprecated, and if so returns true if that key's
        // non-deprecated counterpart is set in the properties map, otherwise returns false
        xAxisKeyIsTrumped: function(key, properties) {
            if(!(/primaryAxis/.test(key))) {
                return false;
            }
            if(/primaryAxisTitle/.test(key)) {
                return properties[key.replace(/primaryAxisTitle/, "axisTitleX")];
            }
            return properties[key.replace(/primaryAxis/, "axisX")];
        },
        
        // returns a map of properties that apply either to the y-axis or to y-axis labels
        // all axis-related keys are renamed to 'axis' and all axis-label-related keys are renamed to 'axisLabels'
        getYAxisProperties: function(properties) {
            var key, newKey,
                remapped = {},
                axisProps = this.filterPropsByRegex(properties, /(axisY|secondaryAxis|axisLabelsY|axisTitleY|gridLinesY)/);
            for(key in axisProps) {
                if(axisProps.hasOwnProperty(key)) {
                    if(!this.yAxisKeyIsTrumped(key, properties)) {
                        newKey = key.replace(/(axisY|secondaryAxis)/, "axis");
                        newKey = newKey.replace(/axisLabelsY/, "axisLabels");
                        newKey = newKey.replace(/axisTitleY/, "axisTitle");
                        newKey = newKey.replace(/gridLinesY/, "gridLines");
                        remapped[newKey] = axisProps[key];
                    }
                }
            }
            return remapped;
        },
        
        // checks if the given y-axis key is deprecated, and if so returns true if that key's
        // non-deprecated counterpart is set in the properties map, otherwise returns false
        yAxisKeyIsTrumped: function(key, properties) {
            if(!(/secondaryAxis/.test(key))) {
                return false;
            }
            if(/secondaryAxisTitle/.test(key)) {
                return properties[key.replace(/secondaryAxisTitle/, "axisTitleY")];
            }
            return properties[key.replace(/secondaryAxis/, "axisY")];
        },
        
        // uses the given regex to filter out any properties whose key doesn't match
        // will return an empty object if the props input is not a map
        filterPropsByRegex: function(props, regex) {
            if(!(regex instanceof RegExp)) {
                return props;
            }
            var key, 
                filtered = {};
            
            for(key in props) {
                if(props.hasOwnProperty(key) && regex.test(key)) {
                    filtered[key] = props[key];
                }
            }
            return filtered;
        },
        
        stringToMap: function(str) {
            var i, propList, loopKv,
                map = {},
                strLen = str.length;
            
            if(str.charAt(0) !== '{' || str.charAt(strLen - 1) !== '}') {
                return false;
            }
            str = str.substr(1, strLen - 2);
            propList = str.split(',');
            for(i = 0; i < propList.length; i++) {
                loopKv = propList[i].split(':');
                map[loopKv[0]] = loopKv[1];
            }
            return map;
        },
        
        stringToArray: function(str) {
            var strLen = str.length;
            
            if(str.charAt(0) !== '[' || str.charAt(strLen - 1) !== ']') {
                return false;
            }
            str = str.substr(1, strLen - 2);
            return Splunk.util.stringToFieldList(str);
        },

        stringToHexArray: function(colorStr) {
            var i, hexColor,
                colors = this.stringToArray(colorStr);
            
            if(!colors) {
                return false;
            }
            for(i = 0; i < colors.length; i++) {
                hexColor = parseInt(colors[i], 16);
                if(isNaN(hexColor)) {
                    return false;
                }
                colors[i] = hexColor;
            }
            return colors;
        },
        
        // a simple utility method for comparing arrays, assumes one-dimensional arrays of primitives, performs strict comparisons
        arraysAreEquivalent: function(array1, array2) {
            // make sure these are actually arrays
            if(!(array1 instanceof Array) || !(array2 instanceof Array)) {
                return false;
            }
            if(array1 === array2) {
                // true if they are the same object
                return true;
            }
            if(array1.length !== array2.length) {
                // false if they are different lengths
                return false;
            }
            // false if any of their elements don't match
            for(var i = 0; i < array1.length; i++) {
                if(array1[i] !== array2[i]) {
                    return false;
                }
            }
            return true;
        }
        
    };


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Splunk.JSCharting.i18nUtils

    Splunk.JSCharting.i18nUtils = {
        
        // maintain a hash of locales where custom string replacements are needed to get correct translation
        CUSTOM_LOCALE_FORMATS: {
            'ja_JP': [
                ['d', 'd\u65e5'],
                ['YYYY', 'YYYY\u5e74']
            ],
            'ko_KR': [
                ['d', 'd\uc77c'],
                ['YYYY', 'YYYY\ub144']
            ],
            'zh_CN': [
                ['d', 'd\u65e5'],
                ['YYYY', 'YYYY\u5e74']
            ],
            'zh_TW': [
                ['d', 'd\u65e5'],
                ['YYYY', 'YYYY\u5e74']
            ]
        },
        
        // maintain a list of replacements needed when a locale specifies that day comes before month
        DAY_FIRST_FORMATS: [
            ['MMM d', 'd MMM'] 
        ],
        
        // a special-case hack to handle some i18n bugs, see SPL-42469
        format_date: function(date, format) {
            var i, replacements,
                locale = locale_name();
            if(format && locale_uses_day_before_month()) {
                replacements = this.DAY_FIRST_FORMATS;
                for(i = 0; i < replacements.length; i++) {
                    format = format.replace(replacements[i][0], replacements[i][1]);
                }
            }
            if(format && locale in this.CUSTOM_LOCALE_FORMATS) {
                replacements = this.CUSTOM_LOCALE_FORMATS[locale];
                
                for(i = 0; i < replacements.length; i++) {
                    format = format.replace(replacements[i][0], replacements[i][1]);
                }
            }
            return format_date(date, format);
        }
        
    };

})();