#!/usr/bin/env node

var fs = require("fs");
var teslo = require("../teslo.js");

function convert (env, name, fileIn, fileOut, template) {
    var src = fs.readFileSync(fileIn, { encoding: "utf8" });
    var ops = compileSource(src, env);
    var jsSrc = template(name, src, ops);
    fs.writeFileSync(fileOut, jsSrc);
}

var templates = {
    lib: function (name, src, ops) {
        return [
            "(function (teslo) {",
            "  teslo." + name + " = {",
            "    source: " + formatSrc(src) + ",",
            "    ops: " + formatOps(ops),
            "  };",
            "})(this.teslo || require('../'));"
        ].join("\n");
    },
    standalone:
    function (name, src, ops) {
        return [
            "(function (" + name + ") {",
            name + ".source = " + formatSrc(src) + ";",
            name + ".ops = " + formatOps(ops) + ";",
            "})(typeof exports === \"undefined\" ? this[\"" + name + "\"] = {} : exports);"
        ].join("\n");
    }
};

function formatSrc (src) {
    var srcLines = src.split("\n")
            .map(JSON.stringify)
            .join(",\n");
    return ["[",
            srcLines,
            "].join('\\n')"].join("\n");
}

function formatOps (ops) {
    var opsLines = ops.map(JSON.stringify)
        .join(",\n");
    return ["[",
            opsLines,
            "]"].join("\n");
}

function compileSource (source, env) {
    var forms = teslo.read(source).forms;
    return forms.reduce(
        function (all, form) {
            var expandedForm = teslo.macroExpand([form], env);
            var ops = teslo.compile(expandedForm, []);
            teslo.run(ops, env); // run the compiled code, to update env with any macro expansion time dependencies
            return all.concat(ops);
        }, []);
}

if (require.main === module) {
    var env = teslo.environment();
    ["prelude", "repl"].forEach(function (name) {
        var fileIn = "lib/" + name + ".teslo";
        var fileOut = "lib-js/teslo." + name + ".js";
        convert(env, name, fileIn, fileOut, templates.lib);
    });
    console.log("Conversion complete!");
}
