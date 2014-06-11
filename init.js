//var Compiler = ModuleTranspiler.Compiler,
//  $input = $('#input'),
//  $output = $('#output'),
//  $command = $('#command'),
//  $types = $('input[type=radio][name=type]'),
//  waitTimeout;
//
//$input.keyup(function() {
//  if (waitTimeout) clearTimeout(waitTimeout);
//  waitTimeout = setTimeout(transpile, 100);
//});
//
//$types.change(transpile);
//
//function transpile() {
//  var output,
//    type = $types.filter(':checked').attr('value');
//
//  try {
//    var compiler = new Compiler($input.val(), 'segment', {imports: []});
//    output = (type === 'amd') ? compiler.toAMD() : compiler.toCJS();
//  } catch (ex) {
//    output = ex.message + "\n" + ex.backtrace.join("\n");
//  }
//
//  $command.text('$ compile-modules --type ' + type + ' --to output input');
//  $output.val(output);
//}

//transpile();

(function() {
  var source = decodeURIComponent(location.hash.slice(1));
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
      try {
        source = input.getValue();
        location.hash = encodeURIComponent(source);
        output.setValue(esnext.compile(source).code);
        hideError();
      } catch (ex) {
        console.log('conversion error: ', ex);
        showError(ex.message);
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
