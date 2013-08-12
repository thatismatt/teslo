(function (mocha, chai, teslo) {

    chai.Assertion.includeStack = true;
    var assert = chai.assert;

    // assert helpers
    function isBuiltInType (type) { return function (env, name) { assert.equal(env.lookup(name).type, type); }; }
    var isFunction = isBuiltInType("function");
    var isList = isBuiltInType("list");
    var isNumber = isBuiltInType("number");
    function isType (env, name, type) { assert.equal(env.lookup(name), type); }

    suite("evaluate", function () {

        function setupEnv () {
            var env = teslo.environment();
            teslo.evaluate(teslo.prelude, env);
            return env;
        }

        function evaluate (src) {
            var env = setupEnv();
            teslo.evaluate(src, env);
            return env;
        }

        function evaluateForm (src) {
            var env = setupEnv();
            return teslo.evaluate(src, env)[0];
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
                isList(env, "my-list");
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
                isFunction(env, "f");
            });

            test("create and invoke function", function() {
                var env = evaluate("(def x ((fn () 1) 1))");
                isNumber(env, "x");
                assert.equal(env.lookup("x").value, 1);
            });

            test("define a function and invoke", function() {
                var env = evaluate("(def f (fn () 1)) (def x (f))");
                isNumber(env, "x");
                assert.equal(env.lookup("x").value, 1);
            });

            test("invoke function with different args", function() {
                var env = evaluate("(def f (fn (a) a)) (def x (f 1)) (def y (f 2))");
                isNumber(env, "x");
                assert.equal(env.lookup("x").value, 1);
                isNumber(env, "y");
                assert.equal(env.lookup("y").value, 2);
            });

            test("closure", function() {
                var env = evaluate("(def f (let (a 1) (fn () a))) (def x (f))");
                isNumber(env, "x");
                assert.equal(env.lookup("x").value, 1);
            });

        });

        suite("type", function () {

            test("create anonymous type", function() {
                var result = evaluateForm("(create-type)");
                assert.equal(result.type, "Type");
            });

        });

        suite("deft", function () {

            test("define type", function() {
                var env = evaluate("(deft (T)) (def x (T))");
                assert.equal(env.lookup("x").type, "T");
            });

            test("define type with explicit constructor", function() {
                var env = evaluate("(deft T (C)) (def x (C))");
                assert.equal(env.lookup("x").type, "T");
            });

            test("define type with two constructors", function() {
                var env = evaluate("(deft T (C1) (C2)) (def x1 (C1)) (def x2 (C2))");
                assert.equal(env.lookup("x1").type, "T");
                assert.equal(env.lookup("x2").type, "T");
            });

            test("define type with constructor taking one parameter", function() {
                var env = evaluate("(deft (T a)) (def x (T 1)) (def y (T.a x))");
                assert.equal(env.lookup("x").type, "T");
                assert.equal(env.lookup("y").value, 1);
            });

            test("define type with constructor taking multiple parameters", function() {
                var env = evaluate("(deft (T a b c)) (def x (T 1 2 3)) (def xa (T.a x)) (def xb (T.b x)) (def xc (T.c x))");
                assert.equal(env.lookup("x").type, "T");
                assert.equal(env.lookup("xa").value, 1);
                assert.equal(env.lookup("xb").value, 2);
                assert.equal(env.lookup("xc").value, 3);
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

        suite("reflection", function () {

            test("type", function() {
                var env = evaluate("(def a (type 1))");
                isType(env, "a", "number");
            });

        });

        suite("pattern matching", function () {

            test("match - value", function() {
                var result = evaluateForm('(match 1 1 "one")');
                assert.equal(result.value, "one");
            });

            test("match - symbol is catch all", function() {
                var env = evaluate('(def m (fn (x) (match x a "catchall")))');
                assert.equal(teslo.evaluate("(m 1)", env)[0].value, "catchall");
                assert.equal(teslo.evaluate("(m 2)", env)[0].value, "catchall");
            });

            test("match - value must be exact match", function() {
                var env = evaluate('(def m (fn (x) (match x 1 "one" 2 "two")))');
                assert.equal(teslo.evaluate("(m 1)", env)[0].value, "one");
                assert.equal(teslo.evaluate("(m 2)", env)[0].value, "two");
            });

            test("match - type", function() {
                var env = evaluate('(deft (A)) (def m (fn (x) (match x (A) "A")))');
                assert.equal(teslo.evaluate("(m (A))", env)[0].value, "A");
            });

            test("match - constructor", function() {
                var env = evaluate('(deft T (A) (B)) (def m (fn (x) (match x (A) "A" (B) "B")))');
                assert.equal(teslo.evaluate("(m (A))", env)[0].value, "A");
                assert.equal(teslo.evaluate("(m (B))", env)[0].value, "B");
            });

        });

    });

    // TODO: test prelude environment

})(this.mocha || new require("mocha").Mocha,
   this.chai || require("chai"),
   this.teslo || (function () {
       var teslo = require("../");
       teslo.prelude = require("fs").readFileSync("lib/prelude.teslo", { encoding: "utf8" });
       return teslo; })());
