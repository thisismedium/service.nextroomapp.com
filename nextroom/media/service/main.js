define(['./util', './router', './server', './mouse'], function(U, Router, Server) {

  function Main(selector) {
    this.el = $(selector);
    this.nav = new Nav('#main-nav');
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

  
  // ## Nav ##

  function Nav(selector) {
    this.el = $(selector);
  }

  Nav.prototype.select = function(name) {
    this.find(name).addClass('selected');
    return this;
  };

  Nav.prototype.deselect = function(name) {
    this.find(name).removeClass('selected');
    return this;
  };

  Nav.prototype.find = function(name) {
    return this.el.find('li:has([href="#!' + name + '"])');
  };

  
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
      var item = self.items.find(data.uri).addClass('saving'),
          title = 'Delete ' + self.items.kind() + ' ' + data.title + '?';

      confirmDelete(title, function(confirmed) {
        if (confirmed)
          deleteItem(data.uri, item);
        else
          item.removeClass('saving');
      });
    });

    function confirmDelete(message, next) {
      return confirmModal({
          message: message,
          confirm: 'Yes, Delete',
          next: next,
          className: 'confirm-delete'
      });
    }

    function deleteItem(uri, item) {
      self.api.del(uri, function(err) {
        if (err)
          fail(err);
        else {
          item.removeClass('saving');
          self.items.remove(uri);
          if (ui.isActive(uri))
            ui.location(U.dirname(uri));
        }
      });
    }

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
      if (U.basename(edit) == 'new')
        newItem = true;
      else
        need[1] = edit;
    }

    this.api.get(need, function(err, data) {
      if (err)
        fail(err);
      else {
        self.select(kind);
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

  App.prototype.unload = function(kind, edit, next) {
    console.log('unload app?', edit, this.editor.uri(), this.editor.hasLoaded(edit), kind, this.items.hasLoaded(kind));
    if (!this.editor.hasLoaded(edit))
      this.editor.unload().hide();
    if (!this.items.hasLoaded(kind)) {
      this.deselect();
      this.items.unload().hide();
    }
    next();
    return this;
  };

  App.prototype.select = function(uri) {
    if (!uri)
      return this.deselect();
    this.el.addClass(U.basename(uri) + '-selected');
    this.menu.select(uri);
    this.tips.show();
    return this;
  };

  App.prototype.deselect = function() {
    this.el.attr('className', this.el.attr('className').replace(/\w+-selected/g, ''));
    this.tips.hide();
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

  InstanceList.prototype.kind = function() {
    return this._kind;
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
    this.el.html('<div class="content stub" />').data('uri', null);
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
          up = $('<a class="up" href="#">Back to top</a>');

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
    this._kind = U.titleCase(U.basename(uri));
    list.find('.header .title').text('Add ' + this._kind);
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
    this.el.html('<div class="content stub"/>').data('uri', null);
    return this;
  };

  Editor.prototype.removeErrors = function() {
    this.el.find('form').removeErrors();
    return this;
  };

  Editor.prototype.showErrors = function(errors) {
    this.el.find('form').showErrors('Fix the errors.', errors);
    return this;
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

    var self = this;
    this.el.find('.tips').each(function() {
      self._build(this);
    });
  }

  Tips.prototype.show = function() {
    this.el.addClass('active');
    return this;
  };

  Tips.prototype.hide = function() {
    this.el.removeClass('active');
    return this;
  };

  Tips.prototype._build = function(el) {
    var self = this,
        expandable = $('.unit:has(> .figure)', el);

      expandable
        .each(function(idx) {
          $('.figure', this)
            .append('<a class="expand" href="#">+</a>');
          $('.teaser', this)
            .after('<a class="expand" href="#"><span class="action">Expand</span> &raquo;</a>');
        })
        .find('.figure, .expand').click(function(ev) {
          U.stop(ev);
          self._expand($(this).up('.unit'), expandable);
        });
  };

  Tips.prototype._expand = function(unit, related) {
    var $win = $(window),
        modal = new Modal()
          .addClass('expanded-tips')
          .appendTo('body'),
        slider = new Slider()
          .appendTo(modal)
          .append(related.clone())
          .each(function(_, el) {
            $('.action', el).text('Collapse').click(collapse);
          })
          .show(related.index(unit));

    $win.bind('keyup', keyup);
    modal.on('close', close).open();

    function collapse() {
      modal.close();
      return false;
    }

    function close() {
      modal.destroy();
      $win.unbind('keyup', keyup);
    }

    function keyup(ev) {
      if (ev.keyCode == 37)      // Left
        slider.move(-1);
      else if (ev.keyCode == 39) // Right
        slider.move(+1);
    }

  };

  function confirmModal(opt) {
    var modal = (new Modal()).addClass('confirm'),
        message = $('<p class="message"/>').html(opt.message),
        cancel = $('<input type="button" class="cancel modal-close" />')
          .attr('value', opt.cancel || 'Cancel'),
        confirm = $('<input type="button" class="confirm" />')
          .attr('value', opt.confirm || 'OK'),
        buttons = $('<div class="buttons" />')
          .append(cancel)
          .append(confirm),
        confirmed = false;

    confirm.click(function() {
      confirmed = true;
      modal.close();
    });

    modal.on('close', function() {
      modal.destroy();
      opt.next(confirmed);
    });

    opt.className && modal.addClass(opt.className);

    return modal
      .append(message)
      .append(buttons)
      .appendTo('body')
      .open();
  };

  function Modal(opt) {
    var self = this,
        el = $('<div class="modal"><div class="modal-overlay" /></div>'),
        body = $('<div class="modal-body"/>'),
        close = $('<a href="#" class="modal-close">X</a>'),
        content = $('<div class="modal-content"/>');

    self.el = el;
    self.opt = opt || {};

    self._body = body;
    self._content = content;
    self.__keyup = function(e) { return self._keyup(e); };

    close.appendTo(body);

    content
      .html(this)
      .appendTo(body);

    el.append(body);
  }

  Modal.prototype.get = function() {
    return this.el.get();
  };

  Modal.prototype.on = function(name, fn) {
    this.opt[name] = fn;
    return this;
  };

  Modal.prototype.open = function() {
    var self = this,
        $win = $(window),
        mh = this._body.outerHeight(),
        wh = $win.height();

    $win.bind('keyup', this.__keyup);

    if (wh > mh)
      this._body.css('top', (wh - mh) / 2);

    this.el
      .addClass('active')
      .find('.modal-close').click(function() {
        self.close();
        return false;
      });

    return this;
  };

  Modal.prototype.close = function() {
    this.el.removeClass('active');
    $(window).unbind('keyup', this.__keyup);
    this.opt.close && this.opt.close(this);
    return this;
  };

  Modal.prototype.destroy = function() {
    this.el.remove();
    return this;
  };

  Modal.prototype.addClass = function(name) {
    this.el.addClass(name);
    return this;
  };

  Modal.prototype.appendTo = function(obj) {
    (obj.append ? obj : $(obj)).append(this.get());
    return this;
  };

  Modal.prototype.append = function(content) {
    this._content.append(content.get ? content.get() : content);
    return this;
  };

  Modal.prototype._keyup = function(ev) {
    if (ev.keyCode == 27) // Escape
      this.close();
    return this;
  };

  function Slider(opt) {
    var self = this,
        slider = $('<div class="slideshow" />'),
        prev = $('<a href="#" class="prev nav">&laquo;</a>'),
        next = $('<a href="#" class="next nav">&raquo;</a>'),
        viewport = $('<div class="viewport"><div class="slides"/><div class="glare"/></div>');

    this.el = slider;
    this._index = 0;
    this._end = 0;
    this._wrap = viewport.children('.slides');
    this._prev = prev;
    this._next = next;
    this._slides = $();

    prev.click(function(ev) {
      self.move(-1);
      return false;
    });

    next.click(function(ev) {
      self.move(+1);
      return false;
    });

    slider
      .append(prev)
      .append(viewport)
      .append(next);
  }

  Slider.prototype.destroy = function() {
    this.el.remove();
    return this;
  };

  Slider.prototype.get = function() {
    return this.el.get();
  };

  Slider.prototype.show = function(index) {
    this.el.addClass('active');
    return this.moveTo(index);
  };

  Slider.prototype.append = function(content) {
    var wrap = this._wrap,
        slides = wrap
          .append(content.get ? content.get() : content)
          .children();

    this._slides = slides;
    this._end = slides.length - 1;
    wrap.width(this._width(slides.length));

    return this;
  };

  Slider.prototype.appendTo = function(obj) {
    (obj.append ? obj : $(obj)).append(this.get());
    return this;
  };

  Slider.prototype.each = function(fn) {
    this._slides.each(fn);
    return this;
  };

  Slider.prototype.move = function(offset) {
    return this.moveTo(this._index + offset);
  };

  Slider.prototype.moveTo = function(dest) {
    var end = this._end;

    if (dest < 0 || dest > end)
      return this;

    this._prev[(dest == 0) ? 'addClass' : 'removeClass']('disabled');
    this._next[(dest == end) ? 'addClass' : 'removeClass']('disabled');

    this._index = dest;
    this._wrap.animate({ marginLeft: -1 * this._width(dest) }, 'fast');

    return this;
  };

  Slider.prototype._width = function(end) {
    var total = 0;
    this._slides.slice(0, end).each(function() {
      total += $(this).outerWidth();
    });
    return total;
  };

  
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

    $('#close-help').click(function() {
      ui.pop('help');
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

    main.nav.select('app');
    app.show().load(uris[1], uris[2]);
    next();
  });

  ui.unload(/^app.*/, function(req, loading, next) {
    var future = loading ? listUriSegments(loading.uri) : [],
        app = main.app;

    console.log('unload!', future);

    app.wait(function() {
      app.unload(future[1], future[2], function() {
        if ('app' != future[0]) {
          main.nav.deselect('app');
          app.hide();
        }
        next();
      });
    });
  });

  ui.load(/^account/, function(req, next) {
    console.debug('load account');
    main.nav.select('account');
    next();
  });

  ui.unload(/^account/, function(req, _, next) {
    console.debug('unload account');
    main.nav.deselect('account');
    next();
  });

  ui.load(/^help/, function(req, next) {
    console.log('show help');
    main.help.show();
    main.nav.select('help');
    next();
  });

  ui.unload(/^help/, function(req, _, next) {
    main.help.hide();
    main.nav.deselect('help');
    next();
  });

  $(function() {
    main = new Main('[role=main]');
    ui.listen();
  });

});