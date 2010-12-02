define(['exports', 'util'], function(exports, U) {

  exports.createClient = function() {
    return new Client();
  };

  function Client() {
    this.waiting = {};
    this.aborting = null;
  }

  Client.prototype.get = function(uri, next) {
    if ($.type(uri) == 'array') {
      uri = $.map(uri, function(u) { return { type: 'get', uri: u }; });
      return this._sendAll(uri, next);
    }
    return this._send({ type: 'get', uri: uri }, next);
  };

  Client.prototype.post = function(uri, data, next) {
    return this._send({ type: 'post', uri: uri, data: data }, next);
  };

  Client.prototype.put = function(uri, data, next) {
    return this._send({ type: 'put', uri: uri, data: data }, next);
  };

  Client.prototype.del = function(uri, next) {
    return this._send({ type: 'delete', uri: uri }, next);
  };

  Client.prototype.stop = function(next) {
    var opt;

    if (U.isEmpty(this.waiting))
      next();
    else {
      this.aborting = next;
      for (var id in this.waiting) {
        if ((opt = this.waiting[id]).type == 'get')
          this._end(opt);
      }
    }
    return this;
  };

  Client.prototype._start = function(opt) {
    if (this.aborting)
      return false;
    this.waiting[opt.id = U.uniqueId()] = opt;
    $.ajax(opt);
    return true;
  };

  Client.prototype._end = function(opt) {
    if (opt.id in this.waiting) {
      delete this.waiting[opt.id];
      this._abort();
      return true;
    }
    return false;
  };

  Client.prototype._abort = function() {
    if (this.aborting && U.isEmpty(this.waiting)) {
      var fn = this.aborting;
      this.aborting = null;
      setTimeout(fn, 0);
    }
  };

  Client.prototype._send = function(opt, next) {
    var self = this;

    if (!opt.uri) {
      next();
      return this;
    }

    opt.url = opt.uri;
    opt.contentType = 'application/json';
    opt.data = opt.data && JSON.stringify(opt.data);

    opt.beforeSend = function(xhr) {
      opt.xhr = xhr;
    };

    opt.success = function(data) {
      if (self._end(opt))
        next(null, data);
    };

    opt.error = function(xhr, status) {
      if (self._end(opt)) {
        var type = xhr.getResponseHeader('Content-Type'),
            data = (type == 'application/json') ? JSON.parse(xhr.responseText) : undefined;
        next(XhrFailed(opt.uri, xhr), data);
      }
    };

    if (!this._start(opt))
      next(new U.Error('Cannot start a request during an abort.'));
    return this;
  };

  Client.prototype._sendAll = function(opts, next) {
    var self = this,
        result = {},
        waiting = opts.length,
        error = null;

    if (waiting == 0)
      done();
    else {
      for (var i = 0, l = opts.length; i < l; i++)
        send(i);
    }

    function send(index) {
      var opt = opts[index];
      self._send(opt, function(err, data) {
        result[opt.uri] = data;
        if (err || --waiting == 0)
          done(err);
      });
    }

    function done(err) {
      if (!err && !error)
        next(null, result);
      else if (!error)
        next(error = err);
      // else: there's already been an error, ignore this
    }
  };

  function XhrFailed(uri, xhr) {
    var err = new U.Error('Request failed: ' + xhr.status);
    err.uri = uri;
    err.status = xhr.status;
    return err;
  }

});