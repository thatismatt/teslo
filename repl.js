var fs = require("fs");
var teslo = require("./teslo");
var readline = require("readline");

function completer (env) {
    return function (line) {
    var vars = Object.keys(env.frames[0]);
    var hits = vars.filter(function(c) {
        return c.indexOf(line) === 0 ||
            (c.indexOf(line.substring(1)) === 0
             && line[0] === "("); });
    return [hits, line.replace("(", "")]; }; }

function repl() {
    var prelude = fs.readFileSync("lib/prelude.teslo", { encoding: "utf8" });
    var env = teslo.environment();
    teslo.evaluate(prelude, env);
    var rdln = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: completer(env) });
    var resultIndex = 0;
    rdln.setPrompt("> ");
    rdln.prompt();
    rdln.on("line", function (line) {
            try {
                var result = teslo.evaluate(line, env);
                if (result.length) {
                    for (var i = 0; i < result.length; i++) {
                    env.def("$" + resultIndex, result[i]);
                    teslo.evaluate("(print $" + resultIndex + ")", env);
                    resultIndex++; } } }
            catch (e) {
                console.log(e); }
            rdln.prompt(); })
        .on("close", function () {
            process.exit(0); }); }

if (require.main === module) repl();
