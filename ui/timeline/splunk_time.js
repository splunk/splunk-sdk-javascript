/**
 * Includes code from the jgatt library
 * Copyright (c) 2011 Jason Gatt
 * Dual licensed under the MIT and GPL licenses
 */
 
(function() {
	
	var jg_global 		= require('./jg_global');
	
	var jg_namespace 	= jg_global.jg_namespace; 
 	var jg_import	 	= jg_global.jg_import;   	
 	var jg_extend	 	= jg_global.jg_extend;  
 	var jg_static    	= jg_global.jg_static; 	
 	var jg_mixin     	= jg_global.jg_mixin;
 	var jg_has_mixin 	= jg_global.jg_has_mixin; 	
 	var jg_delegate	 	= jg_global.jg_jg_delegate; 
 	
 	module.exports = jg_global;
 	
 	/***** ONLY CHANGE THINGS UNDER THIS LINE *****/

	jg_namespace("splunk.time", function()
	{

		this.ITimeZone = jg_extend(Object, function(ITimeZone, base)
		{

			// Public Methods

			this.getStandardOffset = function()
			{
			};

			this.getOffset = function(time)
			{
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		var ITimeZone = jg_import("splunk.time.ITimeZone");

		this.SimpleTimeZone = jg_extend(ITimeZone, function(SimpleTimeZone, base)
		{

			// Private Properties

			this._offset = 0;

			// Constructor

			this.constructor = function(offset)
			{
				this._offset = (offset !== undefined) ? offset : 0;
			};

			// Public Methods

			this.getStandardOffset = function()
			{
				return this._offset;
			};

			this.getOffset = function(time)
			{
				return this._offset;
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		var ITimeZone = jg_import("splunk.time.ITimeZone");

		this.LocalTimeZone = jg_extend(ITimeZone, function(LocalTimeZone, base)
		{

			// Public Methods

			this.getStandardOffset = function()
			{
				var date = new Date(0);
				return -date.getTimezoneOffset() * 60;
			};

			this.getOffset = function(time)
			{
				var date = new Date(time * 1000);
				return -date.getTimezoneOffset() * 60;
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		var LocalTimeZone = jg_import("splunk.time.LocalTimeZone");
		var SimpleTimeZone = jg_import("splunk.time.SimpleTimeZone");

		this.TimeZones = jg_static(function(TimeZones)
		{

			// Public Static Constants

			TimeZones.LOCAL = new LocalTimeZone();
			TimeZones.UTC = new SimpleTimeZone(0);

		});

	});

	jg_namespace("splunk.time", function()
	{

		var ITimeZone = jg_import("splunk.time.ITimeZone");
		var SimpleTimeZone = jg_import("splunk.time.SimpleTimeZone");
		var TimeZones = jg_import("splunk.time.TimeZones");

		this.DateTime = jg_extend(Object, function(DateTime, base)
		{

			// Private Static Constants

			var _ISO_DATE_TIME_PATTERN = /([\+\-])?(\d{4,})(?:(?:\-(\d{2}))(?:(?:\-(\d{2}))(?:(?:[T ](\d{2}))(?:(?:\:(\d{2}))(?:(?:\:(\d{2}(?:\.\d+)?)))?)?(?:(Z)|([\+\-])(\d{2})(?:\:(\d{2}))?)?)?)?)?/;

			// Private Static Methods

			var _normalizePrecision = function(value)
			{
				return Number(value.toFixed(6));
			};

			var _pad = function(value, digits, fractionDigits)
			{
				if (value != value)
					return "NaN";
				if (value == Infinity)
					return "Infinity";
				if (value == -Infinity)
					return "-Infinity";

				digits = (digits !== undefined) ? digits : 0;
				fractionDigits = (fractionDigits !== undefined) ? fractionDigits : 0;

				var str = value.toFixed(20);

				var decimalIndex = str.indexOf(".");
				if (decimalIndex < 0)
					decimalIndex = str.length;
				else if (fractionDigits < 1)
					str = str.substring(0, decimalIndex);
				else
					str = str.substring(0, decimalIndex) + "." + str.substring(decimalIndex + 1, decimalIndex + fractionDigits + 1);

				for (var i = decimalIndex; i < digits; i++)
					str = "0" + str;

				return str;
			};

			// Private Properties

			this._year = 0;
			this._month = 1;
			this._day = 1;
			this._weekday = 0;
			this._hours = 0;
			this._minutes = 0;
			this._seconds = 0;
			this._timeZone = TimeZones.LOCAL;
			this._timeZoneOffset = 0;
			this._time = 0;

			this._isValid = true;

			// Constructor

			this.constructor = function(yearOrTimevalue, month, day, hours, minutes, seconds, timeZone)
			{
				switch (arguments.length)
				{
					case 0:
						var now = new Date();
						this._time = now.getTime() / 1000;
						this._updateProperties();
						break;
					case 1:
						if (typeof yearOrTimevalue === "number")
						{
							this._time = yearOrTimevalue;
							this._updateProperties();
						}
						else if (typeof yearOrTimevalue === "string")
						{
							var matches = _ISO_DATE_TIME_PATTERN.exec(yearOrTimevalue);
							var numMatches = matches ? matches.length : 0;
							var match;

							match = (numMatches > 1) ? matches[1] : null;
							var yearSign = (match == "-") ? -1 : 1;

							match = (numMatches > 2) ? matches[2] : null;
							this._year = match ? yearSign * Number(match) : 0;

							match = (numMatches > 3) ? matches[3] : null;
							this._month = match ? Number(match) : 1;

							match = (numMatches > 4) ? matches[4] : null;
							this._day = match ? Number(match) : 1;

							match = (numMatches > 5) ? matches[5] : null;
							this._hours = match ? Number(match) : 0;

							match = (numMatches > 6) ? matches[6] : null;
							this._minutes = match ? Number(match) : 0;

							match = (numMatches > 7) ? matches[7] : null;
							this._seconds = match ? Number(match) : 0;

							match = (numMatches > 8) ? matches[8] : null;
							var timeZoneUTC = (match == "Z");

							match = (numMatches > 9) ? matches[9] : null;
							var timeZoneSign = (match == "-") ? -1 : 1;

							match = (numMatches > 10) ? matches[10] : null;
							var timeZoneHours = match ? Number(match) : NaN;

							match = (numMatches > 11) ? matches[11] : null;
							var timeZoneMinutes = match ? Number(match) : NaN;

							if (timeZoneUTC)
								this._timeZone = TimeZones.UTC;
							else if (!isNaN(timeZoneHours) && !isNaN(timeZoneMinutes))
								this._timeZone = new SimpleTimeZone(timeZoneSign * (timeZoneHours * 60 + timeZoneMinutes) * 60);
							else
								this._timeZone = TimeZones.LOCAL;

							this._updateTime();
						}
						else
						{
							this._time = NaN;
							this._updateProperties();
						}
						break;
					default:
						if (typeof yearOrTimevalue === "number")
						{
							this._year = yearOrTimevalue;
							this._month = (month !== undefined) ? month : 1;
							this._day = (day !== undefined) ? day : 1;
							this._hours = (hours !== undefined) ? hours : 0;
							this._minutes = (minutes !== undefined) ? minutes : 0;
							this._seconds = (seconds !== undefined) ? seconds : 0;
							this._timeZone = (timeZone instanceof ITimeZone) ? timeZone : TimeZones.LOCAL;
							this._updateTime();
						}
						else
						{
							this._time = NaN;
							this._updateProperties();
						}
						break;
				}
			};

			// Public Getters/Setters

			this.getYear = function()
			{
				return this._year;
			};
			this.setYear = function(value)
			{
				this._year = value;
				this._updateTime();
			};

			this.getMonth = function()
			{
				return this._month;
			};
			this.setMonth = function(value)
			{
				this._month = value;
				this._updateTime();
			};

			this.getDay = function()
			{
				return this._day;
			};
			this.setDay = function(value)
			{
				this._day = value;
				this._updateTime();
			};

			this.getWeekday = function()
			{
				return this._weekday;
			};

			this.getHours = function()
			{
				return this._hours;
			};
			this.setHours = function(value)
			{
				this._hours = value;
				this._updateTime();
			};

			this.getMinutes = function()
			{
				return this._minutes;
			};
			this.setMinutes = function(value)
			{
				this._minutes = value;
				this._updateTime();
			};

			this.getSeconds = function()
			{
				return this._seconds;
			};
			this.setSeconds = function(value)
			{
				this._seconds = value;
				this._updateTime();
			};

			this.getTimeZone = function()
			{
				return this._timeZone;
			};
			this.setTimeZone = function(value)
			{
				this._timeZone = (value instanceof ITimeZone) ? value : TimeZones.LOCAL;
				this._updateTime();
			};

			this.getTimeZoneOffset = function()
			{
				return this._timeZoneOffset;
			};

			this.getTime = function()
			{
				return this._time;
			};
			this.setTime = function(value)
			{
				this._time = value;
				this._updateProperties();
			};

			// Public Methods

			this.toUTC = function()
			{
				return this.toTimeZone(TimeZones.UTC);
			};

			this.toLocal = function()
			{
				return this.toTimeZone(TimeZones.LOCAL);
			};

			this.toTimeZone = function(timeZone)
			{
				var date = new DateTime();
				date.setTimeZone(timeZone);
				date.setTime(this._time);
				return date;
			};

			this.clone = function()
			{
				var date = new DateTime();
				date.setTimeZone(this._timeZone);
				date.setTime(this._time);
				return date;
			};

			this.equals = function(toCompare)
			{
				return ((this._time === toCompare._time) && (this._timeZoneOffset === toCompare._timeZoneOffset));
			};

			this.toString = function()
			{
				if (!this._isValid)
					return "Invalid Date";

				var str = "";
				if (this._year < 0)
					str += "-" + _pad(-this._year, 4);
				else
					str += _pad(this._year, 4);
				str += "-" + _pad(this._month, 2) + "-" + _pad(this._day, 2);
				str += "T" + _pad(this._hours, 2) + ":" + _pad(this._minutes, 2) + ":" + _pad(this._seconds, 2, 3);

				var timeZoneOffset = this._timeZoneOffset / 60;
				if (timeZoneOffset == 0)
				{
					str += "Z";
				}
				else
				{
					if (timeZoneOffset < 0)
						str += "-";
					else
						str += "+";
					if (timeZoneOffset < 0)
						timeZoneOffset = -timeZoneOffset;
					var timeZoneHours = Math.floor(timeZoneOffset / 60);
					var timeZoneMinutes = Math.floor(timeZoneOffset % 60);
					str += _pad(timeZoneHours, 2) + ":" + _pad(timeZoneMinutes, 2);
				}

				return str;
			};

			this.valueOf = function()
			{
				return this._time;
			};

			// Private Methods

			this._updateTime = function()
			{
				if (this._validate())
				{
					var years = this._year;
					var months = this._month - 1;
					var days = this._day - 1;
					var hours = this._hours;
					var minutes = this._minutes;
					var seconds = this._seconds;

					var secondsPerMinute = 60;
					var secondsPerHour = secondsPerMinute * 60;
					var secondsPerDay = secondsPerHour * 24;

					var totalMonths = months + years * 12;
					var wholeMonths = Math.floor(totalMonths);
					var subMonths = totalMonths - wholeMonths;

					var totalSeconds = seconds + (minutes * secondsPerMinute) + (hours * secondsPerHour) + (days * secondsPerDay);
					var wholeSeconds = Math.floor(totalSeconds);
					var subSeconds = totalSeconds - wholeSeconds;

					var date = new Date(0);
					date.setUTCFullYear(0);
					date.setUTCMonth(wholeMonths);

					if (subMonths != 0)
					{
						date.setUTCMonth(date.getUTCMonth() + 1);
						date.setUTCDate(0);

						var monthsTotalSeconds = date.getUTCDate() * subMonths * secondsPerDay;
						var monthsWholeSeconds = Math.floor(monthsTotalSeconds);
						var monthsSubSeconds = monthsTotalSeconds - monthsWholeSeconds;

						wholeSeconds += monthsWholeSeconds;
						subSeconds += monthsSubSeconds;
						if (subSeconds >= 1)
						{
							subSeconds--;
							wholeSeconds++;
						}

						date.setUTCDate(1);
					}

					date.setUTCSeconds(wholeSeconds);

					var time = (date.getTime() / 1000) + subSeconds;
					var timeZone = this._timeZone;

					this._time = time - timeZone.getOffset(time - timeZone.getStandardOffset());

					this._updateProperties();
				}
			};

			this._updateProperties = function()
			{
				if (this._validate())
				{
					var time = _normalizePrecision(this._time);
					var timeZoneOffset = _normalizePrecision(this._timeZone.getOffset(time));

					var totalSeconds = time + timeZoneOffset;
					var wholeSeconds = Math.floor(totalSeconds);
					var subSeconds = _normalizePrecision(totalSeconds - wholeSeconds);
					if (subSeconds >= 1)
					{
						subSeconds = 0;
						wholeSeconds++;
					}

					var date = new Date(wholeSeconds * 1000);

					this._year = date.getUTCFullYear();
					this._month = date.getUTCMonth() + 1;
					this._day = date.getUTCDate();
					this._weekday = date.getUTCDay();
					this._hours = date.getUTCHours();
					this._minutes = date.getUTCMinutes();
					this._seconds = date.getUTCSeconds() + subSeconds;

					this._time = time;
					this._timeZoneOffset = timeZoneOffset;

					this._validate();
				}
			};

			this._validate = function()
			{
				if (this._isValid)
				{
					this._year *= 1;
					this._month *= 1;
					this._day *= 1;
					this._weekday *= 1;
					this._hours *= 1;
					this._minutes *= 1;
					this._seconds *= 1;
					this._timeZoneOffset *= 1;
					this._time *= 1;
					var checksum = this._year + this._month + this._day + this._weekday + this._hours + this._minutes + this._seconds + this._timeZoneOffset + this._time;
					if (isNaN(checksum) || (checksum == Infinity) || (checksum == -Infinity) || !this._timeZone)
						this._isValid = false;
				}
				else
				{
					this._year *= 1;
					this._time *= 1;
					if ((this._year > -Infinity) && (this._year < Infinity))
					{
						this._month = 1;
						this._day = 1;
						this._hours = 0;
						this._minutes = 0;
						this._seconds = 0;
						this._isValid = true;
					}
					else if ((this._time > -Infinity) && (this._time < Infinity))
					{
						this._isValid = true;
					}
				}

				if (!this._isValid)
				{
					this._year = NaN;
					this._month = NaN;
					this._day = NaN;
					this._weekday = NaN;
					this._hours = NaN;
					this._minutes = NaN;
					this._seconds = NaN;
					this._timeZoneOffset = NaN;
					this._time = NaN;
				}

				return this._isValid;
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		this.Duration = jg_extend(Object, function(Duration, base)
		{

			// Private Static Constants

			var _ISO_DURATION_PATTERN = /P(?:(\-?\d+(?:\.\d+)?)Y)?(?:(\-?\d+(?:\.\d+)?)M)?(?:(\-?\d+(?:\.\d+)?)D)?(?:T(?:(\-?\d+(?:\.\d+)?)H)?(?:(\-?\d+(?:\.\d+)?)M)?(?:(\-?\d+(?:\.\d+)?)S)?)?/;

			// Public Properties

			this.years = 0;
			this.months = 0;
			this.days = 0;
			this.hours = 0;
			this.minutes = 0;
			this.seconds = 0;

			// Constructor

			this.constructor = function(yearsOrTimestring, months, days, hours, minutes, seconds)
			{
				if ((arguments.length == 1) && (typeof yearsOrTimestring === "string"))
				{
					var matches = _ISO_DURATION_PATTERN.exec(yearsOrTimestring);
					var numMatches = matches ? matches.length : 0;
					var match;

					match = (numMatches > 1) ? matches[1] : null;
					this.years = match ? Number(match) : 0;

					match = (numMatches > 2) ? matches[2] : null;
					this.months = match ? Number(match) : 0;

					match = (numMatches > 3) ? matches[3] : null;
					this.days = match ? Number(match) : 0;

					match = (numMatches > 4) ? matches[4] : null;
					this.hours = match ? Number(match) : 0;

					match = (numMatches > 5) ? matches[5] : null;
					this.minutes = match ? Number(match) : 0;

					match = (numMatches > 6) ? matches[6] : null;
					this.seconds = match ? Number(match) : 0;
				}
				else
				{
					this.years = (typeof yearsOrTimestring === "number") ? yearsOrTimestring : 0;
					this.months = (months !== undefined) ? months : 0;
					this.days = (days !== undefined) ? days : 0;
					this.hours = (hours !== undefined) ? hours : 0;
					this.minutes = (minutes !== undefined) ? minutes : 0;
					this.seconds = (seconds !== undefined) ? seconds : 0;
				}
			};

			// Public Methods

			this.clone = function()
			{
				return new Duration(this.years, this.months, this.days, this.hours, this.minutes, this.seconds);
			};

			this.equals = function(toCompare)
			{
				return ((this.years == toCompare.years) &&
				        (this.months == toCompare.months) &&
				        (this.days == toCompare.days) &&
				        (this.hours == toCompare.hours) &&
				        (this.minutes == toCompare.minutes) &&
				        (this.seconds == toCompare.seconds));
			};

			this.toString = function()
			{
				var str = "";
				str += "P" + this.years + "Y" + this.months + "M" + this.days + "D";
				str += "T" + this.hours + "H" + this.minutes + "M" + this.seconds + "S";
				return str;
			};

		});

	});

	jg_namespace("jgatt.utils", function()
	{

		this.IComparator = jg_extend(Object, function(IComparator, base)
		{

			// Public Methods

			this.compare = function(value1, value2)
			{
			};

		});

	});

	jg_namespace("jgatt.utils", function()
	{

		var IComparator = jg_import("jgatt.utils.IComparator");

		this.NaturalComparator = jg_extend(IComparator, function(NaturalComparator, base)
		{

			// Public Methods

			this.compare = function(value1, value2)
			{
				if (value1 < value2)
					return -1;
				if (value1 > value2)
					return 1;
				return 0;
			};

		});

	});

	jg_namespace("jgatt.utils", function()
	{

		var IComparator = jg_import("jgatt.utils.IComparator");
		var NaturalComparator = jg_import("jgatt.utils.NaturalComparator");

		this.ArrayUtils = jg_static(function(ArrayUtils)
		{

			// Private Static Constants

			var _NATURAL_COMPARATOR = new NaturalComparator();

			// Public Static Methods

			ArrayUtils.indexOf = function(a, value)
			{
				if (a == null)
					throw new Error("Parameter a must be non-null.");
				if (!(a instanceof Array))
					throw new Error("Parameter a must be an array.");

				for (var i = 0, l = a.length; i < l; i++)
				{
					if (a[i] === value)
						return i;
				}

				return -1;
			};

			ArrayUtils.lastIndexOf = function(a, value)
			{
				if (a == null)
					throw new Error("Parameter a must be non-null.");
				if (!(a instanceof Array))
					throw new Error("Parameter a must be an array.");

				for (var i = a.length - 1; i >= 0; i--)
				{
					if (a[i] === value)
						return i;
				}

				return -1;
			};

			ArrayUtils.sort = function(a, comparator)
			{
				if (a == null)
					throw new Error("Parameter a must be non-null.");
				if (!(a instanceof Array))
					throw new Error("Parameter a must be an array.");
				if ((comparator != null) && !(comparator instanceof IComparator))
					throw new Error("Parameter comparator must be an instance of jgatt.utils.IComparator.");

				if (!comparator)
					comparator = _NATURAL_COMPARATOR;

				// use delegate so comparator has scope
				var compare = function(value1, value2)
				{
					return comparator.compare(value1, value2);
				};

				a.sort(compare);
			};

			ArrayUtils.binarySearch = function(a, value, comparator)
			{
				if (a == null)
					throw new Error("Parameter a must be non-null.");
				if (!(a instanceof Array))
					throw new Error("Parameter a must be an array.");
				if ((comparator != null) && !(comparator instanceof IComparator))
					throw new Error("Parameter comparator must be an instance of jgatt.utils.IComparator.");

				var high = a.length - 1;
				if (high < 0)
					return -1;

				if (!comparator)
					comparator = _NATURAL_COMPARATOR;

				var low = 0;
				var mid;
				var comp;

				while (low <= high)
				{
					mid = low + Math.floor((high - low) / 2);
					comp = comparator.compare(value, a[mid]);
					if (comp < 0)
						high = mid - 1;
					else if (comp > 0)
						low = mid + 1;
					else
						return mid;
				}

				return -low - 1;
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		var ArrayUtils = jg_import("jgatt.utils.ArrayUtils");
		var ITimeZone = jg_import("splunk.time.ITimeZone");

		this.SplunkTimeZone = jg_extend(ITimeZone, function(SplunkTimeZone, base)
		{

			// Private Properties

			this._standardOffset = 0;
			this._serializedTimeZone = null;

			this._isConstant = false;
			this._offsetList = null;
			this._timeList = null;
			this._indexList = null;

			// Constructor

			this.constructor = function(serializedTimeZone)
			{
				if (serializedTimeZone == null)
					throw new Error("Parameter serializedTimeZone must be non-null.");
				if (typeof serializedTimeZone !== "string")
					throw new Error("Parameter serializedTimeZone must be a string.");

				this._serializedTimeZone = serializedTimeZone;

				this._offsetList = [];
				this._timeList = [];
				this._indexList = [];

				this._parseSerializedTimeZone(serializedTimeZone);
			};

			// Public Methods

			this.getSerializedTimeZone = function()
			{
				return this._serializedTimeZone;
			};

			this.getStandardOffset = function()
			{
				return this._standardOffset;
			};

			this.getOffset = function(time)
			{
				if (this._isConstant)
					return this._standardOffset;

				var offsetList = this._offsetList;
				var numOffsets = offsetList.length;
				if (numOffsets == 0)
					return 0;

				if (numOffsets == 1)
					return offsetList[0];

				var timeList = this._timeList;
				var numTimes = timeList.length;
				if (numTimes == 0)
					return 0;

				var timeIndex;
				if (numTimes == 1)
				{
					timeIndex = 0;
				}
				else
				{
					timeIndex = ArrayUtils.binarySearch(timeList, time);
					if (timeIndex < -1)
						timeIndex = -timeIndex - 2;
					else if (timeIndex == -1)
						timeIndex = 0;
				}

				var offsetIndex = this._indexList[timeIndex];
				return offsetList[offsetIndex];
			};

			// Private Methods

			this._parseSerializedTimeZone = function(serializedTimeZone)
			{
				// ### SERIALIZED TIMEZONE FORMAT 1.0
				// Y-25200 YW 50 44 54
				// Y-28800 NW 50 53 54
				// Y-25200 YW 50 57 54
				// Y-25200 YG 50 50 54
				// @-1633269600 0
				// @-1615129200 1
				// @-1601820000 0
				// @-1583679600 1

				// ### SERIALIZED TIMEZONE FORMAT 1.0
				// C0
				// Y0 NW 47 4D 54

				if (!serializedTimeZone)
					return;

				var entries = serializedTimeZone.split(";");
				var entry;
				for (var i = 0, l = entries.length; i < l; i++)
				{
					entry = entries[i];
					if (entry)
					{
						switch (entry.charAt(0))
						{
							case "C":
								if (this._parseC(entry.substring(1, entry.length)))
									return;
								break;
							case "Y":
								this._parseY(entry.substring(1, entry.length));
								break;
							case "@":
								this._parseAt(entry.substring(1, entry.length));
								break;
						}
					}
				}

				this._standardOffset = this.getOffset(0);
			};

			this._parseC = function(entry)
			{
				// 0

				if (!entry)
					return false;

				var time = Number(entry);
				if (isNaN(time))
					return false;

				this._standardOffset = time;
				this._isConstant = true;

				return true;
			};

			this._parseY = function(entry)
			{
				// -25200 YW 50 44 54

				if (!entry)
					return;

				var elements = entry.split(" ");
				if (elements.length < 1)
					return;

				var element = elements[0];
				if (!element)
					return;

				var offset = Number(element);
				if (isNaN(offset))
					return;

				this._offsetList.push(offset);
			};

			this._parseAt = function(entry)
			{
				// -1633269600 0

				if (!entry)
					return;

				var elements = entry.split(" ");
				if (elements.length < 2)
					return;

				var element = elements[0];
				if (!element)
					return;

				var time = Number(element);
				if (isNaN(time))
					return;

				element = elements[1];
				if (!element)
					return;

				var index = Number(element);
				if (isNaN(index))
					return;

				index = Math.floor(index);
				if ((index < 0) || (index >= this._offsetList.length))
					return;

				this._timeList.push(time);
				this._indexList.push(index);
			};

		});

	});

	jg_namespace("splunk.time", function()
	{

		var DateTime = jg_import("splunk.time.DateTime");
		var Duration = jg_import("splunk.time.Duration");
		var SimpleTimeZone = jg_import("splunk.time.SimpleTimeZone");
		var TimeZones = jg_import("splunk.time.TimeZones");

		this.TimeUtils = jg_static(function(TimeUtils)
		{

			// Public Static Constants

			TimeUtils.EPOCH = new DateTime(0).toUTC();

			// Public Static Methods

			TimeUtils.daysInMonth = function(date)
			{
				date = new DateTime(date.getYear(), date.getMonth() + 1, 0, 0, 0, 0, TimeZones.UTC);
				return date.getDay();
			};

			TimeUtils.addDurations = function(duration1, duration2)
			{
				return new Duration(duration1.years + duration2.years, duration1.months + duration2.months, duration1.days + duration2.days, duration1.hours + duration2.hours, duration1.minutes + duration2.minutes, duration1.seconds + duration2.seconds);
			};

			TimeUtils.addDateDuration = function(date, duration)
			{
				if ((duration.years == 0) && (duration.months == 0) && (duration.days == 0))
					date = date.clone();
				else
					date = new DateTime(date.getYear() + duration.years, date.getMonth() + duration.months, date.getDay() + duration.days, date.getHours(), date.getMinutes(), date.getSeconds(), date.getTimeZone());
				date.setTime(date.getTime() + (duration.hours * 3600 + duration.minutes * 60 + duration.seconds));
				return date;
			};

			TimeUtils.subtractDates = function(date1, date2)
			{
				date2 = date2.toTimeZone(date1.getTimeZone());

				var isNegative = (date1.getTime() < date2.getTime());
				if (isNegative)
				{
					var temp = date1;
					date1 = date2;
					date2 = temp;
				}

				var sameTimeZoneOffset = (date1.getTimeZoneOffset() == date2.getTimeZoneOffset());

				var years;
				var months;
				var days;
				var hours;
				var minutes;
				var seconds;

				var date3;
				if (sameTimeZoneOffset)
				{
					date3 = date1;
				}
				else if ((date1.getYear() == date2.getYear()) && (date1.getMonth() == date2.getMonth()) && (date1.getDay() == date2.getDay()))
				{
					date3 = date2;
				}
				else
				{
					date3 = new DateTime(date1.getYear(), date1.getMonth(), date1.getDay(), date2.getHours(), date2.getMinutes(), date2.getSeconds(), date2.getTimeZone());
					if (date3.getTime() > date1.getTime())
					{
						date3 = new DateTime(date1.getYear(), date1.getMonth(), date1.getDay() - 1, date2.getHours(), date2.getMinutes(), date2.getSeconds(), date2.getTimeZone());
						if ((date3.getTime() < date2.getTime()) || ((date3.getYear() == date2.getYear()) && (date3.getMonth() == date2.getMonth()) && (date3.getDay() == date2.getDay())))
							date3 = date2;
					}
				}

				years = date3.getYear() - date2.getYear();
				months = date3.getMonth() - date2.getMonth();
				days = date3.getDay() - date2.getDay();

				if (sameTimeZoneOffset)
				{
					hours = date3.getHours() - date2.getHours();
					minutes = date3.getMinutes() - date2.getMinutes();
					seconds = date3.getSeconds() - date2.getSeconds();

					if (seconds < 0)
					{
						seconds += 60;
						minutes--;
					}

					if (minutes < 0)
					{
						minutes += 60;
						hours--;
					}

					if (hours < 0)
					{
						hours += 24;
						days--;
					}

					seconds = _normalizePrecision(seconds);
				}
				else
				{
					seconds = date1.getTime() - date3.getTime();
					var wholeSeconds = Math.floor(seconds);
					var subSeconds = _normalizePrecision(seconds - wholeSeconds);
					if (subSeconds >= 1)
					{
						subSeconds = 0;
						wholeSeconds++;
					}

					minutes = Math.floor(wholeSeconds / 60);
					seconds = (wholeSeconds % 60) + subSeconds;

					hours = Math.floor(minutes / 60);
					minutes %= 60;
				}

				if (days < 0)
				{
					date3 = new DateTime(date2.getYear(), date2.getMonth() + 1, 0, 0, 0, 0, TimeZones.UTC);
					days += date3.getDay();
					months--;
				}

				if (months < 0)
				{
					months += 12;
					years--;
				}

				if (isNegative)
				{
					years = -years;
					months = -months;
					days = -days;
					hours = -hours;
					minutes = -minutes;
					seconds = -seconds;
				}

				return new Duration(years, months, days, hours, minutes, seconds);
			};

			TimeUtils.subtractDurations = function(duration1, duration2)
			{
				return new Duration(duration1.years - duration2.years, duration1.months - duration2.months, duration1.days - duration2.days, duration1.hours - duration2.hours, duration1.minutes - duration2.minutes, duration1.seconds - duration2.seconds);
			};

			TimeUtils.subtractDateDuration = function(date, duration)
			{
				if ((duration.years == 0) && (duration.months == 0) && (duration.days == 0))
					date = date.clone();
				else
					date = new DateTime(date.getYear() - duration.years, date.getMonth() - duration.months, date.getDay() - duration.days, date.getHours(), date.getMinutes(), date.getSeconds(), date.getTimeZone());
				date.setTime(date.getTime() - (duration.hours * 3600 + duration.minutes * 60 + duration.seconds));
				return date;
			};

			TimeUtils.multiplyDuration = function(duration, scalar)
			{
				return new Duration(duration.years * scalar, duration.months * scalar, duration.days * scalar, duration.hours * scalar, duration.minutes * scalar, duration.seconds * scalar);
			};

			TimeUtils.divideDuration = function(duration, scalar)
			{
				return new Duration(duration.years / scalar, duration.months / scalar, duration.days / scalar, duration.hours / scalar, duration.minutes / scalar, duration.seconds / scalar);
			};

			TimeUtils.ceilDate = function(date, units)
			{
				var date2 = date.toTimeZone(new SimpleTimeZone(date.getTimeZoneOffset()));
				_ceilDateInternal(date2, units);
				return _toTimeZoneStable(date2, date.getTimeZone());
			};

			TimeUtils.ceilDuration = function(duration, units, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = TimeUtils.addDateDuration(referenceDate, duration);
				var isNegative = (date.getTime() < referenceDate.getTime());
				duration = isNegative ? TimeUtils.subtractDates(referenceDate, date) : TimeUtils.subtractDates(date, referenceDate);

				if (!units)
				{
					units = new Duration();
					if (duration.years > 0)
						units.years = 1;
					else if (duration.months > 0)
						units.months = 1;
					else if (duration.days > 0)
						units.days = 1;
					else if (duration.hours > 0)
						units.hours = 1;
					else if (duration.minutes > 0)
						units.minutes = 1;
					else if (duration.seconds > 0)
						units.seconds = 1;
				}

				if (isNegative)
				{
					_floorDurationInternal(duration, units, date);
					return TimeUtils.multiplyDuration(duration, -1);
				}

				_ceilDurationInternal(duration, units, referenceDate);
				return duration;
			};

			TimeUtils.floorDate = function(date, units)
			{
				var date2 = date.toTimeZone(new SimpleTimeZone(date.getTimeZoneOffset()));
				_floorDateInternal(date2, units);
				return _toTimeZoneStable(date2, date.getTimeZone());
			};

			TimeUtils.floorDuration = function(duration, units, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = TimeUtils.addDateDuration(referenceDate, duration);
				var isNegative = (date.getTime() < referenceDate.getTime());
				duration = isNegative ? TimeUtils.subtractDates(referenceDate, date) : TimeUtils.subtractDates(date, referenceDate);

				if (!units)
				{
					units = new Duration();
					if (duration.years > 0)
						units.years = 1;
					else if (duration.months > 0)
						units.months = 1;
					else if (duration.days > 0)
						units.days = 1;
					else if (duration.hours > 0)
						units.hours = 1;
					else if (duration.minutes > 0)
						units.minutes = 1;
					else if (duration.seconds > 0)
						units.seconds = 1;
				}

				if (isNegative)
				{
					_ceilDurationInternal(duration, units, date);
					return TimeUtils.multiplyDuration(duration, -1);
				}

				_floorDurationInternal(duration, units, referenceDate);
				return duration;
			};

			TimeUtils.roundDate = function(date, units)
			{
				var date2 = date.toTimeZone(new SimpleTimeZone(date.getTimeZoneOffset()));
				_roundDateInternal(date2, units);
				return _toTimeZoneStable(date2, date.getTimeZone());
			};

			TimeUtils.roundDuration = function(duration, units, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = TimeUtils.addDateDuration(referenceDate, duration);
				var isNegative = (date.getTime() < referenceDate.getTime());
				duration = isNegative ? TimeUtils.subtractDates(referenceDate, date) : TimeUtils.subtractDates(date, referenceDate);

				if (!units)
				{
					units = new Duration();
					if (duration.years > 0)
						units.years = 1;
					else if (duration.months > 0)
						units.months = 1;
					else if (duration.days > 0)
						units.days = 1;
					else if (duration.hours > 0)
						units.hours = 1;
					else if (duration.minutes > 0)
						units.minutes = 1;
					else if (duration.seconds > 0)
						units.seconds = 1;
				}

				if (isNegative)
				{
					_roundDurationInternal(duration, units, date);
					return TimeUtils.multiplyDuration(duration, -1);
				}

				_roundDurationInternal(duration, units, referenceDate);
				return duration;
			};

			TimeUtils.normalizeDuration = function(duration, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = TimeUtils.addDateDuration(referenceDate, duration);
				return TimeUtils.subtractDates(date, referenceDate);
			};

			TimeUtils.durationToSeconds = function(duration, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = TimeUtils.addDateDuration(referenceDate, duration);
				return _normalizePrecision(date.getTime() - referenceDate.getTime());
			};

			TimeUtils.secondsToDuration = function(seconds, referenceDate)
			{
				if (!referenceDate)
					referenceDate = TimeUtils.EPOCH;

				var date = new DateTime(referenceDate.getTime() + seconds).toTimeZone(referenceDate.getTimeZone());
				return TimeUtils.subtractDates(date, referenceDate);
			};

			// Private Static Methods

			var _ceilDateInternal = function(date, units)
			{
				var ceilYear = (units.years > 0);
				var ceilMonth = ceilYear || (units.months > 0);
				var ceilDay = ceilMonth || (units.days > 0);
				var ceilHours = ceilDay || (units.hours > 0);
				var ceilMinutes = ceilHours || (units.minutes > 0);
				var ceilSeconds = ceilMinutes || (units.seconds > 0);

				if (!ceilSeconds)
					return;

				if (date.getSeconds() > 0)
				{
					if (units.seconds > 0)
						date.setSeconds(Math.min(Math.ceil(date.getSeconds() / units.seconds) * units.seconds, 60));
					else
						date.setSeconds(60);
				}

				if (!ceilMinutes)
					return;

				if (date.getMinutes() > 0)
				{
					if (units.minutes > 0)
						date.setMinutes(Math.min(Math.ceil(date.getMinutes() / units.minutes) * units.minutes, 60));
					else
						date.setMinutes(60);
				}

				if (!ceilHours)
					return;

				if (date.getHours() > 0)
				{
					if (units.hours > 0)
						date.setHours(Math.min(Math.ceil(date.getHours() / units.hours) * units.hours, 24));
					else
						date.setHours(24);
				}

				if (!ceilDay)
					return;

				if (date.getDay() > 1)
				{
					var daysInMonth = TimeUtils.daysInMonth(date);
					if (units.days > 0)
						date.setDay(Math.min(Math.ceil((date.getDay() - 1) / units.days) * units.days, daysInMonth) + 1);
					else
						date.setDay(daysInMonth + 1);
				}

				if (!ceilMonth)
					return;

				if (date.getMonth() > 1)
				{
					if (units.months > 0)
						date.setMonth(Math.min(Math.ceil((date.getMonth() - 1) / units.months) * units.months, 12) + 1);
					else
						date.setMonth(12 + 1);
				}

				if (!ceilYear)
					return;

				if (units.years > 0)
					date.setYear(Math.ceil(date.getYear() / units.years) * units.years);
			};

			var _ceilDurationInternal = function(duration, units, referenceDate)
			{
				var ceilYears = (units.years > 0);
				var ceilMonths = ceilYears || (units.months > 0);
				var ceilDays = ceilMonths || (units.days > 0);
				var ceilHours = ceilDays || (units.hours > 0);
				var ceilMinutes = ceilHours || (units.minutes > 0);
				var ceilSeconds = ceilMinutes || (units.seconds > 0);

				var daysInMonth = TimeUtils.daysInMonth(referenceDate);

				if (!ceilSeconds)
					return;

				if (duration.seconds > 0)
				{
					if (units.seconds > 0)
						duration.seconds = Math.min(Math.ceil(duration.seconds / units.seconds) * units.seconds, 60);
					else
						duration.seconds = 60;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!ceilMinutes)
					return;

				if (duration.minutes > 0)
				{
					if (units.minutes > 0)
						duration.minutes = Math.min(Math.ceil(duration.minutes / units.minutes) * units.minutes, 60);
					else
						duration.minutes = 60;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!ceilHours)
					return;

				if (duration.hours > 0)
				{
					if (units.hours > 0)
						duration.hours = Math.min(Math.ceil(duration.hours / units.hours) * units.hours, 24);
					else
						duration.hours = 24;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!ceilDays)
					return;

				if (duration.days > 0)
				{
					if (units.days > 0)
						duration.days = Math.min(Math.ceil(duration.days / units.days) * units.days, daysInMonth);
					else
						duration.days = daysInMonth;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!ceilMonths)
					return;

				if (duration.months > 0)
				{
					if (units.months > 0)
						duration.months = Math.min(Math.ceil(duration.months / units.months) * units.months, 12);
					else
						duration.months = 12;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!ceilYears)
					return;

				if (units.years > 0)
				{
					duration.years = Math.ceil(duration.years / units.years) * units.years;
					_normalizeDuration(duration, daysInMonth);
				}
			};

			var _floorDateInternal = function(date, units)
			{
				var floorYear = (units.years > 0);
				var floorMonth = floorYear || (units.months > 0);
				var floorDay = floorMonth || (units.days > 0);
				var floorHours = floorDay || (units.hours > 0);
				var floorMinutes = floorHours || (units.minutes > 0);
				var floorSeconds = floorMinutes || (units.seconds > 0);

				if (!floorSeconds)
					return;

				if (date.getSeconds() > 0)
				{
					if (units.seconds > 0)
						date.setSeconds(Math.floor(date.getSeconds() / units.seconds) * units.seconds);
					else
						date.setSeconds(0);
				}

				if (!floorMinutes)
					return;

				if (date.getMinutes() > 0)
				{
					if (units.minutes > 0)
						date.setMinutes(Math.floor(date.getMinutes() / units.minutes) * units.minutes);
					else
						date.setMinutes(0);
				}

				if (!floorHours)
					return;

				if (date.getHours() > 0)
				{
					if (units.hours > 0)
						date.setHours(Math.floor(date.getHours() / units.hours) * units.hours);
					else
						date.setHours(0);
				}

				if (!floorDay)
					return;

				if (date.getDay() > 1)
				{
					if (units.days > 0)
						date.setDay(Math.floor((date.getDay() - 1) / units.days) * units.days + 1);
					else
						date.setDay(1);
				}

				if (!floorMonth)
					return;

				if (date.getMonth() > 1)
				{
					if (units.months > 0)
						date.setMonth(Math.floor((date.getMonth() - 1) / units.months) * units.months + 1);
					else
						date.setMonth(1);
				}

				if (!floorYear)
					return;

				if (units.years > 0)
					date.setYear(Math.floor(date.getYear() / units.years) * units.years);
			};

			var _floorDurationInternal = function(duration, units, referenceDate)
			{
				var floorYears = (units.years > 0);
				var floorMonths = floorYears || (units.months > 0);
				var floorDays = floorMonths || (units.days > 0);
				var floorHours = floorDays || (units.hours > 0);
				var floorMinutes = floorHours || (units.minutes > 0);
				var floorSeconds = floorMinutes || (units.seconds > 0);

				var daysInMonth = TimeUtils.daysInMonth(referenceDate);

				if (!floorSeconds)
					return;

				if (duration.seconds > 0)
				{
					if (units.seconds > 0)
						duration.seconds = Math.floor(duration.seconds / units.seconds) * units.seconds;
					else
						duration.seconds = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!floorMinutes)
					return;

				if (duration.minutes > 0)
				{
					if (units.minutes > 0)
						duration.minutes = Math.floor(duration.minutes / units.minutes) * units.minutes;
					else
						duration.minutes = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!floorHours)
					return;

				if (duration.hours > 0)
				{
					if (units.hours > 0)
						duration.hours = Math.floor(duration.hours / units.hours) * units.hours;
					else
						duration.hours = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!floorDays)
					return;

				if (duration.days > 0)
				{
					if (units.days > 0)
						duration.days = Math.floor(duration.days / units.days) * units.days;
					else
						duration.days = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!floorMonths)
					return;

				if (duration.months > 0)
				{
					if (units.months > 0)
						duration.months = Math.floor(duration.months / units.months) * units.months;
					else
						duration.months = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!floorYears)
					return;

				if (units.years > 0)
				{
					duration.years = Math.floor(duration.years / units.years) * units.years;
					_normalizeDuration(duration, daysInMonth);
				}
			};

			var _roundDateInternal = function(date, units)
			{
				var roundYear = (units.years > 0);
				var roundMonth = roundYear || (units.months > 0);
				var roundDay = roundMonth || (units.days > 0);
				var roundHours = roundDay || (units.hours > 0);
				var roundMinutes = roundHours || (units.minutes > 0);
				var roundSeconds = roundMinutes || (units.seconds > 0);

				if (!roundSeconds)
					return;

				if (date.getSeconds() > 0)
				{
					if (units.seconds > 0)
						date.setSeconds(Math.min(Math.round(date.getSeconds() / units.seconds) * units.seconds, 60));
					else if (date.getSeconds() >= 30)
						date.setSeconds(60);
					else
						date.setSeconds(0);
				}

				if (!roundMinutes)
					return;

				if (date.getMinutes() > 0)
				{
					if (units.minutes > 0)
						date.setMinutes(Math.min(Math.round(date.getMinutes() / units.minutes) * units.minutes, 60));
					else if (date.getMinutes() >= 30)
						date.setMinutes(60);
					else
						date.setMinutes(0);
				}

				if (!roundHours)
					return;

				if (date.getHours() > 0)
				{
					if (units.hours > 0)
						date.setHours(Math.min(Math.round(date.getHours() / units.hours) * units.hours, 24));
					else if (date.getHours() >= 12)
						date.setHours(24);
					else
						date.setHours(0);
				}

				if (!roundDay)
					return;

				if (date.getDay() > 1)
				{
					var daysInMonth = TimeUtils.daysInMonth(date);
					if (units.days > 0)
						date.setDay(Math.min(Math.round((date.getDay() - 1) / units.days) * units.days, daysInMonth) + 1);
					else if (date.getDay() >= Math.floor(daysInMonth / 2 + 1))
						date.setDay(daysInMonth + 1);
					else
						date.setDay(1);
				}

				if (!roundMonth)
					return;

				if (date.getMonth() > 1)
				{
					if (units.months > 0)
						date.setMonth(Math.min(Math.round((date.getMonth() - 1) / units.months) * units.months, 12) + 1);
					else if (date.getMonth() >= (6 + 1))
						date.setMonth(12 + 1);
					else
						date.setMonth(1);
				}

				if (!roundYear)
					return;

				if (units.years > 0)
					date.setYear(Math.round(date.getYear() / units.years) * units.years);
			};

			var _roundDurationInternal = function(duration, units, referenceDate)
			{
				var roundYears = (units.years > 0);
				var roundMonths = roundYears || (units.months > 0);
				var roundDays = roundMonths || (units.days > 0);
				var roundHours = roundDays || (units.hours > 0);
				var roundMinutes = roundHours || (units.minutes > 0);
				var roundSeconds = roundMinutes || (units.seconds > 0);

				var daysInMonth = TimeUtils.daysInMonth(referenceDate);

				if (!roundSeconds)
					return;

				if (duration.seconds > 0)
				{
					if (units.seconds > 0)
						duration.seconds = Math.min(Math.round(duration.seconds / units.seconds) * units.seconds, 60);
					else if (duration.seconds >= 30)
						duration.seconds = 60;
					else
						duration.seconds = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!roundMinutes)
					return;

				if (duration.minutes > 0)
				{
					if (units.minutes > 0)
						duration.minutes = Math.min(Math.round(duration.minutes / units.minutes) * units.minutes, 60);
					else if (duration.minutes >= 30)
						duration.minutes = 60;
					else
						duration.minutes = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!roundHours)
					return;

				if (duration.hours > 0)
				{
					if (units.hours > 0)
						duration.hours = Math.min(Math.round(duration.hours / units.hours) * units.hours, 24);
					else if (duration.hours >= 12)
						duration.hours = 24;
					else
						duration.hours = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!roundDays)
					return;

				if (duration.days > 0)
				{
					if (units.days > 0)
						duration.days = Math.min(Math.round(duration.days / units.days) * units.days, daysInMonth);
					else if (duration.days >= Math.floor(daysInMonth / 2))
						duration.days = daysInMonth;
					else
						duration.days = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!roundMonths)
					return;

				if (duration.months > 0)
				{
					if (units.months > 0)
						duration.months = Math.min(Math.round(duration.months / units.months) * units.months, 12);
					else if (duration.months >= 6)
						duration.months = 12;
					else
						duration.months = 0;
					_normalizeDuration(duration, daysInMonth);
				}

				if (!roundYears)
					return;

				if (units.years > 0)
				{
					duration.years = Math.round(duration.years / units.years) * units.years;
					_normalizeDuration(duration, daysInMonth);
				}
			};

			var _toTimeZoneStable = function(date, timeZone)
			{
				var date2 = date.toTimeZone(timeZone);
				if ((date2.getYear() == date.getYear()) && (date2.getMonth() == date.getMonth()) && (date2.getDay() == date.getDay()) &&
				    (date2.getHours() == date.getHours()) && (date2.getMinutes() == date.getMinutes()) && (date2.getSeconds() == date.getSeconds()))
					return date2;

				var date3 = date.clone();
				date3.setTimeZone(timeZone);
				if ((date3.getYear() == date.getYear()) && (date3.getMonth() == date.getMonth()) && (date3.getDay() == date.getDay()) &&
				    (date3.getHours() == date.getHours()) && (date3.getMinutes() == date.getMinutes()) && (date3.getSeconds() == date.getSeconds()))
					return date3;

				return date2;
			};

			var _normalizeDuration = function(duration, daysInMonth)
			{
				var years = duration.years;
				var wholeYears = Math.floor(years);
				var subYears = years - wholeYears;

				var months = duration.months + subYears * 12;
				var wholeMonths = Math.floor(months);
				var subMonths = months - wholeMonths;

				var days = duration.days + subMonths * daysInMonth;
				var wholeDays = Math.floor(days);
				var subDays = days - wholeDays;

				var hours = duration.hours + subDays * 24;
				var wholeHours = Math.floor(hours);
				var subHours = hours - wholeHours;

				var minutes = duration.minutes + subHours * 60;
				var wholeMinutes = Math.floor(minutes);
				var subMinutes = minutes - wholeMinutes;

				var seconds = duration.seconds + subMinutes * 60;
				var wholeSeconds = Math.floor(seconds);
				var subSeconds = _normalizePrecision(seconds - wholeSeconds);
				if (subSeconds >= 1)
				{
					subSeconds = 0;
					wholeSeconds++;
				}

				wholeMinutes += Math.floor(wholeSeconds / 60);
				wholeSeconds %= 60;

				wholeHours += Math.floor(wholeMinutes / 60);
				wholeMinutes %= 60;

				wholeDays += Math.floor(wholeHours / 24);
				wholeHours %= 24;

				wholeMonths += Math.floor(wholeDays / daysInMonth);
				wholeDays %= daysInMonth;

				wholeYears += Math.floor(wholeMonths / 12);
				wholeMonths %= 12;

				duration.years = wholeYears;
				duration.months = wholeMonths;
				duration.days = wholeDays;
				duration.hours = wholeHours;
				duration.minutes = wholeMinutes;
				duration.seconds = wholeSeconds + subSeconds;
			};

			var _normalizePrecision = function(value)
			{
				return Number(value.toFixed(6));
			};

		});

	});

})();