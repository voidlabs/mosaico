'use strict'

var $       = require("jquery")
var ko      = require("knockout")
var console = require("console")

function handleCreationName(viewModel) {
  var originalValue
  viewModel.titleMode         = ko.observable('show')
  viewModel.metadata.name     = ko.observable(viewModel.metadata.name)

  viewModel.creationName      = ko.computed(function() {
    return viewModel.metadata.name() || 'no name'
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
    viewModel.notifier.info('changing name…')

    $.ajax({
      method: 'PUT',
      url:    viewModel.metadata.url.update,
      data:   {
        name: viewModel.metadata.name(),
      },
      success: function () {
        // viewModel.notifier.info(viewModel.t('New block added at the model bottom (__pos__)', {
        //   pos: pos
        // }));
        viewModel.notifier.success('Name changed')
      },
      error: function () {
        viewModel.notifier.error('Unable to save new name')
      },
      complete: function () {
        originalValue = ''
        viewModel.titleMode('show')
      },
    })
  }

  return viewModel

}

function enhance(viewModel) {
  viewModel = handleCreationName(viewModel)
  return viewModel
}

module.exports = enhance
