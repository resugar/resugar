/* jshint evil:true */

(function() {
  function makeElementWithClass(className) {
    var element = document.createElement('div');
    element.className = className;
    return element;
  }

  function Console(element) {
    this._container = element;
    this._groups = [element];
  }
  Console.prototype.log = function() {
    this.append('log', [].slice.call(arguments));
    console.log.apply(console, arguments);
  };
  Console.prototype.info = function() {
    this.append('info', [].slice.call(arguments));
    console.info.apply(console, arguments);
  };
  Console.prototype.warn = function() {
    this.append('warn', [].slice.call(arguments));
    console.warn.apply(console, arguments);
  };
  Console.prototype.error = function() {
    this.append('error', [].slice.call(arguments));
    console.error.apply(console, arguments);
  };
  Console.prototype.group = function() {
    var group = makeElementWithClass('group');
    this._currentGroup().appendChild(group);
    this._groups.push(group);
  };
  Console.prototype.groupEnd = function() {
    var groups = this._groups;
    if (groups.length === 1) {
      return;
    }
    groups.pop();
  };
  Console.prototype._flushGroups = function() {
    this._groups = [this._groups[0]];
  };
  Console.prototype.append = function(level, args) {
    var scrolledToBottom = this._isScrolledToBottom();
    var lineElement = makeElementWithClass('line ' + level);
    lineElement.appendChild(document.createTextNode(
      args.map(function(item) {
        return ''+item;
      }).join(' ')
    ));
    this._currentGroup().appendChild(lineElement);
    if (scrolledToBottom) {
      this._container.scrollTop = this._container.scrollTopMax;
    }
  };
  Console.prototype._currentGroup = function() {
    return this._groups[this._groups.length - 1];
  };
  Console.prototype._isScrolledToBottom = function() {
    return this._container.scrollTopMax < this._container.scrollTop + 10;
  };

  function Context(console) {
    this.console = console;
  }
  Context.prototype.evaluate = function(source) {
    var fn = new Function('console', source);
    fn(this.console);
  };

  var source = decodeURIComponent(location.hash.slice(1));
  var context = new Context(
    new Console(document.querySelector('.console'))
  );

  [].forEach.call(document.querySelectorAll('.input-output'), function(pair) {
    var input = CodeMirror.fromTextArea(pair.querySelector('textarea:nth-of-type(1)'), {
      lineNumbers: true,
      smartIndent: false,
      indentWithTabs: false,
      tabSize: 2,
      autofocus: true,
      theme: 'default'
    });

    var output = CodeMirror.fromTextArea(pair.querySelector('textarea:nth-of-type(2)'), {
      lineNumbers: true,
      smartIndent: false,
      indentWithTabs: false,
      tabSize: 2,
      theme: 'default'
    });

    if (source) {
      input.setValue(source);
    }

    var errorContainer = pair.querySelector('.error-message');
    var convertTimeout;
    input.on('change', function() {
      if (convertTimeout) {
        clearTimeout(convertTimeout);
      }
      convertTimeout = setTimeout(convert, 500);
    });

    function convert() {
      var compiled;
      try {
        context.console._flushGroups();
        source = input.getValue();
        location.hash = encodeURIComponent(source);
        compiled = esnext.compile(source).code;
        context.console.group();
        output.setValue(compiled);
        hideError();
      } catch (ex) {
        console.error('compile error:', ex);
        showError(ex.message);
      }
      if (compiled) {
        try {
          context.evaluate(compiled);
        } catch (ex) {
          console.error('runtime error:', ex);
          showError(ex.message);
        }
      }
    }

    function showError(error) {
      errorContainer.innerHTML = '';
      errorContainer.appendChild(document.createTextNode(error));
      errorContainer.style.display = 'block';
    }

    function hideError() {
      errorContainer.style.display = '';
    }

    convert();
  });
})();
