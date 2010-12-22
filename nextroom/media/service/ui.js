define(['exports', './util'], function(exports, U) {

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
  }

  Checkbox.prototype.isChecked = function() {
    return this._input.is(':checked');
  };

  Checkbox.prototype.value = function() {
    return this.isChecked() ? this._input.val() : '';
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

});