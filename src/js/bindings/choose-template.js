"use strict";

// script template is the one provided by KO and deals with tempaltes defined as <script type=text/html.
// string template defines them in memory and avoids polluting the HTML: seems to work better in Mosaico.

module.exports = require('./string-template.js');
// module.exports = require('./script-template.js');