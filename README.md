# Auto Complete for Mendix

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
- **Minimum Input Length**: The minimum number of characters the user has to enter before search executes.
- **Search Method**: 'starts-with' or 'contains'; controls how the attribute is searched

## Result Display
- **Selected Item**: The attribute to display in the field when an item is selected.
- **Item template**: The template (treated as HTML) to use for a search result in the dropdown. If left empty the selected item attribute will be used. This value is wrapped in a div element with a class of 'autoCompleteResult' 
- **Item Attributes**: The mapping of attributes to variable names for replacement in the Item template.
- **Sort Order**: The attributes that the results should be sorted by.

## Display
- **Show Label**: Whether a label should be displayed for the dropdown.
- **Label Caption**: The text to be displayed in the label (only used if Show Label is set to Yes)
- **Form Orientation**: 'Horizontal' or 'Vertical' (should match the DataView's Form Orientation value)
- **Label Width**: A value between 1 and 11 that determines the width of the label. Will be reset to 1 or 11 if a value is selected that is outside these bounds. (only used if Show Label is set to Yes and Form Orientation is set to Horizontal)

## Strings
- **Placeholder text:** The text to be shown in the dropdown when no item has been selected.
- **'Input too short' text**: The string to display if the minimum input length has not been reached. Value can make use of tokens ${minLength} for minimum length setting and ${remainLength} for the number of characters remaining before the search executes

## Events
- **On change**: The microflow that will be run when an item is selected or the control is cleared.

# Limitations / Known Issues

- ‘Search attribute’ only supports ‘String’ data types.
- ‘Selected item’ only supports ‘String’ data types.
- ‘Item Attributes’ do not support Enum or DateTime types
- Selected item display does not support templating.