var teslo = require("./teslo");

function repl() {
    var readline = require("readline");
    var env = teslo.environment();
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: function(line) {
            var vars = Object.keys(env.frames[0]);
            var hits = vars.filter(function(c) {
                return c.indexOf(line) === 0 ||
                    (c.indexOf(line.substring(1)) === 0
                     && line[0] === '('); });
            return [hits, line.replace("(", "")]; } });
    var i = 0;
    rl.setPrompt("> ");
    rl.prompt();
    rl.on("line", function(line) {
        try {
            var result = teslo.evaluate(line, env);
            if (result.length) {
                env.def("$" + i, result[0]);
                teslo.evaluate("(print $" + i + ")", env); } }
        catch (e) {
            console.log(e); }
        rl.prompt();
        i++;
    }).on("close", function() {
        process.exit(0); }); }

if (require.main === module) repl();
