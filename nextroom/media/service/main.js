define(['./util', './router', './server', './mouse'], function(U, Router, Server) {

  var app = Router.createRouter(),
      api = Server.createClient(),
      main;

  function Main(selector) {
    this.elem = $(selector);
    this.view = null;
  }

  
  // ## Roles ##

  
  // ## Dashboard ##

  // There's no dashboard yet, so just redirect to App.
  app.load(/^$/, function(req) {
    app.location('app');
  });

  
  // ## App ##

  function App(selector) {
    this.elem = $(selector);
    this.panels = this.elem.children('.panel');

    this.elem;
  }

  App.prototype.show = function(fn) {
    this.elem.fadeIn('fast', fn);
    return this;
  };

  App.prototype.hide = function(fn) {
    this.elem.fadeOut('fast', fn);
    return this;
  };

  // ### App Controllers ###

  app.load(/^app(.*)/, function(req) {
    var panels = main.app.panels;

    // Register this request.
    if (main.view !== main.app)
      main.view = main.app.show();
    main.active = req;

    // Iterate over successive partial uris, matching each with a
    // panel. If the panel is inactive, add it to the wait set.
    var wait = reduceSegments(req.uri, $(), function(index, uri, wait) {
      var panel = panels.eq(index);
      if (!panel.is('.active, .static'))
        return wait.add(panel.data('uri', uri));
    });

    // Request data in the wait set and initialize each panel. After
    // waiting, only show the panels if the main view hasn't changed
    // to handle another request in the mean time.
    api.get(uris(wait), function(data) {
      if (main.active === req)
        showPanels(wait.each(function(index, el) {
          $(el).view(data[index]);
        }));
    });
  });

  app.unload(/^app(.*)/, function(req, next, ok) {
    var panels = main.app.panels,
        future = next ? listSegments(next.uri) : [];

    // The `future` list holds the panel uris that are about to be
    // loaded after this unload event is handled. Destroy any panels
    // that aren't in the list.
    hidePanels(panels.filter(function(index) {
      var panel = $(this);
      return panel.is('.active') && panel.data('uri') != future[index];
    })).data('uri', null);

    // Unregister this request.
    main.active = null;
    if (future[0] != 'app') {
      main.app.hide();
      main.view = null;
    }
  });

  // ### App Views ###

  $.view('#app-kind', function(data) {
    var self = this,
        uri = this.data('uri'),
        list = makeList(data)
          .addClass('content')
          .appendTo(this.empty())
          .sortable('> .entry').end()
          .bind('sorted', sorted);

    function sorted(ev) {
      ev.changed.addClass('saving');
      api.put(uri, value(), function(result) {
        ev.changed.removeClass('saving');
      });
    }

    function value() {
      var data = [];
      list.children('.entry')
        .each(function(_, el) {
          data.push($.data(el, 'value'));
        });
      return data;
    }

    return list;
  });

  $.view('#app-editor', function(data) {
    return makeEditor(this.data('uri'), data)
      .addClass('content')
      .appendTo(this.empty());
  });

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

  function makeList(list) {
    var el = $('<ul class="sortable content" />');

    $('<li class="header"/>')
      .append('<span>&nbsp;</span>')
      .append('<button class="add" value="add">+</button>')
      .appendTo(el);

    $.each(list, function(_, item) {
      $('<a/>')
        .attr({ href: app.href(item.uri) })
        .html(item.name)
        .wrap('<li class="entry" />')
        .parent()
          .data('value', item)
          .addClass(item.special ? 'special' : '')
          .append('<button class="delete">x</button>')
          .appendTo(el);
    });

    return el;
  }

  function makeEditor(uri, data) {
    var probe = uri.match(/^app\/([^/]+)\/(.*)$/),
        kind = '.' + (data.special ? 'special-' : '') + probe[1] + '-detail';

    return $('#template')
      .children(kind)
      .cloneTemplate()
      .attr({ method: uri })
      .view(data);
  }

  // ### App Helper Methods ###

  function splitUri(uri) {
    uri = uri.replace(/^[\s\/]+|[\s\/]+$/, '');
    return uri ? uri.split(/\/+/) : [];
  }

  function listSegments(uri) {
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
    return panels.each(function() {
      var content = $('> .content', this);
      content
        .stop(true, true)
        .animate({ opacity: 0, left: -1 * content.data('shutter.left') }, 'fast', 'swing');
    }).removeClass('active');
  }

  
  // ### Account ###

  app.load(/^account/, function(req) {
    console.debug('load account');
  });

  app.unload(/^account/, function(req) {
    console.debug('unload account');
  });

  function MainAccount(selector) {
  }

  
  // ## Help ##

  app.load(/^help/, function(req) {
    main.help.show();
  });

  app.unload(/^help/, function(req) {
    main.help.hide();
  });

  function Help(selector) {
    this.elem = $(selector);

    $('a[href=#!help]').click(function(ev) {
      ev.preventDefault();
      app.toggle('help');
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

  $(function() {
    main = new Main('[role=main]');
    main.app = new App('#app');
    main.help = new Help('#help');
    app.listen();
  });

});