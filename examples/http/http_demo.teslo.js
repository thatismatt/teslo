(function (http_demo) {
http_demo.source = [
";;",
"",
"(http-start \"127.0.0.1\" 7777",
"            (fn (req res)",
"                (let (ts (timestamp))",
"                     (http-response-body res (+ \"Hello from teslo! (\" ts \")\")))))",
""
].join('\n');
})(typeof exports === "undefined" ? this["http_demo"] = {} : exports);