'use strict';
/* globals describe: false, it: false, expect: false */
/* globals process: false, console: false */

describe('Style declaration processor', function() {

  var mockery = require('mockery');
  var declarations;

  var templateUrlConverter = function(url) { return '.'+url; };

  var mockedBindingProvider = function(a, b) {
    // console.log("binding provider for", a, b);
    return "$" + a + "[" + b + "]";
  };

  beforeAll(function() {
    mockery.registerMock('jquery', require('cheerio').load('<html />'));
    mockery.registerAllowables(['cheerio', '../src/js/converter/declarations.js', './utils.js', 'console', 'jsep', 'mensch/lib/parser.js', './debug', './lexer', './domutils.js']);
    mockery.enable();
    declarations = require('../src/js/converter/declarations.js');
  });

  it('should not loose simple properties after a -ko-property', function() {
    var styleSheet, decls, previewBindings;
    styleSheet = require('../src/js/converter/cssparser.js').parse("#{\n" + 'color: red; -ko-color: @color; background-color: white' + "}");
    decls = styleSheet.stylesheet.rules[0].declarations;
    previewBindings = declarations.elaborateDeclarationsAndReturnStyleBindings(decls, templateUrlConverter, mockedBindingProvider);
    expect(previewBindings).toEqual("virtualAttrStyles: { color: $color[red], 'background-color': 'white' }");

    styleSheet = require('../src/js/converter/cssparser.js').parse("#{\n" + 'color: red; background-color: white; -ko-color: @color' + "}");
    decls = styleSheet.stylesheet.rules[0].declarations;
    previewBindings = declarations.elaborateDeclarationsAndReturnStyleBindings(decls, templateUrlConverter, mockedBindingProvider);
    expect(previewBindings).toEqual("virtualAttrStyles: { color: $color[red], 'background-color': 'white' }");

  });

  it('should correctly mix virtualStyle and virtualAttrStyle bindings', function() {
    var styleSheet, decls, previewBindings;
    styleSheet = require('../src/js/converter/cssparser.js').parse("#{\n" + '-ko-bind-text: @[\'Pulsante\']; -ko-font-family: @face; -ko-color: @color; -ko-font-size: @[size]px; -ko-background-color: @buttonColor; padding-left: 5px; -ko-border-radius: @[radius]px; padding: 5px;' + "}");
    decls = styleSheet.stylesheet.rules[0].declarations;
    previewBindings = declarations.elaborateDeclarationsAndReturnStyleBindings(decls, templateUrlConverter, mockedBindingProvider);
    expect(previewBindings).toEqual("virtualAttrStyles: { 'padding-left': '5px', padding: '5px' }, text: 'Pulsante', virtualStyle: { fontFamily: $face[undefined], color: $color[undefined], fontSize: $size[undefined]()+'px', backgroundColor: $buttonColor[undefined], borderRadius: $radius[undefined]()+'px' }");
  });

  it('should correctly deal with dashed properties', function() {
    var result;
    result = declarations.elaborateElementStyleDeclarations('background-color: red; -ko-background-color: @color', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("background-color: red; background-color: <!-- ko text: $color[red] -->red<!-- /ko -->");

    result = declarations.elaborateElementStyleDeclarations('-ms-color: red;-ko--ms-color: @color;background-color: white', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("-ms-color: red;-ms-color: <!-- ko text: $color[red] -->red<!-- /ko -->;background-color: white");
  });

  it('should mantain spaces and ; when removing/replacing declarations', function() {
    var result;
    result = declarations.elaborateElementStyleDeclarations('color: red; -ko-color: @color; background-color: white', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: $color[red] -->red<!-- /ko -->; background-color: white");

    result = declarations.elaborateElementStyleDeclarations('color: red;-ko-color: @color;background-color: white', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red;color: <!-- ko text: $color[red] -->red<!-- /ko -->;background-color: white");
  });


  it('should correctly parse multiline declarations', function() {
    var result;

    result = declarations.elaborateElementStyleDeclarations('\tcolor: red;\n\t-ko-color: @color;\n\tbackground-color: white\n', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("\tcolor: red;\n\tcolor: <!-- ko text: $color[red] -->red<!-- /ko -->;\n\tbackground-color: white\n");
  });

  it('should support modifiers', function() {
    var result;
    result = declarations.elaborateElementStyleDeclarations('width: 10%; -ko-width: @[mywidth]%', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("width: 10%; width: <!-- ko text: $mywidth[10]()+'%' -->10%<!-- /ko -->");

    result = declarations.elaborateElementStyleDeclarations('width: 10px; -ko-width: @[mywidth]px', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("width: 10px; width: <!-- ko text: $mywidth[10]()+'px' -->10px<!-- /ko -->");

    result = declarations.elaborateElementStyleDeclarations('src: url(\'path\'); -ko-src: url(\'@myurl\')', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("src: url(\'.path\'); src: <!-- ko text: 'url(\\''+$myurl[.path]()+'\\')' -->url(\'.path\')<!-- /ko -->");

    result = declarations.elaborateElementStyleDeclarations('src: url("path"); -ko-src: url("@myurl")', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("src: url(\".path\"); src: <!-- ko text: 'url(\"'+$myurl[.path]()+'\")' -->url(\".path\")<!-- /ko -->");

    result = declarations.elaborateElementStyleDeclarations('src: url(path); -ko-src: url(@myurl)', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("src: url(.path); src: <!-- ko text: 'url('+$myurl[.path]()+')' -->url(.path)<!-- /ko -->");

  });

  it('should be able to remove display: none', function() {
    var result;
    result = declarations.elaborateElementStyleDeclarations('a: 1; display: none; b: 2', templateUrlConverter, mockedBindingProvider, undefined, true);
    expect(result).toEqual("a: 1; ; b: 2");
  });

  it('should support composed properties and hardcoded values', function() {
    var result;
    result = declarations.elaborateElementStyleDeclarations('border: 1px 2px 3px 4px; -ko-border: @border1 @border2 3px @border4', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("border: 1px 2px 3px 4px; border: <!-- ko text: $border1[1px]()+' '+$border2[2px]()+' 3px '+$border4[4px]() -->1px 2px 3px 4px<!-- /ko -->");
  });

  it('should support conditional properties', function() {
    var result, styleSheet, decls;
    styleSheet = require('../src/js/converter/cssparser.js').parse("#{\n" + 'color: red; -ko-color: @mycolor; -ko-color-if: mycondition' + "}");
    decls = styleSheet.stylesheet.rules[0].declarations;
    result = declarations.elaborateDeclarationsAndReturnStyleBindings(decls, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("virtualAttrStyles: { color: $mycondition[undefined]() ? ko.utils.unwrapObservable($mycolor[red]) : null }");

    result = declarations.elaborateElementStyleDeclarations('color: red; -ko-color: @mycolor; -ko-color-if: mycondition', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: $mycondition[undefined]() ? ko.utils.unwrapObservable($mycolor[red]) : null -->red<!-- /ko -->; ");
  });

  it('should support simple expressions in conditional properties', function() {
    var result, styleSheet, decls;
    styleSheet = require('../src/js/converter/cssparser.js').parse("#{\n" + 'color: red; -ko-color: @mycolor; -ko-color-if: mycondition gt 1 and mycondition lt 3' + "}");
    decls = styleSheet.stylesheet.rules[0].declarations;
    result = declarations.elaborateDeclarationsAndReturnStyleBindings(decls, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("virtualAttrStyles: { color: (($mycondition[undefined]() > 1) && ($mycondition[undefined]() < 3)) ? ko.utils.unwrapObservable($mycolor[red]) : null }");

    result = declarations.elaborateElementStyleDeclarations('color: red; -ko-color: @mycolor; -ko-color-if: mycondition gt 1 and mycondition lt 3', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: (($mycondition[undefined]() > 1) && ($mycondition[undefined]() < 3)) ? ko.utils.unwrapObservable($mycolor[red]) : null -->red<!-- /ko -->; ");

    result = declarations.elaborateElementStyleDeclarations('color: red; -ko-color: @mycolor; -ko-color-ifnot: mycondition gt 1 and mycondition lt 3', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: !(($mycondition[undefined]() > 1) && ($mycondition[undefined]() < 3)) ? ko.utils.unwrapObservable($mycolor[red]) : null -->red<!-- /ko -->; ");

    result = declarations.elaborateElementStyleDeclarations('color: red; -ko-color: @mycolor; -ko-color-ifnot: mycondition eq "ciao ciao"', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: !($mycondition[undefined]() == \"ciao ciao\") ? ko.utils.unwrapObservable($mycolor[red]) : null -->red<!-- /ko -->; ");

  });

  it('should support complex expressions in conditional properties', function() {
    var result;
    result = declarations.elaborateElementStyleDeclarations('color: red; -ko-color: @mycolor; -ko-color-ifnot: mycondition eq "ciao ciao" and mycondition neq "miao" or mycondition lte 1 or Color.lighter(mycondition, "#00000") gte "#CCCCCC"', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: !(((($mycondition[undefined]() == \"ciao ciao\") && ($mycondition[undefined]() != \"miao\")) || ($mycondition[undefined]() <= 1)) || (Color.lighter($mycondition[undefined](), \"#00000\") >= \"#CCCCCC\")) ? ko.utils.unwrapObservable($mycolor[red]) : null -->red<!-- /ko -->; ");

    result = declarations.elaborateElementStyleDeclarations('color: red; -ko-color: @mycolor; -ko-color-ifnot: !mycondition || true ? myobj.color : "red"', templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: !((!$mycondition[undefined]() || true) ? $myobj.color[undefined]() : \"red\") ? ko.utils.unwrapObservable($mycolor[red]) : null -->red<!-- /ko -->; ");
  });

  it('should expect defaults', function() {
    var result, exception;
    try {
      result = declarations.elaborateElementStyleDeclarations('-ko-color: red', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Cannot find default/);

    try {
      result = declarations.elaborateElementStyleDeclarations('color: red blue; -ko-color: @a @b @c @d', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Cannot find default/);
  });

  // TODO the first now works (we support "or") while the seconds raise a different exception.
  it('should raise an exception on unknown tokens in condition expressions', function() {
    var result, exception;
    try {
      result = declarations.elaborateElementStyleDeclarations('color: red; -ko-color: @mycolor; -ko-color-if: mycondition gt 1 xor mycondition lt 3', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Syntax error/);

    try {
      result = declarations.elaborateElementStyleDeclarations('color: red; -ko-color: @mycolor; -ko-color-if: mycondition gtn 1', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Syntax error/);

  });

  it('should raise an exception on element styles applied with no element', function() {
    var result, exception;
    try {
      result = declarations.elaborateElementStyleDeclarations('-ko-attr-href: @myhref', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Attributes and bind declarations/);

    try {
      result = declarations.elaborateElementStyleDeclarations('-ko-bind-text: @mytext', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Attributes and bind declarations/);

  });

  // TODO switching to JSEP raises an "'Found an unsupported expression type: Compound'"" exception, instead.
  it('should raise an exception on unbalanced string values', function() {
    var result, exception;
    try {
      result = declarations.elaborateElementStyleDeclarations('color: red; -ko-color: @mycolor; -ko-color-if: mycondition eq "ciao ciao"a', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Syntax error/);
  });

  it('should raise an exception when -if and -ifnot are used on the same property', function() {
    var result, exception;
    try {
      result = declarations.elaborateElementStyleDeclarations('color: red; -ko-color-ifnot: mycondition; -ko-color: @mycolor; -ko-color-if: mycondition eq "ciao ciao"', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Unexpected error/);
  });


  // TODO maybe this doesn't apply anymore??
  it('should raise errors on bad modifiers', function() {
    var result, exception;
    try {
      result = declarations.elaborateElementStyleDeclarations('src: url(\'path\'); -ko-src: @[myurl!mymod]', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/Syntax error /);
  });

  it('should raise errors on missing default value', function() {
    var result, exception;
    try {
      result = declarations.elaborateElementStyleDeclarations('-ko-color: @mycolor', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Cannot find default/);
  });

  it('should not alter the result when no -ko declarations are used', function() {
    var result;
    result = declarations.elaborateElementStyleDeclarations('width: 10%; width: 20%', templateUrlConverter, mockedBindingProvider);
    expect(result).toBe('width: 10%; width: 20%');
  });

  it('should raise errors on unexpected default values when using modifiers', function() {
    var result, exception;
    try {
      result = declarations.elaborateElementStyleDeclarations('width: 10%; -ko-width: @[mywidth]px', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Cannot find default/);

    try {
      result = declarations.elaborateElementStyleDeclarations('width: 10px; -ko-width: @[mywidth]%', templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Cannot find default/);
  });

  it('should camel case styles but not attributes', function() {
    var result;
    var cheerio = require('cheerio');
    var $ = cheerio.load('<a data-attribute="ciao"></a>');
    result = declarations.elaborateElementStyleDeclarations('-ko-attr-data-attribute: @myvalue; background-color: red; -ko-background-color: @mycolor', templateUrlConverter, mockedBindingProvider, $('a')[0]);
    expect($('a').attr('data-bind')).toEqual("virtualAttr: { 'data-attribute': $myvalue[ciao] }, virtualAttrStyles: { 'background-color': $mycolor[red] }");

    $ = cheerio.load('<a attribute="ciao"></a>');
    result = declarations.elaborateElementStyleDeclarations('-ko-attr-attribute: @myvalue; color: red; -ko-color: @mycolor', templateUrlConverter, mockedBindingProvider, $('a')[0]);
    expect($('a').attr('data-bind')).toEqual("virtualAttr: { attribute: $myvalue[ciao] }, virtualAttrStyles: { color: $mycolor[red] }");

  });

  it('should keep multiple declarations for the same property', function() {
    var result;
    var cheerio = require('cheerio');
    var $ = cheerio.load('<div/>');
    result = declarations.elaborateElementStyleDeclarations('color: yellow; color: red; color: blue; -ko-color: @mycolor', templateUrlConverter, mockedBindingProvider, $('div')[0]);
    expect($('div').attr('data-bind')).toEqual("virtualAttrStyles: { color$2: 'yellow', color$1: 'red', color: $mycolor[blue] }");

    // This is a weird use case, but we have templates using this style and we want to maintain the behaviour
    $ = cheerio.load('<div/>');
    result = declarations.elaborateElementStyleDeclarations('color: yellow; color: red; color: blue; -ko-color: @mycolor1; -ko-color: @mycolor2', templateUrlConverter, mockedBindingProvider, $('div')[0]);
    expect($('div').attr('data-bind')).toEqual("virtualAttrStyles: { color$2: 'yellow', color$1: 'red', color: $mycolor1[blue] }");

    // Before mosaico 0.18.6 this used to produce something like "color: yellow, color: $mycolor1[blue], color: blue"
    //    where the default "blue" value was read from the rightmost element.
    // Then we slightly changed the logic so that it should get the default value from the same property it will replace.
    $ = cheerio.load('<div/>');
    result = declarations.elaborateElementStyleDeclarations('color: yellow; color: red; -ko-color: @mycolor1; -ko-color: @mycolor2; color: blue', templateUrlConverter, mockedBindingProvider, $('div')[0]);
    expect($('div').attr('data-bind')).toEqual("virtualAttrStyles: { color$2: 'yellow', color$1: $mycolor1[red], color: 'blue' }");

    $ = cheerio.load('<div/>');
    result = declarations.elaborateElementStyleDeclarations('color: yellow; color: red; -ko-color: @mycolor1; color: blue; -ko-color: @mycolor2', templateUrlConverter, mockedBindingProvider, $('div')[0]);
    expect($('div').attr('data-bind')).toEqual("virtualAttrStyles: { color$2: 'yellow', color$1: $mycolor1[red], color: $mycolor2[blue] }");
  });

  it('should deal with conditional bindings with correct parentheses', function() {
    var result;
    var cheerio = require('cheerio');
    var $ = cheerio.load('<a data-attribute="ciao"></a>');
    result = declarations.elaborateElementStyleDeclarations('background-color: red; -ko-background-color: @color; -ko-background-color-if: visible', templateUrlConverter, mockedBindingProvider, $('a')[0]);
    expect($('a').attr('data-bind')).toEqual("virtualAttrStyles: { 'background-color': $visible[undefined]() ? ko.utils.unwrapObservable($color[red]) : null }");
  });

  afterAll(function() {
    mockery.disable();
    mockery.deregisterAll();
  });

});
