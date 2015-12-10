"use strict";

var ko = require("knockout");
var console = require("console");

// @see also script-template.js pushTemplate
var addScriptTemplate = function(doc, templateName, templateMarkup) {
  var scriptTag = doc.createElement('script');
  scriptTag.setAttribute('type', 'text/html');
  scriptTag.setAttribute('id', templateName);
  scriptTag.text = templateMarkup;
  doc.body.appendChild(scriptTag);
  return scriptTag;
  // $('<script type="text/html"></sc' + 'ript>').text(templateMarkup).attr('id', templateName).appendTo($('body'));
};

// used for live preview in iframe.
ko.bindingHandlers.bindIframe = {
  // tpl will be overriden with the structure parsed by the input template.
  tpl: "<!DOCTYPE html>\r\n<html>\r\n<head>\r\n</head>\r\n<body><div data-bind=\"block: content\"></div></body>\r\n</html>\r\n",
  init: function(element, valueAccessor) {
    function bindIframe(local) {
      try {
        var iframe = element.contentDocument;
        iframe.open();
        iframe.write(ko.bindingHandlers.bindIframe.tpl);
        iframe.close();

        try {
          var iframedoc = iframe.body;
          if (iframedoc) {
            // scripts have to be duplicated (maybe this is not needed anymore since using string-templates)
            var templates = element.contentWindow.parent.document.getElementsByTagName('script');
            for (var i = 0; i < templates.length; i++) {
              if (templates[i].getAttribute('type') == 'text/html' && templates[i].getAttribute('id')) {
                addScriptTemplate(iframe, templates[i].getAttribute('id'), templates[i].innerHTML);
              }
            }

            var html = iframe.getElementsByTagName("HTML");

            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
              ko.cleanNode(html[0] || iframedoc);
            });

            ko.applyBindings(valueAccessor(), html[0] || iframedoc);
          } else {
            console.log("no iframedoc", local);
          }
        } catch (e) {
          console.log("error reading iframe.body", e, local);
          throw e;
        }
      } catch (e) {
        console.log("error reading iframe contentDocument", e, local);
        throw e;
        // ignored
      }
    }
    bindIframe("first call");
    // older browsers needed this
    // ko.utils.registerEventHandler(element, 'load', bindIframe);
  }
};