'use strict';
/* globals describe: false, it: false, expect: false */
/* globals process: false, console: false */

var mockery = require('mockery');
mockery.enable();
mockery.registerAllowables(['../src/js/converter/declarations.js', 'console', './utils.js', './domutils.js', 'console', '../bower_components/mensch']);

/*
var cheerio = require('cheerio');
var currentDocument = cheerio.load('<body></body>');

mockery.registerMock('jquery', function() {
console.log("XXXXX", currentDocument);
return currentDocument.apply(currentDocument, arguments);
});
*/
mockery.registerMock('jquery', require('cheerio'));

mockery.registerMock('jsep', require('../bower_components/jsep/src/jsep.js'));
mockery.registerMock('mensch/lib/parser.js', function() {
  var parse = require('../bower_components/mensch').parse;
  return parse.apply(parse, arguments);
});
var elaborateDeclarations = require('../src/js/converter/declarations.js');

var mockedBindingProvider = function(a, b) {
  // console.log("binding provider for", a, b);
  return "$" + a + "[" + b + "]";
};

var templateUrlConverter = function(url) {
  return url;
}

describe('Template converter', function() {

  it('should handle basic template conversion', function() {
    var modelDef = require('../src/js/converter/model.js');
    var translateTemplate = require('../src/js/converter/parser.js');
    var templates = [];
    var $ = require('jquery');
    var myTemplateCreator = function(htmlOrElement, optionalName, templateMode) {
      templates.push({
        optionalName: optionalName,
        templateMode: templateMode,
        html: typeof htmlOrElement == 'object' ? $.html(htmlOrElement) : htmlOrElement
      });
    };
    var html = '<replacedhtml><replacedhead></replacedhead><repleacedbody><div data-ko-container="main"><div data-ko-block="simpleBlock"><div data-ko-editable="text">block1</div></div></div></replacedbody></replacedhtml>';
    var templateDef = translateTemplate('template', html, './basepath/', myTemplateCreator);

    var expectedTemplates = [{
      optionalName: 'template',
      templateMode: 'show',
      html: '<replacedhtml data-bind=""><replacedhead></replacedhead><repleacedbody><div data-bind="block: mainBlocks"></div></repleacedbody></replacedhtml>'
    }, {
      optionalName: 'simpleBlock',
      templateMode: 'show',
      html: '<div data-bind="attr: { id: id }, uniqueId: $data"><div data-bind="wysiwygId: id()+&apos;_text&apos;, wysiwygClick: function(obj, evt) { $root.selectItem(text, $data); return false }, clickBubble: false, wysiwygCss: { selecteditem: $root.isSelectedItem(text) }, scrollIntoView: $root.isSelectedItem(text), wysiwygOrHtml: text"></div></div>'
    }];

    expect(templates).toEqual(expectedTemplates);

    var model = modelDef.generateResultModel(templateDef);

    var expectedModel = {
      type: 'template',
      mainBlocks: {
        type: 'blocks',
        blocks: []
      },
      theme: {
        type: 'theme',
        bodyTheme: null
      }
    };

    expect(model).toEqual(expectedModel);

    // TODO verify template "defs" output
    // console.log("RESULT", templateDef);
  });

  it('should handle versafix-1 template conversion', function() {
    var modelDef = require('../src/js/converter/model.js');
    var translateTemplate = require('../src/js/converter/parser.js');
    var templates = [];
    var $ = require('jquery');
    var myTemplateCreator = function(htmlOrElement, optionalName, templateMode) {
      templates.push({
        optionalName: optionalName,
        templateMode: templateMode,
        html: typeof htmlOrElement == 'object' ? $.html(htmlOrElement) : htmlOrElement
      });
    };

    var fs = require('fs');

    var templatecode = "" + fs.readFileSync("templates/versafix-1/template-versafix-1.html");
    var res = templatecode.match(/^([\S\s]*)([<]html[^>]*>[\S\s]*<\/html>)([\S\s]*)$/i);
    if (res === null) throw "Unable to find <html> opening and closing tags in the template";
    var html = res[2].replace(/(<\/?)(html|head|body)([^>]*>)/gi, function(match, p1, p2, p3) {
      return p1 + 'replaced' + p2 + p3;
    });

    var templateDef = translateTemplate('template', html, templateUrlConverter, myTemplateCreator);
    var model = modelDef.generateResultModel(templateDef);

    var expectedModel = JSON.parse("" + fs.readFileSync("spec/data/template-versafix-1.model.json"));

    expect(model).toEqual(expectedModel);
  });

});