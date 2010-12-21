define(['exports'], function(exports) {

  exports.noop = exports.error = noop;
  exports.Error = Error;
  exports.toArray = toArray;
  exports.words = words;
  exports.strip = strip;
  exports.join = join;
  exports.dirname = dirname;
  exports.basename = basename;
  exports.aEach = aEach;
  exports.isEmpty = isEmpty;
  exports.titleCase = titleCase;
  exports.stop = stop;

  
  // ### Error ###

  function noop(obj) {
    if (obj)
      console.error.apply(console, (obj instanceof Error) ? obj.items : arguments);
  };

  function Error() {
    this.items = Array.prototype.slice.call(arguments, 0);
  }

  Error.prototype.toString = function() {
    return 'Error: ' + this.items.join(' ');
  };

  
  // ### Helpful Methods ###

  function toArray(seq) {
    var list = new Array(seq.length);
    for (var i = 0, l = seq.length; i < l; i++)
      list[i] = seq[i];
    return list;
  }

  function words(s) {
    s = strip(s);
    return s ? s.split(/\s+/) : [];
  }

  function strip(s) {
    return (s || '').replace(/^\s*|\s*$/, '');
  }

  function join() {
    var result = arguments[0];
    for (var i = 1, l = arguments.length; i < l; i++)
      result = result.replace(/\/*$/, '') + '/' + arguments[i].replace(/^\/*/, '');
    return result || '';
  }

  function dirname(p) {
    return p.replace(/\/[^\/]+\/*$/, '');
  }

  function basename(p) {
    var probe = p && p.match(/\/([^\/]+)\/*$/);
    return probe ? probe[1] : p;
  }

  function aEach(seq, next, fn) {
    var index = 0,
        limit = seq.length;

    each();

    function each(err) {
      if (err || (index >= limit))
        next(err);
      else
        fn(index, seq[index++], each);
    }
  }

  function isEmpty(obj) {
    for (var _ in obj)
      return false;
    return true;
  }

  var uniqueId = exports.uniqueId = (function() {
    var index = 0;
    return function uniqueId(prefix) {
      index = (index + 1) % 100;
      return (prefix || 'nr') + '-' + Date.now() + '-' + index;
    };
  })();

  function titleCase(s) {
    return s.replace(/(\w)(\S*)/g, function(_, a, b) {
      return a.toUpperCase() + b;
    });
  }

  function stop(event) {
    event.preventDefault();
    event.stopPropagation();
    return event;
  };

  
  // ### jQuery Methods ###

  // Add `id` and `for` attribute to input/label pairs that don't
  // already have them.
  //
  // + selector - identify input/label groups (default: '.field')
  //
  // Returns original jQuery
  $.fn.labelFields = function labelFields(selector) {
    return this
      .find(selector || '.field').each(function() {
        var input = $(':input', this),
            label = $('label', this),
            id = input.attr('id');

        if (!id) {
          id = label.text() + (new Date()).getTime();
          input.attr('id', id);
          label.attr('for', id);
        }
      })
      .end();
  };

  // Serialize a form or update its inputs values if `data` is given.
  //
  // + data - Object update the form with these values (optional).
  //
  // Returns original jQuery or data object.
  $.fn.formData = function formData(data) {
    var form = this;

    if (data !== undefined) {
      $.each(data, function(key, val) {
        var input = form.find('[name=' + key + ']:input');
        if (input.is(':checkbox'))
          input.attr('checked', val ? 'checked' : '');
        else
          input.val(val);
      });
      return form;
    }
    else {
      data = {};
      form.find('[name]:input').each(function() {
        var input = $(this);
        if (input.is(':checkbox')) {
          if (input.attr('checked'))
            data[this.name] = input.val();
        }
        else
          data[this.name] = input.val();
      });
      return data;
    }

  };

  $.fn.showErrors = function(message, errors) {

    if (!errors) {
      errors = message;
      message = null;
    }

    var form = this,
        list = $('<ul class="errors">'),
        title = null,
        timeout;

    form.removeErrors();

    if (message)
      title = $('<li class="active title" />')
        .html(message)
        .appendTo(list);

    $.each(errors, function(key, val) {
      var entry, input = form.find('[name=' + key + ']');
      if (input.length > 0) {
        entry = $('<li />')
          .addClass(key)
          .html(val)
          .appendTo(list);
        input
          .bind('focus.errors', function(ev) { focus(entry); })
          .bind('blur.errors', function(ev) { blur(entry); })
          .parents('.field')
            .addClass('error');
      }
    });

    if (!title)
      title = list.children(':eq(0)')
        .addClass('active');

    function focus(entry) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      list.find('.active').removeClass('active');
      entry.addClass('active');
    }

    function blur(entry) {
      entry.removeClass('active');
      timeout = setTimeout(noFocus, 10);
    }

    function noFocus() {
      focus(title);
    }

    return this.append(list);
  };

  $.fn.removeErrors = function() {
    this.find('.error')
      .removeClass('error')
      .find('[name]').unbind('.errors');
    this.find('.errors').remove();
    return this;
  };

  // Starting with the current query, try to match the selector
  // otherwise try parent().
  $.fn.up = function(sel) {
    var item = this;
    while (item && !item.is(sel)) {
      item = item.parent();
    }
    return item;
  };

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

  $.fn.cloneTemplate = function() {
    return this.clone().uniqueIds();
  };

  $.fn.uniqueIds = function() {
    var changed = {};
    return this
      .find('[id]').each(function(_, el) {
        changed[this.id] = el.id = uniqueId(el.id);
      })
      .end()
      .find('[for]').each(function(_, el) {
        var id = el.getAttribute('for');
        if (id in changed)
          el.setAttribute('for', changed[id]);
      })
      .end();
  };

  $.fn.scrollTo = function(elem, speed) {
    var top = (typeof elem == 'number' ? elem : elem.offset().top) + 1;
    return this.animate({ scrollTop: top }, speed || 'fast');
  };

  $.view = function defView(name, ctor) {
    $._views[name] = ctor;
    return ctor;
  };

  $._views = {};

  $.fn.view = function initView(data) {
    var registry = $._views;

    return this.each(function(_, el) {
      var ctor, name;

      for (var i = 0, r = roles(el), l = r.length; i < l; i++) {
        name = r[i];
        if ((ctor = registry[r[i]])) {
          ctor.call($(el), data);
          break;
        }
      }

      if (!ctor) {
        console.error('No view', el, r);
        throw new Error('No view found, tried [' + r.join(', ') + ']', 'for', el);
      }

    });
  };

  function roles(el) {
    var result = words(el.getAttribute('role'));

    if (el.id)
      result.unshift('#' + el.id);

    return result;
  }

});