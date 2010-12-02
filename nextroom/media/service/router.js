define(['exports', 'util', 'jquery.history'], function(exports, U) {

  exports.createRouter = function() {
    return new Router();
  };

  
  // ## Router ##

  function Router() {
    this.routes = {};
    this.state = [];
  }

  Router.prototype.load = function(route, view) {
    return this._defRoute('load', route, view);
  };

  Router.prototype.unload = function(route, view) {
    return this._defRoute('unload', route, view);
  };

  Router.prototype.listen = function() {
    var self = this;

    $.hashchange(function() {
      self._resolve(self.active());
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

  Router.prototype.isActive = function(req) {
    var active = (typeof req == 'string') ? this.active() : this.state;
    return ($.inArray(req, active) !== -1);
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

  Router.prototype._defRoute = function(name, pattern, view) {
    var routes = this.routes[name], route;

    if (!routes)
      routes = this.routes[name] = [];

    for (var i = 0, l = routes.length; i < l; i++) {
      if (pattern.source == routes[i].pattern.source) {
        route = routes[i];
        break;
      }
    }

    if (!route) {
      route = new Route(pattern);
      routes.push(route);
    }
    route.setView(view);

    return this;
  };

  Router.prototype._findRoute = function(name, uri) {
    var routes = this.routes[name], route, probe;

    if (routes)
      for (var i = 0, l = routes.length; i < l; i++) {
        route = routes[i];
        if ((probe = route.match(uri)))
          return new Request(this, route, probe);
      }

    return undefined;
  };

  Router.prototype._resolve = function(active) {
    var self = this, state = this.state, load, unload;

    // Do this in callback-style so each view has a chance to "block".
    U.aEach(active, clear, dispatch);

    // Load each active URI. If something is already loaded in its
    // slot, unload it first.
    function dispatch(index, uri, next) {
      var last = state[index];

      if (last && last.uri == uri)
        next();
      else if (!(load = self._findRoute('load', uri)))
        next(new U.Error('Cannot resolve "' + uri + '".'));
      else if (last && (unload = self._findRoute('unload', last.uri)))
        self._view(unload, load, function(err) {
          err ? next(err) : self._view((state[index] = load), next);
        });
      else
        self._view((state[index] = load), next);
    }

    // Unload any extra slots.
    function clear(err) {
      if (err)
        U.error(err);
      else if (state.length > active.length) {
        if ((unload = self._findRoute('unload', state.pop().uri)))
          self._view(unload, null, clear);
        else
          clear();
      }
      // else: all done
    }

  };

  Router.prototype._view = function(req) {
    return req._route.view.apply(null, arguments);
  };

  
  // ## Route ##

  function Route(pattern) {
    this.pattern = pattern;
  }

  Route.prototype.match = function(uri) {
    return uri.match(this.pattern);
  };

  Route.prototype.setView = function(view) {
    this.view = view;
    return this;
  };

  
  // ## Request ##

  function Request(app, route, match) {
    this._app = app;
    this._route = route;
    this.uri = match[0];
    for (var i = 0, l = match.length; i < l; i++)
      this[i] = match[i];
  }

});