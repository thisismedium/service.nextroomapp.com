define(['exports'], function(exports) {

  // $(function() {
  //   $('.sortable')
  //     .sortable('> .item')
  //     .bind('sorted', function(ev) {
  //       ev.changed.highlight('saving');
  //       setTimeout(function() {
  //         ev.changed.fadeBack(500, 'swing');
  //       }, 150);
  //     });
  // });

  $.fn.draggable = function(selector, opt) {
    opt = opt || {};
    opt.selector = selector || '> *';
    opt.drop = opt.drop || opt.selector;
    opt.over = opt.over || 'over';
    opt.context = this;

    return this.find(selector)
      .each(function() {
        draggable.call(this, opt);
      });
  };

  function draggable(opt) {
    var item = $(this), body = $('body'), ghost, drops, over, pos;

    item.attr('unselectable', 'on').mousedown(down);

    function down(ev) {
      ev.preventDefault();
      pos = item.offset();
      var bPos = body.offset();
      pos.left -= bPos.left;
      pos.top -= bPos.top;
      pos.offsetX = ev.pageX - pos.left;
      pos.offsetY = ev.pageY - pos.top;
      $(window).mousemove(move).mouseup(up);
    }

    function move(ev) {
      (ghost || start())
        .css('top', ev.pageY - pos.offsetY)
        .css('left', ev.pageX - pos.offsetX);
      enter(closestDrop(ev.pageX, ev.pageY));
    }

    function up(ev) {
      ev.preventDefault();
      $(window).unbind('mousemove', move).unbind('mouseup', up);
      ghost && end();
    }

    function start() {
      ghost = makeGhost(item);
      drops = findDrops();
      trigger(item, 'dragstart');
      return ghost;
    }

    function enter(target) {
      var data = { fromElement: over && over[0], toElement: target && target[0] };

      if (over && (!target || (over.get(0) != target.get(0)))) {
        opt.over && over.removeClass(opt.over);
        trigger(item, 'dragleave', data);
        over = null;
      }

      if (target && !over) {
        over = target;
        opt.over && over.addClass(opt.over);
        trigger(item, 'dragenter', data);
      }
    }

    function end() {
      trigger(item, 'dragend', { relatedTarget: over && over[0] });
      drop();
      ghost = drops = over = null;
    }

    function drop() {
      if (over) {
        opt.over && over.removeClass(opt.over);
        ghost.remove();
      }
      else
        ghost.animate({ top: pos.top, left: pos.left }, 'fast', 'swing', function() {
          $(this).remove();
        });
    }

    function trigger(item, name, data) {
      return item.trigger(data ? $.extend($.Event(name), data) : name);
    }

    function makeGhost(item) {
      return item.snapshot()
        .attr('className', 'ghost')
        .css({
            position: 'absolute', top: pos.top, left: pos.left,
            width: item.width(), height: item.height(),
            opacity: 0.75
        })
        .appendTo(body);
    }

    function findDrops() {
      return $(opt.drop, opt.context).not(item).not(ghost);
    }

    function closestDrop(x, y) {
      if (drops) {
        for (var i = drops.length - 1; i >= 0; i--) {
          var d = drops.eq(i), p = d.offset(),
              w = d.outerWidth(true), h = d.outerHeight(true);
          if (x >= p.left && x <= (p.left + w) && y >= p.top && y <= (p.top + h))
            return d;
        }
      }
      return null;
    }
  };

  $.fn.sortable = function(selector) {
    var context = this,
        items;

    selector = selector || '> *';

    return this.draggable(selector)
      .bind('dragstart', start)
      .bind('dragenter', enter)
      .bind('dragleave', leave)
      .bind('dragend', end);

    function start(ev) {
      items = $(selector, context);
    }

    function enter(ev) {
      $(ev.toElement).addClass(method(this, ev.toElement));
    }

    function leave(ev) {
      $(ev.fromElement).removeClass('before after');
    }

    function end(ev) {
      ev.relatedTarget && move(this, ev.relatedTarget);
    };

    function move(src, dst) {
      var isrc = items.index(src),
          idst = items.index(dst),
          changed = items.slice(Math.min(isrc, idst), Math.max(isrc, idst) + 1);
      $(dst).removeClass('before after')[method(src, dst)](src);
      trigger($(src), 'sorted', { relatedTarget: dst, changed: changed });
    }

    function method(src, dst) {
      return (items.index(src) < items.index(dst)) ? 'after' : 'before';
    }

    function trigger(item, name, data) {
      return item.trigger(data ? $.extend($.Event(name), data) : name);
    }

    return items;
  };

  $.fn.highlight = function(className) {
    return this.each(function() {
      var self = $(this), orig = self.style();
      self.addClass(className)
        .data('highlight', { cls: className, diff: diffStyle(orig, this) });
    });
  };

  $.fn.fadeBack = function(duration, easing) {
    return this.each(function() {
      var self = $(this),
          state = self.data('highlight'),
          properties = revertable(state.diff, this);

      self.animate(properties, duration, easing, function() {
        self.removeClass(state.cls).style(properties, '');
      });
    });
  };

  function diffStyle(orig, el) {
    var result = {};

    $.eachStyle(el, function(name, value) {
      if (orig[name] != value)
        result[name] = [orig[name], value];
    });

    return result;
  }

  function revertable(diff, el) {
    var properties = {};

    $.each(diff, function(name, values) {
      if ($.css(el, name) == values[1])
        properties[name] = values[0];
    });

    return properties;
  }

  $.fn.snapshot = function(events) {
    return transferStyle(this, this.clone(events));
  };

  function transferStyle(from, into) {
    return into.each(function(index) {
      var self = $(this);

      $.eachStyle(from[index], function(name, value) {
        self.css(name, value);
      });

      transferStyle(from[index].childNodes, self.children());
    });
  }

  $.fn.style = function(name, value) {
    if (arguments.length == 0)
      return captureStyle(this);
    else if (arguments.length == 1)
      switch ($.type(name)) {
      case 'array':
        return captureStyle(this, name);
      default:
        return this.css(name);
      }
    else
      switch ($.type(name)) {
      case 'array':
      case 'object':
        var props = {};
        eachKey(name, function(name) { props[name] = value; });
        return this.css(props);
      default:
        return this.css(name, value);
      }
  };

  function captureStyle(q, names) {
    var result = {};
    q.eachStyle(names, function(name, value) {
      result[name] = value;
    });
    return result;
  }

  function eachKey(seq, fn) {
    if (seq.length !== undefined) {
      for (var i = 0, l = seq.length; i < l; i++)
        fn.call(this, seq[i]);
    }
    else {
      for (var key in seq)
        fn.call(this, key);
    }
  }

  $.fn.eachStyle = function(names, fn) {
    $.eachStyle(this[0], names, fn);
    return this;
  };

  $.eachStyle = function(el, names, fn) {
    var name, styles = computeStyle(el);

    if (fn === undefined) {
      fn = names;
      names = styles;
    }
    else if (names === undefined)
      names = styles;

    if (styles) {
      for (var i = 0, l = names.length; i < l; i++) {
        name = $.camelCase(names[i]);
        name = $.cssProps[name] || name;
        fn(name, $.css(el, name));
      }
    }

    return el;
  };

  function computeStyle(el) {
    if (!el)
      return {};
    if (window.getComputedStyle)
      return window.getComputedStyle(el, null);
    else
      return el.currentStyle || {};
  }

});