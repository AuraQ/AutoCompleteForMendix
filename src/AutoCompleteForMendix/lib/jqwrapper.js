var jqDefineAMD = window.define.amd;
delete window.define.amd;
define(['./jquery-1.11.2'], function(jQuery) {
	window.define.amd = jqDefineAMD;
	return window.jQuery.noConflict(true);
});