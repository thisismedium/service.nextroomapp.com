define(['exports', 'util', 'jquery.history'], function(exports, U) {

  exports.createStack = createStack;
  exports.Stack = Stack;
  exports.location = location;

  function createStack(routes) {
    return (new Stack(routes)).location(location());
  }

  
  // ### Stack ###

  function Stack(routes) {
    this.routes = {};
    this.state = [];

    if (routes)
      for (var uri in routes)
        this.def(uri, routes[uri]);

    var self = this;
    $.hashchange(function() {
      self.location(location());
    });
  }

  Stack.prototype.location = function(uri, next) {
    var self = this,
        parts = splitUri(uri);

    next = next || U.noop;

    this._unload(parts, function(err) {
      err ? next(err) : self._load(parts, next);
    });

    return this;
  };

  Stack.prototype.def = function(uri, route) {
    this.routes[uri] = route;
    return this;
  };

  Stack.prototype.load = function(frame, next) {
    var route = this.routes[frame.uri];
    !route ? next(new Error('No route', frame.uri)) : route(frame, next);
    return this;
  };

  Stack.prototype._unload = function _unload(path, next) {
    var state = this.state,
        pivot = 0;

    // Scan the current state to find the pivot point where the new
    // path diverges from it.
    for (var l = Math.min(state.length, path.length); pivot < l; pivot++)
      if (path[pivot] != state[pivot].name) break;

    // Unwind the state stack from right to left until all entries
    // after `pivot` have been unloaded.
    unload();

    function unload(err) {
      if (err || (state.length <= pivot))
        next(err);
      else
        state.pop().unload(unload);
    }
  };

  Stack.prototype._load = function _load(path, next) {
    var self = this,
        state = this.state;

    load();

    function load(err) {
      if (err || (state.length >= path.length))
        next(err);
      else {
        var frame = new Frame(self, path.slice(0, state.length + 1).join('/')),
            last = state[state.length - 1] || self;
        state.push(frame);
        last.load(frame, load);
      }
    }
  };

  function Frame(stack, uri) {
    this.stack = stack;
    this.uri = uri;
  }

  Frame.prototype.load = function(frame, next) {
    next(new U.Error(this.uri, "doesn't know how to load", frame.uri));
  };

  Frame.prototype.loader = function(load) {
    this.load = load;
    return this;
  };


  
  // ### Helpers ###

  function location() {
    var hash = window.location.hash;
    return hash && hash.replace(/^#!/, '');
  }

  function splitUri(uri) {
    return uri.split('/');
  }

});