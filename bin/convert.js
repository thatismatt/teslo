#!/usr/bin/env node

var fs = require("fs");

function template (name, src) {
    return ["(function (teslo) {\nteslo.", name, " = [\n", formatSrc(src), "\n].join('\\n');\n})(this.teslo || require('../'));"].join(""); };

function convert (name) {
    var file = "lib/" + name + ".teslo";
    var src = fs.readFileSync(file, { encoding: "utf8" });
    var jsSrc = template(name, src);
    fs.writeFileSync("lib-js/teslo." + name + ".js", jsSrc); }

function formatSrc (src) {
    return src
        .split("\n")
        .map(JSON.stringify)
        .join(",\n"); }

if (require.main === module) {
    convert("prelude");
    console.log("Conversion complete!"); }
