var page = require('webpage').create(),
    system = require('system'),
    address, output, size, selector, margin;


function setSize(page, size) {
  pageWidth = parseInt(size[0], 10);
  pageHeight = parseInt(size[1], 10);
  page.viewportSize = { width: pageWidth, height: pageHeight };
  page.clipRect = { top: 0, left: 0, width: pageWidth, height: pageHeight };
}

function setClipRect(page, rect, margin, ratio) {
	var h = rect.height + margin*2;
	var w = rect.width + margin*2;
	if (w*ratio > h) w = h / ratio;
	else h = w * ratio;
	console.log("clipRect", rect.top - margin, rect.left - margin, w, h );
	page.clipRect = { top: rect.top - margin, left: rect.left - margin, width: w, height: h };
}


var isFunction = function(o) {
  return typeof o == 'function';
};


var bind,
  slice = [].slice,
  proto = Function.prototype,
  featureMap;

featureMap = {
  'function-bind': 'bind'
};

function has(feature) {
  var prop = featureMap[feature];
  return isFunction(proto[prop]);
}

// check for missing features
if (!has('function-bind')) {
  // adapted from Mozilla Developer Network example at
  // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
  bind = function bind(obj) {
    var args = slice.call(arguments, 1),
      self = this,
      nop = function() {
      },
      bound = function() {
        return self.apply(this instanceof nop ? this : (obj || {}), args.concat(slice.call(arguments)));
      };
    nop.prototype = this.prototype || {}; // Firefox cries sometimes if prototype is undefined
    bound.prototype = new nop();
    return bound;
  };
  proto.bind = bind;
}

if (system.args.length < 5 || system.args.length > 5) {
    console.log('Usage: thumbnailer.js renderWIDTH outputWIDTH URL destfolder');
    phantom.exit(1);
} else {
    address = system.args[3];
    destFolder = system.args[4];
    size = [ system.args[1], 1000 ];
    setSize(page, size);
    margin = 0;

    page.onError = function(msg, trace) {
        var msgStack = ['ERROR: ' + msg];
        if (trace && trace.length) {
            msgStack.push('TRACE:');
            trace.forEach(function(t) {
                msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
            });
        }
        console.error(msgStack.join('\n'));
    };
    
    page.open(address, function (status) {
        if (status !== 'success') {
            console.log('Unable to load the address!');
            phantom.exit();
        } else {
                 
            /* console.log('content', page.content); */
            page.evaluate(function (){
                var bbody=document.getElementsByTagName('body')[0];
                bbody.setAttribute("class",bbody.getAttribute("class")+" preview");
                
            });
            window.setTimeout(function () {
                var blockNames = page.evaluate(function() {
                	var nodelist = document.querySelectorAll('[data-ko-container] [data-ko-block]');
                	var blockNames = [];
                	for (var i = 0; i < nodelist.length; i++) {
                		blockNames.push(nodelist[i].getAttribute('data-ko-block'));
                	}
                  blockNames.push("_full");
                	return blockNames;
                });
                console.log(blockNames);
                var b64s = [];
                var boundRects = [];
                var _getBoundingRect = function(selector) {
            	  	// console.log("X", document.querySelector(selector));
            	  	// return { left: 10, top: 10, width: 500, height: 100 };
                  return document.querySelector(selector).getBoundingClientRect();
            	  };
                for (var i = 0; i < blockNames.length; i++) {
                	var sel;
	                var	blockName = blockNames[i];
	                if (blockName == '_full') {
	                	sel = 'body';
	                } else {
	                	sel = '[data-ko-block='+blockName+']';
	                }
	                // console.log("renderding "+i+" "+blockNames[i]);
	            	  var boundRect2 = page.evaluate(_getBoundingRect, sel);
                  var boundRect = {};
	            	  boundRect.width = size[0];
	            	  boundRect.left = 0;
                  boundRect.top = boundRect2.top;
                  boundRect.height= boundRect2.height;
	                setClipRect(page, boundRect, margin, boundRect.height/boundRect.width);
	
	                boundRects.push(boundRect);
	                b64s.push(page.renderBase64('PNG'));
	              }
	              
	             
	              i = 0;
	              
	              var process = function(boundRects, arg2) {
	                // console.log("saving", i, blockNames[i]);
                	var blockName = blockNames[i];
	
	                page.onLoadFinished = function(status) {
	                    var res = page.render(destFolder+"/"+blockName+'.png');
	                    console.log("finished "+i+" "+res);
	                    if (i == blockNames.length - 1) {
	                    	console.log("exiting");
		                    if (res) phantom.exit();
		                    else phantom.exit(1);
		                  } else {
		                  	i++;
		                  	process(boundRects, arg2);
		                  }
	                };
	                 

	                var imgsize = [ arg2, Math.ceil(boundRects[i].height / boundRects[i].width * arg2) ];
	                // console.log("outsize", imgsize[0], imgsize[1]);
	                var imgcontent = '<html><body style="margin: 0; background: #fff;"><img src="data:image/png;base64,'+b64s[i]+'" alt="N/A" width="'+imgsize[0]+'" height="'+imgsize[1]+'" /></body></html>';
	                setSize(page, imgsize);
	                page.content = imgcontent;
	              };
	              
	              process(boundRects, system.args[2]);

            }, 2000);

        }
    });

}
