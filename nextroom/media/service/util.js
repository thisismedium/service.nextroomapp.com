define(['exports'], function(exports) {

  exports.noop = exports.error = noop;
  exports.Error = Error;
  exports.toArray = toArray;
  exports.words = words;
  exports.strip = strip;

  
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
        data[this.name] = $(this).val();
      });
      return data;
    }

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
        changed[this.id] = el.id = el.id + '-' + Date.now();
      })
      .end()
      .find('[for]').each(function(_, el) {
        var id = el.getAttribute('for');
        if (id in changed)
          el.setAttribute('for', changed[id]);
      })
      .end();
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