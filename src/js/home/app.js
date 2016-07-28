/* global ko */

var initialEdits = [];
var templates = require('../../../res/vendor/skins/main/templates/templates.json');

if (localStorage.getItem('edits')) {
    var editKeys = JSON.parse(localStorage.getItem('edits'));
    var md;
    for (var i = 0; i < editKeys.length; i++) {
        md = localStorage.getItem('metadata-'+editKeys[i]);
        if (typeof md == 'string') {
            initialEdits.push(JSON.parse(md));
        } else {
            console.log("Ignoring saved key", editKeys[i], "type", typeof md, md);
        }
    }

    initialEdits.sort(function(a, b) {
        var lastA = a.changed ? a.changed : a.created;
        var lastB = b.changed ? b.changed : b.created;
        if (lastA < lastB) return 1;
        if (lastA > lastB) return -1;
        return 0;
    });
}

var viewModel = {
    showSaved: ko.observable(false),
    edits: ko.observableArray(initialEdits),
    templates: templates
};

viewModel.edits.subscribe(function(newEdits) {
    var keys = [];
    for (var i = 0; i < newEdits.length; i++) {
        keys.push(newEdits[i].key);
        localStorage.setItem('metadata-'+newEdits[i].key, ko.toJSON(newEdits[i]));
    }
    localStorage.setItem('edits', ko.toJSON(keys));
});

viewModel.dateFormat = function(unixdate) {
    if (typeof unixdate == 'undefined') return 'DD-MM-YYYY';
    var d = new Date();
    d.setTime(ko.utils.unwrapObservable(unixdate));
    var m = ""+(d.getMonth()+1);
    var h = ""+(d.getHours());
    var i = ""+(d.getMinutes());
    return d.getDate()+"/"+(m.length == 1 ? '0' : '')+m+"/"+d.getFullYear()+" "+(h.length == 1 ? '0' : '')+h+":"+(i.length == 1 ? '0' : '')+i;
};

viewModel.templatesBasePath = 'res/vendor/skins/main/templates/';

viewModel.newEdit = function(shorttmplname) {
    console.log("new", this, template);
    var d = new Date();
    var rnd = Math.random().toString(36).substr(2, 7);
    var template =  viewModel.templatesBasePath + shorttmplname + '/template-' + shorttmplname + '.html';
    viewModel.edits.unshift({ created: Date.now(), key: rnd, name: shorttmplname, template: template });
    document.location = 'editor.html#'+rnd;
    // { data: 'AAAA-MM-GG', key: 'ABCDE' }
    // viewModel.edits.push(template);
};
viewModel.renameEdit = function(index) {
    var newName = window.prompt("Modifica nome", viewModel.edits()[index].name);
    if (newName) {
        var newItem = JSON.parse(ko.toJSON(viewModel.edits()[index]));
        newItem.name = newName;
        viewModel.edits.splice(index, 1, newItem);
    }
    return false;
};
viewModel.deleteEdit = function(index) {
    var confirm = window.confirm("Are you sure you want to delete this content?");
    if (confirm) {
        var res = viewModel.edits.splice(index, 1);
        console.log("removing template ", res);
        localStorage.removeItem('template-'+res[0].key);
    }
    return false;
};
viewModel.list = function(clean) {
    for (var i = localStorage.length - 1; i >= 0; i--) {
        var key = localStorage.key(i);
        if (clean) {
            console.log("removing ", key, localStorage.getItem(key));
            localStorage.removeItem(key);
        } else {
            console.log("ls ", key, localStorage.getItem(key));
        }
    }
};
document.addEventListener('DOMContentLoaded',function(){
    ko.applyBindings(viewModel);
});
