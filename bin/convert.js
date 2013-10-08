#!/usr/bin/env node

var fs = require("fs");

function template (name, src) {
    return ["(function (teslo) { teslo.", name, " = ", JSON.stringify(src), "; })(this.teslo || require('../'))"].join(""); };

function convert (name) {
    var file = "lib/" + name + ".teslo";
    var src = fs.readFileSync(file, { encoding: "utf8" });
    var jsSrc = template(name, src);
    fs.writeFileSync("lib-js/teslo." + name + ".js", jsSrc); }

if (require.main === module) {
    convert("prelude");
    console.log("Conversion complete!"); }
