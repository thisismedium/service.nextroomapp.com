
/// ## Bootstrap ##

var NR = {};

(function($) {
  $(document).ready(function() {
    NR.init();
  });

  var root;

  NR.init = function() {
    root = Router.window();
    $('[role=main] > section').each(initSection);
    Router.window(Router.location());
    return this;
  };

  NR.error = function(obj) {
    if (obj)
      console.error.apply(console, (obj instanceof Error) ? obj.items : arguments);
    return this;
  };

  function Error() {
    this.items = Array.prototype.slice.call(arguments, 0);
  }

  Error.prototype.toString = function() {
    return 'Error: ' + this.items.join(' ');
  };

  
  // ## Sections ##

  function initSection() {
    var name = this.id,
        ctor = SECTIONS[name];

    if (ctor)
      ctor.apply(this, arguments);
    else
      NR.error('No constructor for section', name);
  }

  var SECTIONS = {};

  function defSection(name, ctor) {
    SECTIONS[name] = ctor;
    return ctor;
  }

  defSection('app', function() {
    var app = $(this),
        speed = 100;

    root.def('app', getModel(app));

    function getModel(root) {
      return {
        get: function(uri, next) {
          $.getJSON(uri, function(data, status) {
            next(null, listPanel(root, data));
          });
        },

        load: function(next) {
          app.show();
          next();
        },

        unload: function(next) {
          app.hide();
          next();
        }
      };
    }

    function listPanel(area, data) {
      var el = $('<ul class="panel" />');

      $.each(data, function(index, obj) {
        var anchor = $('<a/>').attr('href', '#' + obj.uri);
        anchor.html(obj.name);
        anchor.wrap('<li class="entry" />').parent().appendTo(el);
      });

      return {
        get: function(uri, next) {
          $.getJSON(uri, function(data, status) {
            next(null, detailForm(area, data));
          });
        },

        load: function(next) {
          el.appendTo(area).show();
          next();
        },

        unload: function(next) {
          el.remove();
          next();
        }
      };
    }

    function detailForm(area, data) {
      var form = $('#template .entry-detail').clone();

      form.submit(function(ev) {
        ev.preventDefault();
        console.debug('TODO: save form');
      });

      form.find('.buttons .cancel').click(function() {
        root.up();
      });

      $.each(data, function(key, val) {
        form.find('[name=' + key + ']:input').val(val);
      });

      return {
        load: function(next) {
          form.appendTo(area).show();
          next();
        },

        unload: function(next) {
          form.remove();
          next();
        }
      };
    }
  });

  
  // ## State ##

  var STATE = [];


  
  // ## Router ##

  function Router() {
    this.routes = {};
    this.state = [];
  }

  Router.location = function() {
    var hash = window.location.hash;
    return hash && hash.replace(/^#/, '');
  };

  Router.window = function(uri) {
    // Singleton for `onhashchange`.
    if (!this._window) {
      var router = this._window = new Router();
      $.hashchange(function() {
        router.resolve(Router.location());
      });

      router.up = function() {
        Router.window(Router.location().replace(/\/?[^\/]+\/?$/, ''));
        return this;
      };
    }

    if (uri)
      $.hashchange(uri);

    return this._window;
  };

  Router.prototype.resolve = function(uri, next) {
    var self = this,
        path = uri.split('/');

    next = next || NR.error;
    this._unwind(path, function(err) {
      err ? next(err) : self._wind(path, next);
    });
  };

  Router.prototype.def = function(name, route) {
    this.routes[name] = route;
    return this;
  };

  Router.prototype.get = function(name, next) {
    var route = this.routes[name];
    route ? next(null, route) : next(new Error('No route', name));
    return this;
  };

  Router.prototype._unwind = function(path, next) {
    var state = this.state,
        chop = 0;

    // Scan the current state to find the pivot point where the new
    // path diverges from it.
    for (var l = Math.min(state.length, path.length); chop < l; chop++)
      if (path[chop] != state[chop].name) break;

    // Unwind the state stack from right to left until all entries
    // after `chop` have been unloaded.
    unwind();

    function unwind(err) {
      if (err || (state.length <= chop))
        next(err);
      else {
        state.pop().unload(unwind);
      }
    }
  };

  Router.prototype._wind = function(path, next) {
    var state = this.state,
        index = state.length;

    if (index >= path.length)
      next(null);
    else
      (state[index - 1] || this).get(uri(), wind);

    function uri() {
      return path.slice(0, index + 1).join('/');
    }

    function wind(err, frame) {
      if (err)
        next(err);
      else if (!frame)
        next(new Error('Cannot load', path[index]));
      else {
        frame.name = path[index++];
        state.push(frame);
        frame.load(function(err) {
          if (err || index >= path.length)
            next(err);
          else
            frame.get(uri(), wind);
        });
      }
    }
  };

})(jQuery);


