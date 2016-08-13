'use strict'

var $               = require('jquery')
var dialogPolyfill  = require('dialog-polyfill')

var dialogRename    = $('.js-dialog-rename')[0]
var dialogDelete    = $('.js-dialog-delete')[0]
var notif           = $('#notification')[0]
// https://github.com/GoogleChrome/dialog-polyfill
if (!dialogRename.showModal) {
  console.log('dialogPolyfill.registerDialog')
  dialogPolyfill.registerDialog(dialogRename)
  dialogPolyfill.registerDialog(dialogDelete)
}

//////
// RENAME CREATION
//////

var route   = false
var $name   = false
var $input  = $('#name-field')

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
  dialogRename.showModal()
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
    closeRenameDialog()
  })
  .catch(function () {
    notif.MaterialSnackbar.showSnackbar({
      message: 'error',
    })
  })
})

$('.js-close-rename-dialog').on('click', closeRenameDialog)

function closeRenameDialog() {
  $name = false
  route = false
  dialogRename.close()
}

//////
// DELETE CREATION
//////

var deleteRoute = false
var $deleteRow  = false

$('.js-delete').on('click', function (e) {
  e.preventDefault()
  var $target = $(e.currentTarget)
  deleteRoute = $target.attr('href')
  $deleteRow  = $target.parents('tr')
  dialogDelete.showModal()
})

$('.js-close-delete-dialog').on('click', closeDeleteDialog)
$('.js-delete-confirm').on('click', removeCreation)

function removeCreation(e) {
  console.log('removeCreation', deleteRoute, $deleteRow)
  if (!deleteRoute || !$deleteRow ) return
  console.log('delete', deleteRoute, $deleteRow)
  $.ajax({
    method: 'GET',
    url:    deleteRoute,
  })
  .then(function () {
    $deleteRow.remove()
    notif.MaterialSnackbar.showSnackbar({
      message: 'Mailing is deleted',
    })
    closeDeleteDialog()
  })
  .catch(function () {
    notif.MaterialSnackbar.showSnackbar({
      message: 'error in supression',
    })
  })
}

function closeDeleteDialog() {
  deleteRoute = false
  $deleteRow  = false
  dialogDelete.close()
}
