// Knockout Fast Mapping v0.1
// License: MIT (http://www.opensource.org/licenses/mit-license.php)

(function (factory) {
        // Module systems magic dance.

        if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
                // CommonJS or Node: hard-coded dependency on "knockout"
                factory(require("knockout"), exports);
        } else if (typeof define === "function" && define["amd"]) {
                // AMD anonymous module with hard-coded dependency on "knockout"
                define(["knockout", "exports"], factory);
        } else {
                // <script> tag: use the global `ko` object, attaching a `wrap` property
                factory(ko, ko.wrap = {});
        }
}(function (ko, exports) {
    
    // this function mimics ko.mapping
    exports.fromJS = function(jsObject, computedFunctions, observableObjects)
    {
        reset();
        return wrap(jsObject, computedFunctions, observableObjects);
    };

    // this function unwraps the outer for assigning the result to an observable
    // see https://github.com/SteveSanderson/knockout/issues/517
    exports.updateFromJS = function(observable, jsObject, computedFunctions, observableObjects)
    {
        reset();
        return observable(ko.utils.unwrapObservable(wrap(jsObject, computedFunctions, observableObjects)));
    };

    exports.fromJSON = function (jsonString, computedFunctions, observableObjects) {
        var parsed = ko.utils.parseJson(jsonString);
        return exports.fromJS.apply(this, parsed, computedFunctions, observableObjects);
    };
    
    exports.toJS = function (observable) {
        return unwrap(observable);
    };

    exports.toJSON = function (observable) {
        var plainJavaScriptObject = exports.toJS(observable);
        return ko.utils.stringifyJson(plainJavaScriptObject);
    };

    function typeOf(value) {
        var s = typeof value;
        if (s === 'object') {
            if (value) {
                if (value.constructor == Date)
                    s = 'date';
                else if (Object.prototype.toString.call(value) == '[object Array]')
                    s = 'array';
            } else {
                s = 'null';
            }
        }
        return s;
    }

    // unwrapping
    function unwrapObject(o)
    {
        var t = {};

        for (var k in o)
        {
            var v = o[k];

            if (ko.isComputed(v))
                continue;

            t[k] = unwrap(v);
        }

        return t;
    }

    function unwrapArray(a)
    {
        var r = [];

        if (!a || a.length == 0)
            return r;
        
        for (var i = 0, l = a.length; i < l; ++i)
            r.push(unwrap(a[i]));

        return r;
    }

    function unwrap(v)
    {
        var isObservable = ko.isObservable(v);

        if (isObservable)
        {
            var val = v();

            return unwrap(val);
        }
        else
        {
            if (typeOf(v) == "array")
            {
                return unwrapArray(v);
            }
            else if (typeOf(v) == "object")
            {
                return unwrapObject(v);
            }
            else
            {
                return v;
            }
        }
    }

    function reset()
    {
        parents = [{obj: null, wrapped: null, lvl: ""}];
    }    
    
    // wrapping

    function wrapObject(o, computedFunctions, observableObjects)
    {
        // check for infinite recursion
        for (var i = 0; i < parents.length; ++i) {
            if (parents[i].obj === o) {
                return parents[i].wrapped;
            }
        }

        var t = {};

        for (var k in o)
        {
            var v = o[k];

            parents.push({obj: o, wrapped: t, lvl: currentLvl() + "/" + k});

            t[k] = wrap(v, computedFunctions, observableObjects);

            parents.pop();
        }

        if (computedFunctions && computedFunctions[currentLvl()])
            t = computedFunctions[currentLvl()](t);

        if (hasES5Plugin())
            ko.track(t);

        if (observableObjects) return ko.observable(t);
        return t;
    }

    function wrapArray(a, computedFunctions, observableObjects)
    {
        var r = ko.observableArray();

        if (!a || a.length == 0)
            return r;

        for (var i = 0, l = a.length; i < l; ++i)
            r.push(wrap(a[i], computedFunctions, observableObjects));

        return r;
    }

    // a stack, used for two purposes:
    //  - circular reference checking
    //  - computed functions
    var parents;

    function currentLvl()
    {
        return parents[parents.length-1].lvl;
    }

    function wrap(v, computedFunctions, observableObjects)
    {
        if (typeOf(v) == "array")
        {
            return wrapArray(v, computedFunctions, observableObjects);
        }
        else if (typeOf(v) == "object")
        {
            return wrapObject(v, computedFunctions, observableObjects);
        }
        else
        {
            if (!hasES5Plugin() && typeof v !== 'function')
            {
                var t = ko.observable();
                t(v);
                return t;
            } else
                return v;
        }
    }

    function hasES5Plugin()
    {
        return ko.track != null;
    }
}));
