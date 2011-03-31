define(['./util', './router', './server', './ui', './mouse'], function(U, Router, Server, UI) {

  function Main(selector) {
    this.el = $(selector);
    this.nav = new Nav('#main-nav');
    this.admin = new Admin('#admin');
    this.help = new Help('#help');
    this.account = new Account('#account');
    this.view = null;
  }

  function fail(err) {
    alertModal({
      message: err,
      confirm: 'OK',
      className: 'alert-fail'
    });
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

  
  // ## Admin ##

  function Admin(selector) {
    this.el = $(selector);
    this.api = new Server.createClient();

    this.menu = new AppMenu('#admin-menu');
    this.items = new InstanceList('#admin-kind');
    this.editor = new Editor('#admin-editor');
    this.tips = new Tips('#admin-tips');
    this.resetRooms = new ResetRooms('#reset-rooms', this);

    var self = this;

    this.el.bind('sorted', function(ev) {
      saving(ev.changed);
      self.api.put(self.items.uri(), self.items.value(), function(err) {
        err ? fail(err) : doneSaving(ev.changed);
      });
    });

    this.el.bind('add', function(ev) {
      ui.location(U.join(self.items.uri(), 'new'));
    });

    this.el.bind('del', function(ev, data) {
      var item = saving(self.items.find(data.uri)),
          title = 'Delete ' + self.items.kind() + ' ' + data.name + '?';

      confirmDelete(U.removeRepeats(title), function(confirmed) {
        if (confirmed)
          deleteItem(data.uri, item);
        else
          doneSaving(item);
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
          doneSaving(item);
          self.items.remove(uri);
          if (ui.isActive(uri))
            ui.location(U.dirname(uri));
        }
      });
    }

    this.el.bind('up', function(ev) {
      mainView().scrollTo(0);
    });

    this.el.bind('cancel', function(ev, uri) {
      ui.location(U.dirname(uri));
    });

    this.el.bind('submit', function(ev) {
      var target = U.stop(ev).target,
          form = $(target.form || target),
          uri = form.attr('action'),
          method = form.attr('data-method'),
          value = form.formData();

      if (method != 'post')
        saving(self.items.find(uri));
      self.editor.saving();

      self.api[method](uri, value, function(err, data) {
        if (err) {
          if (err.status == 400)
            self.editor.showErrors(data);
          else
            fail(err);
        }
        else if (method == 'post') {
          self.items.push(data);
          doneSaving(saving(self.items.find(data.uri)));
          self.editor.saved();
        }
        else {
          self.items.update(uri, data);
          doneSaving(self.items.find(data.uri));
          self.editor.saved(data);
        }
      });
    });
  }

  Admin.prototype.show = function(fn) {
    if (!this.el.is('.active'))
      showSection(this.el);
    return this;
  };

  Admin.prototype.hide = function(fn) {
    if (this.el.is('.active'))
      hideSection(this.el);
    return this;
  };

  Admin.prototype.wait = function(next) {
    this.api.stop(next);
    return this;
  };

  Admin.prototype.load = function(kind, edit) {
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

  Admin.prototype.unload = function(kind, edit, next) {
    if (!this.editor.hasLoaded(edit))
      this.editor.unload().hide();
    if (!this.items.hasLoaded(kind)) {
      this.deselect();
      this.items.unload().hide();
    }
    if (!kind) {
      this.menu.deselect();
      this.tips.hide();
    }
    next();
    return this;
  };

  Admin.prototype.select = function(uri) {
    if (!uri)
      return this.deselect();

    var kind = U.basename(uri);
    this.el.addClass(kind + '-selected');
    this.menu.select(uri);
    this.tips.show(kind);
    return this;
  };

  Admin.prototype.deselect = function() {
    this.el.attr('className', this.el.attr('className').replace(/\w+-selected/g, ''));
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

  AppMenu.prototype.deselect = function() {
    this.el.find('.selected').removeClass('selected');
    return this;
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
    showPanels(this.el);
    return this;
  };

  InstanceList.prototype.hide = function() {
    hidePanels(this.el);
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

  InstanceList.prototype.replace = function(uri, data) {
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
    selectEntry(this.el, uri);
    return this;
  };

  InstanceList.prototype.value = function() {
    var data = [];
    if (this.list)
      this.list.children('.entry')
        .each(function(_, el) {
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
      .wrap('<li class="entry" />')
      .parent()
        .addClass(item.special ? 'special' : '')
        .append(del)
        .append('<span class="indicator" />');

    this._bind(elem, item).appendTo(list);
  };

  InstanceList.prototype._bind = function(item, data) {
    if (!item) return;
    data = $.extend(item.data('value') || {}, data);
    return item
      .data('value', data)
      .find('a')
        .html(data.name)
        .attr('href', ui.href(data.uri))
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
    showPanels(this.el);
    return this;
  };

  Editor.prototype.hide = function() {
    hidePanels(this.el);
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
          .attr({ action: (action || uri), 'data-method': (method || 'put') })
          .view(data)
          .find('.cancel')
            .click(function(ev) { self._cancel(ev); })
            .end()
          .children('h3')
            .html((method == 'post' ? 'New ' : '') + U.titleCase(probe[1]) + ' Details')
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

  Editor.prototype.saving = function() {
    this._startSaving();
    return this;
  };

  Editor.prototype.saved = function(data) {
    this._doneSaving();
    if (data === undefined)
      resetForm(this.el.find('form'));
    return this.removeErrors();
  };

  Editor.prototype.removeErrors = function() {
    this.el.find('form').removeErrors();
    return this;
  };

  Editor.prototype.showErrors = function(errors) {
    this._doneSaving(true);
    this.el.find('form').showErrors('Fix the errors.', errors);
    return this;
  };

  Editor.prototype._cancel = function(ev) {
    this.el.trigger('cancel', [this.uri()]);
  };

  Editor.prototype._startSaving = function() {
    var button = this.el.find('[type=submit]');
    button
      .data('saving', { orig: button.attr('value'), when: new Date().getTime() })
      .attr('value', 'Saving...');
  };

  Editor.prototype._doneSaving = function(flush) {
    var button = this.el.find('[type=submit]'),
        saving = button.data('saving'),
        delta = Math.max(0, 400 - (new Date().getTime() - saving.when));
    setTimeout(function() {
      button.attr('value', saving.orig);
    }, flush ? 0 : delta);
  };


  $.view('form', function(data) {
    return this.initForm(data);
  });

  $.view('user-form', function(data) {
    var website = this.find('.website-fields');
    return this
      .initForm(data)
      .find('[name=is_site_user]')
        .change(function() {
          var checked = $(this).attr('aria-checked') == 'true';
          website[checked ? 'addClass' : 'removeClass']('active');
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

  Tips.prototype.show = function(kind) {
    this.el.addClass('active');
    if (kind) {
      var probe = this.el.find('.' + kind + '-tips');
      if (!probe.is('.active-tip')) {
        this.el.find('.active-tip').removeClass('active-tip');
        adjustHeight(this.el.children('.content'), probe.height(), function() {
          probe.addClass('active-tip');
        });
      }
    }
    return this;
  };

  Tips.prototype.hide = function() {
    this.el.removeClass('active');
    var probe = this.el.find('.active-tip');
    if (probe.length > 0) {
      probe.removeClass('active-tip');
      adjustHeight(this.el.children('.content'), 0);
    }
    return this;
  };

  Tips.prototype.expand = function(unit) {
    unit = $(unit, this.el);
    this._expand(unit, unit.siblings(':has(> .figure').andSelf());
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
    var $win = $('html'),
        modal = new Modal()
          .addClass('expanded-tips')
          .appendTo('body'),
        slider = new Slider()
          .appendTo(modal)
          .append(related.clone())
          .each(function(_, el) {
            $('.figure', el).prependTo(el);
            $('.action', el).text('Collapse')
              .parent().click(collapse);
          })
          .show(related.index(unit));

    $win.bind('keydown', keydown);
    modal.on('close', close).open();

    function collapse() {
      modal.close();
      return false;
    }

    function close() {
      modal.destroy();
      $win.unbind('keydown', keydown);
    }

    function keydown(ev) {
      if (ev.keyCode == 37) {      // Left
        slider.move(-1);
        return false;
      }
      else if (ev.keyCode == 39) { // Right
        slider.move(+1);
        return false;
      }
    }

  };

  // This is an optimization to prevent the whole UI from "flashing"
  // when the rooms list is already showing.
  function ResetRooms(selector, admin) {
    this.el = $(selector);
    this.admin = admin;

    var self = this;
    this.el.click(function(ev) {
      self.onClick(ev);
    });
  }

  ResetRooms.prototype.reset = function() {
    var self = this,
        api = this.admin.api;

    api.post('reset-rooms/', {}, function(err) {
      err ? fail(err) : done();
    });

    function done() {
      if (ui.isActive('admin/room'))
        self.app.load('admin/room');
      else
        ui.location('admin/room');
    }
  };

  ResetRooms.prototype.softReset = function() {
    var items = this.admin.items,
        editor = this.admin.editor;

    if (editor.uri())
      editor.unload().hide();
    items.unload().hide();
    this.reset();
    return this;
  };

  ResetRooms.prototype.confirm = function(ok) {
    var self = this;

    confirmModal({
      message: 'Reset rooms and queue?',
      confirm: 'Yes, Reset',
      cancel: 'Cancel',
      next: function(confirmed) {
        if (confirmed)
          ok.call(self);
      },
      className: 'confirm-reset'
    });

    return this;
  };

  ResetRooms.prototype.onClick = function(ev) {
    var self = this,
        items = this.admin.items;

    ev.preventDefault();
    this.confirm(function() {
      if (items.hasLoaded('admin/room'))
        self.softReset();
      else
        ui.location('reset-rooms');
    });
  };

  function alertModal(opt) {
    opt.cancel = false;
    return confirmModal(opt);
  }

  function confirmModal(opt) {
    var modal = (new Modal()).addClass('confirm'),
        message = $('<p class="message"/>').html(opt.message),
        cancel = (opt.cancel === false) ? '' :
          $('<input type="button" class="cancel modal-close" />')
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
      opt.next && opt.next(confirmed);
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

  Modal.prototype.isOpen = function() {
    return this.el.is('.active');
  };

  Modal.prototype.open = function() {
    var self = this,
        mh = this._body.outerHeight(),
        wh = $(window).height();

    $('html').bind('keyup', this.__keyup);

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

    this.el[(slides.length == 1) ? 'addClass' : 'removeClass']('single');

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

  function saving(items) {
    return items.addClass('saving');
  }

  function doneSaving(items) {
    setTimeout(function() { items.removeClass('saving'); }, 200);
    return items;
  }

  function resetForm(form) {
    form[0].reset();
    form.find(':input:eq(0)').get(0).focus();
    return form;
  }

  function findEntry(panel, uri) {
    return panel.find('.entry:has(a[href=#!' + U.relativePath(uri) + '])');
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

  function showPanels(panels) {
    return panels.each(function() {
      var content = $('> .content', this);
      content
        .stop(true, true)
        .data('shutter.left', content.offset().left)
        .animate({ opacity: 1, left: 0 }, 'fast', 'swing');
    }).addClass('active');
  }

  function hidePanels(panels) {
    return panels.removeClass('active');
  }

  function showSection(section) {
    return section.css('opacity', 0)
      .addClass('active')
      .animate({ opacity: 1 }, 'fast', 'swing');
  }

  function hideSection(section) {
    return section.removeClass('active');
  }

  function adjustHeight(area, delta, fn) {
    return area.each(function() {
      var self = $(this);
      if (self.data('adjust.height') === undefined)
        self.data('adjust.height', self.height());
      self.stop(true)
        .animate({ height: self.data('adjust.height') + delta }, 'fast', 'swing', fn);
    });
  }

  
  // ### Account ###

  function Account(selector) {
    this.el = $(selector);
    this.title = $('#practice-name-title');
    this.data = {};
    this.api = Server.createClient();
    this.tips = new Tips('#account-tips');
    this.cancel = new CancelAccount('#cancel-account');
    this.forms = {
      'practice-email': new ShieldForm('#practice-email', { action: 'account/' }),
      'practice-name': new ShieldForm('#practice-name', { action: 'account/' })
    };

    var self = this;

    $('a[href=#!account/cancel]').click(function(ev) {
      U.stop(ev);
      self.cancel.toggle();
    });

    this.el.find('.show-help').click(function(ev) {
      U.stop(ev);
      self.tips.expand('.account-tips .unit:eq(0)');
    });

    this.el.bind('submit', function(ev) {
      var target = U.stop(ev).target,
          el = $(target.form || target),
          form = self.forms[el.attr('id')].saving(),
          uri = el.attr('action'),
          method = el.attr('data-method'),
          value = $.extend({}, self.data, form.value());

      self.api[method](uri, value, function(err, data) {
        if (err) {
          if (err.status == 400)
            form.showErrors(data);
          else {
            form.reset();
            fail(err);
          }
        }
        else {
          self.title.html(U.titleCase(data.practice_name));
          form.update(data, function() {
            if (!form.isSaving()) form.stopEditing();
          });
        }
      });
    });

    this.el.bind('cancel', function(ev) {
      self.api.del('/account', function(err) {
        if (err)
          fail(err);
        else
          self.cancel.success();
      });
    });
  }

  Account.prototype.show = function(fn) {
    if (!this.el.is('.active'))
      showSection(this.el);
    return this;
  };

  Account.prototype.hide = function(fn) {
    if (this.el.is('.active'))
      hideSection(this.el);
    return this;
  };

  Account.prototype.load = function(uri) {
    var self = this;

    if (uri == 'account/cancel')
      this.cancel.show();

    this.api.get('account/', function(err, data) {
      if (err)
        fail(err);
      else {
        $.extend(self.data, data);
        self.eachForm(function(_, form) {
          form.load(self.data);
        });
      }
    });

    return this;
  };

  Account.prototype.wait = function(next) {
    this.api.stop(next);
    return this;
  };

  Account.prototype.unload = function(uri, next) {
    this.cancel.hide();
    this.eachForm(function(_, form) {
      form.reset();
    });
    next();
    return this;
  };

  Account.prototype.eachForm = function(fn) {
    $.each(this.forms, fn);
    return this;
  };

  function CancelAccount(selector) {
    this.el = $(selector);
    this.content = this.el.children('.block-content');

    var self = this;

    this.content
      .find('.cancel')
        .click(function() {
          self.toggle();
        })
        .end()
      .find('.yes')
        .click(function() {
          self.confirm();
        });
  }

  CancelAccount.prototype.show = function() {
    if (!this.el.is('.active'))
      this.el.addClass('active');
    return this;
  };

  CancelAccount.prototype.hide = function() {
    if (this.el.is('.active'))
      this.el.removeClass('active');
    return this;
  };

  CancelAccount.prototype.toggle = function() {
    if (ui.isActive('account/cancel'))
      ui.location('account');
    else
      ui.location('account/cancel');
    return this;
  };

  CancelAccount.prototype.confirm = function() {
    var self = this;
    confirmModal({
      message: 'Cancel this Account?',
      confirm: 'Yes, Cancel',
      cancel: 'No, wait!',
      next: function(confirmed) {
        confirmed ? self.el.trigger('cancel') : self.toggle();
      },
      className: 'confirm-cancel'
    });
    return this;
  };

  CancelAccount.prototype.success = function() {
    var self = this;
    alertModal({
      message: 'Request received.',
      confirm: 'OK',
      next: function() { self.toggle(); },
      className: 'alert-cancelled'
    });
    return this;
  };

  function ShieldForm(selector, opt) {
    opt = opt || {};

    this.el = $(selector).attr({
      action: opt.action,
      'data-method': opt.method || 'put'
    });

    this._input = this.el.find('[name]');
    this._name = this._input.attr('name');
    this._save = this.el.find('.save');
    this._value = this.el.find('.value');

    var self = this;
    this.el
      .submit(function(ev) {
        if (self.isSaving())
          U.stop(ev);
      })
      .find('.edit').click(function(ev) {
        U.stop(ev);
        self.toggleEditing();
      });
  }

  ShieldForm.prototype.load = function(data) {
    return this.update(data);
  };

  ShieldForm.prototype.value = function() {
    return this.el.formData();
  };

  ShieldForm.prototype.saving = function() {
    this.el.removeErrors();
    this._shieldsUp();
    return this;
  };

  ShieldForm.prototype.isSaving = function() {
    return this.el.is('.saving');
  };

  ShieldForm.prototype.update = function(data, next) {
    this.el.formData(data);
    this._value.text(this._input.val());
    this._shieldsDown(true, next);
    return this;
  };

  ShieldForm.prototype.reset = function() {
    this._shieldsDown();
    this._value.text(this._input.val());
    return this;
  };

  ShieldForm.prototype.startEditing = function() {
    this.el.addClass('active');
    return this;
  };

  ShieldForm.prototype.stopEditing = function() {
    this.el.removeClass('active');
    this._shieldsDown();
    return this;
  };

  ShieldForm.prototype.toggleEditing = function() {
    return (this.el.is('.active')) ? this.stopEditing() : this.startEditing();
  };

  ShieldForm.prototype.showErrors = function(errors) {
    this._shieldsDown();
    this.el.showErrors(errors);
    return this;
  };

  ShieldForm.prototype._shieldsUp = function() {
    var self = this;
    if (!this.isSaving()) {
      this.el.addClass('saving');
      this._save
        .addClass('blocked')
        .val('Saving...')
        .data('width', this._save.outerWidth())
        .animate({ width: '100%' }, 200)
        .delay(600); // Stop _shieldsDown() from running immediately.
    }
  };

  ShieldForm.prototype._shieldsDown = function(ok, next) {
    var self = this;
    if (this.isSaving()) {
      this._save
        .val(ok ? 'Saved' : 'Save')
        .removeClass('blocked')
        .animate({ width: this._save.data('width') }, 200, function() {
          self.el.removeClass('saving');
          self._save.css('width', '');
          // Similar to .delay(600) in _shieldsUp()
          setTimeout(function() { self._save.val('Save'); next && next(); }, 600);
        });
    }
  };

  
  // ## Help ##

  function Help(selector) {
    this.modal = (new UI.Modal({ close: close }))
      .addClass('help')
      .position('right below', '#main-nav .nav_help')
      .appendTo('body');

    $(selector)
      .appendTo(this.modal);

    $('a[href=#!help], #close-help').click(function(ev) {
      ev.preventDefault();
      ui.toggle('help');
    });

    function close() {
      ui.pop('help');
    }

  }

  Help.prototype.show = function() {
    if (!this.modal.isOpen())
      this.modal.open();
    return this;
  };

  Help.prototype.hide = function() {
    if (this.modal.isOpen())
      this.modal.close();
    return this;
  };

  
  // ## Panels ##

  function Panels(route, view, name) {
    ui.load(route, function(req, next) {
      var uris = listUriSegments(req.uri);

      main.nav.select(name);
      view.show().load(uris[1], uris[2]);
      next();
    });

    ui.unload(route, function(req, loading, next) {
      var future = loading ? listUriSegments(loading.uri) : [];

      view.wait(function() {
        view.unload(future[1], future[2], function() {
          if (name != future[0]) {
            main.nav.deselect(name);
            view.hide();
          }
          next();
        });
      });
    });
  }

  
  // ## Start ##

  var ui = Router.createRouter(),
      main;

  function addRoutes() {
    Panels(/^admin.*/, main.admin, 'admin');
  }

  ui.load(/^$/, function(req, next) {
    ui.location('admin');
    next();
  });

  ui.load(/^account.*/, function(req, next) {
    main.nav.select('account');
    main.account.load(req.uri).show();
    next();
  });

  ui.unload(/^account.*/, function(req, loading, next) {
    var future = loading ? listUriSegments(loading.uri) : [],
        acct = main.account;

    acct.wait(function() {
      acct.unload(loading && loading.uri, function() {
        if ('account' != future[0]) {
          main.nav.deselect('account');
          main.account.hide();
        }
        next();
      });
    });

  });

  ui.load(/^help/, function(req, next) {
    main.help.show();
    main.nav.select('help');
    next();
  });

  ui.unload(/^help/, function(req, _, next) {
    main.help.hide();
    main.nav.deselect('help');
    next();
  });

  ui.load(/^reset-rooms/, function(req, next) {
    main.admin.resetRooms.reset();
    next();
  });

  $(function() {
    main = new Main('[role=main]');
    addRoutes();
    ui.listen();
  });

});