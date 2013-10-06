(function (mocha, chai, teslo) {

    chai.Assertion.includeStack = true;
    var assert = chai.assert;

    // assert helpers
    function isOfType (type, propFn) {
        // args: env, n
        //    OR env, n, v
        //    OR o
        //    OR o, v
        return function (a, b, c) {
            var aIsEnv = a.constructor.name === "Environment";
            var o = aIsEnv ? a.lookup(b) : a;
            var v = aIsEnv ? c : b;
            assert.equal(o.type.name, type);
            if (propFn && v) assert.equal(propFn(o), v); }; }
    var isFunction = isOfType("Function");
    var isList = isOfType("List");
    var isNumber = isOfType("Number", function (o) { return o.value; });
    var isString = isOfType("String", function (o) { return o.value; });
    var isSymbol = isOfType("Symbol", function (o) { return o.name; });
    var isType = isOfType("Type", function (o) { return o.name; });

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

        function evaluateForm (src, env) {
            return teslo.evaluate(src, env || setupEnv())[0];
        }

        suite("def", function () {

            test("assign 1 to x", function () {
                var env = evaluate("(def x 1)");
                isNumber(env, "x", 1);
            });

            test("assign 2 to y", function () {
                var env = evaluate("(def y 2)");
                isNumber(env, "y", 2);
            });

            test('assign "Hello, World" to greeting', function () {
                var env = evaluate('(def greeting "Hello, World")');
                isString(env, "greeting", "Hello, World");
            });

            test("assign list to my-list", function () {
                var env = evaluate("(def my-list '(1 2 3))");
                var myList = env.lookup("my-list");
                isList(env, "my-list");
                isNumber(myList[0], 1);
                isNumber(myList[1], 2);
                isNumber(myList[2], 3);
            });

            test("two defs", function () {
                var env = evaluate("(def a 1) (def b 2)");
                isNumber(env, "a", 1);
                isNumber(env, "b", 2);
            });

            test("assign a to b", function () {
                var env = evaluate("(def a 1) (def b a)");
                isNumber(env, "a", 1);
                isNumber(env, "b", 1);
            });

            test("maths with values", function () {
                var env = evaluate(["(def add (+ 1 2))",
                                "(def sub (- 6 1 2))",
                                "(def mul (* 1 2 3))",
                                "(def div (/ 12 4 3))"].join(""));
                isNumber(env, "add", 3);
                isNumber(env, "sub", 3);
                isNumber(env, "mul", 6);
                isNumber(env, "div", 1);
            });

            test("minus with one arg negates", function () {
                var result = evaluateForm("(- 1)");
                isNumber(result, -1);
            });

            test("maths symbols", function () {
                var env = evaluate("(def a 1) (def b 2) (def c (+ a b))");
                isNumber(env, "c", 3);
            });

            test("eval", function () {
                var env = evaluate("(def a (eval '(+ 1 2)))");
                isNumber(env, "a", 3);
            });

        });

        suite("let", function () {

            test("let with one binding", function () {
                var env = evaluate("(def x (let (y 1) y))");
                isNumber(env, "x", 1);
            });

            test("let with two bindings", function () {
                var env = evaluate("(def x (let (y 1 z 2) (+ y z)))");
                isNumber(env, "x", 3);
            });

            test("let bindings hide globals", function () {
                var env = evaluate("(def y 2) (def x (let (y 1) y))");
                isNumber(env, "x", 1);
            });

            test("let over lambda", function () {
                var env = evaluate("(def f (let (y 1) (fn () y)))");
                isFunction(env, "f");
                isNumber(evaluateForm("(f)", env), 1);
            });

            // dependent let bindings: (let (x 1 y x) ...)
        });

        suite("do", function () {

            test("evaluates all arguments", function () {
                var env = evaluate("(do (def a 1) (def b 2))");
                isNumber(env, "a", 1);
                isNumber(env, "b", 2);
            });

            test("evaluates arguments in order", function () {
                var env = evaluate("(do (def a 1) (def b (+ a 1)))");
                isNumber(env, "a", 1);
                isNumber(env, "b", 2);
            });

            test("returns result of last argument", function () {
                var result = evaluateForm("(do 1 2 3 4)");
                isNumber(result, 4);
            });

        });

        suite("fn", function () {

            test("assign function to f", function () {
                var env = evaluate("(def f (fn (x) x))");
                isFunction(env, "f");
            });

            test("create and invoke function", function () {
                var env = evaluate("(def x ((fn () 1)))");
                isNumber(env, "x", 1);
            });

            test("define a function and invoke", function () {
                var env = evaluate("(def f (fn () 1)) (def x (f))");
                isNumber(env, "x", 1);
            });

            test("invoke function with different args", function () {
                var env = evaluate("(def f (fn (a) a)) (def x (f 1)) (def y (f 2))");
                isNumber(env, "x", 1);
                isNumber(env, "y", 2);
            });

            test("closure", function () {
                var env = evaluate("(def f (let (a 1) (fn () a))) (def x (f))");
                isNumber(env, "x", 1);
            });

            test("overload on argument count", function () {
                var env = evaluate("(def f (fn () 0 (x) 1 (x y) 2))");
                isNumber(evaluateForm("(f)", env), 0);
                isNumber(evaluateForm("(f 1)", env), 1);
                isNumber(evaluateForm("(f 1 2)", env), 2);
            });

            // argument destructuring

        });

        suite("type", function () {

            test("create type", function () {
                var env = evaluate('(def t (create-type "T"))');
                isType(env, "t", "T");
            });

        });

        suite("comment", function () {

            test("comment macro", function () {
                var env = evaluate("(def a 1) (comment (def not-evaled 3)) (def b 2)");
                isNumber(env, "a", 1);
                isNumber(env, "b", 2);
                assert.equal(env.lookup("not-evaled"), undefined);
            });

            test(";; syntax", function () {
                var env = evaluate("(def a 1)\n;; a comment\n(def b 2)");
                isNumber(env, "a", 1);
                isNumber(env, "b", 2);
            });

        });

        suite("reflection", function () {

            test("type", function () {
                var env = evaluate("(def a (type 1))");
                isType(env, "a", "Number");
            });

            test("type of form", function () {
                var env = evaluate("(def a (type (+ 1 2)))");
                isType(env, "a", "Number");
            });

        });

        suite("pattern matching", function () {

            test("match - value", function () {
                var result = evaluateForm('(match 1 1 "one")');
                isString(result, "one");
            });

            test("match - symbol is catch all", function () {
                var env = evaluate('(def m (fn (x) (match x a "catchall")))');
                isString(evaluateForm("(m 1)", env), "catchall");
                isString(evaluateForm("(m 2)", env), "catchall");
            });

            test("match - symbol is bound to matched value", function () {
                var env = evaluate("(def m (fn (x) (match x a a)))");
                isNumber(evaluateForm("(m 1)", env), 1);
                isNumber(evaluateForm("(m 2)", env), 2);
            });

            test("match - value must be exact match", function () {
                var env = evaluate('(def m (fn (x) (match x 1 "one" 2 "two")))');
                isString(evaluateForm("(m 1)", env), "one");
                isString(evaluateForm("(m 2)", env), "two");
            });

            test("match - type", function () {
                var env = evaluate('(deft A ()) (def m (fn (x) (match x (A) "A")))');
                isString(evaluateForm("(m (A))", env), "A");
            });

            test("match - matching clause's body is evaluated", function () {
                var env = evaluate("(deft A ()) (def m (fn (x) (match x (A) (+ 1 2))))");
                isNumber(evaluateForm("(m (A))", env), 3);
            });

            test("match - destructuring, same name as member", function () {
                var env = evaluate("(deft A (a)) (def m (fn (x) (match x (A a) a)))");
                isNumber(evaluateForm("(m (A 1))", env), 1);
            });

            test("match - destructuring, different name to member", function () {
                var env = evaluate("(deft A (a)) (def m (fn (x) (match x (A b) b)))");
                isNumber(evaluateForm("(m (A 1))", env), 1);
            });

        });

        suite("syntax quote", function () {

            test("plain (not spliced) forms pass through", function () {
                var env = evaluate("(def a `b)");
                isSymbol(env, "a", "b");
            });

            test("splice", function () {
                var env = evaluate("(def b 1) (def a `~b)");
                isNumber(env, "a", 1);
            });

            test("multiple spliced forms inside other plain forms", function () {
                var env = evaluate("(def b 1) (def a `(x (y ~b ~b) ~b))");
                var a = env.lookup("a");
                isList(a);
                isSymbol(a[0], "x");
                isList(a[1]);
                isSymbol(a[1][0], "y");
                isNumber(a[1][1], 1);
                isNumber(a[1][2], 1);
                isNumber(a[2], 1);
            });

        });

        suite("macro", function () {

            test("identity", function () {
                var env = evaluate("(def m (macro (x) x))");
                isNumber(evaluateForm("(m 1)", env), 1);
                isNumber(evaluateForm("(m 2)", env), 2);
            });

            test("macro arguments aren't evaluated", function () {
                var env = evaluate("(def m (macro (x) 0))");
                evaluateForm("(m (i-dont-exist))", env);
            });

            test("the value a macro returns is evaluated", function () {
                var env = evaluate("(def m (macro () '(+ 1 2)))");
                isNumber(evaluateForm("(m)", env), 3);
            });

            test("syntax quote and splice", function () {
                var env = evaluate("(def m (macro (x) `'~x))");
                isSymbol(evaluateForm("(m a)", env), "a");
            });

            test("def symbol argument", function () {
                var env = evaluate("(def m (macro (x) `(def ~x 1))) (m a)");
                isNumber(env, "a", 1);
            });

        });

        suite("prelude", function () {

            test("first", function () {
                isNumber(evaluateForm("(first '(1))"), 1);
            });

            test("rest", function () {
                var rest = evaluateForm("(rest '(1 2 3))");
                isList(rest);
                isNumber(rest[0], 2);
                isNumber(rest[1], 3);
            });

            test("identity", function () {
                isNumber(evaluateForm("(identity 1)"), 1);
            });

            test("defn", function () {
                var env = evaluate("(defn f (x) x)");
                isNumber(evaluateForm("(f 1)", env), 1);
            });

            // defn - overload on argument count

            test("defm", function () {
                var env = evaluate("(defm m (x) `~(first x))");
                isNumber(evaluateForm("(m (1 2))", env), 1);
            });

            test("deft", function () {
                var env = evaluate("(deft T ()) (def x (T))");
                isOfType("T")(env, "x");
            });

            test("deft - constructor taking one parameter", function () {
                var env = evaluate("(deft T (a)) (def x (T 1)) (def y (match x (T a) a))");
                isOfType("T")(env, "x");
                isNumber(env, "y", 1);
            });

            test("deft - constructor taking multiple parameters", function () {
                var env = evaluate("(deft T (a b c)) (def x (T 1 2 3))");
                isOfType("T")(env, "x");
                isNumber(evaluateForm("(match x (T a b c) a)", env), 1);
                isNumber(evaluateForm("(match x (T a b c) b)", env), 2);
                isNumber(evaluateForm("(match x (T a b c) c)", env), 3);
            });

        });

    });

})(this.mocha || new require("mocha").Mocha,
   this.chai || require("chai"),
   this.teslo || require("../lib-js/teslo.prelude.js") && require("../"));
