"use strict";
/* global global: false */

var widgetPlugin = {
  widget: function($, ko, kojqui) {
    return {
      widget: 'url',
      html: function(propAccessor, onfocusbinding, parameters) {
        return '<div class="ui-textbutton">' +
        // <a class="ui-spinner-button ui-spinner-down ui-corner-br ui-button ui-widget ui-state-default ui-button-text-only" tabindex="-1" role="button"><span class="ui-button-text"><span class="ui-icon fa fa-fw caret-down">▼</span></span></a>
          '<input class="ui-textbutton-input" size="7" placeholder="https://..." type="url" pattern="(mailto:.+@.+|https?://.+\\..+|\\[.*\\].*)" value="nothing" data-bind="css: { withButton: typeof $root.linkDialog !== \'undefined\' }, validatedValue: ' + propAccessor + ', ' + onfocusbinding + '" />' + 
          '<a class="ui-textbutton-button" data-bind="visible: typeof $root.linkDialog !== \'undefined\', click: typeof $root.linkDialog !== \'undefined\' ? $root.linkDialog.bind($element.previousSibling) : false, button: { icons: { primary: \'fa fa-fw fa-ellipsis-h\' }, label: \'Opzioni\', text: false }">Opzioni</a>' +
          '</div>';
      }
    };
  },
};

module.exports = widgetPlugin;
