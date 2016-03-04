"use strict";

// Overrides native jQuery tabs to make tabs working also when using a base tag
// in order to avoid conflicts you have to add a data-local="true" attribute to your tab links.

var $ = require('jquery');
var console = require('console');
var tabs = require("jquery-ui/tabs");

if (typeof tabs == 'undefined') throw "Cannot find jquery-ui tabs widget dependency!";

$.widget("ui.tabs", tabs, {
  _isLocal: function( anchor ) {
    if (anchor.getAttribute('data-local') == "true") return true;
    else return this._superApply( arguments );
  }
});