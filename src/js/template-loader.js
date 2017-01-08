"use strict";
/* global global: false */

var $ = require("jquery");
var ko = require("knockout");
var kojqui = require("knockout-jqueryui"); // just for the widget plugins
var templateConverter = require("./converter/main.js");
var console = require("console");
var initializeViewmodel = require("./viewmodel.js");
var templateSystem = require('./bindings/choose-template.js');

// call a given method on every plugin implementing it.
// supports a "reverse" parameter to call the methods from the last one to the first one.
var pluginsCall = function(plugins, methodName, args, reverse) {
  var start, end, diff, res, results;
  results = [];
  if (typeof reverse !== 'undefined' && reverse) {
    start = plugins.length - 1;
    end = 0;
    diff = -1;
  } else {
    start = 0;
    end = plugins.length - 1;
    diff = 1;
  }
  for (var i = start; i != end + diff; i += diff) {
    if (typeof plugins[i][methodName] !== 'undefined') {
      res = plugins[i][methodName].apply(plugins[i], args);
      if (typeof res !== 'undefined') results.push(res);
    }
  }
  return results;
};

// workaround for knockout-jqueryui's buttonset/button disposal:
// https://github.com/gvas/knockout-jqueryui/issues/25
var origDisposeCallback = ko.utils.domNodeDisposal.addDisposeCallback;
ko.utils.domNodeDisposal.addDisposeCallback = function(node, callback) {
  var newCallback = function(node) {
    try {
      callback(node);
    } catch (e) {
      console.warn("Caught unexpected dispose callback exception", e);
    }
  };
  origDisposeCallback(node, newCallback);
};

var bindingPluginMaker = function(performanceAwareCaller) {
  return {
    viewModel: function(viewModel) {
      try {
        performanceAwareCaller('applyBindings', ko.applyBindings.bind(undefined, viewModel));
      } catch (err) {
        console.warn(err, err.stack);
        throw err;
      }
    },
    dispose: function() {
      try {
        performanceAwareCaller('unapplyBindings', ko.cleanNode.bind(this, global.document.body));
      } catch (err) {
        console.warn(err, err.stack);
        throw err;
      }
    }
  };
};

var templateCreator = function(templatePlugin, htmlOrElement, optionalName, templateMode) {
  var tmpName = optionalName;
  if (typeof optionalName != 'undefined' && typeof templateMode != 'undefined') {
    if (typeof htmlOrElement != 'object' || htmlOrElement.tagName.toLowerCase() != 'replacedhtml') tmpName += '-' + templateMode;
  }

  while (typeof tmpName == 'undefined' || tmpName === null || templatePlugin.exists(tmpName)) {
    tmpName = 'anonymous-' + Math.floor((Math.random() * 100000) + 1);
  }

  if (typeof htmlOrElement == 'object' && htmlOrElement.tagName.toLowerCase() == 'replacedhtml') {
    var $el = $(htmlOrElement);
    var $head = $('replacedhead', $el);
    var $body = $('replacedbody', $el);
    templatePlugin.adder(tmpName + '-head', $head.html() || '');
    templatePlugin.adder(tmpName + '-show', $body.html() || '');
    templatePlugin.adder(tmpName + '-preview', $el.html());
    templatePlugin.adder(tmpName + '-wysiwyg', $el.html());

    // $head.attr('data-bind', 'block: content');
    $head.children().detach();
    $head.html("<!-- ko block: content --><!-- /ko -->");
    $head.before('<!-- ko withProperties: { templateMode: \'head\' } -->');
    $head.after('<!-- /ko -->');
    $body.html("<!-- ko block: content --><!-- /ko -->");

    templatePlugin.adder(tmpName + '-iframe', $el[0].outerHTML);

  } else if (typeof htmlOrElement == 'object') {
    templatePlugin.adder(tmpName, htmlOrElement.outerHTML);
  } else {
    templatePlugin.adder(tmpName, htmlOrElement);
  }

  return tmpName;
};

// Adapter to transform "viewModel plugins" into more generic plugins.
function _viewModelPluginInstance(pluginFunction) {
  var instance;
  return {
    viewModel: function(viewModel) {
      instance = pluginFunction(viewModel);
    },
    init: function() {
      if (typeof instance !== 'undefined' && typeof instance.init !== 'undefined') instance.init();
    },
    dispose: function() {
      if (typeof instance !== 'undefined' && typeof instance.dispose !== 'undefined') instance.dispose();
    }
  };
}

var _templateUrlConverter = function(basePath, url) {
  if (!url.match(/^[^\/]*:/) && !url.match(/^\//) && !url.match(/^\[/) && !url.match(/^#?$/)) {
    // TODO this could be smarter joining the urls...
    return basePath + url;
  } else {
    return null;
  }
};

var templateLoader = function(performanceAwareCaller, templateFileName, templateMetadata, jsorjson, extensions, galleryUrl) {
  var templateFile = typeof templateFileName == 'string' ? templateFileName : templateMetadata.template;
  var templatePath = "./";
  var p = templateFile.lastIndexOf('/');
  if (p != -1) {
    templatePath = templateFile.substr(0, p + 1);
  }

  var templateUrlConverter = _templateUrlConverter.bind(undefined, templatePath);

  var metadata;
  if (typeof templateMetadata == 'undefined') {
    metadata = {
      template: templateFile,
      // TODO l10n?
      name: 'No name',
      created: Date.now()
    };
  } else {
    metadata = templateMetadata;
  }

  $.get(templateFile, function(templatecode) {
    var res = templateCompiler(performanceAwareCaller, templateUrlConverter, "template", templatecode, jsorjson, metadata, extensions, galleryUrl);
    res.init();
  });
};

var templateCompiler = function(performanceAwareCaller, templateUrlConverter, templateName, templatecode, jsorjson, metadata, extensions, galleryUrl) {
  // we strip content before <html> tag and after </html> because jquery doesn't parse it.
  // we'll keep it "raw" and use it in the preview/output methods.
  var res = templatecode.match(/^([\S\s]*)([<]html[^>]*>[\S\s]*<\/html>)([\S\s]*)$/i);
  if (res === null) throw "Unable to find <html> opening and closing tags in the template";
  var prefix = res[1];
  // we parse the html content after replacing the tag name for html/head/body so to avoid jquery issues in parsing.
  var basicStructure = { '<html': 0, '<head': 0, '<body': 0, '</html': 0, '</body': 0, '</head': 0 };
  var html = res[2].replace(/(<\/?)(html|head|body)([^>]*>)/gi, function(match, p1, p2, p3) {
    basicStructure[(p1+p2).toLowerCase()] += 1;
    return p1 + 'replaced' + p2 + p3;
  });
  for (var ele in basicStructure) if (basicStructure.hasOwnProperty(ele)) if (basicStructure[ele] != 1) {
    if (basicStructure[ele] === 0) throw "ERROR: missing mandatory element "+ele+">";
    if (basicStructure[ele] > 1) throw "ERROR: multiple element "+ele+"> occourences are not supported (found "+basicStructure[ele]+" occourences)";
  }
  var postfix = res[3];
  var blockDefs = [];
  var enableUndo = true;
  var enableRecorder = true;
  var baseThreshold = '+$root.contentListeners()';

  var plugins = [];

  if (typeof extensions !== 'undefined') {
    for (var i = 0; i < extensions.length; i++) {
      if (typeof extensions[i] == 'function') {
        plugins.push(_viewModelPluginInstance(extensions[i]));
      } else {
        plugins.push(extensions[i]);
      }
    }
  }

  var createdTemplates = [];
  var templatesPlugin = {
    adder: function(id, html) {
      if (typeof html !== 'string') throw "Template system: cannot create new template " + id;
      var trash = html.match(/(data)?-ko-[^ =:]*/g);
      if (trash) {
        console.error("ERROR: found unexpected -ko- attribute in compiled template", id, ", you probably mispelled it:", trash);
      }
      templateSystem.addTemplate(id, html);
      createdTemplates.push(id);
    },
    exists: function(id) {
      var el = templateSystem.getTemplateContent(id);
      if (typeof el !== 'undefined') return true;
      else return false;
    },
    dispose: function() {
      for (var i = createdTemplates.length - 1; i >= 0; i--) {
        templateSystem.removeTemplate(createdTemplates[i]);
      }
    }
  };

  ko.bindingHandlers['block'].templateExists = templatesPlugin.exists;

  // templatecreator tracks created template (via templateAdder) so to be able to dispose them later
  var myTemplateCreator = templateCreator.bind(undefined, templatesPlugin);

  // first pass: we "compile" the template into a termplateDef object
  var templateDef = performanceAwareCaller('translateTemplate', templateConverter.translateTemplate.bind(undefined, templateName, html, templateUrlConverter, myTemplateCreator));

  // second pass: given the templateDef we create a base content model object for this template.
  var content = performanceAwareCaller('generateModel', templateConverter.wrappedResultModel.bind(undefined, templateDef));

  // third pass: we create "style/content editors" for every block
  var widgets = {};
  var widgetPlugins = pluginsCall(plugins, 'widget', [$, ko, kojqui]);
  for (var wi = 0; wi < widgetPlugins.length; wi++) {
    widgets[widgetPlugins[wi].widget] = widgetPlugins[wi];
  }
  blockDefs.push.apply(blockDefs, performanceAwareCaller('generateEditors', templateConverter.generateEditors.bind(undefined, templateDef, widgets, templateUrlConverter, myTemplateCreator, baseThreshold)));

  var incompatibleTemplate = false;
  if (typeof jsorjson !== 'undefined' && jsorjson !== null) {
    var unwrapped;
    if (typeof jsorjson == 'string') {
      unwrapped = ko.utils.parseJson(jsorjson);
    } else {
      unwrapped = jsorjson;
    }

    // we run a basic compatibility check between the content-model we expect and the initialization model
    var checkModelRes = performanceAwareCaller('checkModel', templateConverter.checkModel.bind(undefined, content._unwrap(), blockDefs, unwrapped));
    // if checkModelRes is 1 then the model is not fully compatible but we fixed it
    if (checkModelRes == 2) {
      console.error("Trying to compile an incompatible template version!", content._unwrap(), blockDefs, unwrapped);
      incompatibleTemplate = true;
    }

    try {
      content._wrap(unwrapped);
    } catch (ex) {
      console.error("Unable to inject model content!", ex);
      incompatibleTemplate = true;
    }
  }

  // This build the template for the preview/output, but concatenating prefix, template and content and stripping the "replaced" prefix added to "problematic" tag (html/head/body)
  var iframeTpl = prefix + templateSystem.getTemplateContent(templateName + '-iframe').replace(/(<\/?)replaced(html|head|body)([^>]*>)/gi, function(match, p1, p2, p3) {
    return p1 + p2 + p3;
  }) + postfix;

  // store this so to restore it on disposale
  var origiFrameTpl = ko.bindingHandlers.bindIframe.tpl;
  ko.bindingHandlers.bindIframe.tpl = iframeTpl;
  var iFramePlugin = {
    dispose: function() {
      ko.bindingHandlers.bindIframe.tpl = origiFrameTpl;
    }
  };

  plugins.push(iFramePlugin);
  plugins.push(templatesPlugin);

  // initialize the viewModel object based on the content model.
  var viewModel = performanceAwareCaller('initializeViewmodel', initializeViewmodel.bind(this, content, blockDefs, templateUrlConverter, galleryUrl));

  viewModel.metadata = metadata;
  // let's run some version check on template and editor used to build the model being loaded.
  var editver = '0.16.0';
  if (typeof viewModel.metadata.editorversion !== 'undefined' && viewModel.metadata.editorversion !== editver) {
    console.warn("The model being loaded has been created with an older editor version", viewModel.metadata.editorversion, "vs", editver);
  }
  viewModel.metadata.editorversion = editver;

  if (typeof templateDef.version !== 'undefined') {
    if (typeof viewModel.metadata.templateversion !== 'undefined' && viewModel.metadata.templateversion !== templateDef.version) {
      console.error("The model being loaded has been created with a different template version", templateDef.version, "vs", viewModel.metadata.templateversion);
    }
    viewModel.metadata.templateversion = templateDef.version;
  }

  templateSystem.init();

  // everything's ready, start knockout bindings.
  plugins.push(bindingPluginMaker(performanceAwareCaller));

  pluginsCall(plugins, 'viewModel', [viewModel]);

  if (incompatibleTemplate) {
    $('#incompatible-template').dialog({
      modal: true,
      appendTo: '#mo-body',
      buttons: {
        Ok: function() {
          $(this).dialog("close");
        }
      }
    });
  }

  return {
    model: viewModel,
    init: function() {
      pluginsCall(plugins, 'init', undefined, true);
    },
    dispose: function() {
      pluginsCall(plugins, 'dispose', undefined, true);
    }
  };

};


var checkFeature = function(feature, func) {
  if (!func()) {
    console.warn("Missing feature", feature);
    throw "Missing feature " + feature;
  }
};

var isCompatible = function() {
  try {
    // window.msMatchMedia would match also IE9
    // IE9 wouldn't be so hard to support, but it doesn't worth it. (preview iframe and automatic scroll are 2 things not working in IE9)
    checkFeature('matchMedia', function() {
      return typeof global.matchMedia != 'undefined';
    });
    checkFeature('XMLHttpRequest 2', function() {
      return 'XMLHttpRequest' in global && 'withCredentials' in new global.XMLHttpRequest();
    });
    checkFeature('ES5 strict', function() {
      return function() { /* "use strict";*/
        return typeof this == 'undefined';
      }();
    });
    checkFeature('CSS borderRadius', function() {
      return typeof global.document.body.style['borderRadius'] != 'undefined';
    });
    checkFeature('CSS boxShadow', function() {
      return typeof global.document.body.style['boxShadow'] != 'undefined';
    });
    checkFeature('CSS boxSizing', function() {
      return typeof global.document.body.style['boxSizing'] != 'undefined';
    });
    checkFeature('CSS backgroundSize', function() {
      return typeof global.document.body.style['backgroundSize'] != 'undefined';
    });
    checkFeature('CSS backgroundOrigin', function() {
      return typeof global.document.body.style['backgroundOrigin'] != 'undefined';
    });
    checkBadBrowserExtensions();
    return true;
  } catch (exception) {
    return false;
  }
};

var checkBadBrowserExtensions = function() {
  var id = 'checkbadbrowsersframe';
  var origTpl = ko.bindingHandlers.bindIframe.tpl;
  ko.bindingHandlers.bindIframe.tpl = "<!DOCTYPE html>\r\n<html>\r\n<head><title>A</title>\r\n</head>\r\n<body><p style=\"color: blue\" align=\"right\" data-bind=\"style: { color: 'red' }\">B</p><div data-bind=\"text: content\"></div></body>\r\n</html>\r\n";
  $('body').append('<iframe id="' + id + '" data-bind="bindIframe: $data"></iframe>');
  var frameEl = global.document.getElementById(id);
  ko.applyBindings({ content: "dummy content" }, frameEl);
  // Obsolete method didn't work on IE11 when using "HTML5 doctype":
  // var docType = new XMLSerializer().serializeToString(global.document.doctype);
  var node = frameEl.contentWindow.document.doctype;
  var docType = "<!DOCTYPE " + node.name +
    (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '') +
    (!node.publicId && node.systemId ? ' SYSTEM' : '') +
    (node.systemId ? ' "' + node.systemId + '"' : '') + '>';
  var content = docType + "\n" + frameEl.contentWindow.document.documentElement.outerHTML;
  ko.cleanNode(frameEl);
  ko.removeNode(frameEl);
  ko.bindingHandlers.bindIframe.tpl = origTpl;

  var expected = "<!DOCTYPE html>\n<html><head><title>A</title>\n</head>\n<body><p align=\"right\" style=\"color: red;\" data-bind=\"style: { color: 'red' }\">B</p><div data-bind=\"text: content\">dummy content</div>\n\n</body></html>";
  var expected2 = "<!DOCTYPE html>\n<html><head><title>A</title>\n</head>\n<body><p style=\"color: red;\" data-bind=\"style: { color: 'red' }\" align=\"right\">B</p><div data-bind=\"text: content\">dummy content</div>\n\n</body></html>";
  var expected3 = "<!DOCTYPE html>\n<html><head><title>A</title>\n</head>\n<body><p style=\"color: red;\" align=\"right\" data-bind=\"style: { color: 'red' }\">B</p><div data-bind=\"text: content\">dummy content</div>\n\n</body></html>";
  if (expected !== content && expected2 !== content && expected3 !== content) {
    console.info("BadBrowser.FrameContentCheck", content.length, expected.length, expected2.length, expected3.length, content == expected, content == expected2, content == expected3);
    console.info(content);
    throw "Unexpected frame content. Misbehaving browser: "+content.length+"/"+expected.length+"/"+expected2.length+"/"+expected3.length;
  }
};

var fixPageEvents = function() {
  // This is global code to prevent dragging/dropping in the page where we don't deal with it.
  // IE8 doesn't have window.addEventListener, but doesn't support drag&drop too.
  if (global.addEventListener) {
    // prevent generic file droppping in the page
    global.addEventListener("drag", function(e) {
      // console.log("browser is using drag listener on window");
      e = e || global.event;
      e.preventDefault();
    }, false);
    global.addEventListener("dragstart", function(e) {
      // console.log("browser is using dragstart listener on window");
      e = e || global.event;
      e.preventDefault();
    }, false);
    global.addEventListener("dragover", function(e) {
      // this is called on mouse move on every supported browser.
      // console.log("browser is using dragover listener on window");
      e = e || global.event;
      e.preventDefault();
    }, false);
    global.addEventListener("drop", function(e) {
      // console.log("browser is using drop listener on window");
      e = e || global.event;
      e.preventDefault();
    }, false);
    global.document.body.addEventListener('drop', function(e) {
      // I browser supportati entrato tutti qui quando si droppa qualcosa sul body
      // console.log("browser is using drop listener on body tag");
      e.preventDefault();
    }, false);
  }
  if (global.document.ondragstart) {
    global.document.ondragstart = function() {
      // console.log("browser called ondragstart. return false!");
      return false;
    };
  }
};

module.exports = {
  compile: templateCompiler,
  load: templateLoader,
  isCompatible: isCompatible,
  fixPageEvents: fixPageEvents
};