var teslo = require("./teslo");

function repl() {
    var readline = require("readline");
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    var env = teslo.environment();
    rl.on("line", function(line) {
        try {
            var result = teslo.evaluate(line, env);
            console.log(result);
        } catch (e) {
            console.log(e);
        }
    }).on("close", function() {
        process.exit(0);
    });
}

if (require.main === module) {
    repl();
}
