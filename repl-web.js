(function (teslo) {

    var $in = $("#in");
    var $out = $("#out");
    var $form = $("form");
    var $env = $("#env");
    var history = [];
    var historyIndex = 0;
    var global_env = teslo.environment();

    teslo.evaluate(teslo.prelude, global_env);

    var env = global_env.child(
        { "console-log*": global_env.lookup("log*"),
          "log*": function (args) { print(args[0]); } });

    teslo.evaluate(teslo.repl, env);

    function read () {
        var line = $in.val();
        $in.val("");
        return line; }

    function eval (line) {
        function evaluateLine () {
            var result = teslo.evaluate(line, env)[0];
            if (result === undefined) return undefined;
            env.def("$" + history.length, result);
            return toString("$" + history.length); }

        try {
            return evaluateLine();
        } catch (e) {
            return e; } }

    function print (result, cssClass, prefix) {
        $out.append($("<div>")
                    .addClass(cssClass)
                    .text((prefix || "") + result)); }

    function displayEnvironment () {
        $env.empty();
        env.defs()
            .sort()
            .filter(function (n) { return !/\$[0-9]/.test(n); })
            .map(function (n, i) {
                $env.append(
                    $("<div>").addClass("var")
                        .append($("<span>").text(n))
                        .append($("<span>").text(toString(n)))); }); }

    function toString(x) {
        return teslo.evaluate("(string " + x + ")", env)[0]; }

    function complete (s) {
        if (s && s !== "") {
            var symbols = s.split(/[ ()]/);
            var symbol = symbols[symbols.length - 1];
            var x = [s.substring(0, s.length - symbol.length), symbol];
            var completion = env.defs().sort().find(function (d) { return d.match("^" + x[1]); });
            if (completion) return x[0] + completion; }
        return s; }

    $form.submit(function () {
        var line = read();
        if (line) {
            history.push(line);
            historyIndex = history.length;
            print(line, "in", "> ");
            var result = eval(line);
            if (result) print(result, result instanceof Error ? "error" : "out");
            displayEnvironment(); }
        $out.scrollTop($out[0].scrollHeight);
        return false; });

    $form.keyup(function (e) {
        var key = e.keyCode || e.which;
        if (key === 38  // up
            && historyIndex > 0) {
            historyIndex--;
            $in.val(history[historyIndex]); }
        if (key === 40 // down
            && historyIndex < history.length) {
            historyIndex++;
            $in.val(history[historyIndex]); } });

    $form.keydown(function (e) {
        var key = e.keyCode || e.which;
        if (key === 9) { // tab
            $in.val(complete($in.val()));
            return false; }
        return true; });

    $in.focus();

    displayEnvironment();

})(this.teslo);
