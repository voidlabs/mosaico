"use strict";
var console = require("console");

// returns 0 if equal (0.0.x release), 1 with backward compatible additions (0.x.0 release), 2 on lost data or incompatible data (x.0.0 release)
var checkModel = function(reference, blocks, model, origPrefix, reverse) {
  var blocksObj, i, prefix;
  var valid = 0;
  if (typeof reverse == 'undefined') reverse = false;
  if (typeof blocks !== 'undefined' && typeof blocks.splice == 'function') {
    blocksObj = {};
    for (i = 0; i < blocks.length; i++) blocksObj[blocks[i].type] = blocks[i];
  } else {
    blocksObj = blocks;
  }
  for (var prop in reference)
    if (reference.hasOwnProperty(prop)) {
      prefix = typeof origPrefix !== 'undefined' ? origPrefix + "." + prop : prop;
      if (!model.hasOwnProperty(prop)) {
        if (reverse) {
          console.warn("WARN Property ", prefix, "found in model is not defined by template: removing it!");
          valid = Math.max(valid, 2);
          delete reference[prop];
        } else {
          console.log("INFO Property ", prefix, "missing in model, cloning from reference!");
          valid = Math.max(valid, 1);
          model[prop] = reference[prop];
        }
      } else if (typeof model[prop] != typeof reference[prop]) {
        // se sono di tipo diverso allora provo a vedere se l'altro, convertito di tipo mantiene un valore equivalente.
        if (model[prop] !== null && reference[prop] !== null) {
          if (typeof model[prop] == 'string') {
            if (String(reference[prop]) != reference[prop]) {
              console.log("TODO Different type 1 ", prefix, typeof model[prop], typeof reference[prop], model[prop], reference[prop]);
              valid = Math.max(valid, 2);
            }
          } else if (typeof model[prop] == 'number') {
            if (Number(reference[prop]) != reference[prop]) {
              console.log("TODO Different type 2 ", prefix, typeof model[prop], typeof reference[prop], model[prop], reference[prop]);
              valid = Math.max(valid, 2);
            }
          } else {
            console.log("TODO Different type 3 ", prefix, typeof model[prop], typeof reference[prop], model[prop], reference[prop]);
            valid = Math.max(valid, 2);
          }
        }
      } else if (typeof reference[prop] == 'object') {
        if (reference[prop] !== null) {
          if (typeof reference[prop].splice !== 'undefined') {
            if (reference[prop].length > 0) {
              if (model[prop].length > 0) {
                // TODO needs sorting?
                var j = 0;
                for (i = 0; i < model[prop].length; i++) {
                  if (typeof model[prop][i].type == 'string') {
                    while (j < reference[prop].length && reference[prop][j].type !== model[prop][i].type) {
                      console.log("ignoring ", prefix, reference[prop][j].type, " block type in reference not found in model");
                      j++;
                    }
                    if (j >= reference[prop].length) {
                      console.log("WARN cannot find ", prefix, model[prop][i].type, " block in reference");
                      valid = Math.max(valid, 2);
                      break;
                    }
                    // reverse condition so to skip "deep traversing" on error
                    valid = Math.max(valid, checkModel(reference[prop][j], undefined, model[prop][i], prefix + "[" + i + "." + model[prop][i].type + "]"));
                  }
                }
              } else {
                // in the case of different array we check blocks
                for (i = 0; i < reference[prop].length; i++) {
                  if (typeof reference[prop][i].type !== 'string') {
                    console.log("TODO found an object with no type", prefix, reference[prop][i]);
                    valid = Math.max(valid, 2);
                  } else if (!blocksObj.hasOwnProperty(reference[prop][i].type)) {
                    console.warn("TODO the model uses a block type not defined by the template. REMOVING IT!!", prefix, reference[prop][i]);
                    reference[prop].splice(i, 1);
                    i--;
                    valid = Math.max(valid, 2);
                  } else {
                    valid = Math.max(valid, checkModel(blocksObj[reference[prop][i].type], blocksObj, reference[prop][i], prefix + "[" + i + "." + reference[prop][i].type + "]"));
                  }
                }
              }
            }
          } else {
            if (model[prop] === null) {
              if (reverse) {
                console.log("WARN Null object in model ", prefix, "instead of", reference[prop], "deleting it");
                valid = Math.max(valid, 2);
                delete reference[prop];
              } else {
                console.log("INFO Null object in model ", prefix, "instead of", reference[prop], "cloning it from the reference");
                valid = Math.max(valid, 1);
                model[prop] = reference[prop];
              }
            } else {
              valid = Math.max(valid, checkModel(reference[prop], blocksObj, model[prop], prefix, reverse));
            }
          }
        } else if (model[prop] !== null) {
          console.log("TODO Null in reference but not null in model", prefix, model[prop]);
          valid = Math.max(valid, 2);
        }
      } else if (typeof reference[prop] !== 'string' && typeof reference[prop] !== 'boolean' && typeof reference[prop] !== 'number') {
        console.log("TODO unsupported type", prefix, typeof reference[prop]);
        valid = Math.max(valid, 2);
      }

    }
  if (!reverse) valid = Math.max(valid, checkModel(model, blocksObj, reference, typeof origPrefix !== 'undefined' ? origPrefix + "!R" : "!R", true));
  return valid;
};

module.exports = checkModel;