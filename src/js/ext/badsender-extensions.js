'use strict'

var ko            = require('knockout')
var url           = require('url')
var slugFilename  = require('../../../shared/slug-filename.js')

// https://github.com/voidlabs/mosaico/wiki/Mosaico-Plugins

//////
// VIEW-MODEL PLUGINS
//////

var serverStorage = require('./badsender-server-storage')
var editTitle     = require('./badsender-edit-title')

function setEditorIcon(viewModel) {
  viewModel.logoPath  = '/media/editor-icon.png'
  viewModel.logoUrl   = '/'
  viewModel.logoAlt   = 'Badsender'
}

function extendViewModel(opts, customExtensions) {
  customExtensions.push(serverStorage)
  customExtensions.push(setEditorIcon)
  customExtensions.push(editTitle)
}

// OPTIONS

var tinymceConfigFull = {
  toolbar1: 'bold italic forecolor backcolor hr fontsizeselect styleselect removeformat | link unlink | pastetext code',
  //- font-size select
  //- https://www.tinymce.com/docs/configure/content-formatting/#fontsize_formats
  fontsize_formats: '8px 10px 12px 14px 18px 24px 36px',
  //- add colorpicker
  //- https://www.tinymce.com/docs/plugins/colorpicker/
  plugins: ["link hr paste lists textcolor colorpicker code"],
  //- https://www.tinymce.com/docs/configure/content-formatting/#style_formats
  style_formats: [
    {title: 'Inline', items: [
      {title: 'Bold'         , icon: "bold"         , inline: 'strong'},
      {title: 'Italic'       , icon: "italic"       , inline: 'em'},
      {title: 'Underline'    , icon: "underline"    , inline: 'span', styles: {'text-decoration' : 'underline'}},
      {title: 'Strikethrough', icon: "strikethrough", inline: 'span', styles: {'text-decoration' : 'line-through'}},
      {title: 'Superscript'  , icon: "superscript"  , inline: 'sup'},
      {title: 'Subscript'    , icon: "subscript"    , inline: 'sub'},
      {title: 'Code'         , icon: "code"         , inline: 'code'},
    ]},
    {title: 'Alignment', items: [
      {title: 'Left'   , icon: "alignleft"   , block: 'div', styles: {'text-align' : 'left'}},
      {title: 'Center' , icon: "aligncenter" , block: 'div', styles: {'text-align' : 'center'}},
      {title: 'Right'  , icon: "alignright"  , block: 'div', styles: {'text-align' : 'right'}},
      {title: 'Justify', icon: "alignjustify", block: 'div', styles: {'text-align' : 'justify'}},
    ]},
  ],
}

//////
// KNOCKOUT EXTEND
//////

function templateUrlConverter(opts) {
  return function badsenderTemplateUrlConverter(url) {
    if (!url) return null
    // handle: [unsubscribe_link] or mailto:[mail]
    if (/\]$/.test(url)) return null
    // handle absolute url: http
    if (/^http/.test(url)) return null
    // handle ESP tags: in URL <%
    if (/<%/.test(url)) return null
    // handle other urls: img/social_def/twitter_ok.png
    var urlRegexp       = /([^\/]*)$/
    var extentionRegexp = /\.[0-9a-z]+$/
    // as it is done, all files are flatten in asset folder (uploads or S3)
    url = urlRegexp.exec(url)[1]
    // handle every other case:
    //   *|UNSUB|*
    //   #pouic
    if (!extentionRegexp.test(url)) return null
    // All images at upload are slugged
    //    block thumbnails are based on html block ID
    //    we need to retreive the file url by slugging the id
    // The same applies for uploaded resources images:
    //    html img src may differ from uploaded names
    url = slugFilename(url)
    url = opts.imgProcessorBackend + opts.metadata._wireframe  + '-' + url
    return url
  }
}

// knockout is a global object.
// So we can extend it easily

// this equivalent to the original app.js#applyBindingOptions
function extendKnockout(opts) {

  // Change tinyMCE full editor options
  ko.bindingHandlers.wysiwyg.fullOptions = tinymceConfigFull

  // This is not used by knockout per se.
  // Store this function in KO global object so it can be accessed by template-loader.js#templateLoader
  // badsenderTemplateUrlConverter is used:
  //  - for preview images on left bar
  //  - for static links in templates
  ko.bindingHandlers.wysiwygSrc.templateUrlConverter = templateUrlConverter(opts)

  // options have been set in the editor template
  var imgProcessorBackend = url.parse(opts.imgProcessorBackend)

  // send the non-resized image url
  ko.bindingHandlers.fileupload.remoteFilePreprocessor = function (file) {
    console.info('REMOTE FILE PREPROCESSOR')
    console.log(file)
    var fileUrl = url.format({
      protocol: imgProcessorBackend.protocol,
      host:     imgProcessorBackend.host,
      pathname: imgProcessorBackend.pathname,
    });
    file.url = url.resolve(fileUrl, url.parse(file.url).pathname)
    return file
  }

  // push "convertedUrl" method to the wysiwygSrc binding
  ko.bindingHandlers.wysiwygSrc.convertedUrl = function(src, method, width, height) {
    var imageName = url.parse(src).pathname
    if (!imageName) console.warn('no pathname for image', src)
    console.info('CONVERTED URL', imageName, method, width, height)
    imageName     = imageName.replace('/img/', '')
    var path      = opts.basePath + '/' + method
    path          = path + '/' + width + 'x' + height + '/' + imageName
    return path
  }

  ko.bindingHandlers.wysiwygSrc.placeholderUrl = function(width, height, text) {
    // console.info('PLACEHOLDER URL', width, height, text)
    return opts.basePath + '/placeholder/' + width + 'x' + height + '.png'
  }
}

module.exports = {
  extendViewModel:  extendViewModel,
  extendKnockout:   extendKnockout,
}
