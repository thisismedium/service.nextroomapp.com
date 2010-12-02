define(['./util', './router', './server', './mouse'], function(U, Router, Server) {

  function Main(selector) {
    this.el = $(selector);
    this.app = new App('#app');
    this.help = new Help('#help');
    this.view = null;
  }

  function fail(err) {
    U.error(err);
  }

  function mainView() {
    return ($.browser.webkit) ? $('body') : $('html');
  }

  
  // ## App ##

  function App(selector) {
    this.el = $(selector);
    this.api = new Server.createClient();

    this.menu = new AppMenu('#app-menu');
    this.items = new InstanceList('#app-kind');
    this.editor = new Editor('#app-editor');
    this.tips = new Tips('#app-tips');

    var self = this;

    this.el.bind('sorted', function(ev) {
      ev.changed.addClass('saving');
      self.api.put(self.items.uri(), self.items.value(), function(err) {
        err ? fail(err) : ev.changed.removeClass('saving');
      });
    });

    this.el.bind('add', function(ev) {
      ui.location(U.join(self.items.uri(), 'new'));
    });

    this.el.bind('del', function(ev, data) {
      var item = self.items.find(data.uri).addClass('saving');
      self.api.del(data.uri, function(err) {
        if (err)
          fail(err);
        else {
          item.removeClass('saving');
          self.items.remove(data.uri);
        }
      });
    });

    this.el.bind('up', function(ev) {
      mainView().scrollTo(self.items.el);
    });

    this.el.bind('cancel', function(ev, uri) {
      ui.location(U.dirname(uri));
    });

    this.el.bind('submit', function(ev) {
      ev.preventDefault();
      var form = ev.target,
          uri = form.action,
          method = form.method,
          value = $(form).formData();

      self.api[method](uri, value, function(err, data) {
        if (err) {
          if (err.status == 400)
            self.editor.showErrors(data);
          else
            fail(err);
        }
        else if (method == 'post') {
          self.items.push(data);
          ui.location(data.uri);
        }
        else {
          self.items.update(uri, value);
        }
      });
    });
  }

  App.prototype.show = function(fn) {
    if (!this.el.is(':visible'))
      this.el.fadeIn('fast', fn);
    return this;
  };

  App.prototype.hide = function(fn) {
    if (this.el.is(':visible'))
      this.el.fadeOut('fast', fn);
    return this;
  };

  App.prototype.wait = function(next) {
    this.api.stop(next);
    return this;
  };

  App.prototype.load = function(kind, edit) {
    var self = this,
        need = [null, null],
        newItem = false;

    if (!this.items.hasLoaded(kind))
      need[0] = kind;
    if (edit && !this.editor.hasLoaded(edit)) {
      if (/\/new$/.test(edit))
        newItem = true;
      else
        need[1] = edit;
    }


    this.api.get(need, function(err, data) {
      if (err)
        fail(err);
      else {
        self.menu.select(kind);
        if (data[kind])
          self.items.load(kind, data[kind]).show();
        self.items.select(edit);
        if (newItem)
          self.editor.newItem(edit).show();
        else if (data[edit])
          self.editor.load(edit, data[edit]).show();
      }
    });

    return this;
  };

  App.prototype.unload = function(kind, edit) {
    console.log('unload app?', edit, this.editor.uri(), this.editor.hasLoaded(edit), kind, this.items.hasLoaded(kind));
    if (!this.editor.hasLoaded(edit))
      this.editor.unload().hide();
    if (!this.items.hasLoaded(kind))
      this.items.unload().hide();
    return this;
  };

  
  // ### AppMenu ###

  function AppMenu(selector) {
    this.el = $(selector);
    this.list = null;
  }

  AppMenu.prototype.select = function(uri) {
    selectEntry(this.el, uri);
    return this;
  };

  AppMenu.prototype.find = function(uri) {
    return findEntry(this.el, uri);
  };

  
  // ### InstanceList ###

  function InstanceList(selector) {
    this.el = $(selector);
  }

  InstanceList.prototype.uri = function() {
    return this.el.data('uri');
  };

  InstanceList.prototype.hasLoaded = function(uri) {
    return this.uri() == uri;
  };

  InstanceList.prototype.show = function() {
    this.el.addClass('active');
    return this;
  };

  InstanceList.prototype.hide = function() {
    this.el.removeClass('active');
    return this;
  };

  InstanceList.prototype.load = function(uri, data) {
    if (!this.hasLoaded(uri)) {
      var self = this;
      this._build('loading', function(list) {
        self._title(list, uri);
        for (var i = 0, l = data.length; i < l; i++)
          self._push(list, data[i]);
      });
      this.el.data('uri', uri);
    }
    return this;
  };

  InstanceList.prototype.unload = function() {
    this.list = null;
    this.el.empty().data('uri', null);
    return this;
  };

  InstanceList.prototype.push = function(item) {
    var self = this;
    this._build(null, function(list) {
      self._push(list, item);
    });
    return this;
  };

  InstanceList.prototype.update = function(uri, data) {
    this._bind(this.find(uri), data);
    return this;
  };

  InstanceList.prototype.remove = function(uri) {
    this.find(uri).remove();
    return this;
  };

  InstanceList.prototype.find = function(uri) {
    return findEntry(this.el, uri);
  };

  InstanceList.prototype.select = function(uri) {
    console.log('select', uri);
    selectEntry(this.el, uri);
    return this;
  };

  InstanceList.prototype.value = function() {
    var data = [];
    if (this.list)
      this.list.children('.entry')
        .each(function(_, el) {
          console.log('found value', el, $.data(el, 'value'));
          data.push({ uri: $.data(el, 'value').uri });
        });
    return data;
  };

  InstanceList.prototype._build = function(state, body) {
    var self = this;

    if (state)
      this.el.addClass(state);

    if (!this.list) {
      var list = $('<ul class="sortable" />'),
          add = $('<button class="add" value="add">+</button>'),
          up = $('<a class="up" href="#">Back to Top</a>');

      add.click(function(ev) {
        return self._add(ev);
      });

      up.click(function(ev) {
        return self._up(ev);
      });

      $('<li class="header"/>')
        .append('<span class="title">&nbsp;</span>')
        .append(add)
        .appendTo(list);

      this.list = list
        .wrap('<div class="content"/>')
        .parent()
          .append(up)
          .appendTo(this.el.empty())
        .end();
    }

    body(this.list);
    this.list.sortable('> .entry');

    if (state)
      this.el.removeClass(state);
  };

  InstanceList.prototype._title = function(list, uri) {
    list.find('.header .title').text('Add ' + U.titleCase(U.basename(uri)));
  };

  InstanceList.prototype._push = function(list, item) {
    var self = this;

    var del = $('<button class="delete">x</button>')
      .click(function(ev) {
        self._del(ev, item);
      });

    var elem = $('<a/>')
      .attr({ href: ui.href(item.uri) })
      .wrap('<li class="entry" />')
      .parent()
        .addClass(item.special ? 'special' : '')
        .append(del);

    this._bind(elem, item).appendTo(list);
  };

  InstanceList.prototype._bind = function(item, data) {
    return item && item
      .data('value', data)
      .find('a')
        .html(data.name)
      .end();
  };

  InstanceList.prototype._add = function() {
    this.el.trigger('add', [this.uri()]);
  };

  InstanceList.prototype._del = function(ev, item) {
    this.el.trigger('del', [item]);
  };

  InstanceList.prototype._up = function(ev) {
    ev.preventDefault();
    this.el.trigger('up');
  };

  
  // ### Editor ###

  function Editor(selector) {
    this.el = $(selector);
  }

  Editor.prototype.uri = function() {
    return this.el.data('uri');
  };

  Editor.prototype.hasLoaded = function(uri) {
    return this.uri() == uri;
  };

  Editor.prototype.show = function() {
    this.el.addClass('active');
    return this;
  };

  Editor.prototype.hide = function() {
    this.el.removeClass('active');
    return this;
  };

  Editor.prototype.load = function(uri, data, method, action) {
    if (!this.hasLoaded(uri)) {
      var self = this,
          probe = uri.match(/([^/]+)\/[^\/]+$/),
          special = data.type && data.type.charAt(0) == '_',
          kind = '.' + (special ? 'special-' : '') + probe[1] + '-detail';

      $('#template')
        .children(kind)
        .cloneTemplate()
        .addClass('content')
        .attr({ action: (action || uri), method: (method || 'put') })
        .view(data)
        .find('.cancel')
          .click(function(ev) { self._cancel(ev); })
          .end()
        .appendTo(this.el.empty());

      this.el.data('uri', uri);
    }
    return this;
  };

  Editor.prototype.newItem = function(uri) {
    return this.load(uri, {}, 'post', U.dirname(uri));
  };

  Editor.prototype.unload = function() {
    this.el.empty().data('uri', null);
    return this;
  };

  Editor.prototype.showErrors = function(errors) {
    console.log('errors', errors);
  };

  Editor.prototype._cancel = function(ev) {
    this.el.trigger('cancel', [this.uri()]);
  };

  $.view('form', function(data) {
    return this.formData(data);
  });

  $.view('user-form', function(data) {
    var website = this.find('.website-fields');
    return this
      .formData(data)
      .find('[name=is_site_user]')
        .change(function() {
          website[this.checked ? 'addClass' : 'removeClass']('active');
        })
        .change()
        .end();
  });

  
  // ### Tips ###

  function Tips(selector) {
    this.el = $(selector);
  }

  
  // ### Helper Methods ###

  function selectEntry(panel, uri) {
    return panel.find('.entry')
      .removeClass('selected')
      .filter('.entry:has(a[href=#!' + uri + '])')
      .addClass('selected');
  }

  function findEntry(panel, uri) {
    return panel.find('.entry:has(a[href=#!' + uri + '])');
  };

  function splitUri(uri) {
    uri = uri.replace(/^[\s\/]+|[\s\/]+$/, '');
    return uri ? uri.split(/\/+/) : [];
  }

  function listUriSegments(uri) {
    return reduceSegments(uri, [], function(_, seg, list) {
      list.push(seg);
    });
  }

  function eachSegment(uri, fn) {
    var parts = splitUri(uri);
    for (var i = 0, l = parts.length; i < l; i++)
      fn(i, parts.slice(0, i + 1).join('/'));
  }

  function reduceSegments(uri, seed, fn) {
    var value;
    eachSegment(uri, function(index, uri) {
      if ((value = fn(index, uri, seed)) !== undefined)
        seed = value;
    });
    return seed;
  }

  function uris(query) {
    return $.map(query, function(el, index) {
      return $.data(el, 'uri');
    });
  }

  // FIXME: convert show/hide panels to CSS3 transitions.

  // function showPanels(panels) {
  //   return panels.each(function() {
  //     var content = $('> .content', this);
  //     content
  //       .stop(true, true)
  //       .data('shutter.left', content.offset().left)
  //       .animate({ opacity: 1, left: 0 }, 'fast', 'swing');
  //   }).addClass('active');
  // }

  // function hidePanels(panels) {
  //   return panels.each(function() {
  //     var content = $('> .content', this);
  //     content
  //       .stop(true, true)
  //       .animate({ opacity: 0, left: -1 * content.data('shutter.left') }, 'fast', 'swing');
  //   }).removeClass('active');
  // }

  
  // ### Account ###

  function MainAccount(selector) {
  }

  
  // ## Help ##

  function Help(selector) {
    this.elem = $(selector);

    $('a[href=#!help]').click(function(ev) {
      ev.preventDefault();
      ui.toggle('help');
    });
  }

  Help.prototype.show = function() {
    this.elem.fadeIn('fast');
    return this;
  };

  Help.prototype.hide = function() {
    this.elem.fadeOut('fast');
    return this;
  };

  
  // ## Start ##

  var ui = Router.createRouter(),
      main;

  ui.load(/^$/, function(req, next) {
    ui.location('app');
    next();
  });

  ui.load(/^app.*/, function(req, next) {
    var uris = listUriSegments(req.uri),
        app = main.app;

    app.show().load(uris[1], uris[2]);
    next();
  });

  ui.unload(/^app.*/, function(req, loading, next) {
    var future = loading ? listUriSegments(loading.uri) : [],
        app = main.app;

    console.log('unload!', future);

    app.wait(function() {
      app.unload(future[1], future[2]);
      ('app' != future[0]) && app.hide();
      next();
    });
  });

  ui.load(/^account/, function(req, next) {
    console.debug('load account');
    next();
  });

  ui.unload(/^account/, function(req, _, next) {
    console.debug('unload account');
    next();
  });

  ui.load(/^help/, function(req, next) {
    console.log('show help');
    main.help.show();
    next();
  });

  ui.unload(/^help/, function(req, _, next) {
    main.help.hide();
    next();
  });

  $(function() {
    main = new Main('[role=main]');
    ui.listen();
  });

});