var tinycolor = require('tinycolor');

function Color(tinycolor) {
  this.getBrightness = function(color) {
    return tinycolor(color).getBrightness();
  };
  this.isLight = function(color) {
    return tinycolor(color).isLight();
  };
  this.isDark = function(color) {
    return tinycolor(color).isDark();
  };
  this.getLuminance = function(color) {
    return tinycolor(color).getLuminance();
  };


  this.lighten = function(color, amount) {
    return tinycolor(color).lighten(amount).toHexString();
  };
  this.brighten = function(color, amount) {
    return tinycolor(color).brighten(amount).toHexString();
  };
  this.darken = function(color, amount) {
    return tinycolor(color).darken(amount).toHexString();
  };
  this.desaturate = function(color, amount) {
    return tinycolor(color).desaturate(amount).toHexString();
  };
  this.saturate = function(color, amount) {
    return tinycolor(color).saturate(amount).toHexString();
  };
  this.greyscale = function(color) {
    return tinycolor(color).greyscale().toHexString();
  };
  this.spin = function(color, amount) {
    return tinycolor(color).spin(amount).toHexString();
  };
  this.complement = function(color) {
    return tinycolor(color).complement().toHexString();
  };

  this.mix = tinycolor.mix;
  this.readability = tinycolor.readability;
  this.isReadable = tinycolor.isReadable;
  this.mostReadable = tinycolor.mostReadable;
}

var colorPlugin = function(vm) {
  global.Color = new Color(tinycolor);
};

module.exports = colorPlugin;