(function (mocha, chai, teslo, readFile) {

    chai.Assertion.includeStack = true;
    var assert = chai.assert;

    suite("parser", function () {

        suite("forms", function () {

            test("one empty top level list", function() {
                var result = teslo.parse("()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 1);
                assert.equal(result.forms[0].length, 0);
            });

            test("invalid list fails", function() {
                var result = teslo.parse("(");
                assert.ok(!result.success);
            });

            test("list containing symbol", function() {
                var result = teslo.parse("(f)");
                assert.ok(result.success);
                assert.equal(result.forms[0].length, 1);
                assert.equal(result.forms[0][0].name, "f");
                assert.equal(result.forms[0][0].type, "symbol");
            });

            test("list containing 2 symbols", function() {
                var result = teslo.parse("(f a)");
                assert.ok(result.success);
                assert.equal(result.forms[0].length, 2);
                assert.equal(result.forms[0][0].name, "f");
                assert.equal(result.forms[0][0].type, "symbol");
                assert.equal(result.forms[0][1].name, "a");
                assert.equal(result.forms[0][1].type, "symbol");
            });

            test("multi character symbols", function() {
                var result = teslo.parse("(zero one two three)");
                assert.ok(result.success);
                assert.equal(result.forms[0][0].name, "zero");
                assert.equal(result.forms[0][1].name, "one");
                assert.equal(result.forms[0][2].name, "two");
                assert.equal(result.forms[0][3].name, "three");
            });

            test("multiple top level lists", function() {
                var result = teslo.parse("()()()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 3);
            });

            test("different whitespace between top level lists", function() {
                var result = teslo.parse("()\n()\t() () \n()\t ()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 6);
            });

            test("nested lists", function() {
                var result = teslo.parse("(())");
                assert.ok(result.success);
                assert.equal(result.forms.length, 1);
                assert.equal(result.forms[0].length, 1);
            });

        });

        suite("literals", function () {

            test("integer", function() {
                var result = teslo.parse("123");
                assert.ok(result.success);
                assert.equal(result.forms[0].type, "number");
                assert.equal(result.forms[0].value, 123);
            });

            test("string", function() {
                var result = teslo.parse('"Hello world!"');
                assert.ok(result.success);
                assert.equal(result.forms[0].type, "string");
                assert.equal(result.forms[0].value, "Hello world!");
            });

            test("empty string", function() {
                var result = teslo.parse('""');
                assert.ok(result.success);
                assert.equal(result.forms[0].type, "string");
                assert.equal(result.forms[0].value, "");
            });

            test("keyword", function() {
                var result = teslo.parse(':kwd');
                assert.ok(result.success);
                assert.equal(result.forms[0].type, "keyword");
                assert.equal(result.forms[0].name, "kwd");
            });

            //   doubles
            //   string - escape characters
            //   lists/vectors []
            //   maps {}
            //   sets?
            //   regex?

        });

        suite("reader macros", function () {

            test("quote list", function() {
                var result = teslo.parse("'()"); // (quote ())
                assert.ok(result.success);
                assert.equal(result.forms[0].type, "list");
                assert.equal(result.forms[0][0].type, "symbol");
                assert.equal(result.forms[0][0].name, "quote");
                assert.equal(result.forms[0][1].type, "list");
                assert.equal(result.forms[0][1].length, 0);
            });

            test("quote symbol in list", function() {
                var result = teslo.parse("(f 'x)"); // (f (quote x))
                assert.ok(result.success);
                assert.equal(result.forms[0][1][0].type, "symbol");
                assert.equal(result.forms[0][1][0].name, "quote");
                assert.equal(result.forms[0][1][1].type, "symbol");
                assert.equal(result.forms[0][1][1].name, "x");
            });

            test("comment", function() {
                var result = teslo.parse("; a comment");
                assert.ok(result.success);
                assert.equal(result.forms[0].type, "list");
                assert.equal(result.forms[0][0].type, "symbol");
                assert.equal(result.forms[0][0].name, "comment");
                assert.equal(result.forms[0][1].type, "string");
                assert.equal(result.forms[0][1].value, " a comment");
            });

            test("comment between lists", function() {
                var result = teslo.parse("()\n; a comment\n()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 3);
            });

            test("syntax quote", function() {
                var result = teslo.parse("`(a)"); // (syntax-quote (a))
                assert.ok(result.success);
                assert.equal(result.forms[0].type, "list");
                assert.equal(result.forms[0][0].type, "symbol");
                assert.equal(result.forms[0][0].name, "syntax-quote");
                assert.equal(result.forms[0][1][0].name, "a");
            });

            test("unquote", function() {
                var result = teslo.parse("`(~a)"); // (syntax-quote ((unquote a)))
                assert.ok(result.success);
                assert.equal(result.forms[0].type, "list");
                assert.equal(result.forms[0][1][0][0].type, "symbol");
                assert.equal(result.forms[0][1][0][0].name, "unquote");
                assert.equal(result.forms[0][1][0][1].name, "a");
            });

            test("unquote splice", function() {
                var result = teslo.parse("`(~@a)"); // (syntax-quote ((unquote-splice a)))
                assert.ok(result.success);
                assert.equal(result.forms[0].type, "list");
                assert.equal(result.forms[0][1][0][0].type, "symbol");
                assert.equal(result.forms[0][1][0][0].name, "unquote-splice");
                assert.equal(result.forms[0][1][0][1].name, "a");
            });

        });

        suite("examples", function () {

            function example (name, testFn) {
                test(name + " example", function(done) {
                    readFile("examples/" + name + ".teslo", function (f) {
                        var result = teslo.parse(f);
                        assert.ok(result.success);
                        testFn(result);
                        done();
                    });
                });
            }

            example("identity", function (result) {
                assert.equal(result.forms.length, 1);
                var def = result.forms[0];
                assert.equal(def.type, "list");
                assert.equal(def.length, 3);
                assert.equal(def[0].type, "symbol");
                assert.equal(def[0].name, "def");
                assert.equal(def[1][1].type, "symbol");
                assert.equal(def[1][1].name, "x");
            });

            example("prelude", function (result) {});

            example("list", function (result) {});

        });

    });

    suite("evaluate", function () {

        function evaluate (src) {
            var env = teslo.environment();
            teslo.evaluate(teslo.prelude, env);
            teslo.evaluate(src, env);
            return env;
        }

        suite("def", function () {

            test("assign 1 to x", function() {
                var env = evaluate("(def x 1)");
                assert.equal(env.lookup("x").value, 1);
            });

            test("assign 2 to y", function() {
                var env = evaluate("(def y 2)");
                assert.equal(env.lookup("y").value, 2);
            });

            test('assign "Hello, World" to greeting', function() {
                var env = evaluate('(def greeting "Hello, World")');
                assert.equal(env.lookup("greeting").value, "Hello, World");
            });

            test("assign list to my-list", function() {
                var env = evaluate("(def my-list '(1 2 3))");
                var myList = env.lookup("my-list");
                assert.equal(myList.type, "list");
                assert.equal(myList[0].value, 1);
                assert.equal(myList[1].value, 2);
                assert.equal(myList[2].value, 3);
            });

            test("two defs", function() {
                var env = evaluate("(def a 1) (def b 2)");
                assert.equal(env.lookup("a").value, 1);
                assert.equal(env.lookup("b").value, 2);
            });

            test("assign a to b", function() {
                var env = evaluate("(def a 1) (def b a)");
                assert.equal(env.lookup("a").value, 1);
                assert.equal(env.lookup("b").value, 1);
            });

            test("maths with values", function() {
                var env = evaluate(["(def add (+ 1 2))",
                                "(def sub (- 6 1 2))",
                                "(def mul (* 1 2 3))",
                                "(def div (/ 12 4 3))"].join(""));
                assert.equal(env.lookup("add").value, 3);
                assert.equal(env.lookup("sub").value, 3);
                assert.equal(env.lookup("mul").value, 6);
                assert.equal(env.lookup("div").value, 1);
            });

            test("maths symbols", function() {
                var env = evaluate("(def a 1) (def b 2) (def c (+ a b))");
                assert.equal(env.lookup("c").value, 3);
            });

            test("eval", function() {
                var env = evaluate("(def a (eval '(+ 1 2)))");
                assert.equal(env.lookup("a").value, 3);
            });

        });

        suite("let", function () {

            test("let with one binding", function() {
                var env = evaluate("(def x (let (y 1) y))");
                assert.equal(env.lookup("x").value, 1);
            });

            test("let with two bindings", function() {
                var env = evaluate("(def x (let (y 1 z 2) (+ y z)))");
                assert.equal(env.lookup("x").value, 3);
            });

            test("let bindings hide globals", function() {
                var env = evaluate("(def y 2) (def x (let (y 1) y))");
                assert.equal(env.lookup("x").value, 1);
            });

            // dependent let bindings: (let (x 1 y x) ...)
            // let bind a fn
        });

        suite("fn", function () {

            test("assign function to f", function() {
                var env = evaluate("(def f (fn (x) x))");
                assert.equal(env.lookup("f").type, "function");
            });

            test("create and invoke function", function() {
                var env = evaluate("(def x ((fn () 1) 1))");
                assert.equal(env.lookup("x").type, "number");
                assert.equal(env.lookup("x").value, 1);
            });

            test("def function and invoke", function() {
                var env = evaluate("(def f (fn () 1)) (def x (f))");
                assert.equal(env.lookup("x").type, "number");
                assert.equal(env.lookup("x").value, 1);
            });

            test("invoke function with different args", function() {
                var env = evaluate("(def f (fn (a) a)) (def x (f 1)) (def y (f 2))");
                assert.equal(env.lookup("x").type, "number");
                assert.equal(env.lookup("x").value, 1);
                assert.equal(env.lookup("y").type, "number");
                assert.equal(env.lookup("y").value, 2);
            });

            test("closure", function() {
                var env = evaluate("(def f (let (a 1) (fn () a))) (def x (f))");
                assert.equal(env.lookup("x").type, "number");
                assert.equal(env.lookup("x").value, 1);
            });

        });

        suite("deft", function () {

            test("create a type", function() {
                var env = evaluate("(deft (T)) (def x (T))");
                assert.equal(env.lookup("x").type, "T");
            });

            test("create a type with an explicit constructor", function() {
                var env = evaluate("(deft T (C)) (def x (C))");
                assert.equal(env.lookup("x").type, "T");
            });

            test("create a type with two constructors", function() {
                var env = evaluate("(deft T (C1) (C2)) (def x1 (C1)) (def x2 (C2))");
                assert.equal(env.lookup("x1").type, "T");
                assert.equal(env.lookup("x2").type, "T");
            });

        });

        suite("comment", function () {

            test("comment function", function() {
                var env = evaluate("(def a 1) (comment (def not-evaled 3)) (def b 2)");
                assert.equal(env.lookup("a").value, 1);
                assert.equal(env.lookup("b").value, 2);
                assert.equal(env.lookup("not-evaled"), undefined);
            });

            test(";; syntax", function() {
                var env = evaluate("(def a 1)\n;; a comment\n(def b 2)");
                assert.equal(env.lookup("a").value, 1);
                assert.equal(env.lookup("b").value, 2);
            });

        });

    });

    // TODO: test prelude environment

})(this.mocha || new require("mocha").Mocha,
   this.chai || require("chai"),
   this.teslo || (function () {
       var teslo = require("../");
       teslo.prelude = require("fs").readFileSync("lib/prelude.teslo", { encoding: "utf8" });
       return teslo;
   })(),
   this.$ ? this.$.get
          : function (f, c) {
              var r = require("fs").readFile;
              return r(f, { encoding: "utf8" },
                       function(e, d) { if (e) throw e; c(d); }); });
