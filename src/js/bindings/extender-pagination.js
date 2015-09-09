"use strict";

var ko = require("knockout");

ko.extenders.paging = function(target, pageSize) {
  var _pageSize = ko.observable(pageSize || 10),
    // default pageSize to 10
    _currentPage = ko.observable(1); // default current page to 1
  target.pageSize = ko.computed({
    read: _pageSize,
    write: function(newValue) {
      if (newValue > 0) {
        _pageSize(newValue);
      } else {
        _pageSize(10);
      }
    }
  });

  target.currentPage = ko.computed({
    read: _currentPage,
    write: function(newValue) {
      if (newValue > target.pageCount()) {
        _currentPage(target.pageCount());
      } else if (newValue <= 0) {
        _currentPage(1);
      } else {
        _currentPage(newValue);
      }
    }
  });

  target.pageCount = ko.computed(function() {
    return Math.ceil(target().length / target.pageSize()) || 1;
  });

  target.currentPageData = ko.computed(function() {
    var pageSize = _pageSize(),
      pageIndex = _currentPage(),
      startIndex = pageSize * (pageIndex - 1),
      endIndex = pageSize * pageIndex;

    return target().slice(startIndex, endIndex);
  });

  target.moveFirst = function() {
    target.currentPage(1);
  };
  target.movePrevious = function() {
    target.currentPage(target.currentPage() - 1);
  };
  target.moveNext = function() {
    target.currentPage(target.currentPage() + 1);
  };
  target.moveLast = function() {
    target.currentPage(target.pageCount());
  };

  return target;
};