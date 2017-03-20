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

### Docker

We bundle a small Dockerfile based on centos7 to test mosaico with no need to install dependencies.
```
docker build -t mosaico/mosaico .
docker run -p 9006:9006 mosaico/mosaico
```
then open a browser to point to the port 9006 of your docker machine IP.

### Serving via Apache PHP or Django?
First you have to build it using grunt, then you can read (https://github.com/voidlabs/mosaico/wiki/Serving-Mosaico).

*Access Interpreting* wrote a sample [PHP backend](https://github.com/ainterpreting/mosaico-php-backend) so you can start from there if you want to use Mosaico with an Apache/PHP backend.

*Ryan Nowakowski* wrote a [Python/Django backend](https://github.com/tubaman/django-mosaic) and also wrote a [test-suite in Python](https://github.com/tubaman/mosaico-server-tests) to help testing Mosaico backends

### Are you having issues with Mosaico?

See the [CONTRIBUTING file](https://github.com/voidlabs/mosaico/blob/master/CONTRIBUTING.md)

### Contact Us

Please contact us if you have ideas, suggestions or, even better, you want to collaborate on this project or you need COMMERCIAL support: info@mosaico.io . Please DON'T write to this email to get free support: use Git issues for that.
