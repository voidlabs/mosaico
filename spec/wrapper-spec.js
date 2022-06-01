'use strict';
/* globals describe: false, it: false, expect: false */

describe('model wrapper and undomanager', function() {
  var fs = require('fs');
  var mockery = require('mockery');
  var console = require("console");

  var ko, main, undoManager, modelDef, undoserializer;

  beforeAll(function() {
    mockery.registerMock('knockoutjs-reactor', require('ko-reactor/dist/ko-reactor.js'));
    mockery.enable();
    mockery.registerAllowables(['../src/js/converter/declarations.js', './wrapper.js', 'console', './utils.js', './domutils.js', 'console', './cssparser.js', 'path', 'mkdirp', './model.js', 'jquery', 'knockout', 'ko-reactor/dist/ko-reactor.js', '../src/js/undomanager/undoserializer.js', '../src/js/undomanager/undomanager.js', '../src/js/converter/model.js', '../src/js/converter/main.js']);

    main = require('../src/js/converter/main.js');
    ko = require('knockout');
    undoserializer = require("../src/js/undomanager/undoserializer.js");
    undoManager = require('../src/js/undomanager/undomanager.js');
    modelDef = require('../src/js/converter/model.js');

  });

  beforeEach(function() {
    global.document = {
      lookedup: {},
      getElementById: function(id) {
        if (this.lookedup.hasOwnProperty(id)) return true;
        this.lookedup[id] = 1;
        return false;
      }
    }
  });

  afterEach(function() {
    delete global.document;
  });

  it('should not alter input object on push', function() {
    var templateDef = JSON.parse("" + fs.readFileSync("spec/data/template-versafix-1.def.json"));
    var content = main.wrappedResultModel(templateDef);
    var titleBlock = modelDef.generateModel(templateDef._defs, 'titleBlock');
    var originalDef = ko.toJSON(titleBlock);
    var blocks = content().mainBlocks().blocks;
    blocks.push(titleBlock);
    var newDef = ko.toJSON(titleBlock);
    expect(originalDef).toEqual(newDef);
  });

  it('should be able to load previous data and deal with variants', function() {

    var templateDef = JSON.parse("" + fs.readFileSync("spec/data/template-versafix-1.def.json"));
    var content = main.wrappedResultModel(templateDef);

    var savedModel = JSON.parse("" + fs.readFileSync("spec/data/template-versafix-1.save1.json"));
    content._plainObject(savedModel);

    // loaded correctly?
    expect(content().mainBlocks().blocks()[2]().titleText()).toEqual("My title");

    // able to switch to another variant
    expect(content().mainBlocks().blocks()[0]().externalBackgroundVisible()).toEqual(true);
    content().mainBlocks().blocks()[0]._nextVariant();
    expect(content().mainBlocks().blocks()[0]().externalBackgroundVisible()).toEqual(false);
  });

  it('should support undo/redo and full model replacement', function() {
    var templateDef = JSON.parse("" + fs.readFileSync("spec/data/template-versafix-1.def.json"));
    var content = main.wrappedResultModel(templateDef);

    var titleBlock = modelDef.generateModel(templateDef._defs, 'titleBlock');

    var jsonContent = ko.toJSON(content._plainObject());

    var undoRedoStack = undoManager(content, {
      levels: 100,
      undoLabel: ko.computed(function() { return "Undo (#COUNT#)"; }),
      redoLabel: ko.computed(function() { return "Redo"; })
    });

    undoRedoStack.setUndoActionMaker(undoserializer.makeUndoAction.bind(undefined, content));
    undoserializer.watchEnabled(true);
    undoRedoStack.setModeOnce();

    expect(content().titleText()).toEqual("TITLE");

    content().titleText('New Title 1');
    
    expect(content().titleText()).toEqual("New Title 1");

    undoRedoStack.undoCommand.execute();

    expect(content().titleText()).toEqual("TITLE");

    undoRedoStack.redoCommand.execute();

    expect(content().titleText()).toEqual("New Title 1");

    content().mainBlocks().blocks.push(titleBlock);

    var unwrapped = ko.utils.parseJson(jsonContent);
    content._plainObject(unwrapped);

    expect(content().titleText()).toEqual("TITLE");

    content().titleText('New Title 2');

    expect(content().titleText()).toEqual("New Title 2");

    undoRedoStack.undoCommand.execute();

    // This requires the "sync" option (async: false) of ko-reactor
    expect(content().titleText()).toEqual("TITLE");

    undoRedoStack.redoCommand.execute();

    expect(content().titleText()).toEqual("New Title 2");

    var unwrapped = ko.utils.parseJson(jsonContent);
    content._plainObject(unwrapped);

    expect(content().titleText()).toEqual("TITLE");

    // Fails on current code because the "undo" of a full content _plainObject doesn't wrap the previous model
    undoRedoStack.undoCommand.execute();

    expect(content().titleText()).toEqual("New Title 2");
  });

  it('should support undo/redo of move actions', function() {

    var templateDef = JSON.parse("" + fs.readFileSync("spec/data/template-versafix-1.def.json"));
    var content = main.wrappedResultModel(templateDef);

    var titleBlock1 = modelDef.generateModel(templateDef._defs, 'titleBlock');
    var titleBlock2 = modelDef.generateModel(templateDef._defs, 'titleBlock');
    var titleBlock3 = modelDef.generateModel(templateDef._defs, 'titleBlock');

    var jsonContent = ko.toJSON(content._plainObject());

    var undoRedoStack = undoManager(content, {
      levels: 100,
      undoLabel: ko.computed(function() { return "Undo (#COUNT#)"; }),
      redoLabel: ko.computed(function() { return "Redo"; })
    });

    undoRedoStack.setUndoActionMaker(undoserializer.makeUndoAction.bind(undefined, content));
    undoserializer.watchEnabled(true);
    undoRedoStack.setModeOnce();

    var blocks = content().mainBlocks().blocks;

    blocks.push(titleBlock1);
    blocks.push(titleBlock2);
    blocks.push(titleBlock3);

    blocks()[0]().text('Title 1');
    blocks()[1]().text('Title 2');
    blocks()[2]().text('Title 3');

    expect(blocks()[0]().text()).toEqual("Title 1");
    expect(blocks()[2]().text()).toEqual("Title 3");

    var debug = function(prefix, blocks) {
        for (var i = 0; i < blocks().length; i++) {
            // console.log(prefix, i, blocks()[i]().text());
        }
    };

    undoserializer.setListener(function(path, child, oldVal, item) {
        // console.log("UL:", path, oldVal, item.status, item.index, item.moved, item.value.text);
    });

    debug("A", blocks);

    blocks.subscribe(function (changes) {
        var ch = ko.toJS(changes);
        for (var i = 0; i < ch.length; i++) {
            // console.log("AC", i, ch[i].status, ch[i].index, ch[i].moved, ch[i].value.text);
        }
    }, undefined, 'arrayChange');

    // using undomanager Merge modes
    undoRedoStack.setModeMerge();
    blocks.valueWillMutate();
    var removed = blocks.splice(2, 1);
    blocks.splice(0, 0, removed[0]);
    blocks.valueHasMutated();
    undoRedoStack.setModeOnce();

    debug("B", blocks);

    expect(blocks()[0]().text()).toEqual("Title 3");
    expect(blocks()[1]().text()).toEqual("Title 1");
    expect(blocks()[2]().text()).toEqual("Title 2");

    undoRedoStack.undoCommand.execute();

    debug("C", blocks);

    expect(blocks()[0]().text()).toEqual("Title 1");
    expect(blocks()[1]().text()).toEqual("Title 2");
    expect(blocks()[2]().text()).toEqual("Title 3");


    // using "move action" (sortable with move strategy will use valueWillMute/hasMutated
    blocks.valueWillMutate();
    var underlyingBlocks = ko.utils.unwrapObservable(blocks);
    var removed2 = underlyingBlocks.splice(2, 1);
    underlyingBlocks.splice(0, 0, removed2[0]);
    blocks.valueHasMutated();

    debug("D", blocks);

    expect(blocks()[0]().text()).toEqual("Title 3");
    expect(blocks()[1]().text()).toEqual("Title 1");
    expect(blocks()[2]().text()).toEqual("Title 2");

    undoRedoStack.undoCommand.execute();

    debug("E", blocks);

    expect(blocks()[0]().text()).toEqual("Title 1");
    expect(blocks()[1]().text()).toEqual("Title 2");
    expect(blocks()[2]().text()).toEqual("Title 3");

    // using separate remove-add actions without valueWillMutate and without manual declaration of the mergemode.
    // maybe this case is no more needed with the updated knockout/knockout-sortable libraries that correctly detect the move
    var removed2 = blocks.splice(0, 1);
    blocks.splice(2, 0, removed2[0]);

    debug("F", blocks);

    expect(blocks()[0]().text()).toEqual("Title 2");
    expect(blocks()[1]().text()).toEqual("Title 3");
    expect(blocks()[2]().text()).toEqual("Title 1");

    undoRedoStack.undoCommand.execute();

    debug("G", blocks);

    expect(blocks()[0]().text()).toEqual("Title 1");
    expect(blocks()[1]().text()).toEqual("Title 2");
    expect(blocks()[2]().text()).toEqual("Title 3");

    undoRedoStack.redoCommand.execute();

    debug("H", blocks);

    expect(blocks()[0]().text()).toEqual("Title 2");
    expect(blocks()[1]().text()).toEqual("Title 3");
    expect(blocks()[2]().text()).toEqual("Title 1");

  });

  it('should not merge removal of a block being just added', function() {
    var templateDef = JSON.parse("" + fs.readFileSync("spec/data/template-versafix-1.def.json"));
    var content = main.wrappedResultModel(templateDef);
    var titleBlock = modelDef.generateModel(templateDef._defs, 'titleBlock');
    var jsonContent = ko.toJSON(content._plainObject());

    var undoRedoStack = undoManager(content, {
      levels: 100,
      undoLabel: ko.computed(function() { return "Undo (#COUNT#)"; }),
      redoLabel: ko.computed(function() { return "Redo"; })
    });
    undoRedoStack.setUndoActionMaker(undoserializer.makeUndoAction.bind(undefined, content));
    undoserializer.watchEnabled(true);
    undoRedoStack.setModeOnce();

    var blocks = content().mainBlocks().blocks;

    blocks.push(titleBlock);
    expect(blocks().length).toEqual(1);

    blocks.remove(blocks()[0]);
    expect(blocks().length).toEqual(0);

    undoRedoStack.undoCommand.execute();
    expect(blocks().length).toEqual(1);
  });

  afterAll(function() {
    mockery.disable();
    mockery.deregisterAll();
  });

});