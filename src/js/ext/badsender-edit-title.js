'use strict'

var $       = require('jquery')
var ko      = require('knockout')
var console = require('console')

function handleCreationName(viewModel) {
  var originalValue
  viewModel.titleMode         = ko.observable('show')
  viewModel.metadata.name     = ko.observable(viewModel.metadata.name)

  viewModel.creationName      = ko.computed(function() {
    return viewModel.metadata.name() || viewModel.t('title-empty')
  }, viewModel)

  viewModel.enableEditCreationName  = function (data, event) {
    console.log('enableEditCreationName', data)
    originalValue = viewModel.metadata.name()
    viewModel.titleMode('edit')
  }

  viewModel.cancelEditCreationName  = function (data, event) {
    console.log('cancelEditCreationName')
    viewModel.metadata.name(originalValue)
    originalValue = ''
    viewModel.titleMode('show')
  }

  viewModel.saveEditCreationName  = function (data, event) {
    console.log('saveEditCreationName', viewModel.metadata.name())
    viewModel.titleMode('saving')
    viewModel.notifier.info(viewModel.t('edit-title-ajax-pending'))

    $.ajax({
      method: 'PUT',
      url:    viewModel.metadata.url.update,
      data:   {
        name: viewModel.metadata.name(),
      },
      success: function () {
        viewModel.notifier.success(viewModel.t('edit-title-ajax-success'))
      },
      error: function () {
        viewModel.notifier.error(viewModel.t('edit-title-ajax-fail'))
      },
      complete: function () {
        originalValue = ''
        viewModel.titleMode('show')
      },
    })
  }
}

module.exports = handleCreationName
