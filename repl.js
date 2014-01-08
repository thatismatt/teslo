var teslo = require("./teslo");
require("./lib-js/teslo.prelude.js");
var readline = require("readline");

function completer (env) {
    return function (line) {
        var parts = line.split(/[\s\()]+/);
        var v = parts[parts.length - 1];
        var vs = Object.keys(env.frames);
        var hits = vs.filter(function (c) { return c.indexOf(v) === 0; });
        return [hits, v]; }; }

function repl () {
    var env = teslo.environment();
    teslo.evaluate(teslo.prelude, env);
    var rdln = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: completer(env) });
    var resultIndex = 0;
    rdln.setPrompt("> ");
    rdln.prompt();
    rdln.on(
        "line",
        function (line) {
            function evaluateLine () {
                var result = teslo.evaluate(line, env);
                if (result.length) {
                    for (var i = 0; i < result.length; i++) {
                        if (result[i] !== undefined) {
                            env.def("$" + resultIndex, result[i]);
                            teslo.evaluate("(print $" + resultIndex + ")", env);
                            resultIndex++; } } } }
            try {
                evaluateLine();
            } catch (e) {
                console.log(e); }
            rdln.prompt(); })
        .on("close", function () {
            process.exit(0); }); }

if (require.main === module) repl();
