define(['exports', './util'], function(exports, U) {

  exports.EventEmitter = EventEmitter;

  function EventEmitter() {
    this._listeners = {};
  }

  EventEmitter.prototype.on = function(name, handle) {
    var listening = this._listeners[name];

    if (!listening) {
      this._listeners[name] = handle;
      return this;
    }

    if (typeof listening == 'function') {
      listening = this._listeners[name] = [listening];
    }
    listening.push(handle);

    return this;
  };

  EventEmitter.prototype.emit = function(name) {
    var listening = this._listeners[name];

    if (!listening) {
      if (name != 'error') {
        console.error('uncaught error', this, arguments[1]);
      }
      return false;
    }

    if (typeof listening == 'function') {
      listening.apply(this, U.toArray(arguments, 1));
      return true;
    }

    var args = U.toArray(arguments, 1);
    for (var i = 0, l = listening.length; i < l; i++) {
      listening[i].apply(this, args);
    }

    return true;
  };

});
