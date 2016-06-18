'use strict'

var console = require('console')
var $       = require('jquery')
var ko      = require('knockout')
var _omit   = require('lodash.omit')

function getData(viewModel) {
  // gather meta
  // remove keys that aren't necessary to update
  var datas  = _omit(ko.toJS(viewModel.metadata), ['urlConverter', 'template'])
  datas.data = viewModel.exportJS()
  return datas
}

var loader = function (viewModel) {
  console.info('init server storage')

  var saveCmd = {
    name: 'Save', // l10n happens in the template
    enabled: ko.observable(true)
  };
  saveCmd.execute = function() {
    saveCmd.enabled(false);
    var data = getData(viewModel)
    console.info('SAVE DATA')
    console.log(data)

    // force JSON for bodyparser to catch up
    // => keep types server side
    $.ajax({
      url: window.location.href,
      method:       'POST',
      contentType:  'application/json',
      data:         JSON.stringify(data),
      success:      onPostSuccess,
      error:        onPostError,
      complete:     onPostComplete,
    })

    function onPostSuccess(data, textStatus, jqXHR) {
      console.log('save success')
      if (data.meta.redirect) {
        history.replaceState({}, 'editor', data.meta.redirect)
      }
      viewModel.notifier.success(viewModel.t("Creation has been saved"))
    }

    function onPostError(jqXHR, textStatus, errorThrown) {
      console.log('save error')
      console.log(errorThrown)
      viewModel.notifier.error(viewModel.t("Save errir"))
    }

    function onPostComplete() {
      saveCmd.enabled(true);
    }
  }

  var testCmd = {
    name: 'Test', // l10n happens in the template
    enabled: ko.observable(true)
  }
  testCmd.execute = function() {
    console.info('TEST')
    testCmd.enabled(false)
    // var email = global.localStorage.getItem("testemail");
    // if (email === null || email == 'null') email = viewModel.t('Insert here the recipient email address');
    // email = global.prompt(viewModel.t("Test email address"), email);
    // if (email.match(/@/)) {
    //   global.localStorage.setItem("testemail", email);
    //   console.log("TODO testing...", email);
    //   var postUrl = emailProcessorBackend ? emailProcessorBackend : '/dl/';
    //   var post = $.post(postUrl, {
    //     action: 'email',
    //     rcpt: email,
    //     subject: "[test] " + mdkey + " - " + mdname,
    //     html: viewModel.exportHTML()
    //   }, null, 'html');
    //   post.fail(function() {
    //     console.log("fail", arguments);
    //     viewModel.notifier.error(viewModel.t('Unexpected error talking to server: contact us!'));
    //   });
    //   post.success(function() {
    //     console.log("success", arguments);
    //     viewModel.notifier.success(viewModel.t("Test email sent..."));
    //   });
    //   post.always(function() {
    //     testCmd.enabled(true);
    //   });
    // } else {
    //   global.alert(viewModel.t('Invalid email address'));
    //   testCmd.enabled(true);
    // }
    testCmd.enabled(true)
  }

  var downloadCmd = {
    name: 'Download', // l10n happens in the template
    enabled: ko.observable(true)
  }

  downloadCmd.execute = function() {
    console.info('DOWNLOAD')
    downloadCmd.enabled(false);
    // viewModel.notifier.info(viewModel.t("Downloading..."));
    // viewModel.exportHTMLtoTextarea('#downloadHtmlTextarea');
    // var postUrl = emailProcessorBackend ? emailProcessorBackend : '/dl/';
    // global.document.getElementById('downloadForm').setAttribute("action", postUrl);
    // global.document.getElementById('downloadForm').submit();
    downloadCmd.enabled(true);
  };

  viewModel.save = saveCmd;
  viewModel.test = testCmd;
  viewModel.download = downloadCmd;

}

module.exports = loader;
