"use strict";

var ko = require("knockout");
var reactor = require("knockoutjs-reactor");
var console = require("console");

/// <summary>
///     Track last "levels" changes within the chained observable down to any given level and
///     supports undoing/redoing the changes.
/// </summary>
/// <param name="options" type="object">
///     { levels: 2 } -> Remember only last "levels" changes<br/>
///     { undoLabel: "Undo it (#COUNT)!" } -> Define a label for the undo command. "#COUNT#" sequence will be replaced with the stack length.<br/>
///     { redoLabel: "Redo it (#COUNT)!" } -> Define a label for the redo command. "#COUNT#" sequence will be replaced with the stack length.<br/>
/// </param>
var undoManager = function (model, options) {
  var undoStack = ko.observableArray();
  var redoStack = ko.observableArray();
  var lastPushedStack;
  var STATE_DOING = 0;
  var STATE_UNDOING = 1;
  var STATE_REDOING = 2;
  var state = STATE_DOING;

  var MODE_NORMAL = 0; // add to stack every change
  var MODE_IGNORE = 1; // do not add anything to the stack
  var MODE_ONCE = 2; // only one sequential change for each property is added to the stack
  var MODE_MERGE = 3; // merge next change with the last one
  var mode = MODE_NORMAL;

  var defaultOptions = {
    levels: 100,
    undoLabel: "undo (#COUNT#)",
    redoLabel: "redo (#COUNT#)"
  };
  
  if (typeof options == 'object') {
    options = ko.utils.extend(defaultOptions, options);
  } else {
    options = defaultOptions;
  }

  var _push = function (action) {
    // durante UNDO/REDO lavoriamo sempre in normale
    if (state == STATE_UNDOING) {
      _pushInt(action, redoStack);
    } else if (state == STATE_REDOING) {
      _pushInt(action, undoStack);
    } else if (state == STATE_DOING) {
      _pushInt(action, undoStack);
      redoStack.removeAll();
    }
  };
  
  var _tryMerge = function (prev, newAction) {
    if (typeof prev.mergedAction !== 'undefined') {
      return prev.mergedAction(newAction);
    } else return null;
  };

  var _pushInt = function (action, myStack) {
    /* gestione del merge di azioni: se l'ultima azione nello stack ha un metodo "mergedAction"
       proviamo ad invocarlo e se ci restituisce una funzione la usiamo al posto di entrambe */
    // console.log("UR", "_pushInt", myStack().length > 0 ? typeof myStack()[myStack().length - 1].mergedAction : "EMPTY");
    if (myStack().length > 0) {
      var merged = _tryMerge(myStack()[myStack().length - 1], action);
      // console.log("UR", "_pushInt.merged", merged, "MV", typeof action.mergeableMove, "MA", typeof action.mergeableAction, "MM", typeof action.mergeMe);
      if (merged !== null) {
        myStack()[myStack().length - 1] = merged;
        return;
      }
    }
    if (myStack().length >= options.levels) myStack.shift();
    lastPushedStack = myStack;
    myStack.push(action);
  };
  
  var _xdoCommand = function(label, workState, stack) {
    return {
      name: ko.computed(function() {
        return ko.utils.unwrapObservable(label).replace(/#COUNT#/, stack().length);
      }),
      enabled: ko.computed(function() {
        return stack().length !== 0;
      }),
      execute: function() {
        var action = stack.pop();
        if (action) {
          var prevState = state;
          state = workState;
          var oldMode = mode;
          mode = MODE_MERGE;
          action();
          _removeMergedAction(lastPushedStack);
          mode = oldMode;
          state = prevState;
        }
        return true;
      }
    };
  };

  var _removeMergedAction = function(myStack) {
    if (typeof myStack == 'undefined') throw "Unexpected operation: stack cleaner called with undefined stack";
    
    if (myStack().length > 0 && typeof myStack()[myStack().length - 1].mergedAction !== 'undefined') {
      delete myStack()[myStack().length - 1].mergedAction;
    }
  };

  var _combinedFunction = function(first, second) {
    var res = (function(f1, f2) {
      f1();
      f2();
    }).bind(undefined, first, second);
    if (typeof first.mergedAction !== 'undefined') {
      res.mergedAction = first.mergedAction;
    }
    return res;
  };

  var executeUndoAction = function(child, value, item) {
    if (typeof value !== 'undefined') {
      child(value);
    } else if (item) {
      if (item.status !== 'added' && item.status !== 'deleted') throw "Unsupported item.status: "+item.status;

      // When the items are "moved" we do both delete and add on the "add" action and ignore the delete action
      if (typeof item.moved !== 'undefined') {
        if (item.status == 'added') {
          child.splice(item.index, 1);
          child.splice(item.moved, 0, item.value);
        } else {
          // console.log("Ignoring undo move", item);
        }
      } else {
        if (item.status == 'added') {
          child.splice(item.index, 1);
        } else {
          child.splice(item.index, 0, item.value);
        }
      }
    } else {
      throw "Unexpected condition: no item and no child.oldValues!";
    }
  };

  var makeUndoActionDefault = function(undoFunc, parents, child, oldVal, item) {
    return undoFunc.bind(undefined, child, oldVal, item);
  };

  var makeUndoAction = makeUndoActionDefault;

  var changePusher = function(parents, child, item) {
    var oldVal = typeof child.oldValues != 'undefined' ? child.oldValues[0] : undefined;
    var act = makeUndoAction(executeUndoAction, parents, child, oldVal, item);

    if (mode == MODE_IGNORE) return;

    if (mode == MODE_MERGE) {
      if (typeof act !== 'undefined') {
        act.mergedAction = function(newAction) {
          if (typeof newAction.mergeMe !== 'undefined' && newAction.mergeMe) {
            return _combinedFunction(newAction, this);
          } else return null;
        };
        act.mergeMe = true;
      }
    } else {
      if (typeof act !== 'undefined') {
        if (child.oldValues && mode == MODE_ONCE) {
          act.mergedAction = function(oldChild, oldItem, newAction) {
            if (typeof newAction.mergeableAction == 'object' && oldChild == newAction.mergeableAction.child) {
              return this;
            } else return null;
          }.bind(act, child, item);
          act.mergeableAction = { child: child, item: item };
        }

        // "item" is valued when an item is added/removed/reteined in an array
        // sometimes KO detect "moves" and add a "moved" property with the index but
        // this doesn't happen for example using knockout-sortable or when moving objects
        // between arrays.
        // So this ends up handling this with "mergeableMove" and "mergedAction": 
        if (item && (item.status == 'deleted' || item.status == 'added')) {

          // We do merge only if the first action is a delete (preparing for the add) or if it declares it is part of a move.
          if (item.status == 'deleted' || typeof item.moved !== 'undefined') {
            act.mergedAction = function(oldChild, oldItem, newAction) {
              // a deleted action is able to merge with a added action if they apply to the same
              // object.

              // we do the merge only for 2 different actions (deleted+added or viceversa) with moved property and moved-index property pointing each other
              if (typeof newAction.mergeableMove == 'object' && oldItem.value == newAction.mergeableMove.item.value && 
                ((typeof oldItem.moved == 'undefined' && typeof newAction.mergeableMove.item.moved == 'undefined') ||
                (typeof oldItem.moved !== 'undefined' && typeof newAction.mergeableMove.item.moved !== 'undefined' &&
                oldItem.moved == newAction.mergeableMove.item.index && oldItem.index == newAction.mergeableMove.item.moved)) &&
                oldItem.status !== newAction.mergeableMove.item.status) {
                // in this case I simply return a single action running both actions in sequence,
                // this way the "undo" will need to undo only once for a "move" operation.
                return _combinedFunction(newAction, this);
              } else {
              }

              return null;
            }.bind(act, child, item);
          }

          // add a mergeableMove property that will be used by the next action "mergedAction" to see if this action
          // can be merged.
          act.mergeableMove = { child: child, item: item };
        } else if (item) {
          console.warn("Unsupported item.status", item.status, typeof item, item);
        }
      }
    }
    if (typeof act !== 'undefined') _push(act);
  };

  var reactorOptions = { depth: -1, oldValues: 1, mutable: true, /* tagParentsWithName: true */ tagFields: true, async: false /*, splitArrayChanges: false */ };

  var context = {};
  var react = typeof reactor == 'function' ? reactor : ko.watch;
  var res = react(model, reactorOptions, changePusher, context);

  return {
    push: _push, 
    undoCommand: _xdoCommand(options.undoLabel, STATE_UNDOING, undoStack),
    redoCommand: _xdoCommand(options.redoLabel, STATE_REDOING, redoStack),
    reset: function() { undoStack.removeAll(); redoStack.removeAll(); },
    // setMode: function(newMode) { mode = newMode; _removeMergedAction(undoStack); },
    setModeOnce: function() { mode = MODE_ONCE; _removeMergedAction(undoStack); },
    setModeMerge: function() { mode = MODE_MERGE; _removeMergedAction(undoStack); },
    setModeNormal: function() { mode = MODE_NORMAL; _removeMergedAction(undoStack); },
    setModeIgnore: function() { mode = MODE_IGNORE; _removeMergedAction(undoStack); },
    setUndoActionMaker: function(maker) { makeUndoAction = maker; },
    dispose: function() { /* ko.unwatch(model, reactorOptions, changePusher); */ res.dispose(); }
  };
};

module.exports = undoManager;
