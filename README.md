# AutoComplete for Mendix - Version 3

This widget is a wrapper for the [Select2 plugin](https://select2.github.io/)  allowing a user to filter the options displayed in a dropdown when setting a reference association.

## Contributing

For more information on contributing to this repository visit [Contributing to a GitHub repository](https://world.mendix.com/display/howto50/Contributing+to+a+GitHub+repository)!

## Typical usage scenario

Where you have a large number of available options for a reference selector, use this to allow the end user to filter what options are displayed in the dropdown.

# Features

- Supports templates for results, allowing you to combine multiple attributes for display.
- Search using an XPath query, a microflow that is executed for each search or a microflow that caches the result set on initialisation (and context change).
- Control the minimum number of characters user has to input before search executes.
- Control the maximum number of results to return when searching via XPath.
- Configure the message displayed to a user when further input is required.
- Control whether a selected item can be cleared.
- Control the maximum number of records to return from an XPath search
- Render the control as disabled or hidden, using a static parameter on the widget or controlled from a boolean attribute.

# Configuration

**Due to the additional search options, some of the validation has moved from the widget configuraton to widget initialisation. If the dropdown does not render, check the browser console for any validation errors.**

## Search
- **Select Source**: The reference association, starting from the dataview object.
- **Minimum Input Length**: The minimum number of characters the user has to enter before search executes.
- **Search Type**: 'XPath', 'Microflow' or 'Microflow (Cached)'; controls whether the search should use an XPath query, a Microflow called for each search or a Microflow that caches the results (by default the cache is populated on initialisation and when the context object is refreshed)
- **Search Delay**: The delay, in milliseconds, before a search is executed.

## Search - XPath
- **Search method**: 'starts-with' or 'contains'; controls how the attribute is searched
- **Search attribute**: The attribute to search against.
- **Data constraint**: An XPath constraint, further filtering the available objects that are displayed in the dropdown.
- **Constrained by [Context]**: Select an association from the data view context if you want the results to be constrained by a particular object. Must be used alongside 'Constrained by [Source]' 
- **Constrained by [Source]**:Select an association from the AutoComplete's source entity if you want the results to be constrained by a particular object. Must be used alongside 'Constrained by [Context]'
- **Max Records**: The maximum number of records to return from the search (a value of 0 does not apply a limit).

## Search - Microflow
- **Search microflow:** The microflow to run to execute the search. Input parameter must match the context object and return type should be a list of source objects.
- **Search String Attribute:** The attribute in the context object to store the search term.

## Search - Microflow (Cached)
- **Search microflow:** The microflow to run to execute the search. Input parameter must match the context object and return type should be a list of source objects. Called on initilisation and, by default, when the context object refreshes.
- **Search method**: 'starts-with' or 'contains'; controls how the attribute is searched
- **Search attribute:** The attribute to search against.
- **Refresh cache via attribute**: An optional parameter. If populated will use the selected boolean attribute to control whether the cache should be refreshed when the context object refreshes.

## Result Display
- **Selected Template**: The template (treated as Plain Text) to use for a selected item. 
- **Result Template**: The template (treated as HTML) to use for a search result in the dropdown. If left empty the 'Selected Template' property will be used. This value is wrapped in a div element with a class of 'autoCompleteResult' 
- **Template Attributes**: The mapping of attributes to variable names for replacement in 'Selected Template' and 'Result Template'.
- **Sort order**: The attributes that the results should be sorted by.

## Control Display
- **Show Label**: Whether a label should be displayed for the dropdown.
- **Label Caption**: The text to be displayed in the label (only used if Show Label is set to Yes)
- **Form orientation**: 'Horizontal' or 'Vertical' (should match the DataView's Form Orientation value)
- **Label Width (weight)**: A value between 1 and 11 that determines the width of the label. Will be reset to 1 or 11 if a value is selected that is outside these bounds. (only used if Show Label is set to Yes and Form Orientation is set to Horizontal)
- **Allow Clear**: Whether the user can clear a selected item or not
- **Disabled**: Whether to render the control in a disabled state or not.
- **Disabled via attribute**: An optional parameter. If populated will use the selected boolean attribute to render the control in a disabled state or not (true = disabled). This property overrides the 'Disabled' parameter.
- **Visible**: Whether to render the control visible or not.
- **Visible via attribute**: An optional parameter. If populated will use the selected boolean attribute to render the control visible or not (true = visible). This property overrides the 'Visible' parameter.
- **Select On Close**: If true, selects the highlighted value when the dropdown closes (e.g. when tabbing out of the control).
- **Parent selector**: A CSS selector used to manage where the dropdown is rendered. E.g. leave empty for a main page, and use .modal-dialog for a modal
- **Disable Dropdown Option**: Boolean attribute based on which the dropdown list item will be disabled
- **Disable List Tooltip**: Specify the tooptip message for the disabled list values
- **Open on focus**: If true, opens the dropdown automatically on the initial focus.

## No Results
- **'No results found' text:** The text to be shown in the dropdown when a search returns no results.
- **'No results found' display type:** The type of element to display if no results are found. Either Text or Button
- **No Results microflow:** The microflow to run if the no results button is clicked (only used if no results type is Button)
- **Search String Attribute:** The attribute in the context object to store the search term (only populated if no results are found).

## Strings
- **Placeholder text:** The text to be shown in the dropdown when no item has been selected.
- **'Input too short' text**: The string to display if the minimum input length has not been reached. Value can make use of tokens ${minLength} for minimum length setting and ${remainLength} for the number of characters remaining before the search executes
- **'Searching' text:** The text to displaying while a search is executing.

## Events
- **On change**: The microflow that will be run when an item is selected or the control is cleared.
- **Show Progress Bar**: Controls whether a progress bar should be displayed when executing the onchange microflow
- **Progress Message**: The progress message to show when executing the onchange microflow

# Known Issues

See [here](https://github.com/AuraQ/AutoCompleteForMendix/issues) for all outstanding issues or to raise a new issue, enhancement etc.

# Limitations

- ‘Search attribute’ only supports ‘String’ data types.

# v3.0.0 Breaking changes:
- ‘Search attribute’ will need to be reselected.
- 'Search method' gets reset back to 'starts-with' when widget is first updated in the modeller.

# Thanks

[Mendix](https://github.com/mendix) for the [FormatString widget](https://github.com/mendix/FormatString) which we heavily borrowed from for the templating, date and number formatting :)  
[Select2](https://github.com/select2) for the autocomplete plugin which this widget is based on.