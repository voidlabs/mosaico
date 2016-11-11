"use strict";
/* global global: false */

var $ = require("jquery");
var ko = require("knockout");
var console = require("console");
var performanceAwareCaller = require("./timed-call.js").timedCall;

var toastr = require("toastr");
toastr.options = {
  "closeButton": false,
  "debug": false,
  "positionClass": "toast-bottom-full-width",
  "target": "#mo-body",
  "onclick": null,
  "showDuration": "300",
  "hideDuration": "1000",
  "timeOut": "5000",
  "extendedTimeOut": "1000",
  "showEasing": "swing",
  "hideEasing": "linear",
  "showMethod": "fadeIn",
  "hideMethod": "fadeOut"
};

/* NOTE: translations moved to "plugin"
var strings = {
  'show preview and send test': 'Visualizza una anteprima e fai un invio di test',
  // Strings for app.js
  'Download': 'Download',
  'Test': 'Test',
  'Save': 'Salva',
  'Downloading...': "Download in corso...",
  'Invalid email address': "Indirizzo email invalido",
  "Test email sent...": "Email di test inviata...",
  'Unexpected error talking to server: contact us!': 'Errore di comunicazione con il server: contattaci!',
  'Insert here the recipient email address': 'Inserisci qui l\'indirizzo email a cui spedire',
  "Test email address": "Indirizzo email di test",
  // viewModel
  'Block removed: use undo button to restore it...': 'Blocco eliminato: usa il pulsante annulla per recuperarlo...',
  'New block added after the selected one (__pos__)': 'Nuovo blocco aggiunto sotto a quello selezionato (__pos__)',
  'New block added at the model bottom (__pos__)': 'Nuovo blocco aggiunto in fondo al modello (__pos__)',
  // undomain.js
  'Undo (#COUNT#)': 'Annulla (#COUNT#)',
  'Redo': 'Ripristina',
  // editor.js
  'Selected element has no editable properties': 'L\'elemento selezionato non fornisce proprietà editabili',
  'This style is specific for this block: click here to remove the custom style and revert to the theme value': 'Questo stile è specifico di questo blocco: clicca qui per annullare lo stile personalizzato',
  'Switch between global and block level styles editing': 'Permette di specificare se si vuole modificare lo stile generale o solamente quello specifico del blocco selezionato',
  // main.tpl.html
  'Undo last operation': 'Annulla ultima operazione',
  'Redo last operation': 'Ripeti operazione annullata',
  'Show image gallery': 'Visualizza galleria immagini',
  'Gallery': 'Galleria',
  'Preview': 'Anteprima',
  'Show live preview': 'Mostra anteprima live',
  'Large screen': 'Schermo grande',
  'Tablet': 'Tablet',
  'Smartphone': 'Smartphone',
  'Show preview and send test': 'Visualizza una anteprima e fai un invio di test',
  'Download template': 'Scarica il template',
  'Save template': 'Salva il template',
  'Saved model is obsolete': 'Modello salvato obsoleto',
  '<p>The saved model has been created with a previous, non completely compatible version, of the template</p><p>Some content or style in the model <b>COULD BE LOST</b> if you will <b>save</b></p><p>Contact us for more informations!</p>': '<p>Il modello salvato è stato creato con una versione precedente del template non del tutto compatibile</p><p>Alcuni contenuti o stili del modello <b>POTREBBERO ESSERE PERSI</b> se procederai e deciderai di <b>salvare</b></p><p>Contattaci se hai dei dubbi!</p>',

  // TODO this cannot be done in knockout as with uncompatible browsers we don't initialize
  // 'Usupported browser': 'Browser non compatibile', 
  // '<p>Your browser is not supported.</p><p>Use a different browser or try updaring your browser.</p><p>Supported browsers: <ul><li>Internet Explorer &gt;= 10</li><li>Google Chrome &gt;= 30</li><li>Apple Safari &gt;= 5</li><li>Mozilla Firefix &gt;= 20</li></ul></p>': '<p>Il tuo browser non è supportato.</p><p>Accedi con un browser differente o prova ad aggiornare il tuo browser.</p><p>Browser supportati: <ul><li>Internet Explorer &gt;= 10</li><li>Google Chrome &gt;= 30</li><li>Apple Safari &gt;= 5</li><li>Mozilla Firefix &gt;= 20</li></ul></p>',

  // toolbox
  'Blocks': 'Blocchi',
  'Blocks ready to be added to the template': 'Elenco contenuti aggiungibili al messaggio',
  'Content': 'Contenuto',
  'Edit content options': 'Modifica opzioni contenuti',
  'Style': 'Stile',
  'Edit style options': 'Modifica opzioni grafiche',
  'Block __name__': 'Blocco __name__',
  'Click or drag to add this block to the template': 'Clicca o trascina per aggiungere al messaggio',
  'Add': 'Aggiungi',
  'By clicking on message parts you will select a block and content options, if any, will show here': 'Cliccando su alcune parti del messaggio selezionerai un blocco e le opzioni contenutistiche, se disponibili, compariranno qui',
  'By clicking on message parts you will select a block and style options, if available, will show here': 'Cliccando su alcune parti del messaggio selezionerai un blocco e le opzioni di stile, se disponibili, compariranno qui',
  'Click or drag files here': 'Clicca o trascina i file qui!',
  'No images uploaded, yet': 'Non hai ancora caricato immagini',
  'Show images from the gallery': 'Visualizza le immagini caricate nella tua area',
  'Loading...': 'Caricamento...',
  'Load gallery': 'Carica galleria',
  'Loading gallery...': 'Caricamento in corso...',
  'The gallery is empty': 'Nessuna immagine nella galleria',
  // img-wysiwyg.tmlp
  'Remove image': 'Rimuovi immagine',
  'Open the image editing tool': 'Avvia strumento modifica immagine',
  'Upload a new image': 'Carica una nuova immagine',
  'Drop an image here': 'Trascina una immagine qui',
  'Drop an image here or click the upload button': 'Trascina una immagine qui o clicca sul pulsante di caricamento',
  // gallery
  'Drag this image and drop it on any template image placeholder': 'Trascina questa immagine sulla posizione in cui vuoi inserirla',
  'Gallery:': 'Galleria:',
  'Session images': 'Immagini di sessione',
  'Recents': 'Recenti',
  'Remote gallery': 'Galleria remota',

  // customstyle
  'Customized block.<ul><li>In this status changes to properties will be specific to the current block (instead of being global to all blocks in the same section)</li><li>A <span class="customStyled"><span>"small cube" </span></span> icon beside the property will mark the customization. By clicking this icon the property value will be reverted to the value defined for the section.</li></ul>': 'Blocco personalizzato.<ul><li>In questa modalità se cambi una proprietà verrà modificata solamente per questo specifico blocco (invece che per tutti i blocchi della stessa sezione).</li><li>Per segnalare la personalizzazione apparirà l\'icona <span class="customStyled"><span> del "cubetto"</span></span> a fianco delle proprietà. Cliccando questa icona tornerai al valore comune.</li></ul>',
  // blocks-wysiwyg
  'Drop here blocks from the "Blocks" tab': 'Trascina qui i blocchi dalla scheda \'Blocchi\'',
  // block-wysiwyg
  'Drag this handle to move the block': 'Trascina per spostare il blocco altrove',
  'Move this block upside': 'Sposta il blocco in su',
  'Move this block downside': 'Sposta il blocco in giu',
  'Delete block': 'Elimina blocco',
  'Duplicate block': 'Duplica blocco',
  'Switch block variant': 'Cambia variante blocco',
  // colorpicker
  'Theme Colors,Standard Colors,Web Colors,Theme Colors,Back to Palette,History,No history yet.': 'Colori Tema,Colori Standard,Colori Web,Colori Tema,Torna alla tavolozza,Storico,storico colori vuoto',

  'Drop here': 'Rilascia qui',

};
*/

function initializeEditor(content, blockDefs, thumbPathConverter, galleryUrl) {

  var viewModel = {
    galleryRecent: ko.observableArray([]).extend({
      paging: 16
    }),
    galleryRemote: ko.observableArray([]).extend({
      paging: 16
    }),
    selectedBlock: ko.observable(null),
    selectedItem: ko.observable(null),
    selectedTool: ko.observable(0),
    selectedImageTab: ko.observable(0),
    dragging: ko.observable(false),
    draggingImage: ko.observable(false),
    galleryLoaded: ko.observable(false),
    showPreviewFrame: ko.observable(false),
    previewMode: ko.observable('mobile'),
    showToolbox: ko.observable(true),
    showTheme: ko.observable(false),
    showGallery: ko.observable(false),
    debug: ko.observable(false),
    contentListeners: ko.observable(0),
    
    logoPath: 'dist/img/mosaico32.png',
    logoUrl: '.',
    logoAlt: 'mosaico'
  };

  // viewModel.content = content._instrument(ko, content, undefined, true);
  viewModel.content = content;
  viewModel.blockDefs = blockDefs;

  viewModel.notifier = toastr;

  // Does token substitution in i18next style
  viewModel.tt = function(key, paramObj) {
    if (typeof paramObj !== 'undefined')
      for (var prop in paramObj)
        if (paramObj.hasOwnProperty(prop)) {
          key = key.replace(new RegExp('__' + prop + '__', 'g'), paramObj[prop]);
        }
    return key;
  };

  // Simply maps to tt: language plugins can override this method to define their own language
  // handling.
  // If this method invokes an observable (e.g: viewModel.lang()) then the UI language will automatically
  // update when the "lang" observable changes.
  viewModel.t = viewModel.tt;

  // currently called by editor.html to translate template-defined keys (label, help, descriptions)
  // the editor always uses the "template" category for that strings.
  // you can override this method as you like in order to provide translation or change the strings in any way.
  viewModel.ut = function(category, key) {
    return key;
  };

  viewModel.templatePath = thumbPathConverter;

  viewModel.remoteUrlProcessor = function(url) {
    return url;
  };

  viewModel.remoteFileProcessor = function(fileObj) {
    if (typeof fileObj.url !== 'undefined') fileObj.url = viewModel.remoteUrlProcessor(fileObj.url);
    if (typeof fileObj.thumbnailUrl !== 'undefined') fileObj.thumbnailUrl = viewModel.remoteUrlProcessor(fileObj.thumbnailUrl);
    // deleteUrl?
    return fileObj;
  };

  // toolbox.tmpl.html
  viewModel.loadGallery = function() {
    viewModel.galleryLoaded('loading');
    var url = galleryUrl ? galleryUrl : '/upload/';
    // retrieve the full list of remote files
    $.getJSON(url, function(data) {
      for (var i = 0; i < data.files.length; i++) data.files[i] = viewModel.remoteFileProcessor(data.files[i]);
      viewModel.galleryLoaded(data.files.length);
      // TODO do I want this call to return relative paths? Or just absolute paths?
      viewModel.galleryRemote(data.files.reverse());
    }).fail(function() {
      viewModel.galleryLoaded(false);
      viewModel.notifier.error(viewModel.t('Unexpected error listing files'));
    });
  };

  // img-wysiwyg.tmpl.html
  viewModel.fileToImage = function(obj, event, ui) {
    // console.log("fileToImage", obj);
    return obj.url;
  };

  // block-wysiwyg.tmpl.html
  viewModel.removeBlock = function(data, parent) {
    // let's unselect the block
    if (ko.utils.unwrapObservable(viewModel.selectedBlock) == ko.utils.unwrapObservable(data)) {
      viewModel.selectBlock(null, true);
    }
    var res = parent.blocks.remove(data);
    // TODO This message should be different depending on undo plugin presence.
    viewModel.notifier.info(viewModel.t('Block removed: use undo button to restore it...'));
    return res;
  };

  // block-wysiwyg.tmpl.html
  viewModel.duplicateBlock = function(index, parent) {
    var idx = ko.utils.unwrapObservable(index);
    // Deinstrument/deobserve the object
    var unwrapped = ko.toJS(ko.utils.unwrapObservable(parent.blocks)[idx]);
    // We need to remove the id so that a new one will be assigned to the clone
    if (typeof unwrapped.id !== 'undefined') unwrapped.id = '';
    // insert the cloned block
    parent.blocks.splice(idx + 1, 0, unwrapped);
  };

  // block-wysiwyg.tmpl.html
  viewModel.moveBlock = function(index, parent, up) {
    var idx = ko.utils.unwrapObservable(index);
    var parentBlocks = ko.utils.unwrapObservable(parent.blocks);
    if ((up && idx > 0) || (!up && idx < parentBlocks.length - 1)) {
      var destIndex = idx + (up ? -1 : 1);
      var destBlock = parentBlocks[destIndex];
      viewModel.startMultiple();
      parent.blocks.splice(destIndex, 1);
      parent.blocks.splice(idx, 0, destBlock);
      viewModel.stopMultiple();
    }
  };

  // test method, command line use only
  viewModel.loadDefaultBlocks = function() {
    // cloning the whole "mainBlocks" object so that undomanager will
    // see it as a single operation (maybe I could use "startMultiple"/"stopMultiple".
    var res = ko.toJS(viewModel.content().mainBlocks);
    res.blocks = [];
    var input = ko.utils.unwrapObservable(viewModel.blockDefs);
    for (var i = 0; i < input.length; i++) {
      var obj = ko.toJS(input[i]);
      // generating ids for blocks, maybe this would work also leaving it empty.
      obj.id = 'block_' + i;
      res.blocks.push(obj);
    }
    performanceAwareCaller('setMainBlocks', viewModel.content().mainBlocks._wrap.bind(viewModel.content().mainBlocks, res));
  };

  // gallery-images.tmpl.html
  viewModel.addImage = function(img) {
    var selectedImg = $('#main-wysiwyg-area .selectable-img.selecteditem');
    if (selectedImg.length == 1 && typeof img == 'object' && typeof img.url !== 'undefined') {
      ko.contextFor(selectedImg[0])._src(img.url);
      return true;
    } else {
      return false;
    }
  };

  // toolbox.tmpl.html
  viewModel.addBlock = function(obj, event) {
    // if there is a selected block we try to add the block just after the selected one.
    var selected = viewModel.selectedBlock();
    // search the selected block position.
    var found;
    if (selected !== null) {
      // TODO "mainBlocks" is an hardcoded thing.
      for (var i = viewModel.content().mainBlocks().blocks().length - 1; i >= 0; i--) {
        if (viewModel.content().mainBlocks().blocks()[i]() == selected) {
          found = i;
          break;
        }
      }
    }
    var pos;
    if (typeof found !== 'undefined') {
      pos = found + 1;
      viewModel.content().mainBlocks().blocks.splice(pos, 0, obj);
      viewModel.notifier.info(viewModel.t('New block added after the selected one (__pos__)', {
        pos: pos
      }));
    } else {
      viewModel.content().mainBlocks().blocks.push(obj);
      pos = viewModel.content().mainBlocks().blocks().length - 1;
      viewModel.notifier.info(viewModel.t('New block added at the model bottom (__pos__)', {
        pos: pos
      }));
    }
    // find the newly added block and select it!
    var added = viewModel.content().mainBlocks().blocks()[pos]();
    viewModel.selectBlock(added, true);
    // prevent click propagation (losing url hash - see #43)
    return false;
  };

  // Used by stylesheet.js to create multiple styles
  viewModel.findObjectsOfType = function(data, type) {
    var res = [];
    var obj = ko.utils.unwrapObservable(data);
    for (var prop in obj)
      if (obj.hasOwnProperty(prop)) {
        var val = ko.utils.unwrapObservable(obj[prop]);
        // TODO this is not the right way to deal with "block list" objects.
        if (prop.match(/Blocks$/)) {
          var contents = ko.utils.unwrapObservable(val.blocks);
          for (var i = 0; i < contents.length; i++) {
            var c = ko.utils.unwrapObservable(contents[i]);
            if (type === null || ko.utils.unwrapObservable(c.type) == type) res.push(c);
          }
          // TODO investigate which condition provide a null value.
        } else if (typeof val == 'object' && val !== null) {
          if (type === null || ko.utils.unwrapObservable(val.type) == type) res.push(val);
        }
      }
    return res;
  };

  /*
  viewModel.placeholderHelper = 'sortable-placeholder';
  if (false) {
    viewModel.placeholderHelper = {
      element: function(currentItem) {
        return $('<div />').removeClass('ui-draggable').addClass('sortable-placeholder').css('position', 'relative').css('width', '100%').css('height', currentItem.css('height')).css('opacity', '.8')[0];
      },
      update: function(container, p) {
       return;
      }
    };
  }
  */

  // Attempt to insert the block in the destination layout during dragging
  viewModel.placeholderHelper = {
    element: function(currentItem) {
      return $(currentItem[0].outerHTML).removeClass('ui-draggable').addClass('sortable-placeholder').css('display', 'block').css('position', 'relative').css('width', '100%').css('height', 'auto').css('opacity', '.8')[0];
    },
    update: function(container, p) {
      return;
    }
  };

  // TODO the undumanager should be pluggable.
  // Used by "moveBlock" and blocks-wysiwyg.tmpl.html to "merge" drag/drop operations into a single undo/redo op.
  viewModel.startMultiple = function() {
    if (typeof viewModel.setUndoModeMerge !== 'undefined') viewModel.setUndoModeMerge();
  };
  viewModel.stopMultiple = function() {
    if (typeof viewModel.setUndoModeOnce !== 'undefined') viewModel.setUndoModeOnce();
  };

  // Used by code generated by editor.js 
  viewModel.localGlobalSwitch = function(prop, globalProp) {
    var current = prop();
    if (current === null) prop(globalProp());
    else prop(null);
    return false;
  };

  // Used by editor and main "converter" to support item selection
  viewModel.selectItem = function(valueAccessor, item, block) {
    var val = ko.utils.peekObservable(valueAccessor);
    if (typeof block !== 'undefined') viewModel.selectBlock(block, false, true);
    if (val != item) {
      valueAccessor(item);
      // On selectItem if we were on "Blocks" toolbox tab we move to "Content" toolbox tab.
      if (item !== null && viewModel.selectedTool() === 0) viewModel.selectedTool(1);
    }
    return false;
  }.bind(viewModel, viewModel.selectedItem);

  viewModel.isSelectedItem = function(item) {
    return viewModel.selectedItem() == item;
  };

  viewModel.selectBlock = function(valueAccessor, item, doNotSelect, doNotUnselectItem) {
    var val = ko.utils.peekObservable(valueAccessor);
    if (!doNotUnselectItem) viewModel.selectItem(null);
    if (val != item) {
      valueAccessor(item);
      // hide gallery on block selection
      viewModel.showGallery(false);
      if (item !== null && !doNotSelect && viewModel.selectedTool() === 0) viewModel.selectedTool(1);
    }
  }.bind(viewModel, viewModel.selectedBlock);

  // DEBUG
  viewModel.countSubscriptions = function(model, debug) {
    var res = 0;
    for (var prop in model)
      if (model.hasOwnProperty(prop)) {
        var p = model[prop];
        if (ko.isObservable(p)) {
          if (typeof p._defaultComputed != 'undefined') {
            if (typeof debug != 'undefined') console.log(debug + "/" + prop + "/_", p._defaultComputed.getSubscriptionsCount());
            res += p._defaultComputed.getSubscriptionsCount();
          }
          if (typeof debug != 'undefined') console.log(debug + "/" + prop + "/-", p.getSubscriptionsCount());
          res += p.getSubscriptionsCount();
          p = ko.utils.unwrapObservable(p);
        }
        if (typeof p == 'object' && p !== null) {
          var tot = viewModel.countSubscriptions(p, typeof debug != 'undefined' ? debug + '/' + prop + "@" : undefined);
          if (typeof debug != 'undefined') console.log(debug + "/" + prop + "@", tot);
          res += tot;
        }
      }
    return res;
  };

  // DEBUG
  viewModel.loopSubscriptionsCount = function() {
    var count = viewModel.countSubscriptions(viewModel.content());
    global.document.getElementById('subscriptionsCount').innerHTML = count;
    global.setTimeout(viewModel.loopSubscriptionsCount, 1000);
  };

  viewModel.export = function() {
    var content = performanceAwareCaller("exportHTML", viewModel.exportHTML);
    return content;
  };

  function conditional_restore(html) {
    return html.replace(/<replacedcc[^>]* condition="([^"]*)"[^>]*>([\s\S]*?)<\/replacedcc>/g, function(match, condition, body) {
      var dd = '<!--[if '+condition.replace(/&amp;/, '&')+']>';
      dd += body.replace(/<!-- cc:bc:([A-Za-z:]*) -->(<\/cc>)?<!-- cc:ac:\1 -->/g, '</$1>') // restore closing tags (including lost tags)
            .replace(/><\/cc><!-- cc:sc -->/g, '/>') // restore selfclosing tags
            .replace(/<!-- cc:bo:([A-Za-z:]*) --><cc/g, '<$1') // restore open tags
            .replace(/^.*<!-- cc:start -->/,'') // remove content before start
            .replace(/<!-- cc:end -->.*$/,''); // remove content after end
      dd += '<![endif]-->';
      return dd;
    });
  }

  viewModel.exportHTML = function() {
    var id = 'exportframe';
    $('body').append('<iframe id="' + id + '" data-bind="bindIframe: $data"></iframe>');
    var frameEl = global.document.getElementById(id);
    ko.applyBindings(viewModel, frameEl);

    ko.cleanNode(frameEl);

    if (viewModel.inline) viewModel.inline(frameEl.contentWindow.document);

    // Obsolete method didn't work on IE11 when using "HTML5 doctype":
    // var docType = new XMLSerializer().serializeToString(global.document.doctype);
    var node = frameEl.contentWindow.document.doctype;
    var docType = "<!DOCTYPE " + node.name +
      (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '') +
      (!node.publicId && node.systemId ? ' SYSTEM' : '') +
      (node.systemId ? ' "' + node.systemId + '"' : '') + '>';
    var content = docType + "\n" + frameEl.contentWindow.document.documentElement.outerHTML;
    ko.removeNode(frameEl);

    content = content.replace(/<script ([^>]* )?type="text\/html"[^>]*>[\s\S]*?<\/script>/gm, '');
    // content = content.replace(/<!-- ko .*? -->/g, ''); // sometimes we have expressions like (<!-- ko var > 2 -->)
    content = content.replace(/<!-- ko ((?!--).)*? -->/g, ''); // this replaces the above with a more formal (but slower) solution
    content = content.replace(/<!-- \/ko -->/g, '');
    // Remove data-bind/data-block attributes
    content = content.replace(/ data-bind="[^"]*"/gm, '');
    // Remove trash leftover by TinyMCE
    content = content.replace(/ data-mce-(href|src|style)="[^"]*"/gm, '');

    // Replace "replacedstyle" to "style" attributes (chrome puts replacedstyle after style)
    content = content.replace(/ style="[^"]*"([^>]*) replaced(style="[^"]*")/gm, '$1 $2');
    // Replace "replacedstyle" to "style" attributes (ie/ff have reverse order)
    content = content.replace(/ replaced(style="[^"]*")([^>]*) style="[^"]*"/gm, ' $1$2');
    content = content.replace(/ replaced(style="[^"]*")/gm, ' $1');

    // same as style, but for http-equiv (some browser break it if we don't replace, but then we find it duplicated)
    content = content.replace(/ http-equiv="[^"]*"([^>]*) replaced(http-equiv="[^"]*")/gm, '$1 $2');
    content = content.replace(/ replaced(http-equiv="[^"]*")([^>]*) http-equiv="[^"]*"/gm, ' $1$2');
    content = content.replace(/ replaced(http-equiv="[^"]*")/gm, ' $1');

    // We already replace style and http-equiv and we don't need this.
    // content = content.replace(/ replaced([^= ]*=)/gm, ' $1');
    // Restore conditional comments
    content = conditional_restore(content);
    var trash = content.match(/ data-[^ =]+(="[^"]+")? /) || content.match(/ replaced([^= ]*=)/);
    if (trash) {
      console.warn("Output HTML contains unexpected data- attributes or replaced attributes", trash);
    }

    return content;
  };

  viewModel.exportHTMLtoTextarea = function(textareaid) {
    $(textareaid).val(viewModel.exportHTML());
  };

  viewModel.exportJSONtoTextarea = function(textareaid) {
    $(textareaid).val(viewModel.exportJSON());
  };

  viewModel.importJSONfromTextarea = function(textareaid) {
    viewModel.importJSON($(textareaid).val());
  };

  viewModel.exportMetadata = function() {
    var json = ko.toJSON(viewModel.metadata);
    return json;
  };

  viewModel.exportJSON = function() {
    var json = ko.toJSON(viewModel.content);
    return json;
  };

  viewModel.exportJS = function() {
    return ko.toJS(viewModel.content);
  };

  viewModel.importJSON = function(json) {
    var unwrapped = ko.utils.parseJson(json);
    viewModel.content._wrap(unwrapped);
  };

  viewModel.exportTheme = function() {
    var flat = {};
    var mod = viewModel.content().theme();

    var _export = function(prefix, flat, mod) {
      for (var prop in mod)
        if (mod.hasOwnProperty(prop)) {
          var a = ko.utils.unwrapObservable(mod[prop]);
          if (a !== null && typeof a == 'object') {
            _export(prop + '.', flat, a);
          } else {
            flat[prefix + prop] = a;
          }
        }
    };

    _export('', flat, mod);

    var output = '';
    for (var prop in flat)
      if (flat.hasOwnProperty(prop) && prop != 'type') {
        output += prop + ": " + flat[prop] + ";" + "\n";
      }

    return output;
  };

  // moxiemanager (or file browser/imageeditor) extension points.
  // Just implement editImage or linkDialog methods
  // viewModel.editImage = function(src, done) {} : implement this method to enable image editing (src is a wirtableObservable).
  // viewModel.linkDialog = function() {}: implement this method using "this" to find the input element $(this).val is a writableObservable.

  viewModel.loadImage = function(img) {
    // push image at top of "recent" gallery
    viewModel.galleryRecent.unshift(img);
    // select recent gallery tab
    viewModel.selectedImageTab(0);
  };

  viewModel.dialog = function(selector, options) {
    $(selector).dialog(options);
  };

  // Dummy log method overridden by extensions
  viewModel.log = function(category, msg) {
    // console.log("viewModel.log", category, msg);
  };

  // automatically load the gallery when the gallery tab is selected
  viewModel.selectedImageTab.subscribe(function(newValue) {
    if (newValue == 1 && viewModel.galleryLoaded() === false) {
      viewModel.loadGallery();
    }
  }, viewModel, 'change');

  return viewModel;

}

module.exports = initializeEditor;