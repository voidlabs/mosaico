"use strict";

// Overrides native jQuery tabs to make tabs working also when using a base tag
// in order to avoid conflicts you have to add a data-local="true" attribute to your tab links.

var $ = require('jquery');
var console = require('console');
$.widget("ui.tabs", $.ui.tabs, {
  _isLocal: function( anchor ) {
    if (anchor.getAttribute('data-local') == "true") return true;
    else return this._superApply( arguments );
  }
});