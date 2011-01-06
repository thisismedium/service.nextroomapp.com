define(['exports', './util'], function(exports, U) {

  
  // ## Checkbox ##

  $.view('checkbox', function(data) {
    this.data('input') || (new Checkbox(this)).update(data);
  });

  function Checkbox(el) {
    var self = this;

    el = this.el = $(el).data('input', this);

    this._input = $('<input type="checkbox" class="proxy" />')
      .attr({ value: (el.attr('value') || 'on'), 'aria-hidden': 'true' })
      .focus(function(e)  { return self.onFocus(e); })
      .blur(function(e)   { return self.onBlur(e); })
      .change(function(e) { return self.onChange(e); })
      .appendTo(el);

    bindRelated(el, function() {
      self.toggle();
    });
  }

  Checkbox.prototype.isChecked = function() {
    return this._input.is(':checked');
  };

  Checkbox.prototype.value = function() {
    return this.isChecked() ? this._input.val() : '';
  };

  Checkbox.prototype.toggle = function() {
    return this.update(this.isChecked() ? '' : 'true');
  };

  Checkbox.prototype.update = function(value) {
    this._input.attr('checked', value ? 'checked' : '');
    this.onChange();
    return this;
  };

  Checkbox.prototype.onFocus = function(e) {
    this.el.addClass('focus');
  };

  Checkbox.prototype.onBlur = function(e) {
    this.el.removeClass('focus');
  };

  Checkbox.prototype.onChange = function(e) {
    this._draw();
  };

  Checkbox.prototype._draw = function() {
    this.el.attr('aria-checked', this.isChecked() ? 'true' : 'false');
  };

  
  // ## Select ##

  $.view('select', function(data) {
    this.data('input') || (new Select(this)).update(data);
  });

  function Select(el) {
    var self = this;

    el = this.el = $(el)
      .data('input', this)
      .click(function(e) { return self.onClick(e); });

    this._input = $('<input type="text" class="proxy" />')
      .attr({ 'aria-hidden': 'true' })
      .focus(function(e)  { return self.onFocus(e); })
      .blur(function(e)   { return self.onBlur(e); })
      .change(function(e) { return self.onChange(e); })
      .keydown(function(e) { return self.onKeydown(e); })
      .mouseenter(function(e) { return self.onEnter(e); })
      .mouseleave(function(e) { return self.onLeave(e); })
      .appendTo(el);

    this._value = $('<span class="value" />')
      .appendTo(el);

    this._list = el.children('.datalist');
  }

  Select.prototype.value = function() {
    return this._input.val();
  };

  Select.prototype.isOpen = function() {
    return this.el.is('.active');
  };

  Select.prototype.isValid = function(value) {
    return this._list.children('[value=' + value + ']').length > 0;
  };

  Select.prototype.valueOf = function(index) {
    return this._list.children(':eq(' + index + ')').attr('value');
  };

  Select.prototype.update = function(data) {
    this._input.val(this.isValid(data) ? data : this.valueOf(0));
    this.onChange();
    return this;
  };

  Select.prototype.toggleOptions = function() {
    return (this.isOpen()) ? this.hideOptions() : this.showOptions();
  };

  Select.prototype.showOptions = function() {
    if (!this.isOpen())
      this._getOptions().open();
    return this;
  };

  Select.prototype.hideOptions = function() {
    if (this.isOpen())
      this._getOptions().close();
    return this;
  };

  Select.prototype.selectUp = function() {
    return this._scan('prev');
  };

  Select.prototype.selectRight = function() {
    return this._scan('next');
  };

  Select.prototype.selectDown = function() {
    return this._scan('next');
  };

  Select.prototype.selectLeft = function() {
    return this._scan('prev');
  };

  Select.prototype._scan = function(dir) {
    var options = this._getOptions(),
        choice = options.selected();

    if ((choice = choice[dir]()).length > 0)
      options[this.isOpen() ? 'select' : 'choose' ](choice.attr('value'));

    return this;
  };

  Select.prototype.onFocus = function(ev) {
    this.el.addClass('focus');
  };

  Select.prototype.onBlur = function(ev) {
    this.el.removeClass('focus');
  };

  Select.prototype.onChange = function(ev) {
    this._draw();
  };

  Select.prototype.onClick = function(ev) {
    this.toggleOptions();
  };

  Select.prototype.onKeydown = function(ev) {
    switch (ev.keyCode) {
    case 32: // Space
      this.showOptions();
      break;

    case 37: // Left
      this.selectLeft();
      break;

    case 38: // Up
      this.selectUp();
      break;

    case 39: // Right
      this.selectRight();
      break;

    case 40: // Down
      this.selectDown();
      break;
    };
  };

  Select.prototype.onEnter = function(ev) {
    this.el.addClass('hover');
  };

  Select.prototype.onLeave = function(ev) {
    this.el.removeClass('hover');
  };

  Select.prototype._draw = function(ev) {
    this._value.html(this._list.find('[value=' + this._input.val() + ']').html());
  };

  Select.prototype._getOptions = function() {
    if (!this._options) {
      var self = this;
      this._options = this._buildOptions(this._list.children(), this.value())
        .appendTo('body')
        .position('left top', this._value)
        .on('clickout', function() {
          this.close();
          return false;
        })
        .on('open', function() {
          self.el.addClass('active');
          this.select(self.value());
        })
        .on('close', function() {
          self.el.removeClass('active');
          self._input.focus();
        });
    }
    return this._options;
  };

  Select.prototype._buildOptions = function(options, value) {
    var modal = new Modal().addClass('select-options');

    options.each(function() {
      var selected = (value == this.getAttribute('value')) ? 'true' : 'false',
          option = $('<span class="option" />')
            .attr({
                value: this.getAttribute('value'),
                'aria-selected': selected
            })
            .html(this.innerHTML)
            .appendTo(modal);
    });

    var self = this,
        choices = modal.find('.option')
          .bind('mouseenter.select', function() {
            select($(this));
          })
          .bind('click.select', function() {
            choose($(this));
            modal.close();
          });

    function select(el) {
      modal.selected().removeClass('active');
      el.addClass('active');
      return el;
    }

    function choose(el) {
      self.update(select(el).attr('value'));
    }

    function find(value) {
      return choices.filter('[value=' + value + ']');
    }

    modal.selected = function() {
      return choices.filter('.active');
    };

    modal.select = function(value) {
      select(find(value));
      return this;
    };

    modal.choose = function(value) {
      choose(find(value));
      return this;
    };

    modal.keyboard({
      13: function() {  // Return
        modal.selected().click();
        return false;
      }
    });

    return modal.select(value);
  };

  
  // ## Color Picker ##

  $.view('color', function(data) {
    this.data('input') || (new ColorPicker(this)).update(data);
  });

  function ColorPicker(el) {
    var self = this;

    el = this.el = $(el)
      .data('input', this)
      .click(function(e) { return self.onClick(e); });

    this._input = $('<input type="text" class="proxy" />')
      .attr({ 'aria-hidden': 'true' })
      .focus(function(e)  { return self.onFocus(e); })
      .blur(function(e)   { return self.onBlur(e); })
      .change(function(e) { return self.onChange(e); })
      .keydown(function(e) { return self.onKeydown(e); })
      .mouseenter(function(e) { return self.onEnter(e); })
      .mouseleave(function(e) { return self.onLeave(e); })
      .appendTo(el);

    this._value = $('<a class="value"><span class="gradient" /></a>')
      .appendTo(el);

    this._list = el.children('.datalist');
  }

  ColorPicker.prototype.value = function() {
    return this._input.val();
  };

  ColorPicker.prototype.isValid = function(value) {
    return this._list.children('[value=' + value + ']').length > 0;
  };

  ColorPicker.prototype.valueOf = function(index) {
    return this._list.children(':eq(' + index + ')').attr('value');
  };

  ColorPicker.prototype.update = function(data) {
    this._input.val(this.isValid(data) ? data : this.valueOf(0));
    this.onChange();
    return this;
  };

  ColorPicker.prototype.togglePalette = function() {
    return (this.el.is('.active')) ? this.hidePalette() : this.showPalette();
  };

  ColorPicker.prototype.showPalette = function() {
    if (!this.el.is('.active'))
      this._getPalette().open();
    return this;
  };

  ColorPicker.prototype.hidePalette = function() {
    if (this.el.is('.active'))
      this._getPalette().close();
    return this;
  };

  ColorPicker.prototype.selectUp = function() {
    return this._scan('prev', function(orig, pos) {
      return (pos.left == orig.left && pos.top < orig.top);
    });
  };

  ColorPicker.prototype.selectRight = function() {
    return this._scan('next', function(orig, pos) {
      return (pos.left > orig.left && pos.top == orig.top);
    });
  };

  ColorPicker.prototype.selectDown = function() {
    return this._scan('next', function(orig, pos) {
      return (pos.left == orig.left && pos.top > orig.top);
    });
  };

  ColorPicker.prototype.selectLeft = function() {
    return this._scan('prev', function(orig, pos) {
      return (pos.left < orig.left && pos.top == orig.top);
    });
  };

  ColorPicker.prototype._scan = function(dir, predicate) {
    var palette = this._getPalette(),
        choice = palette.selected(),
        orig = choice.position(), pos;

    while ((choice = choice[dir]()).length > 0) {
      pos = choice.position();
      if (predicate(orig, pos)) {
        palette.choose(choice.attr('value'));
        break;
      }
    }

    return this;
  };

  ColorPicker.prototype.onFocus = function(ev) {
    this.el.addClass('focus');
  };

  ColorPicker.prototype.onBlur = function(ev) {
    this.el.removeClass('focus');
  };

  ColorPicker.prototype.onChange = function(ev) {
    this._draw();
  };

  ColorPicker.prototype.onClick = function(ev) {
    this.togglePalette();
  };

  ColorPicker.prototype.onKeydown = function(ev) {
    switch (ev.keyCode) {
    case 32: // Space
      this.showPalette();
      break;

    case 37: // Left
      this.selectLeft();
      break;

    case 38: // Up
      this.selectUp();
      break;

    case 39: // Right
      this.selectRight();
      break;

    case 40: // Down
      this.selectDown();
      break;
    };
  };

  ColorPicker.prototype.onEnter = function(ev) {
    this.el.addClass('hover');
  };

  ColorPicker.prototype.onLeave = function(ev) {
    this.el.removeClass('hover');
  };

  ColorPicker.prototype._draw = function(ev) {
    this._value.css('backgroundColor', this._input.val());
  };

  ColorPicker.prototype._getPalette = function() {
    if (!this._palette) {
      var self = this;
      this._palette = this._buildPalette(this._list.children(), this.value())
        .appendTo('body')
        .position('center below', this._value)
        .on('clickout', function() {
          this.close();
          return false;
        })
        .on('open', function() {
          self.el.addClass('active');
          this.select(self.value());
        })
        .on('close', function() {
          self.el.removeClass('active');
          self._input.focus();
        });
    }
    return this._palette;
  };

  ColorPicker.prototype._buildPalette = function(options, value) {
    var modal = new Modal().addClass('color-palette');

    options.each(function() {
      var selected = (value == this.getAttribute('value')) ? 'true' : 'false',
          option = $('<a class="option" />')
            .css({ backgroundColor: this.getAttribute('value') })
            .attr({
                value: this.getAttribute('value'),
                'aria-selected': selected
            })
            .append('<span class="gradient" />')
            .appendTo(modal);
    });

    var self = this,
        choices = modal.find('.option')
          .bind('mouseenter.color', function() {
            select($(this));
          })
          .bind('click.color', function() {
            choose($(this));
            modal.close();
          });

    function select(el) {
      modal.selected().removeClass('active');
      el.addClass('active');
      return el;
    }

    function choose(el) {
      self.update(select(el).attr('value'));
    }

    function find(value) {
      return choices.filter('[value=' + value + ']');
    }

    modal.selected = function() {
      return choices.filter('.active');
    };

    modal.select = function(value) {
      select(find(value));
      return this;
    };

    modal.choose = function(value) {
      choose(find(value));
      return this;
    };

    modal.keyboard({
      13: function() {  // Return
        modal.selected().click();
        return false;
      }
    });

    return modal.select(value);
  };

  
  // ## Modal ##

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
    self._keys = { 27: this.close };

    close.appendTo(body);

    content
      .html(this)
      .appendTo(body);

    el.append(body);

    this.position();
  }

  Modal.prototype.get = function() {
    return this.el.get();
  };

  Modal.prototype.on = function(name, fn) {
    this.opt[name] = fn;
    return this;
  };

  Modal.prototype.position = function(where, rel) {
    var self = this;
    this._position = function() {
      where = where || 'center';
      rel = $(rel || window);
      var pos = where.split(/\s+/),
          xpos = pos[0] || 'center',
          ypos = pos[1] || 'center';
      self._body.css(findPosition(self._body, rel, xpos, ypos));
    };
    return this;
  };

  Modal.prototype.open = function() {
    var self = this;

    $('html').bind('keydown.modal', function(ev) {
      return self.onKeydown(ev);
    });

    this._position();

    this.el
      .addClass('active')
      .find('.modal-close')
        .bind('click.modal', function() {
          self.close();
          return false;
        })
        .end()
      .find('.modal-overlay')
        .bind('click.modal', function(e) {
          self.onOverlayClick(e);
        });

    this.opt.open && this.opt.open.call(this);
    return this;
  };

  Modal.prototype.close = function() {
    this.el.find('.modal-close, .modal-overlay').unbind('.modal');
    this.el.removeClass('active');
    $('html').unbind('.modal');
    this.opt.close && this.opt.close.call(this);
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

  Modal.prototype.find = function(selector) {
    return this._content.find(selector);
  };

  Modal.prototype.keyboard = function(keys) {
    $.extend(this._keys, keys);
    return this;
  };

  Modal.prototype.onKeydown = function(ev) {
    var callback = this._keys[ev.keyCode];
    return callback ? callback.call(this, ev) : undefined;
  };

  Modal.prototype.onOverlayClick = function(ev) {
    return this.opt.clickout ? this.opt.clickout.call(this, ev) : undefined;
  };

  
  // ## jQuery Integration ##

  var $appendTo = $.fn.appendTo;

  $.fn.appendTo = function(selector) {
    if (!selector.append)
      return $appendTo.apply(this, arguments);
    selector.append(this);
    return this;
  };

  var $val = $.fn.val;

  $.fn.val = function(data) {
    var input;

    if (!arguments.length) {
      var elem = this[0];
      input = $.data(elem, 'input');
      return input ? input.value() : $val.apply(this, arguments);
    }

    return $val.apply(this, arguments)
      .filter('[role]')
        .each(function() {
          if ((input = $.data(this, 'input'))) {
            input.update(data);
          }
        })
        .end();
  };

  
  // ## Helper Methods ##

  function bindRelated(el, callback) {
    var id = el.attr('id');
    if (id)
      setTimeout(function() {
        $('[for=' + id + ']').click(callback);
      }, 0);
  }

  function dimensions(el) {
    var pos = el.offset() || { top: 0, left: 0 },
        h = el.outerHeight(),
        w = el.outerWidth();

    pos.height = isNaN(h) ? el.height() : h;
    pos.width = isNaN(w) ? el.width() : w;

    return pos;
  }

  function findPosition(el, rel, xpos, ypos) {
    var ed = dimensions(el),
        rd = dimensions(rel),
        pos = {},
        method;

    if (!(method = xmethods[xpos]))
      throw new Error('Unrecognized x-position: `' + xpos + '`.');
    pos.left = method(ed, rd);

    if (!(method = ymethods[ypos]))
      throw new Error('Unrecognized y-position: `' + ypos + '`.');
    pos.top = method(ed, rd);

    return pos;
  }

  var xmethods = {
    'center':        function(ed, rd) { return rd.left + (rd.width - ed.width) / 2; },
    'left':          function(ed, rd) { return rd.left; },
    'right':         function(ed, rd) { return rd.left + rd.width - ed.width; },
    'outside-left':  function(ed, rd) { return rd.left - ed.width; },
    'outside-right': function(ed, rd) { return rd.left + rd.width; }
  };

  var ymethods = {
    'center': function(ed, rd) { return rd.top + (rd.height - ed.height) / 2; },
    'top':    function(ed, rd) { return rd.top; },
    'bottom': function(ed, rd) { return rd.top + rd.height - ed.height; },
    'above':  function(ed, rd) { return rd.top - ed.height; },
    'below':  function(ed, rd) { return rd.top + rd.height; }
  };

});