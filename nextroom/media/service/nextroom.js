
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
            next(null, listPanel(uri, root, data));
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

    function listPanel(uri, area, data) {
      var el = $('<ul class="panel" />');

      $('<span/>')
        .text('FIXME: Header')
        .append('<input type="button" class="add" value="+" />')
        .wrap('<li class="header" />')
          .parent()
          .appendTo(el);

      $.each(data, function(index, obj) {
        makeEntry(obj);
      });

      function makeEntry(obj) {
        $('<a/>').attr('href', '#' + obj.uri)
          .text(obj.name || '')
          .append('<input type="button" class="delete" value="x" />')
          .wrap('<li class="entry" />')
            .parent()
            .data('nextroom', obj)
            .appendTo(el);
        return obj;
      }

      sortable('.entry', el, function(entries) {
        var data = entries.map(function() {
          return $.data(this, 'nextroom');
        });

        request('put', uri, {
          data: data.get(),
          success: function(data) {
            console.debug('FIXME: SORTED!');
          }
        });
      });

      el.find('.add').click(function(ev) {
        // FIXME: using "/new" is cheating.
        // FIXME: better name
        // FIXME: hook up sortable and delete
        var obj = makeEntry({ uri: uri, name: 'New Item' });
        Router.window(uri);
        detailForm('post', area, obj).load(function() {
          console.debug('FIXME: get this on the stack.');
        });
      });

      el.find('.delete').click(function(ev) {
        var uri = this.parentNode.href.replace(/^.*#/, ''),
            entry = $(this).parents('.entry');

        request('delete', uri, {
          success: function() {
            // FIXME: maybe blur form first?
            entry.remove();
          }
        });

        return false;
      });

      return {
        get: function(uri, next) {
          $.getJSON(uri, function(data, status) {
            next(null, detailForm('put', area, data));
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

    function detailForm(method, area, data) {
      var form = $('#template .entry-detail').clone();

      form.submit(function(ev) {
        ev.preventDefault();
        request(method, data.uri, {
          data: formData(form),
          success: function(data) {
            // FIXME: update form
            // FIXME: update list
            console.debug('Saved!', data);
          }
        });
      });

      formData(form, data)
        .find('.buttons .cancel').click(function() {
          root.up();
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

  function request(type, url, opt) {
    opt.type = type;
    opt.url = url;
    opt.contentType = 'application/json';
    opt.data = opt.data && JSON.stringify(opt.data);

    opt.error = opt.error || function(xhr, status) {
      NR.error('Failed to save', data.uri, status);
    };

    $.ajax(opt);
  }

  function formData(form, data) {
    if (data !== undefined) {
      $.each(data, function(key, val) {
        form.find('[name=' + key + ']:input').val(val);
      });
      return form;
    }
    else {
      data = {};
      form.find('[name]:input').each(function() {
        data[this.name] = $(this).val();
      });
      return data;
    }
  }

  function sortable(selector, list, onDrop) {
    var _drag,
        items = list.children(selector)
          .attr('draggable', 'true')
          .bind('dragstart', drag_start)
          .bind('dragend', drag_end)
          .bind('dragenter', drag_enter)
          .bind('dragover', drag_over)
          .bind('drop', drop);

    function item(obj) {
      return $(obj).up(selector);
    }

    function drag_start(ev) {
      _drag = item(ev.target).addClass('drag');
      ev.originalEvent.dataTransfer.setData('FireFox', 'requires this');
      return true;
    }

    function drag_end(ev) {
      item(ev.target).removeClass('drag')
        .siblings().andSelf().removeClass('over');
    }

    function drag_enter(ev) {
      item(ev.target)
      // Do this here instead of dragleave because of the order
      // WebKit fires events for nested elements.
        .siblings('.over').removeClass('over').end()
        .addClass('over');
    }

    function is_drop(elem) {
      return (elem != _drag[0]) && (elem.parentNode == _drag[0].parentNode);
    }

    function drag_over(ev) {
      // Return "false" if dropping is allowed.
      return !is_drop(item(ev.target).get(0));
    }

    function drop(ev) {
      // Place the dragged node on the "other side" of the drop
      // target depending on their relative position.
      var drop = item(ev.target).removeClass('over');
      drop[(drop.index() > _drag.index()) ? 'after' : 'before'](_drag);
      _drag = undefined;
      onDrop(items);
      return false;
    }

    return list;
  }

   // Starting with the current query, try to match the selector
   // otherwise try parent().
   $.fn.up = function(sel) {
     var item = this;
     while (item && !item.is(sel)) {
       item = item.parent();
     }
     return item;
   };

   // down() -- a shallow find/each
   //
   // Walk downward, until the selector is matched.  Call fn() on
   // matched each matched item.  Don't traverse into matched item.
   $.fn.down = function(sel, fn) {
     var queue = this.get(),
         elem, item, idx, lim;

     while (queue.length > 0) {
       elem = queue.shift();
       item = $(elem);
       if (!item.is(sel))
         $.merge(queue, item.children());
       else if (false === fn.call(queue[idx], item))
       break;
     }

     return this;
   };

  
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


