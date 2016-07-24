"use strict";
/* global global: false */

var $ = require("jquery");
var console = require("console");
var converterUtils = require("./utils.js");
var elaborateDeclarations = require("./declarations.js");
var processStylesheetRules = require("./stylesheet.js");
var modelDef = require("./model.js");
var domutils = require("./domutils.js");

var wrapElementWithCondition = function(attribute, element, bindingProvider) {
  var cond = domutils.getAttribute(element, attribute);

  try {
    var binding = converterUtils.conditionBinding(cond, bindingProvider);
    $(element).before('<!-- ko if: ' + binding + ' -->');
    $(element).after('<!-- /ko -->');
    domutils.removeAttribute(element, attribute);
  } catch (e) {
    console.warn("Model ensure path failed in if/variant", element, cond, attribute);
    throw e;
  }

};

var replacedAttributes = function(element, attributeName) {
  domutils.setAttribute(element, attributeName, domutils.getAttribute(element, "replaced" + attributeName));
};

var processStyle = function(element, templateUrlConverter, bindingProvider, addUniqueId) {
  var style = domutils.getAttribute(element, 'replacedstyle');
  var newStyle = null;
  var newBindings;
  if (addUniqueId) newBindings = {
    uniqueId: '$data',
    attr: {
      id: 'id'
    }
  };

  var removeDisplayNone = domutils.getAttribute(element, 'data-ko-display') !== null;

  newStyle = elaborateDeclarations(style, undefined, templateUrlConverter, bindingProvider, element, newBindings, removeDisplayNone);

  // only when using "replaced"
  if (newStyle === null) {
    newStyle = style;
  } else {
    // in case there are no bindings we keep replacedstyle to be used by IE during output
    // otherwise I remove it because it will be overwritten by virtualAttrStyle binding.
    // TODO maybe we better use different names for "replaced" used during template conversion
    // and the ones used to create the output.
    domutils.removeAttribute(element, 'replacedstyle');
  }

  if (newStyle !== null) {
    if (newStyle.trim().length > 0) {
      domutils.setAttribute(element, 'style', newStyle);
    } else domutils.removeAttribute(element, 'style');
  }
};


// TODO fixing URLs is also needed where styles uses path (e.g: background-image, @import)
var _fixRelativePath = function(attribute, templateUrlConverter, index, element) {
  var url = domutils.getAttribute(element, attribute);
  var newUrl = templateUrlConverter(url);
  if (newUrl !== null) {
    domutils.setAttribute(element, attribute, newUrl);
  }
};


var processBlock = function(element, defs, themeUpdater, blockPusher, templateUrlConverter, contextName, rootModelName, containerName, generateUniqueId, templateCreator) {

  try {

  var templateName;
  var variantName = '',
    variantDef = '';
  if (contextName == 'block') {
    templateName = domutils.getAttribute(element, 'data-ko-block');
    domutils.removeAttribute(element, 'data-ko-block');
  } else if (contextName == 'template') {
    templateName = rootModelName;
  } else {
    throw "Unexpected context name while processing block: " + contextName;
  }

  // console.log("processBlock", contextName, rootModelName, containerName, templateName);

  // Remove element
  $('[data-ko-remove]', element).remove();

  var fixedBlocks = $('[data-ko-block]', element).replaceWith('<replacedblock>');

  // Urls in these attributes needs "relativization"
  var urlattrs = ['href', 'src', 'data-ko-placeholder-src', 'background'];
  for (var i = 0; i < urlattrs.length; i++) {
    // faccio il bind per non definire funzioni in un loop (jshint)
    var func = _fixRelativePath.bind(undefined, urlattrs[i], templateUrlConverter);
    $('[' + urlattrs[i] + ']', element).each(func);
  }

  var dataDefs = domutils.getAttribute(element, 'data-ko-properties');
  if (dataDefs === null) dataDefs = "";
  $("[data-ko-properties]", element).each(function(index, element) {
    if (dataDefs.length > 0) dataDefs = dataDefs + " ";
    dataDefs = dataDefs + domutils.getAttribute(element, 'data-ko-properties');
    domutils.removeAttribute(element, 'data-ko-properties');
  });

  modelDef.createOrUpdateBlockDef(defs, templateName, dataDefs, { contextName: contextName });

  var bindingProvider = modelDef.ensurePathAndGetBindValue.bind(undefined, defs, themeUpdater, rootModelName, templateName, '');
  if (contextName == 'block') bindingProvider('id', '');

  $('style', element).each(function(index, element) {
    var style = domutils.getInnerHtml(element);

    var blockDefsUpdater = modelDef.createOrUpdateBlockDef.bind(undefined, defs);
    var localWithBindingProvider = modelDef.ensurePathAndGetBindValue.bind(undefined, defs, themeUpdater, rootModelName);
    var newStyle = processStylesheetRules(style, undefined, localWithBindingProvider, blockDefsUpdater, themeUpdater, templateUrlConverter, rootModelName, templateName);

    if (newStyle != style) {
      if (newStyle.trim() !== '') {
        var tmpName = templateCreator(newStyle);
        domutils.setAttribute(element, 'data-bind', 'template: { name: \'' + tmpName + '\' }');
        // ho creato il template quindi posso svuotare il sorgente.
        domutils.setContent(element, '');
      } else {
        // remove empty styles blocks
        domutils.removeElements($(element));
      }
    }
  });

  processStyle(element, templateUrlConverter, bindingProvider, generateUniqueId);

  // TODO href should be supported. data-ko-display and data-ko-wrap should never happen in here.
  var notsupported = ['data-ko-display', 'data-ko-editable', 'data-ko-wrap', 'href'];
  for (var j = 0; j < notsupported.length; j++) {
    var attr = domutils.getAttribute(element, notsupported[j]);
    if (attr) {
      console.warn("ERROR: Unsupported " + notsupported[j] + " used together with data-ko-block", element);
      throw "ERROR: Unsupported " + notsupported[j] + " used together with data-ko-block";
    }
  }

  // simply preprocessed as data-ko-wrap + -ko-attr-href
  $("[data-ko-link]", element).each(function(index, element) {
    var urlVar = domutils.getAttribute(element, 'data-ko-link');
    var repStyle = domutils.getAttribute(element, 'replacedstyle');
    if (typeof repStyle == 'undefined' || repStyle === null) repStyle = '';
    if (repStyle !== '') repStyle = '-ko-attr-href: @' + urlVar + "; " + repStyle;
    else repStyle = '-ko-attr-href: @' + urlVar;
    domutils.setAttribute(element, 'replacedstyle', repStyle);
    domutils.setAttribute(element, 'data-ko-wrap', urlVar);
    domutils.removeAttribute(element, 'data-ko-link');
  });

  $("[replacedstyle]", element).each(function(index, element) {
    processStyle(element, templateUrlConverter, bindingProvider, false);
  });

  $("[replacedhttp-equiv]", element).each(function(index, element) {
    replacedAttributes(element, "http-equiv");
  });

  $("[data-ko-display]", element).each(function(index, element) {
    wrapElementWithCondition('data-ko-display', element, bindingProvider);
  });

  $("[data-ko-editable]", element).each(function(index, element) {
    var newBinding, defaultValue, model, currentBindings, dataBind;


    var dataEditable = domutils.getAttribute(element, "data-ko-editable");

    // TODO add validation of the editable

    var itemBindValue;
    var selectBinding;
    if (dataEditable.lastIndexOf('.') > 0) {
      var subs = dataEditable.substr(0, dataEditable.lastIndexOf('.'));
      itemBindValue = bindingProvider(subs);
    } else {
      itemBindValue = bindingProvider(dataEditable);
    }
    selectBinding = "wysiwygClick: function(obj, evt) { $root.selectItem(" + itemBindValue + ", $data); return false }, clickBubble: false, wysiwygCss: { selecteditem: $root.isSelectedItem(" + itemBindValue + ") }, scrollIntoView: $root.isSelectedItem(" + itemBindValue + ")";

    if (domutils.getLowerTagName(element) != 'img') {


      defaultValue = domutils.getInnerHtml(element);
      var modelBindValue = bindingProvider(dataEditable, defaultValue, true, 'wysiwyg');
      newBinding = "";

      if (!domutils.getAttribute(element, "id")) {
        newBinding += "wysiwygId: id()+'_" + dataEditable.replace('.', '_') + "', ";
      }

      if (typeof selectBinding !== 'undefined') {
        newBinding += selectBinding + ", ";
      }

      newBinding += "wysiwygOrHtml: " + modelBindValue;

      if (domutils.getLowerTagName(element) == 'td') {
        var wrappingDiv = $('<div data-ko-wrap="false" style="width: 100%; height: 100%"></div>')[0];
        domutils.setAttribute(wrappingDiv, 'data-bind', newBinding);
        var newContent = domutils.getInnerHtml($('<div></div>').append(wrappingDiv));
        domutils.setContent(element, newContent);
      } else {
        currentBindings = domutils.getAttribute(element, 'data-bind');
        dataBind = (currentBindings !== null ? currentBindings + ", " : "") + newBinding;
        domutils.setAttribute(element, 'data-bind', dataBind);
        domutils.setContent(element, '');
      }
      domutils.removeAttribute(element, 'data-ko-editable');
    } else {
      var width = domutils.getAttribute(element, 'width');
      if (width === '') width = null;
      if (width === null) {
        console.error("ERROR: data-ko-editable images must declare a WIDTH attribute!", element);
        throw "ERROR: data-ko-editable images must declare a WIDTH attribute!";
      }
      var height = domutils.getAttribute(element, 'height');
      if (height === '') height = null;

      var align = domutils.getAttribute(element, 'align');

      currentBindings = domutils.getAttribute(element, 'data-bind');

      // TODO this is ugly... maybe a better strategy is to pass this around using "data-" attributes
      var dynHeight = currentBindings && currentBindings.match(/virtualAttr: {[^}]* height: ([^,}]*)[,}]/);
      if (dynHeight) height = dynHeight[1];
      var dynWidth = currentBindings && currentBindings.match(/virtualAttr: {[^}]* width: ([^,}]*)[,}]/);
      if (dynWidth) width = dynWidth[1];

      var method;

      defaultValue = domutils.getAttribute(element, 'data-ko-placeholder-src');
      // TODO make sure this default value is the same as the one checked by img-wysiwyg template.
      var value = '';
      if (defaultValue) {
        value = domutils.getAttribute(element, 'src');
      } else {
        defaultValue = domutils.getAttribute(element, 'src');
      }

      var size;
      if (width && height) {
        size = width + "+'x'+" + height;
      } else if (!height) {
        size = "'w'+" + width + "+''";
      } else if (!width) {
        size = "'h'+" + height + "+''";
      }
      var placeholdersrc;
      var plheight = height || domutils.getAttribute(element, 'data-ko-placeholder-height');
      var plwidth = width || domutils.getAttribute(element, 'data-ko-placeholder-width');

      domutils.removeAttribute(element, 'src');
      domutils.removeAttribute(element, 'data-ko-editable');
      domutils.removeAttribute(element, 'data-ko-placeholder-height');
      domutils.removeAttribute(element, 'data-ko-placeholder-width');
      domutils.removeAttribute(element, 'data-ko-placeholder-src');

      if (defaultValue) {
        placeholdersrc = "{ width: " + plwidth + ", height: " + plheight + ", text: " + size + "}";
      }

      if (!plwidth || !plheight) {
        // TODO raise an exception?
        console.error("IMG data-ko-editable must declare width and height attributes, or their placeholder counterparts data-ko-placeholder-width/data-ko-placeholder-height", element);
        throw "ERROR: IMG data-ko-editable MUST declare width and height attributes, or their placeholder counterparts data-ko-placeholder-width/data-ko-placeholder-height";
      }

      var bindingValue = bindingProvider(dataEditable, value, false, 'wysiwyg');
      newBinding = "wysiwygSrc: { width: " + width + ", height: " + height + ", src: " + bindingValue + ", placeholder: " + placeholdersrc + " }";
      dataBind = (currentBindings !== null ? currentBindings + ", " : "") + newBinding;
      domutils.setAttribute(element, 'data-bind', dataBind);

      var tmplName = templateCreator(element);

      var containerBind = '{ width: ' + width;
      if (align == 'left') containerBind += ', float: \'left\'';
      else if (align == 'right') containerBind += ', float: \'right\'';
      else if (align == 'center') console.log('non so cosa fa align=center su una img e quindi non so come simularne l\'editing');
      else if (align == 'top') containerBind += ', verticalAlign: \'top\'';
      else if (align == 'middle') containerBind += ', verticalAlign: \'middle\'';
      else if (align == 'bottom') containerBind += ', verticalAlign: \'bottom\'';
      containerBind += '}';

      $(element).before('<!-- ko wysiwygImg: { _data: $data, _item: ' + itemBindValue + ', _template: \'' + tmplName + '\', _editTemplate: \'img-wysiwyg\', _src: ' + bindingValue + ', _width: ' + width + ', _height: ' + height + ', _align: ' + (align === null ? undefined : '\'' + align + '\'') + ', _size: ' + size + ', _method: ' + method + ', _placeholdersrc: ' + placeholdersrc + ', _stylebind: ' + containerBind + ' } -->');
      $(element).after('<!-- /ko -->');
    }

  });

  // Applied after the data-editable so to avoid processing hrefs for editable content
  $("[href]", element).each(function(index, element) {
    var attrValue = domutils.getAttribute(element, 'href');
    var newBinding = 'wysiwygHref: \'' + converterUtils.addSlashes(attrValue) + '\'';
    var currentBindings = domutils.getAttribute(element, 'data-bind');
    var dataBind = (currentBindings !== null ? currentBindings + ", " : "") + newBinding;
    domutils.setAttribute(element, 'data-bind', dataBind);
  });

  $("replacedblock", element).each(function(index, element) {
    var blockElement = fixedBlocks[index];

    var blockName = processBlock(blockElement, defs, themeUpdater, blockPusher, templateUrlConverter, 'block', templateName, containerName, true, templateCreator);
    // replaced blocks are defined in the model root
    var modelBindValue = modelDef.ensurePathAndGetBindValue(defs, themeUpdater, rootModelName, templateName, '', blockName);

    // this way we call block-wysiwyg or block-show and not directly the right block
    $(element).before('<!-- ko block: { data: ' + converterUtils.addSlashes(modelBindValue) + ', template: \'block\' } -->');
    $(element).after('<!-- /ko -->');
    $(element).remove();
  });

  // TODO do we really need to loop in reverse order?
  // data-ko-wrap have to be processed at the end, expecially after "replaceblocks"
  // otherwise a data-ko-wrap wrapping a data-ko-block would break everything.
  $($("[data-ko-wrap]", element).get().reverse(), element).each(function(index, element) {
    var cond = domutils.getAttribute(element, 'data-ko-wrap');
    if (typeof cond === 'undefined' || cond === '' || cond === 'true') {
      throw "Unsupported empty value for data-ko-wrap: use false value if you want to always remove the tag";
    }

    var condBinding = converterUtils.conditionBinding(cond, bindingProvider);

    /*
          var condBinding = false;
          if (typeof cond === 'undefined' || cond === '') {
            throw "Unsupported empty value for data-ko-wrap: use false value if you want to always remove the tag";
          } else if (cond === 'false') {
            condBinding = false;
          } else if (cond === 'true') {
            throw "Unsupported true value for data-ko-wrap. This makes no sense: use false or a variable";
          } else {
            condBinding = bindingProvider(cond)+'()';
          }
    */

    var dataBind = domutils.getAttribute(element, 'data-bind');

    var innerTmplName, outerTmplName;
    // TODO ugly hardcoded handling: at the very least this should be invoked by the data-container caller.
    if (dataBind !== '' && dataBind !== null && dataBind.match(/(block|wysiwygOrHtml):/)) {
      // we can't put the content in a template because it will be overwritten by the binding
      var innerTmplContent = '<!-- ko ' + dataBind + ' -->' + domutils.getInnerHtml(element) + '<!-- /ko -->';
      innerTmplName = templateCreator(innerTmplContent);
      domutils.removeAttribute(element, 'data-ko-wrap');
      outerTmplName = templateCreator(element);
      domutils.replaceHtml(element, '<!-- ko template: /* special */ (typeof templateMode != \'undefined\' && templateMode == \'wysiwyg\') || ' + condBinding + ' ? \'' + outerTmplName + '\' : \'' + innerTmplName + '\' --><!-- /ko -->');
    } else {
      // we put the content in a template and the frame in another template including this one.
      innerTmplName = templateCreator(domutils.getInnerHtml(element));
      domutils.removeAttribute(element, 'data-ko-wrap');
      domutils.setContent(element, '<!-- ko template: \'' + innerTmplName + '\' --><!-- /ko -->');
      outerTmplName = templateCreator(element);
      domutils.replaceHtml(element, '<!-- ko template: (typeof templateMode != \'undefined\' && templateMode == \'wysiwyg\') || ' + condBinding + ' ? \'' + outerTmplName + '\' : \'' + innerTmplName + '\' --><!-- /ko -->');
    }

  });

  templateCreator(element, templateName, 'show');

  blockPusher(rootModelName, templateName, contextName, containerName);

  return templateName;

  } catch (e) {
    console.error("Exception while parsing the template", e, element);
    throw e;
  }

};

function conditional_replace(html) {
  return html.replace(/<!--\[if ([^\]]*)\]>((?:(?!--)[\s\S])*?)<!\[endif\]-->/g, function(match, condition, body) {
    var dd = '<!-- cc:start -->';
    dd += body.replace(/<([A-Za-z:]+)/g, '<!-- cc:bo:$1 --><cc') // before open tag
           .replace(/<\/([A-Za-z:]+)>/g,'<!-- cc:bc:$1 --></cc><!-- cc:ac:$1 -->') // before/after close tag
           .replace(/\/>/g,'/><!-- cc:sc -->'); // self-close tag
    dd += '<!-- cc:end -->';
    var output = '<replacedcc condition="'+condition+'" style="display: none">';
    output += $('<div>').append($(dd)).html()
      .replace(/^<!-- cc:start -->/, '')
      .replace(/<!-- cc:end -->$/, '');
    output += '</replacedcc>';
    return output;
  });
}


var translateTemplate = function(templateName, html, templateUrlConverter, templateCreator) {
  var defs = {};
  var replacedHtml = conditional_replace(html.replace(/(<[^>]+\s)(style|http-equiv)(="[^"]*"[^>]*>)/gi, function(match, p1, p2, p3) {
    return p1 + 'replaced' + p2 + p3;
  }));
  var content = $(replacedHtml);
  var element = content[0];

  var blocks = []; // {rootName, blockName, containerName}
  var _blockPusher = function(rootName, blockName, contextName, containerName) {
    blocks.push({
      root: rootName,
      block: blockName,
      context: contextName,
      container: containerName
    });
  };

  // TODO have to accept nulls as undefineds (because of model.js behaviour)
  var themeUpdater = function(name, key, val) {
    if (typeof defs['themes'] === 'undefined') defs['themes'] = {};
    if (typeof defs['themes'][name] === 'undefined') defs['themes'][name] = {};
    if (typeof defs['themes'][name][key] === 'undefined' || defs['themes'][name][key] === null) defs['themes'][name][key] = val;
    else if (typeof val !== 'undefined' && val !== null) {
      var precVal = defs['themes'][name][key];
      if (precVal != val) console.log("Error setting a new default for property " + key + " in theme " + name + ". old:" + precVal + " new:" + val + "!");
    }
  };

  var containers = $("[data-ko-container]", content);
  var containersDom = {};
  containers.each(function(index, element) {
    var containerName = domutils.getAttribute(element, 'data-ko-container') + "Blocks";

    domutils.removeAttribute(element, 'data-ko-container');
    domutils.setAttribute(element, 'data-bind', 'block: ' + containerName);

    var containerBlocks = $("> [data-ko-block]", element);
    domutils.removeElements(containerBlocks, true);

    containersDom[containerName] = containerBlocks;
  });

  // TODO remove hardcoded properties: we need them because without these loading a basic template fails.
  // Needed in order to use data-ko-block
  modelDef.createOrUpdateBlockDef(defs, 'id');
  // Needed always as it is the default theme section.
  modelDef.createOrUpdateBlockDef(defs, 'bodyTheme');
  // Needed for data-ko-container
  modelDef.createOrUpdateBlockDef(defs, 'blocks', 'blocks[]');

  // Needed if you want to use a text variable? TODO this should not be needed!
  modelDef.createOrUpdateBlockDef(defs, 'text');

  processBlock(element, defs, themeUpdater, _blockPusher, templateUrlConverter, 'template', templateName, undefined, false, templateCreator);

  var blockProcess = function(containerName, index, element) {
    processBlock(element, defs, themeUpdater, _blockPusher, templateUrlConverter, 'block', templateName, containerName, true, templateCreator);
  };

  for (var prop in containersDom)
    if (containersDom.hasOwnProperty(prop)) {
      var containerBlocks = containersDom[prop];
      var containerName = prop;

      modelDef.ensurePathAndGetBindValue(defs, themeUpdater, templateName, templateName, '', containerName + ".blocks", "[]");

      containerBlocks.each(blockProcess.bind(undefined, containerName));
    }

  var templateDef = {
    _defs: defs,
    templateName: templateName,
    _blocks: blocks
  };

  if (typeof defs[templateName]._version !== 'undefined') {
    templateDef.version = defs[templateName]._version;
  }

  return templateDef;
};


module.exports = translateTemplate;