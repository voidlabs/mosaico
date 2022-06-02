'use strict';
/* globals console:false, describe:false, it:false, expect:false, jasmine:false */

describe('Stylesheet declaration processor', function() {
  var processStylesheetRules;
  var mockery = require('mockery');

  var templateUrlConverter = function(url) { return 'https://PREFIXED/'+url; };

  var mockedWithBindingProvider = function(x, y, a, b) {
    return "$" + x + '.' + a + "[" + b + "]";
  };

  var blockDefsUpdater = function() {
    console.log("BDU", arguments);
  };

  var themeUpdater = function() {
    console.log("TU", arguments);
  };

  beforeAll(function() {
    mockery.enable();
    mockery.registerAllowables(['../src/js/converter/declarations.js', 'console', './utils.js', './domutils.js', 'console', '../node_modules/mensch', './declarations.js', '../src/js/converter/stylesheet.js', 'mensch/lib/parser.js', './debug', './lexer', 'jsep', 'jquery'])
    processStylesheetRules = require('../src/js/converter/stylesheet.js');
  });

  it('should add "namespacing" to every rule', function() {
    var result;
    // function(style, rules, localWithBindingProvider, blockDefsUpdater, themeUpdater, basePath, rootModelName, templateName) {
    result = processStylesheetRules('a { b: c }', undefined, mockedWithBindingProvider, undefined, undefined, '.', 'template', 'block');
    expect(result).toEqual("<!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a{ b: c }");

    result = processStylesheetRules('a{b:c}', undefined, mockedWithBindingProvider, undefined, undefined, '.', 'template', 'block');
    expect(result).toEqual("<!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a{b:c}");

    result = processStylesheetRules('a, b { b: c } @media all { c { d: e } }', undefined, mockedWithBindingProvider, undefined, undefined, '.', 'template', 'block');
    expect(result).toEqual("<!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a, <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->b{ b: c } @media all { <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->c{ d: e } }");

    // processStylesheetRules('a { b: c }', undefined, mockedBindingProvider, blockDefsUpdater, themeUpdater, '.', 'template', 'block');
  });

  it('should process simple -ko properties', function() {
    var result;
    // function(style, rules, localWithBindingProvider, blockDefsUpdater, themeUpdater, basePath, rootModelName, templateName) {
    result = processStylesheetRules('a { b: c; -ko-b: @myc }', undefined, mockedWithBindingProvider, undefined, undefined, '.', 'template', 'block');
    expect(result).toEqual("<!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a{ b: c; b: <!-- ko text: $block.myc[c] -->c<!-- /ko -->}");

    result = processStylesheetRules('prova{color: #3f3f3f;-ko-color:@[\'#3f3f3f\'];}\r\nprova{color: #3f3f3f;-ko-color:@[\'#3f3f3f\'];}', undefined, mockedWithBindingProvider, undefined, undefined, '.', 'template', 'block');
    expect(result).toEqual("<!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->prova{color: #3f3f3f;color: <!-- ko text: '#3f3f3f' -->#3f3f3f<!-- /ko -->;}\r\n<!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->prova{color: #3f3f3f;color: <!-- ko text: '#3f3f3f' -->#3f3f3f<!-- /ko -->;}");

  });

  it('should process [data-ko-block=] directive', function() {
    var result;

    var blockDefsUpdater = jasmine.createSpy("blockDefsUpdater");

    // function(style, rules, localWithBindingProvider, blockDefsUpdater, themeUpdater, basePath, rootModelName, templateName) {
    result = processStylesheetRules('a[data-ko-block=foo] { b: c; -ko-b: @myc }', undefined, mockedWithBindingProvider, blockDefsUpdater, themeUpdater, '.', 'template', 'block');
    expect(result).toEqual("<!-- ko foreach: $root.findObjectsOfType($data, 'foo') --> <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a<!-- ko text: '#'+id() -->foo<!-- /ko -->{ b: c; b: <!-- ko text: $foo.myc[c] -->c<!-- /ko --> } <!-- /ko -->");

    expect(blockDefsUpdater).toHaveBeenCalledWith('foo', '', { contextName: 'block' });
    // blockDefsUpdater.calls.reset();

    result = processStylesheetRules('a[data-ko-block=foo], [data-ko-block=foo] a { b: c; -ko-b: @myc }', undefined, mockedWithBindingProvider, blockDefsUpdater, themeUpdater, '.', 'template', 'block');
    expect(result).toEqual("<!-- ko foreach: $root.findObjectsOfType($data, 'foo') --> <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a<!-- ko text: '#'+id() -->foo<!-- /ko -->, <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko --><!-- ko text: '#'+id() -->foo<!-- /ko --> a{ b: c; b: <!-- ko text: $foo.myc[c] -->c<!-- /ko --> } <!-- /ko -->");

    // expect(blockDefsUpdater).toHaveBeenCalledWith('foo', '', undefined, 'block');
    // expect(blockDefsUpdater.calls.count()).toEqual(2);
    // blockDefsUpdater.calls.reset();

    result = processStylesheetRules('a[data-ko-block=foo],\n [data-ko-block=foo] a { b: c; -ko-b: @myc }', undefined, mockedWithBindingProvider, blockDefsUpdater, themeUpdater, '.', 'template', 'block');
    expect(result).toEqual("<!-- ko foreach: $root.findObjectsOfType($data, 'foo') --> <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a<!-- ko text: '#'+id() -->foo<!-- /ko -->, <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko --><!-- ko text: '#'+id() -->foo<!-- /ko --> a{ b: c; b: <!-- ko text: $foo.myc[c] -->c<!-- /ko --> } <!-- /ko -->");

    result = processStylesheetRules('a[data-ko-block=foo]{}b[data-ko-block=foo]{}', undefined, mockedWithBindingProvider, blockDefsUpdater, themeUpdater, '.', 'template', 'block');
    expect(result).toEqual("<!-- ko foreach: $root.findObjectsOfType($data, 'foo') --> <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a<!-- ko text: '#'+id() -->foo<!-- /ko -->{} <!-- /ko --><!-- ko foreach: $root.findObjectsOfType($data, 'foo') --> <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->b<!-- ko text: '#'+id() -->foo<!-- /ko -->{} <!-- /ko -->");

    result = processStylesheetRules('a[data-ko-block=foo] { } b[data-ko-block=foo] { } ', undefined, mockedWithBindingProvider, blockDefsUpdater, themeUpdater, '.', 'template', 'block');
    expect(result).toEqual("<!-- ko foreach: $root.findObjectsOfType($data, 'foo') --> <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a<!-- ko text: '#'+id() -->foo<!-- /ko -->{ }  <!-- /ko --><!-- ko foreach: $root.findObjectsOfType($data, 'foo') --> <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->b<!-- ko text: '#'+id() -->foo<!-- /ko -->{ }  <!-- /ko -->");

    result = processStylesheetRules('a[data-ko-block=foo]{\n}b[data-ko-block=foo]{\n}', undefined, mockedWithBindingProvider, blockDefsUpdater, themeUpdater, '.', 'template', 'block');
    expect(result).toEqual("<!-- ko foreach: $root.findObjectsOfType($data, 'foo') --> <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a<!-- ko text: '#'+id() -->foo<!-- /ko -->{\n} <!-- /ko --><!-- ko foreach: $root.findObjectsOfType($data, 'foo') --> <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->b<!-- ko text: '#'+id() -->foo<!-- /ko -->{\n} <!-- /ko -->");

  });

  it('should throw error on multiple different [data-ko-block=] directive', function() {
    var result, exception;
    // function(style, rules, localWithBindingProvider, blockDefsUpdater, themeUpdater, basePath, rootModelName, templateName) {
    try {
      result = processStylesheetRules('a[data-ko-block=foo], b[data-ko-block=bar] { b: c; -ko-b: @myc }', undefined, mockedWithBindingProvider, blockDefsUpdater, themeUpdater, '.', 'template', 'block');
    } catch (e) {
      exception = e;
    }
    expect(result).toBe(undefined);
    expect(exception).toMatch(/^Found multiple/);
  });

  it('should process multiline [data-ko-block=] directive', function() {
    var result;
    // function(style, rules, localWithBindingProvider, blockDefsUpdater, themeUpdater, basePath, rootModelName, templateName) {
    result = processStylesheetRules('    a[data-ko-block=foo] {\n      b: c;\n      -ko-b: @myc\n    }\n', undefined, mockedWithBindingProvider, blockDefsUpdater, themeUpdater, '.', 'template', 'block');
    expect(result).toEqual("    <!-- ko foreach: $root.findObjectsOfType($data, 'foo') -->\n    <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a<!-- ko text: '#'+id() -->foo<!-- /ko -->{\n      b: c;\n      b: <!-- ko text: $foo.myc[c] -->c<!-- /ko -->\n    }\n    <!-- /ko -->");

    // function(style, rules, localWithBindingProvider, blockDefsUpdater, themeUpdater, basePath, rootModelName, templateName) {
    result = processStylesheetRules('    f { g: h; }\n    i{j:k}\n    a[data-ko-block=foo] {\n      b: c;\n      -ko-b: @myc\n    }\n', undefined, mockedWithBindingProvider, blockDefsUpdater, themeUpdater, '.', 'template', 'block');
    expect(result).toEqual("    <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->f{ g: h; }\n    <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->i{j:k}\n    <!-- ko foreach: $root.findObjectsOfType($data, 'foo') -->\n    <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a<!-- ko text: '#'+id() -->foo<!-- /ko -->{\n      b: c;\n      b: <!-- ko text: $foo.myc[c] -->c<!-- /ko -->\n    }\n    <!-- /ko -->");


    result = processStylesheetRules("\n    [data-ko-block=tripleArticleBlock] .links-color a,\n    [data-ko-block=tripleArticleBlock] .links-color a:hover {\n      color: #3f3f3f;\n      -ko-color: @longTextStyle.linksColor;\n      text-decoration: underline;\n    }\na{b:c}", undefined, mockedWithBindingProvider, blockDefsUpdater, themeUpdater, '.', 'template', 'block');
    expect(result).toEqual("\n    <!-- ko foreach: $root.findObjectsOfType($data, 'tripleArticleBlock') -->\n    <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko --><!-- ko text: '#'+id() -->tripleArticleBlock<!-- /ko --> .links-color a, <!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko --><!-- ko text: '#'+id() -->tripleArticleBlock<!-- /ko --> .links-color a:hover{\n      color: #3f3f3f;\n      color: <!-- ko text: $tripleArticleBlock.longTextStyle.linksColor[#3f3f3f] -->#3f3f3f<!-- /ko -->;\n      text-decoration: underline\n    }\n    <!-- /ko --><!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a{b:c}");
  });

  it('should ignore comments or unknown rules but keep them', function() {
    var result;
    // function(style, rules, localWithBindingProvider, blockDefsUpdater, themeUpdater, basePath, rootModelName, templateName) {
    result = processStylesheetRules('/* first */a { b: c; /* second */-ko-b: @myc }/* third */', undefined, mockedWithBindingProvider, undefined, undefined, '.', 'template', 'block');
    expect(result).toEqual("/* first */<!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a{ b: c; /* second */b: <!-- ko text: $block.myc[c] -->c<!-- /ko -->}/* third */");

    result = processStylesheetRules('@keyframes{a{-ko-b:@c}}a {b:c}', undefined, mockedWithBindingProvider, undefined, undefined, '.', 'template', 'block');
    expect(result).toEqual("@keyframes{a{-ko-b:@c}}<!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a{b:c}");
  });

  it('should parse unsupported supports rules', function() {
    var result;
    result = processStylesheetRules('@supports cips {a{b:1;-ko-b:@myb}}a {b:c}', undefined, mockedWithBindingProvider, undefined, undefined, '.', 'template', 'block');
    expect(result).toEqual("@supports cips {<!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a{b:1;b: <!-- ko text: $block.myb[1] -->1<!-- /ko -->}}<!-- ko text: templateMode =='wysiwyg' ? '#main-wysiwyg-area ' : '' --><!-- /ko -->a{b:c}");
  });

  it('should parse -ko-blockdefs definitions', function() {
    var result;
    var blockDefsUpdater = jasmine.createSpy("blockDefsUpdater");
    result = processStylesheetRules('@supports -ko-blockdefs { color { widget: color } color:preview { -ko-color: @color } }', undefined, mockedWithBindingProvider, blockDefsUpdater, undefined, '.', 'template', 'block');
    expect(result).toEqual("");
    expect(blockDefsUpdater).toHaveBeenCalledWith('color', '', { widget: 'color' });
    expect(blockDefsUpdater).toHaveBeenCalledWith('color', undefined, { previewBindings: [{
      type: 'property',
      name: '-ko-color',
      value: '@color',
      position: {
        start: {
          line: 1,
          col: 67
        },
        end: {
          line: 1,
          col: 85
        }
      }
    }]});
    // console.log("BBB", blockDefsUpdater.calls);
  });

  it('should parse -ko-blockdefs definitions, even empty declarations', function() {
    var result;
    var blockDefsUpdater = jasmine.createSpy("blockDefsUpdater");
    result = processStylesheetRules('@supports -ko-blockdefs { color { } }', undefined, mockedWithBindingProvider, blockDefsUpdater, undefined, '.', 'template', 'block');
    expect(blockDefsUpdater).toHaveBeenCalledWith('color', '', {});
    expect(result).toEqual("");
    // console.log("BBB", blockDefsUpdater.calls);
  });

  it('should parse -ko-blockdefs definitions, even quoted values', function() {
    var result;
    var blockDefsUpdater = jasmine.createSpy("blockDefsUpdater");
    result = processStylesheetRules('@supports -ko-blockdefs { color { label: "esc\'aped" } }', undefined, mockedWithBindingProvider, blockDefsUpdater, undefined, '.', 'template', 'block');
    expect(blockDefsUpdater).toHaveBeenCalledWith('color', '', { name: 'esc\'aped' });
    expect(result).toEqual("");
    // console.log("BBB", blockDefsUpdater.calls);
  });

  it('should raise an error when mixing preview selctor with other declarations', function() {
    var result, exception;
    try {
      result = processStylesheetRules('@supports -ko-blockdefs { color, color:preview { } }', undefined, mockedWithBindingProvider, blockDefsUpdater, undefined, '.', 'template', 'block');
    } catch (e) {
      exception = e;
    }
    expect(result).toBeUndefined();
    expect(exception).toMatch(/^Cannot mix/);
    // console.log("BBB", blockDefsUpdater.calls);
  });

  it('should parse @font-face definitions, mainly for template url prefixing', function() {
    var result;
    var blockDefsUpdater = jasmine.createSpy("blockDefsUpdater");
    result = processStylesheetRules('@font-face { src: url("../fonts/Calibri.woff") format("woff"), url("../fonts/Calibri.woff2") format("woff2"); }', undefined, mockedWithBindingProvider, undefined, undefined, templateUrlConverter, 'template', 'block');
    expect(result).toEqual('@font-face { src: url("https://PREFIXED/../fonts/Calibri.woff") format("woff"), url("https://PREFIXED/../fonts/Calibri.woff2") format("woff2"); }');
  });


  afterAll(function() {
    mockery.disable();
    mockery.deregisterAll();
  });

});
