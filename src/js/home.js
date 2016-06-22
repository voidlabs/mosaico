'use strict'

var $               = require('jquery')
var dialogPolyfill  = require('dialog-polyfill')

var dialog   = $('.mdl-dialog')[0]
// https://github.com/GoogleChrome/dialog-polyfill
if (!dialog.showModal) dialogPolyfill.registerDialog(dialog)

var route   = false
var $name   = false
var $input  = $('#name-field')
var notif   = $('#notification')[0]

$('.js-rename').on('click', function (e) {
  e.preventDefault()
  var $target = $(e.currentTarget)
  route       = $target.data('href')
  $name       = $target.parents('tr').find('.js-name')
  $input.val($name.text())
  // don't seem to work…
  setTimeout(function () {
    componentHandler.upgradeElement($input.parent()[0])
  }, 10)
  dialog.showModal()
})

$('.js-post').on('click', function () {
  var name = $('#name-field').val()
  $.ajax({
    method: 'PUT',
    url:    route,
    data:   {
      name: name,
    }
  })
  .then(function () {
    $name.text(name)
    notif.MaterialSnackbar.showSnackbar({
      message: 'Name changed',
    })
    closeDialog()
  })
  .catch(function () {
    notif.MaterialSnackbar.showSnackbar({
      message: 'error',
    })
  })
})

$('.js-close').on('click', closeDialog)

function closeDialog() {
  $name = false
  route = false
  dialog.close()
}
