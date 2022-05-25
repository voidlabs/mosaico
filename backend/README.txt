This is a very simple backend to be used in a DEVELOPMENT environment.

Provides the following services:

/dl
  receives a post with the html body and a parameter asking for "download" or "email".
  (it does inlining using Juice) since Mosaico 0.15 CSS inlining happens in the client.
  if asked to send an email it sends it using nodemailer

/upload
  GET returns a JSON list of previously uploaded images 
  POST to upload images (using the jQuery-file-upload protocol)
  when uploading it also create thumbnails for each uploaded image.

/img
  GET with src, method and params query values
  method can be "placeholder", "cover" or "resize"
  "placeholder" will return a placeholder image with the given width/height (encoded in params as "width,height")
  "cover" will resize the image keeping the aspect ratio and covering the whole dimension (cutting it if different A/R)
  "resize" can receive one dimension to resize while keeping the A/R, or 2 to resize the image to be inside the dimensions.
  this uses "jimp" library to do manipulation (not very fast/secure, but we only use it for development).

This currently doesn't provide any authentication or security options, so don't use this in production!
