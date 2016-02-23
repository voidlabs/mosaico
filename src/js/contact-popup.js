(function () {
  'use strict';

  var $iframe     = $('iframe');
  var $container;
  var waitingTime = 45 // in second

  init();

  function init() {
    $iframe.wrap('<div class="popup-container"><div class="in"></div></div>');
    $('.popup-container .in').append('<div class="popup-close"><i class="fa fa-times-circle"></i></div>');
    $container = $('.popup-container');
    $('.popup-close').on('click', remove);
    setTimeout(open, waitingTime * 1000);
  }

  function open() {
    $container.addClass('is-open')
    setTimeout(function() {
      $container.css('opacity', 1);
    }, 1)
  }

  function remove() {
    $container.css('opacity', 0);
    $container.on('transitionend', function () {
      $container.remove();
    });
  }
}());
