/*global logger*/
/*
    AutoCompleteForMendix
    ========================

    @file      : AutoCompleteForMendix.js
    @version   : 2.0.0
    @author    : Iain Lindsay
    @date      : 2016-04-12
    @copyright : AuraQ Limited 2016
    @license   : Apache V2

    Documentation
    ========================
    AutoComplete widget built using Select2 (https://select2.github.io/).
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
require({
    packages: [{
        name: 'jqwrapper',
        location: '../../widgets/AutoCompleteForMendix/lib',
        main: 'jqwrapper'
    }, {
        name: 'select2',
        location: '../../widgets/AutoCompleteForMendix/lib',
        main: 'select2'
    }]
}, [
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "dojo/_base/kernel",
    "jqwrapper",
    "select2",
    "dojo/text!AutoCompleteForMendix/widget/template/AutoCompleteForMendix.html"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, dojo, _jqwrapper, _select2, widgetTemplate) {
    "use strict";

    var $ = _jqwrapper;
    $ = _select2.createInstance($);

    // Declare widget's prototype.
    return declare("AutoCompleteForMendix.widget.AutoCompleteForMendix", [_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        _$combo: null,
        _displayAttributes: [],
        _sortParams: [],
        _queryAdapter: null,
        _entity: null,
        _reference: null,
        _attributeList: null,
        _displayTemplate: "",
        _selectedTemplate: "",
        _searchType: null,
        _searchMicroflow: null,
		_searchTextAttribute: "",
        variableData: [],

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _$alertdiv: null,
        _alertDiv: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            // Uncomment the following line to enable debug messages
            //logger.level(logger.DEBUG);
            logger.debug(this.id + ".constructor");
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function() {
            logger.debug(this.id + ".postCreate");

            this._entity = this.dataAssociation.split('/')[1];
            this._reference = this.dataAssociation.split('/')[0];
            this._attributeList = this._variableContainer;
            this._displayTemplate = this.displayTemplate;
            this._selectedTemplate = this.selectedTemplate;
            this._searchType = this.searchType;
            this._searchMicroflow = this.searchMicroflow;
			this._searchTextAttribute = this.searchTextAttribute;

            // issues with the sort parameters being persisted between widget instances mean we set the sort array to empty.
            this._sortParams = [];
            // create our sort order array
            for (var i = 0; i < this._sortContainer.length; i++) {
                var item = this._sortContainer[i];
                this._sortParams.push([item.sortAttribute, item.sortOrder]);
            }

            // make sure we only select the control for the current id or we'll overwrite previous instances
            var selector = '#' + this.id + ' select.autoComplete';
            this._$combo = $(selector);

            // adjust the template based on the display settings.
            if (this.showLabel) {
                if (this.formOrientation === "horizontal") {
                    // width needs to be between 1 and 11
                    var comboLabelWidth = this.labelWidth < 1 ? 1 : this.labelWidth;
                    comboLabelWidth = this.labelWidth > 11 ? 11 : this.labelWidth;

                    var comboControlWidth = 12 - comboLabelWidth,
                        comboLabelClass = 'col-sm-' + comboLabelWidth,
                        comboControlClass = 'col-sm-' + comboControlWidth;

                    dojoClass.add(this.autoCompleteLabel, comboLabelClass);
                    dojoClass.add(this.autoCompleteComboContainer, comboControlClass);
                }

                this.autoCompleteLabel.innerHTML = this.fieldCaption;
            } else {
                dojoClass.remove(this.autoCompleteMainContainer, "form-group");
                dojoConstruct.destroy(this.autoCompleteLabel);
            }

            this._initialiseQueryAdapter();

            //this._updateRendering();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {
            logger.debug(this.id + ".update");
            var self = this;

            if (obj === null) {
                if (!dojoClass.contains(this.domNode, 'hidden')) {
                    dojoClass.add(this.domNode, 'hidden');
                }
            } else {
                if (dojoClass.contains(this.domNode, 'hidden')) {
                    dojoClass.remove(this.domNode, 'hidden');
                }
                this._contextObj = obj;
                this._resetSubscriptions();
                this._updateRendering(null);

                this._$combo.select2({
                        dataAdapter: this._queryAdapter,
                        minimumInputLength: this.minimumInputLength,
                        width: '100%',
                        placeholder: this.placeholderText,
                        allowClear: this.allowClear,
                        language: {
                            inputTooShort: function(params) {
                                var min = params.minimum || 0;
                                var input = params.input || '';
                                var remain = min - input.length;

                                var message = self.inputTooShortText;
                                message = message.split("${minLength}").join(min);
                                message = message.split("${remainLength}").join(remain);

                                return message;
                            },
                            noResults: function() {
                                return self.noResultsText;
                            },
                            searching: function() {
                                return self.searchingText;
                            }
                        },
                        templateResult: function(item) {
                            if (!item.id) {
                                // return `text` for optgroup
                                return item.text;
                            }
                            // return item template, assume its html
                            return $(item.dropdownDisplay);
                        }
                    })
                    .on("select2:select", function(e) {
                        // set the value
                        if (e.params && e.params.data) {
                            var guid = e.params.data.id;
                            self._contextObj.addReference(self._reference, guid);
                        }

                        // run the OC microflow if one has been configured.
                        if (self.onChangeMicroflow) {
                            self._execMf(self._contextObj.getGuid(), self.onChangeMicroflow);
                        }
                    })
                    .on("select2:unselect", function(e) {
                        // set the value
                        if (e.params && e.params.data) {
                            var guid = e.params.data.id;
                            self._contextObj.removeReferences(self._reference, [guid]);
                        }

                        // run the OC microflow if one has been configured.
                        if (self.onChangeMicroflow) {
                            self._execMf(self._contextObj.getGuid(), self.onChangeMicroflow);
                        }
                    });

                // set the default value for the dropdown (if reference is already set)
                this._loadCurrentValue(callback);
            }
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function() {
            logger.debug(this.id + ".enable");
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function() {
            logger.debug(this.id + ".disable");
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function(box) {
            logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function() {
            logger.debug(this.id + ".uninitialize");
            this._displayAttributes = [];
            this._sortParams = [];
            this._queryAdapter = null;
            this._$combo.select2("destroy");

            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function(e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements
        _setupEvents: function() {
            logger.debug(this.id + "._setupEvents");
        },

        // Rerender the interface.
        _updateRendering: function(guid) {
            logger.debug(this.id + "._updateRendering");

            // Important to clear all validations!
            this._clearValidations();

            //Also update the current selection
            //this._loadCurrentValue(null);
            if (guid && guid !== "") {
                mx.data.get({
                    guid: guid,
                    callback: dojoLang.hitch(this, function(obj) {
                        var reference = obj.get(this._reference);
                        if (reference === null || reference === '') {
                            this._$combo.val(null).trigger("change");
                        }
                    })
                });
            }
        },

        // Handle validations.
        _handleValidation: function(validations) {
            logger.debug(this.id + "._handleValidation");
            this._clearValidations();

            var validation = validations[0],
                message = validation.getReasonByAttribute(this._reference);

            if (this.readOnly) {
                validation.removeAttribute(this._reference);
            } else {
                if (message) {
                    this._addValidation(message);
                    validation.removeAttribute(this._reference);
                }
            }
        },

        // Clear validations.
        _clearValidations: function() {
            logger.debug(this.id + "._clearValidations");
            if (this._$alertdiv) {
                this._$combo.parent().removeClass('has-error');
                this._$alertdiv.remove();
            }
        },

        // Add a validation.
        _addValidation: function(message) {
            logger.debug(this.id + "._addValidation");
            this._$alertdiv = $("<div></div>").addClass('alert alert-danger mx-validation-message').html(message);
            this._$combo.parent().addClass('has-error').append(this._$alertdiv);
        },

        // Reset subscriptions.
        _resetSubscriptions: function() {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            if (this._handles) {
                dojoArray.forEach(this._handles, function(handle) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscriptions.
            if (this._contextObj) {
                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function(guid) {
                        this._updateRendering(guid);
                    })
                });

                var attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this._reference,
                    callback: dojoLang.hitch(this, function(guid, attr, attrValue) {
                        this._updateRendering(guid);
                    })
                });

                var validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });

                this._handles = [objectHandle, attrHandle, validationHandle];
            }
        },

        /* CUSTOM FUNCTIONS START HERE */
        _initialiseQueryAdapter: function() {
            var core = this;

            /*
            Due to each widget instance potentially having different configuration
            we have to create a unique adapter for every instance.

            The following assignment creates a unique id (from http://stackoverflow.com/a/2117523)
            to use for the adapter.
            */
            var adapterId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0,
                    v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });

            var adapterName = 'select2/data/queryAdapter_' + adapterId;

            $.fn.select2.amd.define(adapterName, [
                    'select2/data/array',
                    'select2/utils',
                    'select2/data/minimumInputLength'
                ],
                function(ArrayAdapter, Utils, MinimumInputLength) {

                    function QueryAdapter($element, options) {
                        QueryAdapter.__super__.constructor.call(this, $element, options);
                    }
                    Utils.Extend(QueryAdapter, ArrayAdapter);

                    if (core._searchType === "xpath") {
                        QueryAdapter.prototype.query = dojoLang.hitch(core, core._findMatchesXPath);
                    } else {
                        QueryAdapter.prototype.query = dojoLang.hitch(core, core._findMatchesMicroflow);
                    }

                    return Utils.Decorate(QueryAdapter, MinimumInputLength);
                });

            this._queryAdapter = $.fn.select2.amd.require(adapterName);
        },

        _findMatchesXPath: function findMatches(params, callback) {
            var self = this;

            function request() {
                var xpath = '//' + self._entity + self.dataConstraint.replace('[%CurrentObject%]', self._contextObj.getGuid());
                var method = self.searchMethod == "startswith" ? "starts-with" : self.searchMethod;

                var searchConstraint = "[" + method + "(" + self.searchAttribute + ",'" + params.term + "')";
                if (method == "starts-with") {
                    searchConstraint += " or " + self.searchAttribute + "='" + params.term + "'";
                }
                searchConstraint += "]";

                xpath += searchConstraint;

                mx.data.get({
                    xpath: xpath,
                    filter: {
                        sort: self._sortParams,
                        offset: 0
                    },
                    callback: dojoLang.hitch(self, function(objs) {
                        var results = self._processResults(objs, self._formatResults, callback);
                    })
                });
            }

            request();
        },

        _findMatchesMicroflow: function findMatches(params, callback) {
            var self = this;
            var thisCallback = callback;

            function request() {
                var self2 = self;
                var callback = thisCallback;

				self._contextObj.set(self._searchTextAttribute, params.term);

                self._execMf(self._contextObj.getGuid(), self._searchMicroflow, function(objs) {
                    self2._processResults(objs, self2._formatResults, callback);
                });
            }

            request();
        },
/*
        _executeMicroflow: function(mf, callback, obj) {
            logger.debug(this.id + "._executeMicroflow");
            var _params = {
                applyto: "selection",
                actionname: mf,
                guids: []
            };

            if (obj === null) {
                obj = this._data.object;
            }

            if (obj && obj.getGuid()) {
                _params.guids = [obj.getGuid()];
            }

            mx.data.action({
                params: _params,
                store: {
                    caller: this.mxform
                },
                callback: dojoLang.hitch(this, function(obj) {
                    if (typeof callback !== "undefined") {
                        callback(obj);
                    }
                }),
                error: function(error) {
                    console.log(error.description);
                }
            }, this);
        },
*/
        _processResults: function(objs, formatResultsFunction, callback) {
            var self = this;
            this.variableData = []; // this will hold our variables
            var referenceAttributes = [];

            dojoArray.forEach(objs, function(availableObject, index) {

                var currentVariable = {};
                currentVariable.guid = availableObject.getGuid();
                currentVariable.variables = [];

                for (var i = 0; i < self._attributeList.length; i++) {
                    if (availableObject.get(self._attributeList[i].variableAttribute) !== null) {
                        var value = self._fetchAttribute(availableObject, self._attributeList[i].variableAttribute, i);

                        currentVariable.variables.push({
                            id: i,
                            variable: self._attributeList[i].variableName,
                            value: value
                        });
                    } else {
                        // add a placeholder for our reference variable value.
                        currentVariable.variables.push({
                            id: i,
                            variable: self._attributeList[i].variableName,
                            value: "" // set this later
                        });

                        var split = self._attributeList[i].variableAttribute.split("/");
                        var refAttribute = {};
                        for (var a in self._attributeList[i]) refAttribute[a] = self._attributeList[i][a];
                        refAttribute.attributeIndex = i;
                        refAttribute.parentGuid = availableObject.getGuid();
                        refAttribute.referenceGuid = availableObject.getReference(split[0]);
                        refAttribute.referenceAttribute = split[2];

                        referenceAttributes.push(refAttribute);
                    }
                }

                self.variableData.push(currentVariable);
            });

            if (referenceAttributes.length > 0) {
                // get values for our references
                this._fetchReferences(referenceAttributes, formatResultsFunction, callback);
            } else {
                // format the results
                dojoLang.hitch(this, formatResultsFunction, callback)();
            }
        },

        _formatResults: function(callback) {
            // an array that will be populated with our results
            var matches = [],
                resultDisplay = "",
                selectedDisplay = "";

            // default to selected template
            var resultTemplate = this._displayTemplate || this._selectedTemplate;

            for (var i = 0; i < this.variableData.length; i++) {
                resultDisplay = this._mergeTemplate(this.variableData[i].variables, resultTemplate, false);
                var div = dom.div({
                    "class": "autoCompleteResult"
                });
                div.innerHTML = resultDisplay;
                selectedDisplay = this._mergeTemplate(this.variableData[i].variables, this._selectedTemplate, true);

                var item = {
                    id: this.variableData[i].guid,
                    text: selectedDisplay,
                    dropdownDisplay: div
                };

                matches.push(item);
            }

            if (callback && typeof callback === "function") {
                logger.debug(this.id + "._formatData callback");
                callback({
                    results: matches
                });
            }
        },

        _loadCurrentValue: function(callback) {
            // set the default value for the dropdown (if reference is already set)
            var referencedObjectGuid = this._contextObj.get(this._reference);

            if (referencedObjectGuid !== null && referencedObjectGuid !== "") {
                mx.data.get({
                    guid: referencedObjectGuid,
                    callback: dojoLang.hitch(this, function(obj) {
                        this._processResults([obj], this._formatCurrentValue, callback);
                    })
                });
            } else {
                if (callback && typeof callback === "function") {
                    callback();
                }
            };

            // Execute callback.
            if (callback && typeof callback !== 'undefined') {
                callback();
            }
        },

        _formatCurrentValue: function(callback) {
            var selectedDisplay = "";

            // we only want the first match (should never have multiple)
            if (this.variableData && this.variableData.length > 0) {
                var currentVariable = this.variableData[0];

                selectedDisplay = this._mergeTemplate(currentVariable.variables, this._selectedTemplate, true);

                // load the initial value
                var $option = $('<option selected>' + selectedDisplay + '</option>').val(currentVariable.guid);

                this._$combo.append($option).trigger('change'); // append the option and update Select2
            }

            if (callback && typeof callback === "function") {
                logger.debug(this.id + "._formatData callback");
                callback();
            }
        },

        _fetchAttribute: function(obj, attr, i, escapeValues) {
            logger.debug(this.id + "._fetchAttribute");
            var returnvalue = "",
                options = {},
                numberOptions = null;

            // Referenced object might be empty, can't fetch an attr on empty
            if (!obj) {
                return "";
            }

            if (obj.isDate(attr)) {
                if (this._attributeList[i].datePattern !== "") {
                    options.datePattern = this._attributeList[i].datePattern;
                }
                if (this._attributeList[i].timePattern !== "") {
                    options.timePattern = this._attributeList[i].timePattern;
                }
                returnvalue = this._parseDate(this._attributeList[i].datetimeformat, options, obj.get(attr));
            } else if (obj.isEnum(attr)) {
                returnvalue = this._checkString(obj.getEnumCaption(attr, obj.get(attr)), escapeValues);
            } else if (obj.isNumeric(attr) || obj.isCurrency(attr) || obj.getAttributeType(attr) === "AutoNumber") {
                numberOptions = {};
                numberOptions.places = this._attributeList[i].decimalPrecision;
                if (this._attributeList[i].groupDigits) {
                    numberOptions.locale = dojo.locale;
                    numberOptions.groups = true;
                }

                returnvalue = mx.parser.formatValue(obj.get(attr), obj.getAttributeType(attr), numberOptions);
            } else {
                if (obj.getAttributeType(attr) === "String") {
                    returnvalue = this._checkString(mx.parser.formatAttribute(obj, attr), escapeValues);
                }
            }

            if (returnvalue === "") {
                return "";
            } else {
                return returnvalue;
            }
        },

        _fetchReferences: function(referenceAttributes, formatResultsFunction, callback) {
            logger.debug(this.id + "._fetchReferences");
            var self = this;
            var l = referenceAttributes.length;

            var callbackfunction = function(data, obj) {
                logger.debug(this.id + "._fetchReferences get callback");
                var value = this._fetchAttribute(obj, data.referenceAttribute, data.attributeIndex);

                var result = $.grep(this.variableData, function(e) {
                    return e.guid == data.parentGuid;
                });

                if (result && result[0]) {
                    var resultVariable = $.grep(result[0].variables, function(e) {
                        return e.id == data.attributeIndex;
                    });
                    if (resultVariable && resultVariable[0]) {
                        resultVariable[0].value = value;
                    }
                }

                l--;
                if (l <= 0) {
                    // format our results
                    dojoLang.hitch(this, formatResultsFunction, callback)();
                }
            };

            for (var i = 0; i < referenceAttributes.length; i++) {
                var listObj = referenceAttributes[i],
                    split = referenceAttributes[i].variableAttribute.split("/"),
                    guid = referenceAttributes[i].referenceGuid,
                    attributeIndex = referenceAttributes[i].attributeIndex,
                    parentGuid = referenceAttributes[i].parentGuid,
                    referenceAttribute = referenceAttributes[i].referenceAttribute,
                    dataparam = {
                        i: i,
                        listObj: listObj,
                        attributeIndex: attributeIndex,
                        parentGuid: parentGuid,
                        referenceAttribute: referenceAttribute
                    };


                if (guid !== "") {
                    mx.data.get({
                        guid: guid,
                        callback: dojoLang.hitch(this, callbackfunction, dataparam)
                    });
                }
            }
        },

        _checkString: function(str, escapeValues) {
            logger.debug(this.id + "._checkString");
            if (str.indexOf("<script") > -1 || escapeValues) {
                str = dom.escapeString(str);
            }
            return str;
        },

        _parseDate: function(format, options, value) {
            logger.debug(this.id + "._parseDate");
            var datevalue = value;

            if (value === "") {
                return value;
            }

            options.selector = format;
            datevalue = dojo.date.locale.format(new Date(value), options);

            return datevalue;
        },

        _mergeTemplate: function(variables, template, escapeTemplate) {
            var self = this;

            if (escapeTemplate) {
                template = dom.escapeString(template);
            }

            for (var attr in variables) {
                var settings = variables[attr];
                template = template.split("${" + settings.variable + "}").join(settings.value);
            }

            return template;
        },

        _execMf: function(guid, mf, cb) {
                if (guid && mf) {
                    mx.data.action({
                        params: {
                            applyto: 'selection',
                            actionname: mf,
                            guids: [guid]
                        },
                        callback: function(objs) {
                            if (cb) {
                                cb(objs);
                            }
                        },
                        error: function(e) {
                            console.error('Error running Microflow: ' + e);
                        }
                    }, this);
                }

            }
            /* CUSTOM FUNCTIONS END HERE */
    });
});

require(["AutoCompleteForMendix/widget/AutoCompleteForMendix"], function() {
    "use strict";
});
