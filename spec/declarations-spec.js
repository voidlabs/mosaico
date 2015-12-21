'use strict';
/* globals describe: false, it: false, expect: false */
/* globals process: false, console: false */

var mockery = require('mockery');
mockery.enable();
mockery.registerAllowables(['../src/js/converter/declarations.js', 'console', './utils.js', './domutils.js', 'console', '../bower_components/mensch']);
var currentDocument;
mockery.registerMock('jquery', function() {
  return currentDocument.apply(currentDocument, arguments);
});
mockery.registerMock('jsep', require('../bower_components/jsep/src/jsep.js'));
mockery.registerMock('mensch/lib/parser.js', function() {
  var parse = require('../bower_components/mensch').parse;
  return parse.apply(parse, arguments);
});
var elaborateDeclarations = require('../src/js/converter/declarations.js');
var templateUrlConverter = function(url) { return '.'+url; };

var mockedBindingProvider = function(a, b) {
  // console.log("binding provider for", a, b);
  return "$" + a + "[" + b + "]";
};

describe('Style declaration processor', function() {

  it('should not loose simple properties after a -ko-property', function() {
    var styleSheet, declarations, previewBindings;
    styleSheet = require('mensch/lib/parser.js')("#{\n" + 'color: red; -ko-color: @color; background-color: white' + "}", {
      comments: true,
      position: true
    });
    declarations = styleSheet.stylesheet.rules[0].declarations;
    previewBindings = elaborateDeclarations(undefined, declarations, templateUrlConverter, mockedBindingProvider);
    expect(previewBindings).toEqual("virtualAttrStyle: 'color: '+($color[undefined]())+'; '+'background-color: white;'+''");

    styleSheet = require('mensch/lib/parser.js')("#{\n" + 'color: red; background-color: white; -ko-color: @color' + "}", {
      comments: true,
      position: true
    });
    declarations = styleSheet.stylesheet.rules[0].declarations;
    previewBindings = elaborateDeclarations(undefined, declarations, templateUrlConverter, mockedBindingProvider);
    expect(previewBindings).toEqual("virtualAttrStyle: 'color: '+($color[undefined]())+'; '+'background-color: white;'+''");

  });

  it('should not mix virtualStyle and virtualAttrStyle bindings', function() {
    var styleSheet, declarations, previewBindings;
    styleSheet = require('mensch/lib/parser.js')("#{\n" + '-ko-bind-text: @[\'Pulsante\']; -ko-font-family: @face; -ko-color: @color; -ko-font-size: @[size]px; -ko-background-color: @buttonColor; padding-left: 5px; -ko-border-radius: @[radius]px; padding: 5px;' + "}", {
      comments: true,
      position: true
    });
    declarations = styleSheet.stylesheet.rules[0].declarations;
    previewBindings = elaborateDeclarations(undefined, declarations, templateUrlConverter, mockedBindingProvider);
    expect(previewBindings).toEqual("virtualAttrStyle: 'padding-left: 5px; '+'padding: 5px;'+'', text: 'Pulsante', virtualStyle: { fontFamily: $face[undefined](), color: $color[undefined](), fontSize: $size[undefined]()+'px', backgroundColor: $buttonColor[undefined](), borderRadius: $radius[undefined]()+'px' }");
  });

  it('should mantain spaces and ; when removing/replacing declarations', function() {
    var result;
    result = elaborateDeclarations('color: red; -ko-color: @color; background-color: white', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: $color[red]() -->red<!-- /ko -->; background-color: white");

    result = elaborateDeclarations('color: red;-ko-color: @color;background-color: white', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red;color: <!-- ko text: $color[red]() -->red<!-- /ko -->;background-color: white");
  });


  it('should correctly parse multiline declarations', function() {
    var result;

    result = elaborateDeclarations('\tcolor: red;\n\t-ko-color: @color;\n\tbackground-color: white\n', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("\tcolor: red;\n\tcolor: <!-- ko text: $color[red]() -->red<!-- /ko -->;\n\tbackground-color: white\n");
  });

  it('should support modifiers', function() {
    var result;
    result = elaborateDeclarations('width: 10%; -ko-width: @[mywidth]%', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("width: 10%; width: <!-- ko text: $mywidth[10]()+'%' -->10%<!-- /ko -->");

    result = elaborateDeclarations('width: 10px; -ko-width: @[mywidth]px', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("width: 10px; width: <!-- ko text: $mywidth[10]()+'px' -->10px<!-- /ko -->");

    result = elaborateDeclarations('src: url(\'path\'); -ko-src: url(\'@myurl\')', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("src: url(\'.path\'); src: <!-- ko text: 'url(\\''+$myurl[.path]()+'\\')' -->url(\'.path\')<!-- /ko -->");

    result = elaborateDeclarations('src: url("path"); -ko-src: url("@myurl")', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("src: url(\".path\"); src: <!-- ko text: 'url(\"'+$myurl[.path]()+'\")' -->url(\".path\")<!-- /ko -->");

    result = elaborateDeclarations('src: url(path); -ko-src: url(@myurl)', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("src: url(.path); src: <!-- ko text: 'url('+$myurl[.path]()+')' -->url(.path)<!-- /ko -->");

  });

  it('should be able to remove display: none', function() {
    var result;
    result = elaborateDeclarations('a: 1; display: none; b: 2', undefined, templateUrlConverter, mockedBindingProvider, undefined, undefined, true);
    expect(result).toEqual("a: 1; ; b: 2");
  });

  it('should support composed properties and hardcoded values', function() {
    var result;
    result = elaborateDeclarations('border: 1px 2px 3px 4px; -ko-border: @border1 @border2 3px @border4', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("border: 1px 2px 3px 4px; border: <!-- ko text: $border1[1px]()+' '+$border2[2px]()+' 3px '+$border4[4px]() -->1px 2px 3px 4px<!-- /ko -->");
  });

  it('should support conditional properties', function() {
    var result, styleSheet, declarations;
    styleSheet = require('mensch/lib/parser.js')("#{\n" + 'color: red; -ko-color: @mycolor; -ko-color-if: mycondition' + "}", {
      comments: true,
      position: true
    });
    declarations = styleSheet.stylesheet.rules[0].declarations;
    result = elaborateDeclarations(undefined, declarations, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("virtualAttrStyle: 'color: '+(($mycondition[undefined]()) ? $mycolor[undefined]() : null)+';'+''");

    result = elaborateDeclarations('color: red; -ko-color: @mycolor; -ko-color-if: mycondition', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: ($mycondition[undefined]()) ? $mycolor[red]() : null -->red<!-- /ko -->; ");
  });

  it('should support simple expressions in conditional properties', function() {
    var result, styleSheet, declarations;
    styleSheet = require('mensch/lib/parser.js')("#{\n" + 'color: red; -ko-color: @mycolor; -ko-color-if: mycondition gt 1 and mycondition lt 3' + "}", {
      comments: true,
      position: true
    });
    declarations = styleSheet.stylesheet.rules[0].declarations;
    result = elaborateDeclarations(undefined, declarations, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("virtualAttrStyle: 'color: '+(((($mycondition[undefined]() > 1) && ($mycondition[undefined]() < 3))) ? $mycolor[undefined]() : null)+';'+''");

    result = elaborateDeclarations('color: red; -ko-color: @mycolor; -ko-color-if: mycondition gt 1 and mycondition lt 3', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: ((($mycondition[undefined]() > 1) && ($mycondition[undefined]() < 3))) ? $mycolor[red]() : null -->red<!-- /ko -->; ");

    result = elaborateDeclarations('color: red; -ko-color: @mycolor; -ko-color-ifnot: mycondition gt 1 and mycondition lt 3', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: !((($mycondition[undefined]() > 1) && ($mycondition[undefined]() < 3))) ? $mycolor[red]() : null -->red<!-- /ko -->; ");

    result = elaborateDeclarations('color: red; -ko-color: @mycolor; -ko-color-ifnot: mycondition eq "ciao ciao"', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: !(($mycondition[undefined]() == \"ciao ciao\")) ? $mycolor[red]() : null -->red<!-- /ko -->; ");

  });

  it('should support complex expressions in conditional properties', function() {
    var result;
    result = elaborateDeclarations('color: red; -ko-color: @mycolor; -ko-color-ifnot: mycondition eq "ciao ciao" and mycondition neq "miao" or mycondition lte 1 or Color.lighter(mycondition, "#00000") gte "#CCCCCC"', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: !((((($mycondition[undefined]() == \"ciao ciao\") && ($mycondition[undefined]() != \"miao\")) || ($mycondition[undefined]() <= 1)) || (Color.lighter($mycondition[undefined](), \"#00000\") >= \"#CCCCCC\"))) ? $mycolor[red]() : null -->red<!-- /ko -->; ");

    result = elaborateDeclarations('color: red; -ko-color: @mycolor; -ko-color-ifnot: !mycondition || true ? myobj.color : "red"', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toEqual("color: red; color: <!-- ko text: !(((!$mycondition[undefined]() || true) ? $myobj.color[undefined]() : \"red\")) ? $mycolor[red]() : null -->red<!-- /ko -->; ");
  });

  it('should expect defaults', function() {
    var result, exception;
    try {
      result = elaborateDeclarations('-ko-color: red', undefined, templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Cannot find default/);

    try {
      result = elaborateDeclarations('color: red blue; -ko-color: @a @b @c @d', undefined, templateUrlConverter, mockedBindingProvider);
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
      result = elaborateDeclarations('color: red; -ko-color: @mycolor; -ko-color-if: mycondition gt 1 xor mycondition lt 3', undefined, templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Syntax error/);

    try {
      result = elaborateDeclarations('color: red; -ko-color: @mycolor; -ko-color-if: mycondition gtn 1', undefined, templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Syntax error/);

  });

  it('should raise an exception on element styles applied with no element', function() {
    var result, exception;
    try {
      result = elaborateDeclarations('-ko-attr-href: @myhref', undefined, templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Attributes and bind declarations/);

    try {
      result = elaborateDeclarations('-ko-bind-text: @mytext', undefined, templateUrlConverter, mockedBindingProvider);
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
      result = elaborateDeclarations('color: red; -ko-color: @mycolor; -ko-color-if: mycondition eq "ciao ciao"a', undefined, templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Syntax error/);
  });

  it('should raise an exception when -if and -ifnot are used on the same property', function() {
    var result, exception;
    try {
      result = elaborateDeclarations('color: red; -ko-color-ifnot: mycondition; -ko-color: @mycolor; -ko-color-if: mycondition eq "ciao ciao"', undefined, templateUrlConverter, mockedBindingProvider);
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
      result = elaborateDeclarations('src: url(\'path\'); -ko-src: @[myurl!mymod]', undefined, templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/Syntax error /);
  });

  it('should raise errors on missing default value', function() {
    var result, exception;
    try {
      result = elaborateDeclarations('-ko-color: @mycolor', undefined, templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Cannot find default/);
  });

  it('should not alter the result when no -ko declarations are used', function() {
    var result;
    result = elaborateDeclarations('width: 10%; width: 20%', undefined, templateUrlConverter, mockedBindingProvider);
    expect(result).toBe(null);
  });

  it('should raise errors on unexpected default values when using modifiers', function() {
    var result, exception;
    try {
      result = elaborateDeclarations('width: 10%; -ko-width: @[mywidth]px', undefined, templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Cannot find default/);

    try {
      result = elaborateDeclarations('width: 10px; -ko-width: @[mywidth]%', undefined, templateUrlConverter, mockedBindingProvider);
    } catch (e) {
      exception = e;
    }
    expect(result).toEqual(undefined);
    expect(exception).toMatch(/^Cannot find default/);
  });

});