'use strict'

var $               = require('jquery')
var dialogPolyfill  = require('dialog-polyfill')

var dialogRename    = $('.js-dialog-rename')[0]
var dialogDelete    = $('.js-dialog-delete')[0]
// https://github.com/GoogleChrome/dialog-polyfill
if (!dialogRename.showModal) {
  console.log('dialogPolyfill.registerDialog')
  dialogPolyfill.registerDialog(dialogRename)
  dialogPolyfill.registerDialog(dialogDelete)
}

var route   = false
var $name   = false
var $input  = $('#name-field')
var notif   = $('#notification')[0]

//////
// RENAME CREATION
//////

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

$('.js-delete').on('click', function (e) {
  e.preventDefault()
  var $target = $(e.currentTarget)
  console.log('delete')
  dialogDelete.showModal()
})

$('.js-close-delete-dialog').on('click', closeDeleteDialog)

function closeDeleteDialog() {
  dialogDelete.close()
}
