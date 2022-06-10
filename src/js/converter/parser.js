"use strict";
/* global global: false */

var $ = require("jquery");
var console = require("console");
var declarations = require("./declarations.js");
var processStylesheetRules = require("./stylesheet.js");
var modelDef = require("./model.js");
var domutils = require("./domutils.js");
var addSlashes = require('./utils.js').addSlashes;

var domutilsSetOrAppendDataBind = function (element, newBinding) {
  var currentBindings = domutils.getAttribute(element, 'data-bind');
  var dataBind = (currentBindings !== null ? currentBindings + ", " : "") + newBinding;
  domutils.setAttribute(element, 'data-bind', dataBind);
};

var wrapElementWithCondition = function(attribute, element, bindingProvider) {
  var cond = domutils.getAttribute(element, attribute);

  try {
    var binding = declarations.conditionBinding(cond, bindingProvider);
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

var processStyleAttribute = function(element, templateUrlConverter, bindingProvider) {
  var style = domutils.getAttribute(element, 'replacedstyle');

  var removeDisplayNone = domutils.getAttribute(element, 'data-ko-display') !== null;

  var newStyle = declarations.elaborateElementStyleDeclarations(style, templateUrlConverter, bindingProvider, element, removeDisplayNone);

  if (newStyle !== style) {
    // in case there are no bindings we keep replacedstyle to be used by IE during output
    // otherwise I remove it because it will be overwritten by virtualAttrStyle binding.
    // TODO maybe we better use different names for "replaced" used during template conversion
    // and the ones used to create the output.
    domutils.removeAttribute(element, 'replacedstyle');
  }

  if (newStyle.trim().length > 0) {
    domutils.setAttribute(element, 'style', newStyle);
  } else domutils.removeAttribute(element, 'style');
};


// TODO fixing URLs is also needed where styles uses path (e.g: background-image, @import)
var _fixRelativePath = function(attribute, templateUrlConverter, index, element) {
  var url = domutils.getAttribute(element, attribute);
  var newUrl = templateUrlConverter(url);
  if (newUrl !== null) {
    domutils.setAttribute(element, attribute, newUrl);
  }
};


var processBlock = function(element, defs, themeUpdater, blockPusher, templateUrlConverter, contextName, rootModelName, containerName, templateCreator, addId) {

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
    // Use bind so to not define functions in a loop (jshint)
    var func = _fixRelativePath.bind(undefined, urlattrs[i], templateUrlConverter);
    $('[' + urlattrs[i] + ']', element).each(func);
  }

  var dataDefs = domutils.getAttribute(element, 'data-ko-properties');
  if (dataDefs === null) dataDefs = "";
  else domutils.removeAttribute(element, 'data-ko-properties');
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
        // template have been created, let's empty the source content.
        domutils.setContent(element, '');
      } else {
        // remove empty styles blocks
        domutils.removeElements($(element));
      }
    }
  });

  if (addId) domutilsSetOrAppendDataBind(element, 'attr: { id: id }');

  if (domutils.getAttribute(element, 'replacedstyle') !== null) {
    processStyleAttribute(element, templateUrlConverter, bindingProvider);
  }

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

  // should be only used on resizable items, like TD.
  $("[data-ko-height]", element).each(function(index, element) {
    var heightVar = domutils.getAttribute(element, 'data-ko-height');
    // we expect defaults for the variable used in data-ko-height to be set via properties 
    // in -ko-support or via data-ko-properties or any other mean, as we can't magically
    // detect a default
    var bindingValue = bindingProvider(heightVar);

    var resizableOptions = '';
    if (typeof defs[bindingValue] !== 'undefined' && typeof defs[bindingValue]._min !== 'undefined') resizableOptions += ', minHeight: '+defs[bindingValue]._min;
    if (typeof defs[bindingValue] !== 'undefined' && typeof defs[bindingValue]._max !== 'undefined') resizableOptions += ', maxHeight: '+defs[bindingValue]._max;

    var resizingBinding = "syncedhoverclass: { ref: " + bindingValue + ", class: 'resizing-hover' }, extresizable: { data: " + bindingValue + ", options: { handles: 's'" + resizableOptions + ", resizing: $root.resizing } }, attr: { 'data-size': ko.utils.unwrapObservable(" + bindingValue + ")+'px' } ";

    var resizingDiv = $('<div class="ui-resizing-div" data-ko-wrap="false" style="width: 100%; height: 100%"></div>')[0];
    domutils.setAttribute(resizingDiv, 'data-bind', resizingBinding);
    $(element).append(resizingDiv);

    var newBinding = "wysiwygCss: { 'ui-resizable-container': true }";
    domutilsSetOrAppendDataBind(element, newBinding);
    domutils.removeAttribute(element, 'data-ko-height');
  });

  $("[replacedstyle]", element).each(function(index, element) {
    processStyleAttribute(element, templateUrlConverter, bindingProvider);
  });

  // We don't want in html code otherwise IE11 will strip the whole tag from the html (see #557)
  // This means that while editing/previewing we are disabling any effect provided by those tags
  // E.g: if a template declares a charset different than UTF-8 mosaico is not able to correclty
  // edit it as it will add the content to its own main iframe.
  // Also note that in the development environment Express will add an UTF-8 charset to every
  // html request, so even if a template declared a different charset, Express would overwrite it.
  $("[replacedhttp-equiv]", element).each(function(index, element) {
    // replacedAttributes(element, "http-equiv");
  });

  $("[data-ko-display]", element).each(function(index, element) {
    wrapElementWithCondition('data-ko-display', element, bindingProvider);
  });

  $("[data-ko-editable]", element).each(function(index, element) {
    var newBinding, defaultValue, model, dataBind, itemBindValue;

    var dataEditable = domutils.getAttribute(element, "data-ko-editable");

    // TODO add validation of the editable

    if (domutils.getLowerTagName(element) != 'img') {


      defaultValue = domutils.getInnerHtml(element);
      var modelBindValue = bindingProvider(dataEditable, defaultValue, true, 'wysiwyg');
      newBinding = "";

      if (!domutils.getAttribute(element, "id")) {
        newBinding += "wysiwygId: id()+'_" + dataEditable.replace('.', '_') + "', ";
      }

      // item selection
      if (dataEditable.lastIndexOf('.') > 0) {
        itemBindValue = bindingProvider(dataEditable.substr(0, dataEditable.lastIndexOf('.')));
      } else {
        itemBindValue = modelBindValue;
      }
      newBinding += "wysiwygClick: function(obj, evt) { $root.selectItem(" + itemBindValue + ", $data); return false }, clickBubble: false, wysiwygCss: { selecteditem: $root.isSelectedItem(" + itemBindValue + ") }, scrollIntoView: $root.isSelectedItem(" + itemBindValue + "), ";

      newBinding += "wysiwygOrHtml: " + modelBindValue;

      var lowerTagName = domutils.getLowerTagName(element);

      var editorStyle = domutils.getAttribute(element, 'data-ko-editor-style');
      if (editorStyle) {
        domutils.removeAttribute(element, 'data-ko-editor-style');
      } else if (lowerTagName == 'div' || lowerTagName == 'td') {
        editorStyle = 'multiline';
      } else {
        editorStyle = 'singleline';
      }

      newBinding += ", wysiwygStyle: '"+editorStyle+"'";

      // 2022-05-04: we now always use a wrapping DIV for every element (but a DIV).
      // In past we only used the wrapping div for td elements (because it didn't work in IE10-IE11)
      // https://github.com/voidlabs/mosaico/issues/11
      // but we found that every element but divs have contenteditable/tinymce issues.
      // We stuck to tinymce 4.5.x for long time because of tinymce issue with editing spans.
      if (lowerTagName !== 'div') {
        var wrappingDivAttrs = editorStyle == 'singleline' ? 
          ' style="display: inline-block;"' : 
          ' style="width: 100%; height: 100%"';
        var wrappingDiv = $('<div class="mo-editor-wrapper" data-ko-wrap="false"'+wrappingDivAttrs+'></div>')[0];
        domutils.setAttribute(wrappingDiv, 'data-bind', newBinding);
        var newContent = domutils.getInnerHtml($('<div></div>').append(wrappingDiv));
        domutils.setContent(element, newContent);
      } else {
        domutilsSetOrAppendDataBind(element, newBinding);
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

      var currentBindings = domutils.getAttribute(element, 'data-bind');

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

      var placeholdersrc;
      var plheight = height || domutils.getAttribute(element, 'data-ko-placeholder-height');
      var plwidth = width || domutils.getAttribute(element, 'data-ko-placeholder-width');

      domutils.removeAttribute(element, 'src');
      domutils.removeAttribute(element, 'data-ko-editable');
      domutils.removeAttribute(element, 'data-ko-placeholder-height');
      domutils.removeAttribute(element, 'data-ko-placeholder-width');
      domutils.removeAttribute(element, 'data-ko-placeholder-src');

      if (defaultValue) {
        placeholdersrc = "{ width: " + plwidth + ", height: " + plheight + " }";
      }

      if (!plwidth || !plheight) {
        // TODO raise an exception?
        console.error("IMG data-ko-editable must declare width and height attributes, or their placeholder counterparts data-ko-placeholder-width/data-ko-placeholder-height", element);
        throw "ERROR: IMG data-ko-editable MUST declare width and height attributes, or their placeholder counterparts data-ko-placeholder-width/data-ko-placeholder-height";
      }

      var bindingValue = bindingProvider(dataEditable, value, false, 'wysiwyg');
      newBinding = "wysiwygSrc: { width: " + width + ", height: " + height + ", src: " + bindingValue + ", placeholder: " + placeholdersrc + " }";
      domutilsSetOrAppendDataBind(element, newBinding);

      var tmplName = templateCreator(element);

      var containerBind = '{ width: ' + width;
      if (align == 'left') containerBind += ', float: \'left\'';
      else if (align == 'right') containerBind += ', float: \'right\'';
      // else if (align == 'center') if (typeof console.debug == 'function') console.debug('Ignoring align=center on an img tag: we don\'t know how to emulate this alignment in the editor!');
      else if (align == 'top') containerBind += ', verticalAlign: \'top\'';
      else if (align == 'middle') containerBind += ', verticalAlign: \'middle\'';
      else if (align == 'bottom') containerBind += ', verticalAlign: \'bottom\'';
      containerBind += '}';

      if (dataEditable.lastIndexOf('.') > 0) {
        itemBindValue = bindingProvider(dataEditable.substr(0, dataEditable.lastIndexOf('.')));
      } else {
        itemBindValue = bindingValue;
      }

      // TODO maybe we could use ko let to add variables and ko template to use a simple template based on the current status.
      // $(element).before('<!-- ko let: { _data: $data, _item: ' + itemBindValue + ', _template: \'' + tmplName + '\', _src: ' + bindingValue + ', _width: ' + width + ', _height: ' + height + ', _align: ' + (align === null ? undefined : '\'' + align + '\'') + ', _method: ' + method + ', _stylebind: ' + containerBind + ' } -->'+
      //                   '<!-- ko template: { name: templateMode != \'undefined\' && templateMode == \'wysiwyg\' ? \'img-wysiwyg\' : \'' + tmplName + '\' } -->');
      // $(element).after('<!-- /ko --><!-- /ko -->');
      $(element).before('<!-- ko wysiwygImg: { _data: $data, _item: ' + itemBindValue + ', _template: \'' + tmplName + '\', _editTemplate: \'img-wysiwyg\', _src: ' + bindingValue + ', _width: ' + width + ', _height: ' + height + ', _align: ' + (align === null ? undefined : '\'' + align + '\'') + ', _method: ' + method + ', _stylebind: ' + containerBind + ' } -->');
      $(element).after('<!-- /ko -->');
    }

  });

  // Applied after the data-editable so to avoid processing hrefs for editable content
  $("[href]", element).each(function(index, element) {
    var attrValue = domutils.getAttribute(element, 'href');
    var newBinding = 'wysiwygHref: \'' + addSlashes(attrValue) + '\'';
    domutilsSetOrAppendDataBind(element, newBinding);
  });

  $("replacedblock", element).each(function(index, element) {
    var blockElement = fixedBlocks[index];

    var blockName = processBlock(blockElement, defs, themeUpdater, blockPusher, templateUrlConverter, 'block', templateName, containerName, templateCreator, true);
    // replaced blocks are defined in the model root
    var modelBindValue = modelDef.ensurePathAndGetBindValue(defs, themeUpdater, rootModelName, templateName, '', blockName);

    // this way we call block-wysiwyg or block-show and not directly the right block
    $(element).before('<!-- ko block: { data: ' + addSlashes(modelBindValue) + ', template: \'block\' } -->');
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

    var condBinding = declarations.conditionBinding(cond, bindingProvider);

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
           .replace(/<\/([A-Za-z:]+)>/g,'</cc><!-- cc:ac:$1 -->') // before/after close tag
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
  // Use parseHTML to avoid placing the dom in the docuemnt and prevent resources from being downloaded beforehand
  // This only works correctly when using jquery3 because previous versions of jQuery will not create a new document when passed a "context = false" argument.
  var content = typeof $.parseHTML == 'function' ? $($.parseHTML(replacedHtml, false)) : $(replacedHtml);
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
    domutilsSetOrAppendDataBind(element, 'block: ' + containerName);

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

  processBlock(element, defs, themeUpdater, _blockPusher, templateUrlConverter, 'template', templateName, undefined, templateCreator);

  var blockProcess = function(containerName, index, element) {
    processBlock(element, defs, themeUpdater, _blockPusher, templateUrlConverter, 'block', templateName, containerName, templateCreator, true);
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