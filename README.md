# Mosaico - Responsive Email Template Editor

Mosaico is a javascript library (or maybe a single page application) supporting the editing of email templates.
The great thing is that Mosaico itself does not define what you can edit or what styles you can change: this is defined by the template. This makes Mosaico very flexible.


![Mosaico Screenshot](res/img/screenshot.png)


At this time we provide a single template to show the best practices: more templates will come soon! Please get in touch with us if you want to make your email html template "Mosaico ready".

### Live demo
On http://mosaico.io you can see a live demo of Mosaico: the live deploy has a custom backend (you don't see it) and some customization (custom Moxiemanager integration, customized onboarding slideshow, contextual menu, and some other small bits), but 95% of what you see is provided by this library. You will also see a second working template there: we are still working to opensource it.. stay tuned!

#### 2015/09/09 - Initial code commit
The main code has been extracted by production code used since the beginning of 2015 by thousands of users, so it should simply work, but please note that refactoring/translation/cleanup (to remove VOXmail proprietary code) may have created issues so this should be considered EXPERIMENTAL!.

Subscribe to our newsletter to get updates: http://mosaico.voxmail.it/user/register

### More Docs from the Wiki

[Mosaico Basics](https://github.com/voidlabs/mosaico/wiki)

[Developer Notes](https://github.com/voidlabs/mosaico/wiki/Developers)

### Build/Run  [![Build Status](https://travis-ci.org/voidlabs/mosaico.svg)](https://travis-ci.org/voidlabs/mosaico)

this may raise warnings about Knockout, ignore them. It will probably fail on some colorpicker dependency, just run it again and will work:
```
  npm install
```
if you don't have it, install grunt-cli globally
```
  npm install -g grunt-cli
```
compile and run a local webserver (http://127.0.0.1:9000) with incremental build and livereload
```
  grunt
```
*IMPORTANT* in order to use image uploading/processing feature in Node you need imageMagick installed in your environment.
e.g: running "convert" and "identify" on the commandline should output imagemagick command line help.


If you create your own template you can generate the needed "thumbnails"/"block thumbnails" by running:
```
grunt makeThumbs:main:yourtemplatename
```

### Serving via Apache PHP?
First you have to build it using grunt, then you can read (https://github.com/voidlabs/mosaico/wiki/Serving-Mosaico).

*Access Interpreting* wrote a sample [PHP backend](https://github.com/ainterpreting/mosaico-php-backend) so you can start from there if you want to use mosaico with an Apache/PHP backend.

### Contact Us

Plase contact us if you have ideas, suggestions or, even better, you want to collaborate on this project or you need COMMERCIAL support: info@mosaico.io . Please DON'T write to this email to get free support: use Git issues for that.
