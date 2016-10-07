# Mosaico - Responsive Email Template Editor

Mosaico is a JavaScript library (or maybe a single page application) supporting the editing of email templates.
The great thing is that Mosaico itself does not define what you can edit or what styles you can change: this is defined by the template. This makes Mosaico very flexible.


![Mosaico Screenshot](res/img/screenshot.png)


At this time we provide a single template to illustrate some best practice examples: more templates will come soon! Please get in touch with us if you want to make your email html template "Mosaico ready".

### Live demo
On https://mosaico.io you can see a live demo of Mosaico: the live deploy has a custom backend (you don't see it) and some customization (custom Moxiemanager integration, customized onboarding slideshow, contextual menu, and some other small bits), but 95% of what you see is provided by this library. You will also see a second working template there: we are still working to open source it. Stay tuned!

#### News

Subscribe to our newsletter to get updates: http://mosaico.voxmail.it/user/register

### More Docs from the Wiki

[Mosaico Basics](https://github.com/voidlabs/mosaico/wiki)

[Developer Notes](https://github.com/voidlabs/mosaico/wiki/Developers)

### Build/Run  [![Build Status](https://travis-ci.org/voidlabs/mosaico.svg)](https://travis-ci.org/voidlabs/mosaico)

You need NodeJS v6.0 or higher + ImageMagick

this may raise warnings about Knockout, ignore them. It will probably fail on some colorpicker dependency, just run it again and will work:
```
  npm install
```
if you don't have it, install grunt-cli globally
```
  npm install -g grunt-cli
```
compile and run a local webserver (http://127.0.0.1:9006) with incremental build and livereload
```
  grunt
```
*IMPORTANT* in order to use image uploading/processing feature in Node you need imageMagick installed in your environment.
e.g. running "convert" and "identify" on the command line should output imageMagick command line help (if you are on Windows and install imageMagick 7.x then make sure to install ["legacy utilities"](https://github.com/aheckmann/gm/issues/559)).

If you create your own template you can generate the needed "thumbnails"/"block thumbnails" by running:
```
grunt makeThumbs:main:yourtemplatename
```

*NOTE* we have reports that default Ubuntu node package have issues with building Mosaico via Grunt. If you see a ```Fatal error: watch ENOSPC``` then have a look at https://github.com/voidlabs/mosaico/issues/82

### Serving via Apache PHP or Django?
First you have to build it using grunt, then you can read (https://github.com/voidlabs/mosaico/wiki/Serving-Mosaico).

*Access Interpreting* wrote a sample [PHP backend](https://github.com/ainterpreting/mosaico-php-backend) so you can start from there if you want to use Mosaico with an Apache/PHP backend.

*Ryan Nowakowski* wrote a [Python/Django backend](https://github.com/tubaman/django-mosaic) and also wrote a [test-suite in Python](https://github.com/tubaman/mosaico-server-tests) to help testing Mosaico backends

### Are you having issues with Mosaico?

Please make sure:
- you understand you have to build it and to run a backend server (either the node.js version bundled with this project or the php backend referenced above or write your own)
- you read this Readme *three* times and followed the instructions
- you understand I'll close any GitHub issue with insufficient information: if you want help then you'll have to take your time to explain your issue.
- you don't ask for a binary/executable to be used as a standalone desktop application
- you understand you can't simply open index.html/editor.html and expect it to work if you don't build the library and don't run a backend server and access that files through the webserver.
- you don't add off topic comments to an existing issue: if you want to add that you are having the same issue please make sure you are having the same issue described. If you are unsure, open a new issue following the rules (I prefer a duplicated issue than a chaotic issue mixing unrelated things).

##### issues building:
- take note of the full log of your npm install, and grunt commands output
- open a GitHub issues saying that you read this doc
- paste the output from npm install and grunt
- write your full environment (your operative system name and version, your node version, your npm version)

##### issues running/editing
if your problem is not with the building then when you open a GitHub issue:
- make sure you specify if you are using the bundled backend or php backend or any other kind of deployment
- tell us the browser you are using (name and version) and test at least a *second* browser to tell us if this happen in both or only one (tell us the details about the second browser too).
- test the same scenario on https://mosaico.io and tell us if you see the same issue
- if you are having issues running with Apache then specify you installed the php backend from access interpreting and WHY you think you are having problem with mosaico.js and not with that specific backend (did you try with bundled node.js backend?)

##### rendering issues with templates generated by Mosaico
- open an issue only if you have a screenshot
- when you open an issue please tell us what template you are using
- tell which email client show the issue (version, name, operative system)
- tell us which backend you are using (the bundled one ran with grunt, the php backend referenced above, or your custom backend).
- if you are sending the email using a different way then most of the times the template gets broken by your way to send it: so try the same thing on mosaico.io and confirm you see the same rendering issues.

### Contact Us

Please contact us if you have ideas, suggestions or, even better, you want to collaborate on this project or you need COMMERCIAL support: info@mosaico.io . Please DON'T write to this email to get free support: use Git issues for that.
