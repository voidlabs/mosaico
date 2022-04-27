;(function(factory) {
    if (typeof define === "function" && define.amd) {
        // AMD anonymous module
        define(["knockout", "jquery", "jquery-ui/ui/widgets/resizable"], factory);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS module
        var ko = require("knockout"),
            jQuery = require("jquery");
        require("jquery-ui/ui/widgets/resizable");
        factory(ko, jQuery);
    } else {
        // No module loader (plain <script> tag) - put directly in global namespace
        factory(window.ko, window.jQuery);
    }
})(function(ko, $) { 

    var unwrap = ko.utils.unwrapObservable;

    // Simple Resizable Implementation
    // binding that updates (function or observable)
    ko.bindingHandlers.extresizable = {
        init: function(element, valueAccessor, allBindingsAccessor, data, bindingContext) {
            var value = unwrap(valueAccessor()) || {},
                options = value.options || {},
                resizableOptions = ko.utils.extend({}, ko.bindingHandlers.extresizable.options),
                isEnabled = value.isEnabled !== undefined ? value.isEnabled : ko.bindingHandlers.extresizable.isEnabled;

            // TODO this is a Mosaico specific handling while this could be a very generic binding.
            var isWysiwygMode = (typeof bindingContext.templateMode != 'undefined' && bindingContext.templateMode == 'wysiwyg');

            if (isWysiwygMode) {

                //get reference to drop method
                value = "data" in value ? value.data : valueAccessor();


                // TODO questi devono venire da parametri
                options.minHeight = 2;
                options.maxHeight = 1000;
                options.autoHide = true;
                // options.helper = $("<div/>");
                // options.ghost = true;
                options.start = function(event, ui) {
                    console.log("start");
                    if (typeof options.resizing == 'function') options.resizing(true);
                    ko.utils.toggleDomNodeCssClass(element, "resizable-resizing", true); 
                    /*
                    rootEl.focus();
                    addMovingClass('handle');
                    originalOuterTop = cropModel.container.top;
                    originalMethod = getCurrentComputedSizes().method;
                    maxHeight = getScaledImageSize().height;
                    */
                };
                options.stop = function(event, ui) {
                    console.log("stop");
                    if (typeof options.resizing == 'function') options.resizing(false);
                    ko.utils.toggleDomNodeCssClass(element, "resizable-resizing", false); 
                    event.target.style.height = "auto";
                    // is this really needed?
                    event.preventDefault();
                    /*
                    removeMovingClass();
                    changed("resized");
                    */
                };
                options.resize = function(event, ui) {
                    console.log("resize", ui.size.height, ui.originalSize.height, value());
                    value(ui.size.height);
                    ui.size.height = value();
                };

                //override global options with override options passed in
                ko.utils.extend(resizableOptions, options);

                //initialize resizable
                $(element).resizable(resizableOptions);
                console.log(element, "resizable init");

                //handle enabling/disabling resizable
                if (isEnabled !== undefined) {
                    ko.computed({
                        read: function() {
                            $(element).resizable(unwrap(isEnabled) ? "enable": "disable");
                            console.log(element, "resizable enabled read");
                        },
                        disposeWhenNodeIsRemoved: element
                    });
                }

                //handle disposal
                ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                    $(element).resizable("destroy");
                    console.log(element, "resizable destroy");
                });

            }
        },
        options: {
        }
    }; 

});