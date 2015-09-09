# mosaico
Mosaico - Free/Opensource Responsive Email Template Editor

#### 2015/09/09 - Initial code commit
The main code has been extrapolated by production code used since the beginning of 2015 by thousands of users, so it should simply work, but please note that refactoring/translation/cleanup (to remove VOXmail proprietary code) could have created issues so this should be considered EXPERIMENTAL!.

Subscribe to our newsletter to get updates: http://mosaico.voxmail.it/user/register

### Build/Run

this may raise warnings about Knockout, ignore them:
```
  npm install
```
if you don't have it, install grunt-cli globally
```
  npm install -g grunt-cli
```
compile and runs a local webserver (http://127.0.0.1:9000) with incremental build and livereload
```
  grunt
```
in order to use image uploading/processing feature in Node you need imageMagick installed in your environment.
e.g: running "convert" and "identify" on the commandline should output imagemagick command line help.

create thumbnails for all templates found in "./templates":
```
grunt makeThumbs
```
creates only the "lm" template (./templates/versafix-1/template-versafix-1.html)
```
grunt makeThumbs:main:versafix-1
```

### Contact Us

Plase contact us if you have ideas, suggestions or, even better, you want to collaborate on this project: info@mosaico.io
