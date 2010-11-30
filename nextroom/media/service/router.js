define(['exports', 'util', 'jquery.history'], function(exports, U) {

  exports.createRouter = function() {
    return new Router(U.toArray(arguments));
  };

  
  // ## Router ##

  function Router(routes) {
    this.routes = routes || [];
    this.state = [];
  }

  Router.prototype.load = function(route, view) {
    return this._view('load', route, view);
  };

  Router.prototype.unload = function(route, view) {
    return this._view('unload', route, view);
  };

  Router.prototype.listen = function() {
    var self = this;

    $.hashchange(function() {
      self._resolve.apply(self, self.active());
    }).hashchange();

    return self;
  };

  Router.prototype.location = function(uri) {
    if (uri === undefined) {
      var hash = window.location.hash;
      return hash && hash.replace(/^#!/, '');
    }
    else {
      console.debug('location!', uri);
      window.location.href = this.href(uri);
      return this;
    }
  };

  Router.prototype.href = function(uri) {
    return '#!' + ($.type(uri) == 'array' ? uri.join(';') : uri);
  };

  Router.prototype.active = function() {
    return this.location().split(/;+/);
  };

  Router.prototype.isActive = function(uri) {
    return ($.inArray(uri, this.active()) !== -1);
  };

  Router.prototype.push = function(uri) {
    var active = this.active();
    active.push(uri);
    return this.location(active);
  };

  Router.prototype.pop = function(uri) {
    var active = this.active();
    if (uri === undefined)
      active = active.pop();
    else
      active = $.grep(active, function(v) { return v != uri; });
    return this.location(active);
  };

  Router.prototype.toggle = function(uri) {
    return this.isActive(uri) ? this.pop(uri) : this.push(uri);
  };

  Router.prototype._view = function(name, pattern, view) {
    var route;

    for (var i = 0, l = this.routes.length; i < l; i++) {
      if (pattern.source == this.routes[i].pattern.source) {
        route = this.routes[i];
        break;
      }
    }

    if (!route) {
      route = new Route(pattern);
      this.routes.push(route);
    }

    route.on(name, view);
    return this;
  };

  Router.prototype._resolve = function() {
    var state = this.state, i, l, uri, prev, next;

    for (i = 0, l = arguments.length; i < l; i++) {
      uri = arguments[i];
      prev = state[i];
      if (prev && prev.uri == uri) continue;

      next = this._request(uri);
      if (!next) {
        U.error('Cannot resolve "' + uri + '".');
        continue;
      }

      console.debug('unload:', prev && prev.uri, 'load:', next.uri);
      prev && this.emit('unload', prev, next);
      state[i] = next;
      this.emit('load', next, prev);
    }

    while (state.length > l)
      this.emit('unload', state.pop());
  };

  Router.prototype._request = function(uri) {
    var routes = this.routes, route, probe;

    for (var i = 0, l = routes.length; i < l; i++) {
      route = this.routes[i];
      if ((probe = route.match(uri)))
        return new Request(this, route, probe);
    }

    return undefined;
  };

  Router.prototype.emit = function(name, req, related) {
    var fn = req.route.listeners[name];
    if (fn)
      fn.call(this, req, related);
    return this;
  };

  
  // ## Route ##

  function Route(pattern, view) {
    this.pattern = pattern;
    this.listeners = {}; // FIXME: make some sort of Event Emitter
  }

  Route.prototype.match = function(uri) {
    return uri.match(this.pattern);
  };

  Route.prototype.on = function(name, fn) {
    this.listeners[name] = fn;
    return this;
  };

  
  // ## Request ##

  function Request(app, route, match) {
    this.app = app;
    this.route = route;
    this.uri = match[0];
    for (var i = 0, l = match.length; i < l; i++)
      this[i] = match[i];
  }

});