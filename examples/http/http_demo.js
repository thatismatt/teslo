var teslo = require("../teslo");
require("../lib-js/teslo.prelude.js");
var http_demo_teslo = require("./http_demo.teslo.js");
var http = require("http");

function start () {
    var env = teslo.environment();
    teslo.run(teslo.prelude.ops, env);

    env.def("http-start", function (args) {
        var host = args[0];
        var port = args[1];
        var handler = args[2];

        http.createServer(function (req, res) {

            var start = +new Date;

            res.writeHead(200, {'Content-Type': 'text/plain'});

            teslo.run([["value", req], ["value", res], ["value", handler], ["invoke", 2]], env);

            var end = +new Date;

            console.log(end - start);

        }).listen(port, host);
    });

    env.def("http-response-body", function (args) {
        args[0].end(args[1]);
    });

    teslo.evaluate(http_demo_teslo.source, env);
}

if (require.main === module) start();
