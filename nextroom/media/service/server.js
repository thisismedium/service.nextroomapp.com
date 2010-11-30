define(['exports', 'util'], function(exports, U) {

  exports.createClient = function() {
    return new Client();
  };

  function Client() {
    this.data = {};
  }

  Client.prototype.get = function(uri, next) {
    request('get', uri, { success: next });
    return this;
  };

  Client.prototype.put = function(uri, data, next) {
    request('put', uri, { success: next, data: data });
    return this;
  };

  function request(type, uri, opt) {
    console.debug('request', type, uri, opt);
    ($.type(uri) == 'array' ? requestAll : requestOne)(type, uri, opt);
  }

  // Make a JSON AJAX request.
  //
  // + type - String HTTP method.
  // + url  - String resource identifier.
  // + opt  - Object additional options (see $.ajax())
  //
  // Returns nothing.
  function requestOne(type, url, opt) {
    opt.type = type;
    opt.url = url;
    opt.contentType = 'application/json';
    opt.data = opt.data && JSON.stringify(opt.data);

    opt.error = opt.error || function(xhr, status) {
      U.error('Request failed:', url, status);
    };

    $.ajax(opt);
  }

  // Make several AJAX requests, but wait until they've all completed
  // to call back.
  //
  // + type - String HTTP method
  // + uris - Array of uris
  // + opt  - Object additional options (see $.ajax())
  //
  // Returns nothing.
  function requestAll(type, uris, opt) {
    var result = new Array(uris.length),
        waiting = result.length,
        error = null;

    if (waiting.length == 0)
      done();
    else {
      for (var i = 0, l = uris.length; i < l; i++)
        send(i);
    }

    function send(index) {
      var params = $.extend({}, opt);

      params.success = function(value) {
        result[index] = value;
        if (--waiting == 0)
          done();
      };

      params.error = function(xhr, status) {
        if (error === null) {
          error = new U.Error('requestAll failed:', uris[index], status);
          done();
        }
      };

      requestOne(type, uris[index], params);
    }

    function done() {
      if (error)
        (opt.error || U.error)(error);
      else
        opt.success(result);
    }
  }

});