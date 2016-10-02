# AutoComplete for Mendix

This widget is a wrapper for the [Select2 plugin](https://select2.github.io/)  allowing a user to filter the options displayed in a dropdown when setting a reference association.

## Contributing

For more information on contributing to this repository visit [Contributing to a GitHub repository](https://world.mendix.com/display/howto50/Contributing+to+a+GitHub+repository)!

## Typical usage scenario

Where you have a large number of available options for a reference selector, use this to allow the end user to filter what options are displayed in the dropdown.

# Features

- Supports templates for results, allowing you to combine multiple attributes for display.
- Control the minimum number of characters user has to input before search executes.
- Configure the message displayed to a user when further input is required.
- Control whether a selected item can be cleared.

# Configuration

## Search
- **Select Source**: The reference association, starting from the dataview object.
- **Search attribute**: The attribute to search against.
- **Data constraint**: An XPath constraint, further filtering the available objects that are displayed in the dropdown.
- **Constrained by [Context]**: Select an association from the data view context if you want the results to be constrained by a particular object. Must be used alongside 'Constrained by [Source]' 
- **Constrained by [Source]**:Select an association from the AutoComplete's source entity if you want the results to be constrained by a particular object. Must be used alongside 'Constrained by [Context]'
- **Minimum Input Length**: The minimum number of characters the user has to enter before search executes.
- **Search Method**: 'starts-with' or 'contains'; controls how the attribute is searched

## Result Display
- **Selected Template**: The template (treated as Plain Text) to use for a selected item. 
- **Result Template**: The template (treated as HTML) to use for a search result in the dropdown. If left empty the 'Selected Template' property will be used. This value is wrapped in a div element with a class of 'autoCompleteResult' 
- **Template Attributes**: The mapping of attributes to variable names for replacement in 'Selected Template' and 'Result Template'.
- **Sort Order**: The attributes that the results should be sorted by.

## Display
- **Show Label**: Whether a label should be displayed for the dropdown.
- **Label Caption**: The text to be displayed in the label (only used if Show Label is set to Yes)
- **Form Orientation**: 'Horizontal' or 'Vertical' (should match the DataView's Form Orientation value)
- **Label Width**: A value between 1 and 11 that determines the width of the label. Will be reset to 1 or 11 if a value is selected that is outside these bounds. (only used if Show Label is set to Yes and Form Orientation is set to Horizontal)

## Strings
- **Placeholder text:** The text to be shown in the dropdown when no item has been selected.
- **'Input too short' text**: The string to display if the minimum input length has not been reached. Value can make use of tokens ${minLength} for minimum length setting and ${remainLength} for the number of characters remaining before the search executes
- **'No results found' text:** The text to be shown in the dropdown when a search returns no results.
- **'Searching' text:** The text to displaying while a search is executing.

## Events
- **On change**: The microflow that will be run when an item is selected or the control is cleared.

# Known Issues

See [here](https://github.com/AuraQ/AutoCompleteForMendix/issues) for all outstanding issues or to raise a new issue, enhancement etc.

# Limitations

- ‘Search attribute’ only supports ‘String’ data types.

# v2.0.0 Breaking changes:
- Selected Item (Result display) - renamed to 'Selected Template' and changed to string to support templates

# Thanks

[Mendix](https://github.com/mendix) for the [FormatString widget](https://github.com/mendix/FormatString) which we heavily borrowed from for the templating, date and number formatting :)  
[Select2](https://github.com/select2) for the autocomplete plugin which this widget is based on.