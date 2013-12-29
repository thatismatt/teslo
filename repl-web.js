(function (teslo) {

    var $in = $("#in");
    var $out = $("#out");
    var $form = $("form");
    var $env = $("#env");
    var history = [];
    var historyIndex = 0;
    var env = teslo.environment();
    teslo.evaluate(teslo.prelude, env);

    function read () {
        var line = $in.val();
        $in.val("");
        return line; }

    function eval (line) {
        function evaluateLine () {
            var result = teslo.evaluate(line, env)[0];
            if (!result) return undefined;
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
        Object.keys(env.frames)
            .sort()
            .filter(function (n) { return !/\$[0-9]/.test(n); })
            .map(function (n, i) {
                $env.append(
                    $("<tr>").append($("<td>").text(n))
                             .append($("<td>").text(toString(n)))); }); }

    function toString(x) {
        return teslo.evaluate("(string " + x + ")", env)[0]; }

    $form.submit(function () {
        var line = read();
        if (line) {
            history.push(line);
            historyIndex = history.length;
            print(line, "in", "> ");
            var result = eval(line);
            print(result, result instanceof Error ? "error" : "out");
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

    $in.focus();

    displayEnvironment();

})(this.teslo);
