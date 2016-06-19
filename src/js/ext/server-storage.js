'use strict'

var console = require('console')
var $       = require('jquery')
var ko      = require('knockout')
var _omit   = require('lodash.omit')
var isEmail = require('validator/lib/isEmail')

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

    // use callback for easier jQuery updates
    // => Deprecation notice for .success(), .error(), and .complete()
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
    var email = viewModel.t('Insert here the recipient email address')
    email     = global.prompt(viewModel.t("Test email address"), email)

    if (!isEmail(email)) {
      global.alert(viewModel.t('Invalid email address'));
      return testCmd.enabled(true)
    }

    console.log("TODO testing...", email)
    var metadata  = ko.toJS(viewModel.metadata)
    var datas     = {
      action:   'email',
      rcpt:     email,
      subject:  '[test] ' + metadata.id,
      html:     viewModel.exportHTML()
    }
    $.ajax({
      url:          /dl/,
      method:       'POST',
      data:         datas,
      success:      onTestSuccess,
      error:        onTestError,
      complete:     onTestComplete,
    })

    function onTestSuccess(data, textStatus, jqXHR) {
      console.log('test success')
      viewModel.notifier.success(viewModel.t("Test email sent..."))
    }

    function onTestError(jqXHR, textStatus, errorThrown) {
      console.log('test error')
      console.log(errorThrown)
      viewModel.notifier.error(viewModel.t('Unexpected error talking to server: contact us!'))
    }

    function onTestComplete() {
      saveCmd.enabled(true);
    }
  }

  var downloadCmd = {
    name: 'Download', // l10n happens in the template
    enabled: ko.observable(true)
  }
  downloadCmd.execute = function() {
    console.info('DOWNLOAD')
    downloadCmd.enabled(false)
    viewModel.notifier.info(viewModel.t("Downloading..."))
    viewModel.exportHTMLtoTextarea('#downloadHtmlTextarea')
    $('#downloadForm')
    .attr('action', '/dl/')
    .submit()
    downloadCmd.enabled(true)
  }

  viewModel.save      = saveCmd
  viewModel.test      = testCmd
  viewModel.download  = downloadCmd

}

module.exports = loader;
