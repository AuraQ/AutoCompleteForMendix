/*
    AutoCompleteForMendix
    ========================

    @file      : AutoCompleteForMendix.js
    @version   : 7.0.0
    @author    : Matthew Pratley
    @date      : 2021-08-12
    @copyright : AuraQ Limited 2021
    @license   : Apache V2

    Documentation
    ========================
    AutoComplete widget built using Select2 (https://select2.github.io/).
*/

define( [
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "mxui/dom",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/_base/array", 
    "dojo/_base/lang",
    "dojo/_base/kernel",
    "dojo/date/locale",
    "jquery",
    "select2",
    "dojo/text!AutoCompleteForMendix/widget/template/AutoCompleteForMendix.html",
    "select2/dist/css/select2.css",
    "./ui/AutoCompleteForMendix.css"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoClass, dojoConstruct, dojoArray, dojoLang, dojo, dojoLocale, $, _select2, widgetTemplate) {
    "use strict";

    // Declare widget's prototype.
    return declare("AutoCompleteForMendix.widget.AutoCompleteForMendix", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        _$combo: null,
        _isValid : true,
        _displayAttributes : [],
        _sortParams : [],
        _queryAdapter : null,
        _entity: null,  
        _reference: null,
        _constrainedByAssociation: null,
        _constrainedByReference: null,
        _constrainedBySourceReference: null,
        _attributeList: null,
        _displayTemplate: "",
        _selectedTemplate: "",
        variableData : [],
        _currentSearchTerm : "",
        _localObjectCache: null,
        _updateCache : true,
        _queryTimeout : null,
        _currentReferenceAttributesLength : 0,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _$alertdiv: null,
        _alertDiv: null,
        _hadValidationFeedback: false,
        _initialized: false,

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

            $(document).on("touchstart",".select2", function(event){
                $(event.target).trigger($.Event("click", {
                    pageX: event.originalEvent.touches[0].pageX,
                    pageY: event.originalEvent.touches[0].pageY,
                    originalEvent: event
                }));

            });

            this._entity = this.dataAssociation.split('/')[1];
            this._reference = this.dataAssociation.split('/')[0];
            this._constrainedByAssociation = this.constrainedByAssociation;
            this._constrainedByReference = this.constrainedByAssociation.split('/')[0];
            this._constrainedByAssociationSource = this.constrainedByAssociationSource;
            this._attributeList = this._variableContainer;
            this._displayTemplate = this.displayTemplate;
            this._selectedTemplate = this.selectedTemplate;

            // issues with the sort parameters being persisted between widget instances mean we set the sort array to empty.
            this._sortParams = [];
            // create our sort order array
            for(var i=0;i< this._sortContainer.length;i++) {
                var item = this._sortContainer[i];
                this._sortParams.push([item.sortAttribute, item.sortOrder]); 
            }

            // make sure we only select the control for the current id or we'll overwrite previous instances
            var selector = '#' + this.id + ' select.autoComplete';
            this._$combo = $(selector); 

            // validate the widget        
            this._isValid = this._validateWidget();

            // adjust the template based on the display settings.
            if( this.showLabel ) {
                if(this.formOrientation === "horizontal"){
                    // width needs to be between 1 and 11
                    var comboLabelWidth = this.labelWidth < 1 ? 1 : this.labelWidth;
                    comboLabelWidth = this.labelWidth > 11 ? 11 : this.labelWidth;

                    var comboControlWidth = 12 - comboLabelWidth,                    
                        comboLabelClass = 'col-sm-' + comboLabelWidth,
                        comboControlClass = 'col-sm-' + comboControlWidth;

                    dojoClass.add(this.autoCompleteLabel, comboLabelClass);
                    dojoClass.add(this.autoCompleteComboContainer, comboControlClass);
                }
                else{
                    dojoClass.add(this.autoCompleteMainContainer, "no-columns");
                }

                this.autoCompleteLabel.innerHTML = this.fieldCaption;
            }
            else {
                dojoClass.remove(this.autoCompleteMainContainer, "form-group");
                dojoConstruct.destroy(this.autoCompleteLabel);
            } 

            this._initialiseQueryAdapter();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {
            logger.debug(this.id + ".update");
            var self = this;

            if (obj === null || !this._isValid) {
                if (!dojoClass.contains(this.domNode, 'hidden')) {
                    dojoClass.add(this.domNode, 'hidden');
                }

                if (callback && typeof callback === "function") {                
                    callback();
                }
            } else {
                if (dojoClass.contains(this.domNode, 'hidden')) {
                    dojoClass.remove(this.domNode, 'hidden');
                }
                this._contextObj = obj;
                this._resetSubscriptions();
                this._updateRendering();

                if( this.searchType === "microflowCache"){
                    // execute our search MF and then initialise the combo when we return
                    this._execMf(self._contextObj.getGuid(), self.cacheSearchMicroflow, function(objs){
                        self._localObjectCache = objs;
                        if(!self._initialized) {
                            self._initialiseControl(callback);
                        } else {
                            if (callback && typeof callback === "function") {
                                callback();
                            }
                        }
                    });
                }
                else{
                    if(!this._initialized) {
                        this._initialiseControl(callback);
                    } else {
                        if (callback && typeof callback === "function") {
                            callback();
                        }
                    }
                }
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

            $(document).off('focus', '.select2-selection.select2-selection--single');

            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // Attach events to HTML dom elements
        _validateWidget: function() {
            logger.debug(this.id + "._validateWidget");
            var valid = true;

            switch( this.searchType){
                case "xpath":
                    if(!this.xpathSearchAttribute){
                        valid = false;
                        logger.error(this.id + ": 'Search Attribute' must be specified with search type XPath.");
                    }
                    break;
                case "microflow":
                    if(!this.searchMicroflow){
                        valid = false;
                        logger.error(this.id + ": 'Search Microflow' must be specified with search type Microflow.");
                    }

                    if(!this.searchStringAttribute){
                        valid = false;
                        logger.error(this.id + ": 'Search String Attribute' must be specified with search type Microflow ");
                    }
                    break;
                case "microflowCache":
                    if(!this.cacheSearchMicroflow){
                        valid = false;
                        logger.error(this.id + ": 'Search Microflow' must be specified with search type Microflow (Cached).");
                    }

                    if(!this.cacheSearchAttribute){
                        valid = false;
                        logger.error(this.id + ": 'Search Attribute' must be specified with search type Microflow (Cached)");
                    }
                    break;
                default:
                    valid = false;
                    logger.error(this.id + ": Search type '" + this.searchType + "' not valid.");
                    break;
            }

            return valid;
        },

        _initialiseControl : function(callback){
            var self = this;
            this._$combo.select2(this._getSelect2Options())
            .on("select2:select", function(e) {

                // set the value                
                if( e.params && e.params.data ){                        
                    var guid = e.params.data.id;                        
                    self._contextObj.addReference(self._reference, guid);
                }

                // run the OC microflow if one has been configured.                   
                if( self.onChangeMicroflow ) {
                    self._execMf(self._contextObj.getGuid(), self.onChangeMicroflow, null, self.onChangeMicroflowShowProgress, self.onChangeMicroflowProgressMessage);
                }
            })
            .on("select2:unselect", function(e) {
                // set the value
                if( e.params && e.params.data ){                        
                    var guid = e.params.data.id;
                    self._contextObj.removeReferences(self._reference, [guid]);
                }

                // run the OC microflow if one has been configured.                   
                if( self.onChangeMicroflow ) {
                    self._execMf(self._contextObj.getGuid(), self.onChangeMicroflow, null, self.onChangeMicroflowShowProgress, self.onChangeMicroflowProgressMessage);
                }
            })
            .on("select2:closing",function(e){
                self._$combo.select2('focus');                
            });
            
            this._$combo.data('select2')
            .on('results:message', function () {
                this.dropdown._positionDropdown();
                this.dropdown._resizeDropdown();
            });

            if(this.openOnFocus){
                // on first focus (bubbles up to document), open the menu
                $(document).on('focus', '.select2-selection.select2-selection--single', function (e) {
                    $(this).closest(".select2-container").siblings('select:enabled').select2('open');
                });
                
                // steal focus during close - only capture once and stop propagation
                this._$combo.on('select2:closing', function (e) {
                    $(e.target).data("select2").$selection.one('focus focusin', function (e) {
                        e.stopPropagation();
                    });
                });
            }

            this._updateControlDisplay();
            this._initialized = true;

            // set the default value for the dropdown (if reference is already set)
            this._loadCurrentValue(callback);
        },
        
        _getSelect2Options : function(){
            var self = this;
            var options = {
                dataAdapter: this._queryAdapter,
                minimumInputLength: this.minimumInputLength,
                width: '100%',
                placeholder: this.placeholderText,
                allowClear: this.allowClear,
                selectOnClose : this.selectOnClose,
                language: {
                    inputTooShort: function (params) { 
                        var min = params.minimum || 0;
                        var input = params.input || '';
                        var remain = min - input.length;

                        var message = self.inputTooShortText;
                        message = message.split("${minLength}").join(min);
                        message = message.split("${remainLength}").join(remain);

                        return message;
                    },
                    noResults: function(){
                        var retval = self.noResultsText;

                        if(self.noResultsDisplayType === "button" && self.noResultsMicroflow){                                
                            retval = dojoConstruct.create("a",{
                                href:"#",
                                innerHTML: self.noResultsText,
                                'class':"btn btn-block btn-noResults",
                                onclick:function(){
                                    self._contextObj.set(self.noResultsSearchStringAttribute, self._currentSearchTerm);
                                    self._execMf(self._contextObj.getGuid(), self.noResultsMicroflow);
                                    self._$combo.select2("close");
                                }
                            });
                        }

                        return retval;
                    },
                    searching: function(){
                        return self.searchingText;
                    }
                },
                templateResult : function (item) {
                    if(!item.id) {
                        // return `text` for optgroup
                        return item.text;
                    }
                    // return item template, assume its html
                    return $(item.dropdownDisplay);
                }
            };

            var parentSelector = this.parentSelector;

            if(parentSelector){
                options.dropdownParent = $(parentSelector);
            }
            return options;
        },

        _updateControlDisplay : function(){

            // if data view is disabled
            if(this.get("disabled")) {
                this._$combo.prop('disabled',true);
            }
            else if (this._contextObj.isReadonlyAttr(this._reference)){
                this._$combo.prop('disabled',true);
            }
            else {
                    // fixed property gets checked first
                    if(this.disabled){
                        this._$combo.prop('disabled',true);
                    } else{
                        this._$combo.prop('disabled',false);
                    }
                    // attribute property beats fixed property    
                    if(this.disabledViaAttribute){
                        if(this._contextObj.get(this.disabledViaAttribute) ){
                            this._$combo.prop('disabled',true);
                        } else{
                            this._$combo.prop('disabled',false);
                        }
                    }
            }

            // fixed property gets checked first
            if(this.visible){
                if (dojoClass.contains(this.domNode, 'hidden')) {
                    dojoClass.remove(this.domNode, 'hidden');
                }
            } else {
                if (!dojoClass.contains(this.domNode, 'hidden')) {
                    dojoClass.add(this.domNode, 'hidden');
                }
            }

            // attribute property beats fixed property
            if(this.visibleViaAttribute ){
                if(this._contextObj.get(this.visibleViaAttribute)){
                    if (dojoClass.contains(this.domNode, 'hidden')) {
                        dojoClass.remove(this.domNode, 'hidden');
                    } 
                } else {
                    if (!dojoClass.contains(this.domNode, 'hidden')) {
                        dojoClass.add(this.domNode, 'hidden');
                    }
                }
            }
        },

        // Rerender the interface.
        _updateRendering: function() {
            logger.debug(this.id + "._updateRendering");
            var self = this;

            // Important to clear all validations!
            this._clearValidations();

            // reset the display
            this._updateControlDisplay();

            if( this.searchType === "microflowCache"  ){
                // this is an internal control of the refresh, which bypasses an update on attribute change
                if( this._updateCache ){ 
                    // this is an attribute based control of the refresh, which is governed by the app (if property is used)
                    if(!this.refreshCacheViaAttribute || (this.refreshCacheViaAttribute && this._contextObj.get(this.refreshCacheViaAttribute) ) ){                    
                        // update our local cache of objects
                        this._execMf(self._contextObj.getGuid(), self.cacheSearchMicroflow, function(objs){
                            self._localObjectCache = objs;
                            self._updateCurrentSelection();
                        });
                    }
                }
                else{
                    // reset back to allow a refresh by default
                    this._updateCache = true; 
                }
            }
            else{
                this._updateCurrentSelection();
            }
        },	

        _updateCurrentSelection : function(){
            //Also update the current selection
            var referencedObjectGuid = this._contextObj.get(this._reference);

            if(referencedObjectGuid !== null && referencedObjectGuid !== "") {                        
                mx.data.get({
                    guid: referencedObjectGuid,
                    callback: dojoLang.hitch(this, function(obj){           
                        if(obj){
                            this._processResults([obj],this._formatCurrentValue, null);
                        }
                        else{
                            this._$combo.val(null).trigger("change");
                        }
                    })
                });
            }
            else{
                this._$combo.val(null).trigger("change");
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

                    if(!this._hadValidationFeedback) {
                        this._hadValidationFeedback = true;
                        this._increaseValidationNotification();
                    }

                    validation.removeAttribute(this._reference);                    
                }
            }

            if(this._hadValidationFeedback && !message) {
                this._decreaseValidationNotification();
                this._hadValidationFeedback = false;
            }
        },

        // Clear validations.
        _clearValidations: function() {
            logger.debug(this.id + "._clearValidations");
            if( this._$alertdiv ) {
                var selector = '#' + this.id;
                var $formGroup = $(selector); 
                $formGroup.removeClass('has-error');
                //this._$combo.parent().removeClass('has-error');
                this._$alertdiv.remove();
            }
        },

        // Add a validation.
        _addValidation: function(message) {
            logger.debug(this.id + "._addValidation");
            this._$alertdiv = $("<div></div>").addClass('alert alert-danger mx-validation-message').html(message);
            var selector = '#' + this.id;
            var $formGroup = $(selector); 
            $formGroup.addClass('has-error');
            this._$combo.parent().append( this._$alertdiv );
            //this._$combo.parent().addClass('has-error').append( this._$alertdiv );   
        },


        _increaseValidationNotification : function() {
            //increase notifications in case the widget is inside tab
            //Warning: This is not documented in official API and might break when the API changes. 
            if (this.validator) {
                this.validator.addNotification();

            }
        },

        _decreaseValidationNotification : function() {
            //decrease notifications in case the widget is inside tab
            //Warning: This is not documented in official API and might break when the API changes. 
            if (this.validator) {
                this.validator.removeNotification();
            }
        },

        // Reset subscriptions.
        _resetSubscriptions: function() {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            if (this._handles) {
                dojoArray.forEach(this._handles, dojoLang.hitch(this, function (handle) {
                    this.unsubscribe(handle);
                }));
                this._handles = [];
            }

            // When a mendix object exists create subscriptions.
            if (this._contextObj) {
                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function(guid) {
                        this._updateRendering();
                    })
                });

                var attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this._reference,
                    callback: dojoLang.hitch(this, function(guid, attr, attrValue) {
                        this._updateCache = false;
                        this._updateRendering();
                    })
                });

                var validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: dojoLang.hitch(this, this._handleValidation)
                });

                this._handles = [ objectHandle, attrHandle, validationHandle ];
            }
        },

        /* CUSTOM FUNCTIONS START HERE */
        _initialiseQueryAdapter : function() {
            var core = this;

            /*
            Due to each widget instance potentially having different configuration
            we have to create a unique adapter for every instance.

            The following assignment creates a unique id (from http://stackoverflow.com/a/2117523)
            to use for the adapter.
            */            
            var adapterId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });

            var adapterName = 'select2/data/queryAdapter_' + adapterId;

            $.fn.select2.amd.define(adapterName,[
                'select2/data/array',
                'select2/utils',
                'select2/data/minimumInputLength'
            ],
            function (ArrayAdapter, Utils, MinimumInputLength) {

                function QueryAdapter ($element, options) {
                    QueryAdapter.__super__.constructor.call(this, $element, options);
                }
                Utils.Extend(QueryAdapter, ArrayAdapter);

                QueryAdapter.prototype.query = dojoLang.hitch(core, core._findMatches);

                return Utils.Decorate(QueryAdapter, MinimumInputLength);
            });

            this._queryAdapter = $.fn.select2.amd.require(adapterName);
        },

        _findMatches : function findMatches(params, callback) {
            var self = this;

            function request () {       

                self._currentSearchTerm = params.term;

                var searchCallback = 
                    dojoLang.hitch(self, function(objs){
                        // only process the results if our search term hasn't changed since the query was executed
                        logger.debug("_currentSearchTerm: " + self._currentSearchTerm);
                        logger.debug("params.term: " + params.term);
                        if( self._currentSearchTerm == params.term ){
                            var results = self._processResults(objs, self._formatResults, callback);
                        }
                    });

                if( self.searchType === "xpath"){ 
                    var xpath = '//' + self._entity + self.dataConstraint.replace('[%CurrentObject%]', self._contextObj.getGuid());
                    var method = self.xpathSearchMethod == "startswith" ? "starts-with" : self.xpathSearchMethod;
                    var term = params.term.replace(/'/g, "''");

                    var searchConstraint = "[" + method + "(" + self.xpathSearchAttribute + ",'" + term + "')";    
                    if (method == "starts-with") {
                        searchConstraint += " or " + self.xpathSearchAttribute + "='" + term + "'";    
                    }
                    searchConstraint += "]";

                    xpath += searchConstraint;

                    if( self._constrainedByReference && self._constrainedByAssociationSource ){
                        var constrainedByReferencedObjectGuid = self._contextObj.get(self._constrainedByReference);

                        if( constrainedByReferencedObjectGuid ){
                            var constrainedBy = "[" + self._constrainedByAssociationSource + "[id='" + constrainedByReferencedObjectGuid + "']]";
                            xpath += constrainedBy;
                        }
                        else{
                            xpath += "[true()=false()]";
                        }
                    }

                    var xpathAmount;
                    if (self.maxRecords === 0) {
                        xpathAmount = -1;
                    } else {
                        xpathAmount = self.maxRecords;
                    }

                    mx.data.get({
                        xpath: xpath,
                        filter: {
                            sort: self._sortParams,
                            offset: 0,
                            amount: xpathAmount
                        },
                        callback: searchCallback
                    });
                }
                else if(self.searchType === "microflow") {
                    self._contextObj.set(self.searchStringAttribute, self._currentSearchTerm);
                    self._execMf(self._contextObj.getGuid(), self.searchMicroflow, searchCallback);                    
                }   
                else if(self.searchType === "microflowCache") {
                    // filter my local cache and then process my results
                    var filteredObjs = [];
                    for( var i = 0; i < self._localObjectCache.length; i++){
                        var attributeValue = self._localObjectCache[i].get(self.cacheSearchAttribute);
                        if(self.cacheSearchMethod == "startswith"){
                            // startsWith not supported in IE
                            //if( attributeValue.toLowerCase().startsWith(self._currentSearchTerm.toLowerCase()) ){
                            if( attributeValue.toLowerCase().lastIndexOf(self._currentSearchTerm.toLowerCase(), 0) === 0 ){
                                filteredObjs.push(self._localObjectCache[i]);
                            }
                        }
                        else{
                            if( attributeValue.toLowerCase().indexOf(self._currentSearchTerm.toLowerCase()) >= 0 ){
                                filteredObjs.push(self._localObjectCache[i]);
                            }
                        }
                    }

                    searchCallback(filteredObjs);
                }             
            }
            if (this.searchDelay && this.searchDelay > 0) {
                if (this._queryTimeout) {
                    window.clearTimeout(this._queryTimeout);
                }

                this._queryTimeout = window.setTimeout(request, this.searchDelay);
            } else {
                request(); 
            }
            //request();
        },

        _processResults : function (objs, formatResultsFunction, callback) {
            var self = this;
            this.variableData = []; // this will hold our variables
            var referenceAttributes = [];

            dojoArray.forEach(objs, function (availableObject, index) {

                var currentVariable = {};
                currentVariable.guid = availableObject.getGuid();
                currentVariable.variables = [];

                for (var i = 0; i < self._attributeList.length; i++) {
                    var variableAttribute = availableObject.get(self._attributeList[i].variableAttribute);
                    if (variableAttribute !== null) {
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
                        for(var a in self._attributeList[i]){
                            refAttribute[a]=self._attributeList[i][a];
                        }

                        refAttribute.attributeIndex = i;
                        refAttribute.parentGuid = availableObject.getGuid();
                        refAttribute.referenceGuid = availableObject.getReference(split[0]);
                        refAttribute.referenceAttribute = split.slice(2).join("/");

                        referenceAttributes.push(refAttribute);
                    }
                }

	// added below code to capture disable dropdown option value to list
		if(self.disableDropdownOption){
                  var disableOption =   availableObject.get(self.disableDropdownOption);
				 currentVariable.variables.push({
                            id: self._attributeList.length + 1,
                            variable: self.disableDropdownOption,
                            value: disableOption
                        }); 
                    }
                self.variableData.push(currentVariable);                                        
            });  

            if( referenceAttributes.length > 0 ){
                // get values for our references
                this._fetchReferences(referenceAttributes, formatResultsFunction, callback);                
            } else{
                // format the results
                dojoLang.hitch(this, formatResultsFunction, callback)();
            }                        
        },

        _formatResults : function(callback){
            // an array that will be populated with our results
            var matches = [],
                resultDisplay = "",
                selectedDisplay = "";

            // default to selected template            
            var resultTemplate = this._displayTemplate || this._selectedTemplate;

            for(var i = 0;i< this.variableData.length; i++){
                resultDisplay = this._mergeTemplate(this.variableData[i].variables, resultTemplate, false);
                var div = dom.create("div",{
                    "class" : "autoCompleteResult"
                });
                div.innerHTML = resultDisplay;
                selectedDisplay = this._mergeTemplate(this.variableData[i].variables, this._selectedTemplate, true);

                var item = {
                    id: this.variableData[i].guid,
                    text: selectedDisplay,
                    dropdownDisplay: div
                }; 
		if(this.disableDropdownOption){
			var disable = false;
			for(var j = 0; j < this.variableData[i].variables.length; j++)  {
			if (this.variableData[i].variables[j].variable == this.disableDropdownOption){
				disable = this.variableData[i].variables[j].value;
				break; 
				}
			}
			if(disable){
				item.disabled = true;
				if (this.disableToolTipMsg !== ""){
				$(item).attr('title', this.disableToolTipMsg);	
								
				}
								
                        } else{
                            item.disabled = false;
                        }
                    }

                matches.push(item);
            }

            if (callback && typeof callback === "function") {
                logger.debug(this.id + "._formatResults callback");
                callback({
                    results: matches
                });
            }
        },

        _loadCurrentValue : function(callback){ 
            // set the default value for the dropdown (if reference is already set)
            var referencedObjectGuid = this._contextObj.get(this._reference);

            if(referencedObjectGuid !== null && referencedObjectGuid !== "") {                        
                mx.data.get({
                    guid: referencedObjectGuid,
                    callback: dojoLang.hitch(this, function(obj){    
                        if(obj){
                            this._processResults([obj],this._formatCurrentValue, callback);
                        }                         
                        else{
                            if (callback && typeof callback === "function") {
                                callback();
                            }
                        }
                    })
                });
            } else{                
                if (callback && typeof callback === "function") {
                    callback();
                }
            };
        },

        _formatCurrentValue : function(callback){
            var selectedDisplay = "";

            // we only want the first match (should never have multiple)
            if( this.variableData && this.variableData.length > 0){
                var currentVariable = this.variableData[0];

                selectedDisplay = this._mergeTemplate(currentVariable.variables, this._selectedTemplate, true);

                // load the initial value
                var $option = $('<option selected>' + selectedDisplay + '</option>').val(currentVariable.guid);

                this._$combo.append($option).trigger('change'); // append the option and update Select2
            }

            if (callback && typeof callback === "function") {
                logger.debug(this.id + "._formatCurrentValue callback");
                callback();
            }
        },

        _fetchAttribute: function (obj, attr, i, escapeValues) {
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
            }  else if (obj.isNumeric(attr) || ( obj.isCurrency && obj.isCurrency(attr) ) || obj.getAttributeType(attr) === "AutoNumber") {
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

        _fetchReferences: function (referenceAttributes, formatResultsFunction, callback) {
            logger.debug(this.id + "._fetchReferences");
            this._currentReferenceAttributesLength = referenceAttributes.length;
             
            for (var i = 0; i < referenceAttributes.length; i++) {
                var attributeData = referenceAttributes[i];
                this._getReferencedObject(i, attributeData.referenceGuid, attributeData.referenceAttribute, attributeData.attributeIndex, attributeData.parentGuid, formatResultsFunction, callback);
            }
        },

        _getReferencedObject : function(index, guid, referenceAttribute, attributeIndex, parentGuid, formatResultsFunction, callback){
            var data = {
                i: index,
                attributeIndex: attributeIndex,
                parentGuid : parentGuid,
                referenceAttribute : referenceAttribute
            };

            if (guid !== "") {
                mx.data.get({
                    guid: guid,
                    callback: dojoLang.hitch(this, this._fetchReferenceCallback, data, formatResultsFunction, callback)
                });
            }
            else{
                this._fetchReferenceCallback(null,formatResultsFunction, callback, null);
            }
        },

        _fetchReferenceCallback : function (data, formatResultsFunction, callback, obj) {
            logger.debug(this.id + "._fetchReferences get callback");

            if(obj != null){

                if(data.referenceAttribute.indexOf("/") <= -1){
                    var value = this._fetchAttribute(obj, data.referenceAttribute, data.attributeIndex);

                    var result = $.grep(this.variableData, function(e){ 
                        return e.guid == data.parentGuid; 
                    });

                    if( result && result[0] ){
                        var resultVariable = $.grep(result[0].variables, function(e){ return e.id == data.attributeIndex; });
                        if( resultVariable && resultVariable[0]){
                            resultVariable[0].value = value;
                        }
                    }

                    this._currentReferenceAttributesLength--;
                    if (this._currentReferenceAttributesLength <= 0) {
                        // format our results
                        dojoLang.hitch(this, formatResultsFunction, callback)();
                    }
                }
                else{
                    var split = data.referenceAttribute.split("/");
                    var referenceGuid = obj.getReference(split[0]);
                    var referenceAttribute = split.slice(2).join("/");

                    this._getReferencedObject(data.i, referenceGuid, referenceAttribute, data.attributeIndex, data.parentGuid, formatResultsFunction, callback);
                }
            }
        },

        _checkString: function (str, escapeValues) {
            logger.debug(this.id + "._checkString");
            if (str.indexOf("<script") > -1 || escapeValues) {
                str = dom.escapeString(str);
            }
            return str;
        },

        _parseDate: function (format, options, value) {
            logger.debug(this.id + "._parseDate");
            var datevalue = value;

            if (value === "") {
                return value;
            }

            options.selector = format;
            datevalue = dojoLocale.format(new Date(value), options);

            return datevalue;
        },

        _mergeTemplate : function(variables, template, escapeTemplate) {
            var self = this;

            if( escapeTemplate ){
                template = dom.escapeString(template);
            }

            for (var attr in variables) {
                var settings = variables[attr];
                template = template.split("${" + settings.variable + "}").join(settings.value);
            }

            return template;
        },

        _execMf: function (guid, mf, cb, showProgress, message) {
            var self = this;
            if (guid && mf) {                
                var options = {
                    params: {
                        applyto: 'selection',
                        actionname: mf,
                        guids: [guid]
                    },
                    callback: function (objs) {
                        if (cb) {
                            cb(objs);
                        }
                    },
                    error: function (e) {
                        logger.error('Error running Microflow: ' + e);
                    }
                }

                if(showProgress){                    
                    options.progress = "modal";
                    options.progressMsg = message;
                }

                //mx.ui.action(mf,options, this);
                mx.data.action(options);
            }
        }
        /* CUSTOM FUNCTIONS END HERE */
    });
});
