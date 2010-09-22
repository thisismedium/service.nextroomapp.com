/// # jquery.history.js #
//
// Support `onhashchange` event in more browsers.
//
// For hints about supporting more browsers, see YUI history plugin:
//
//   + Safari <= 2.0 could be supported with a history.length hack
//   + IE < 8 could be supported by using an iFrame.

(function($) {

  // ## jQuery ##

  $.hashchange = function(fn) {
    // Trigger an event.
    // $.hashchange()
    if (fn === undefined)
      notify();
    // Change the current location.
    // $.hashchange('some/local/uri/...')
    else if (typeof fn == 'string')
      load(fn);
    // Listen for a hashchange event.
    // $.hashchange(function() { ... })
    else if (fn) {
      $window.bind('hashchange', fn);
      start();
    }
    return this;
  };

  // ## Helper Methods ##

  function location() {
    var hash = window.location.hash;
    return hash && hash.replace(/^#/, '');
  }

  function notify() {
    $window.trigger('hashchange');
  }

  function load(uri) {
    if (location() == uri)
      notify();
    else
      window.location.hash = uri;
  }

  function start() {
    !teardown && setup();
  }

  function stop() {
    teardown && teardown();
  }

  // ## Polling Loops ##

  var DELAY = 50,
      $window = $(window),
      teardown = null;

  function setup() {
    // Native support: FF 3.6+, IE 8+, Webkit 528+
    if ('onhashchange' in window)
      teardown = function() {};
    // Fall back to polling.  Older versions of IE and Safari 2.0
    // do not support this.
    else {
      var interval = setInterval(poll(), DELAY);
      teardown = function() {
        clearInterval(interval);
      };
    }
  }

  function poll() {
    var current = window.location.hash,
        probe;

    return function loop() {
      probe = window.location.hash;
      if (probe !== current) {
        current = probe;
        notify();
      }
    };
  }

})(jQuery);