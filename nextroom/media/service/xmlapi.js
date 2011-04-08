define(['exports', './util', './events'],
function(exports, U, Events) {

  exports.Client = Client;

  
  // ## Configuration ##

  var ROOMS = '/svc/rooms/';

  
  // ## Room ##

  function Room() {
  }

  Room.prototype.update = function(node) {
    var self = this,
        changed = false;

    eachAttr(node, function(val, name) {
      if (self[name] !== val) {
        self[name] = val;
        changed = true;
      }
    });

    return changed;
  };

  
  // ## Client ##

  U.inherits(Client, Events.EventEmitter);
  function Client(opt) {
    Events.EventEmitter.call(this);

    opt = opt || {};
    this.delta = opt.delta || 2000;
    this.version = '';
    this.rooms = {};
    this.interval = undefined;

    var self = this;
    this._loop = function() {
      self.getRooms();
    };
  }

  Client.prototype.reset = function() {
    return this.pause().resume();
  };

  Client.prototype.resume = function() {
    if (!this.interval) {
      this.interval = setInterval(this._loop, this.delta);
      this.getRooms();
    }
    return this;
  };

  Client.prototype.pause = function() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    return this;
  };

  Client.prototype.getRooms = function() {
    var self = this,
        params = { version: this.version };

    request('get', ROOMS, params, function(err, rooms) {
      err ? self.emit('error', err) : process(rooms);
    });

    function process(doc) {
      var rsp = $('rsp', doc);

      self.version = rsp.attr('versionid');
      // FIXME: What is status?
      // FIXME: What is notify?

      var id, room, delta = [], rooms = self.rooms;
      rsp.children('room').each(function() {
        room = rooms[id = this.getAttribute('roomUID')];

        if (!room) {
          room = rooms[id] = new Room();
        }

        if (room.update(this)) {
          delta.push(room);
        }

      });

      if (delta.length > 0) {
        self.emit('update', delta);
      }
    }

    return this;
  };

  
  // ## XML API  ##

  function request(method, uri, data, next) {

    if (typeof data == 'function') {
      next = data;
      data = undefined;
    }

    $.ajax({
      type: method,
      url: uri,
      data: data,
      dataType: 'xml',
      cache: false,

      success: function(data, status, xhr) {
        next(null, data);
      },

      error: function(xhr, status, err) {
        next(err);
      }
    });
  }

  function eachAttr(node, fn) {
    var all = node.attributes,
        attr;
    for (var i = 0, l = all.length; i < l; i++) {
      attr = all[i];
      fn(attr.value, attr.name);
    }

    return node;
  }

});