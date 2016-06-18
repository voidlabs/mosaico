'use strict'

var console = require('console')

var loader = function (viewModel) {
  // console.log("loading from metadata", md, model);
  var saveCmd = {
    name: 'Save', // l10n happens in the template
    enabled: ko.observable(true)
  };
  saveCmd.execute = function() {
    console.info('SAVE')
    saveCmd.enabled(false);
    // viewModel.metadata.changed = Date.now();
    // if (typeof viewModel.metadata.key == 'undefined') {
    //   console.warn("Unable to find ket in metadata object...", viewModel.metadata);
    //   viewModel.metadata.key = mdkey;
    // }
    // global.localStorage.setItem("metadata-" + mdkey, viewModel.exportMetadata());
    // global.localStorage.setItem("template-" + mdkey, viewModel.exportJSON());
    saveCmd.enabled(true);
  };
  var testCmd = {
    name: 'Test', // l10n happens in the template
    enabled: ko.observable(true)
  };
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
