(function (mocha, chai, teslo) {

    chai.config.includeStack = true;
    var assert = chai.assert;

    var isOfType     = teslo.test.helpers.isOfType;
    var isFunction   = teslo.test.helpers.isFunction;
    var isSequence   = teslo.test.helpers.isSequence;
    var isNumber     = teslo.test.helpers.isNumber;
    var isString     = teslo.test.helpers.isString;
    var isSymbol     = teslo.test.helpers.isSymbol;
    var isKeyword    = teslo.test.helpers.isKeyword;
    var isType       = teslo.test.helpers.isType;
    var isIndexedAt  = teslo.test.helpers.isIndexedAt;
    var evaluate     = teslo.test.helpers.evaluate;
    var evaluateForm = teslo.test.helpers.evaluateForm;

    suite("evaluate", function () {

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
                isSequence(myList, [1, 2, 3]);
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

            test("let bindings destructure", function () {
                var env = evaluate("(deft A (a)) (def x (let ((A a) (A 1)) a))");
                isNumber(env, "x", 1);
            });

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

            test("lexical scoping", function () {
                var env = evaluate("(def x 1) (defn f () x)");
                isNumber(evaluateForm("(let (x 2) (f))", env), 1);
            });

            test("overload on argument count", function () {
                var env = evaluate("(def f (fn () 0 (x) 1 (x y) 2))");
                isNumber(evaluateForm("(f)", env), 0);
                isNumber(evaluateForm("(f 1)", env), 1);
                isNumber(evaluateForm("(f 1 2)", env), 2);
            });

            test("overload on argument type", function () {
                var env = evaluate("(deft A ()) (deft B ()) (def f (fn ((A)) 0 ((B)) 1))");
                isNumber(evaluateForm("(f (A))", env), 0);
                isNumber(evaluateForm("(f (B))", env), 1);
            });

            test("overload on argument type constructor", function () {
                var env = evaluate("(deft A () (a)) (def f (fn ((A)) 0 ((A a)) 1))");
                isNumber(evaluateForm("(f (A))", env), 0);
                isNumber(evaluateForm("(f (A 1))", env), 1);
            });

            test("overload on multiple argument types", function () {
                var env = evaluate("(deft A ()) (deft B ()) (def f (fn ((A) (A)) 0 ((A) (B)) 1))");
                isNumber(evaluateForm("(f (A) (A))", env), 0);
                isNumber(evaluateForm("(f (A) (B))", env), 1);
            });

            test("overload on argument type without destructuring", function () {
                var env = evaluate("(deft A ()) (defn f ((a : A)) a)");
                isOfType("A")(evaluateForm("(f (A))", env));
            });

            test("overload on multiple argument types without destructuring", function () {
                var env = evaluate("(deft A ()) (deft B ()) (defn f ((a : A) (b : A)) 0 ((a : A) (b : B)) 1)");
                isNumber(evaluateForm("(f (A) (A))", env), 0);
                isNumber(evaluateForm("(f (A) (B))", env), 1);
            });

            test("overload on argument values", function () {
                var env = evaluate("(def f (fn (0) 0 (1) 1))");
                isNumber(evaluateForm("(f 0)", env), 0);
                isNumber(evaluateForm("(f 1)", env), 1);
            });

            test("variadic function", function () {
                var env = evaluate("(def f (fn (. xs) xs))");
                var noArgs = evaluateForm("(f)", env);
                isSequence(noArgs, []);
                var oneArg = evaluateForm("(f 1)", env);
                isSequence(oneArg, [1]);
                var twoArgs = evaluateForm("(f 1 2)", env);
                isSequence(twoArgs, [1, 2]);
            });

            test("variadic function with an initial named parameter", function () {
                var env = evaluate("(def f (fn (x . xs) `(~x ~xs)))");
                var oneArg = evaluateForm("(f 1)", env);
                isNumber(oneArg[0], 1);
                isSequence(oneArg[1], []);
                var twoArgs = evaluateForm("(f 1 2)", env);
                isNumber(twoArgs[0], 1);
                isSequence(twoArgs[1], [2]);
            });

            test("argument destructuring", function () {
                var env = evaluate("(deft A (a)) (def f (fn ((A a)) a))");
                isNumber(evaluateForm("(f (A 1))", env), 1);
            });

            test("nested argument destructuring", function () {
                var env = evaluate("(deft A (a)) (def f (fn ((A (A a))) a))");
                isNumber(evaluateForm("(f (A (A 1)))", env), 1);
            });

            test("nested pattern matching", function () {
                var env = evaluate("(deft A (a)) (defn f ((A :one)) 1 ((A :two)) 2)");
                isNumber(evaluateForm("(f (A :one))", env), 1);
                isNumber(evaluateForm("(f (A :two))", env), 2);
            });

            test("functions shouldn't 'see' comments", function () {
                isNumber(evaluateForm("((fn () ;comment\n 1))"), 1);
            });

        });

        suite("builtins", function () {

            test("symbol", function () {
                var result = evaluateForm('(Symbol "a")');
                isSymbol(result, "a");
            });

            test("keyword", function () {
                var result = evaluateForm('(Keyword "a")');
                isKeyword(result, "a");
            });

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
                var result = evaluateForm("(type 1)");
                isType(result, "Number");
            });

            test("type of form", function () {
                var result = evaluateForm("(type (+ 1 2))");
                isType(result, "Number");
            });

            test("type's type", function () {
                var result = evaluateForm("(type (type 1))");
                isType(result, "Type");
            });

            test("type's type's type", function () {
                var result = evaluateForm("(type (type (type 1)))");
                isType(result, "Type");
            });

            test("type of Array", function () {
                var result = evaluateForm("(type '())");
                isType(result, "Array");
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

            test("match - value exact match", function () {
                var env = evaluate('(def m (fn (x) (match x 1 "one" 2 "two")))');
                isString(evaluateForm("(m 1)", env), "one");
                isString(evaluateForm("(m 2)", env), "two");
            });

            test("match - keyword exact match", function () {
                var env = evaluate('(def m (fn (x) (match x :one "one" :two "two")))');
                isString(evaluateForm("(m :one)", env), "one");
                isString(evaluateForm("(m :two)", env), "two");
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

            test("match - destructuring, constructors with different parameter counts", function () {
                var env = evaluate([
                    "(deft A () (a) (a b))",
                    "(def m (fn (x) (match x (A) 0 (A a) 1 (A a b) 2)))"].join(""));
                isNumber(evaluateForm("(m (A))", env), 0);
                isNumber(evaluateForm("(m (A 1))", env), 1);
                isNumber(evaluateForm("(m (A 1 2))", env), 2);
            });

        });

        suite("syntax quote", function () {

            test("plain (not spliced) forms pass through", function () {
                var env = evaluate("(def a `b)");
                isSymbol(env, "a", "b");
            });

            test("unquote", function () {
                var env = evaluate("(def b 1) (def a `~b)");
                isNumber(env, "a", 1);
            });

            test("unquote splice", function () {
                var env = evaluate("(def b '(1 2 3)) (def a `(0 ~@b))");
                isSequence(evaluateForm("a", env), [0, 1, 2, 3]);
            });

            test("multiple spliced forms inside other plain forms", function () {
                var env = evaluate("(def b 1) (def a `(x (y ~b ~b) ~b))");
                var a = env.lookup("a");
                isSequence(a);
                isSymbol(a[0], "x");
                isSequence(a[1], ["y", 1, 1]);
                isNumber(a[2], 1);
            });

        });

        suite("macro", function () {

            test("identity", function () {
                var env = evaluate("(def m (macro (x) x))");
                isNumber(evaluateForm("(m 1)", env), 1);
                isNumber(evaluateForm("(m 2)", env), 2);
            });

            test("anonymous", function () {
                isNumber(evaluateForm("((macro (x) x) 1)"), 1);
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

        suite("macro-expand", function () {

            test("identity", function () {
                var env = evaluate("(defm m (x) x)");
                isNumber(evaluateForm("(macro-expand (m 1))", env), 1);
            });

            test("result not evaluated", function () {
                var env = evaluate("(defm m (x) `(~x ~x))");
                isSequence(evaluateForm("(macro-expand (m a))", env), ["a", "a"]);
            });

            test("source index is preserved", function () {
                var env = evaluate("(defn f () (foo))");
                isIndexedAt(env.lookup("f").overloads[0][0].body, "(defn f () ".length, "(defn f () (foo)".length);
            });

        });

    });

})(this.mocha || new require("mocha").Mocha,
   this.chai || require("chai"),
   this.teslo || require("../lib-js/teslo.prelude.js") && require("../test/teslo.test.helpers.js") && require("../"));
