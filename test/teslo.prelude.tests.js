(function (mocha, chai, teslo) {

    chai.Assertion.includeStack = true;
    var assert = chai.assert;

    var isOfType   = teslo.test.helpers.isOfType;
    var isFunction = teslo.test.helpers.isFunction;
    var isSequence = teslo.test.helpers.isSequence;
    var isNumber   = teslo.test.helpers.isNumber;
    var isString   = teslo.test.helpers.isString;
    var isSymbol   = teslo.test.helpers.isSymbol;
    var isType     = teslo.test.helpers.isType;

    suite("prelude", function () {

        function setupEnv () {
            var env = teslo.environment();
            try {
                teslo.evaluate(teslo.prelude, env); }
            catch(e) {
                e.message += " [in prelude]";
                throw e; }
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

        suite("sequences", function () {

            test("first - array", function () {
                isNumber(evaluateForm("(first '(1))"), 1);
            });

            test("first - list", function () {
                isNumber(evaluateForm("(first (List 1 nil))"), 1);
            });

            test("rest - array", function () {
                var rest = evaluateForm("(rest '(1 2 3))");
                isSequence(rest, [2, 3]);
            });

            test("rest - list", function () {
                var rest = evaluateForm("(rest (List 1 (List 2 (List 3 nil))))");
                isSequence(rest, [2, 3]);
            });

            test("last - array", function () {
                var result = evaluateForm("(last '(1 2 3))");
                isSequence(result, 3);
            });

            test("last - list", function () {
                var result = evaluateForm("(last (List 1 (List 2 (List 3 nil))))");
                isSequence(result, 3);
            });

            test("lists", function () {
                isSequence(evaluateForm("(List)"));
                isSequence(evaluateForm("(List 1 (List))"));
            });

            test("map - list", function () {
                isSequence(evaluateForm("(map (fn (x) (+ x 1)) nil)"), []);
                isSequence(evaluateForm("(map (fn (x) (+ x 1)) (List 1 (List 2 (List 3 nil))))"), [2, 3, 4]);
            });

            test("map - array", function () {
                isSequence(evaluateForm("(map (fn (x) (+ x 1)) nil)"), []);
                isSequence(evaluateForm("(map (fn (x) (+ x 1)) '(1 2 3))"), [2, 3, 4]);
            });

            test("reduce", function () {
                isNumber(evaluateForm("(reduce + 1 nil)"), 1);
                isNumber(evaluateForm("(reduce + 1 (List 1 (List 2 (List 3 nil))))"), 7);
            });

            test("length - list", function () {
                isNumber(evaluateForm("(length nil)"), 0);
                isNumber(evaluateForm("(length (List 1 (List 2 (List 3 nil))))"), 3);
            });

            test("length - array", function () {
                isNumber(evaluateForm("(length ())"), 0);
                isNumber(evaluateForm("(length '(1 2 3))"), 3);
            });

        });

        suite("def macros", function () {

            test("defn", function () {
                var env = evaluate("(defn f (x) x)");
                isNumber(evaluateForm("(f 1)", env), 1);
            });

            test("defn overloads", function () {
                var env = evaluate("(defn f () 0 (a) 1)");
                isNumber(evaluateForm("(f)", env), 0);
                isNumber(evaluateForm("(f 1)", env), 1);
            });

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

        suite("string", function () {

            test("string - string", function () {
                isString(evaluateForm('(string "str")'), '"str"');
            });

            test("string - numbers", function () {
                isString(evaluateForm("(string 1)"), "1");
                isString(evaluateForm("(string 1.1)"), "1.1");
                isString(evaluateForm("(string -1)"), "-1");
            });

            test("string - symbol", function () {
                isString(evaluateForm("(string 'a)"), "a");
            });

            test("string - keyword", function () {
                isString(evaluateForm("(string :kwd)"), ":kwd");
            });

            test("string - array", function () {
                isString(evaluateForm("(string '())"), "()");
                isString(evaluateForm("(string '(1 2 3))"), "(1 2 3)");
            });

            test("string - list", function () {
                isString(evaluateForm("(string (List))"), "()");
                isString(evaluateForm("(string (List 1 (List 2 (List 3 nil))))"), "(1 2 3)");
            });

            test("string - instance of type", function () {
                var env = evaluate("(deft T () (a)) (def x (T))");
                isString(evaluateForm("(string (T))", env), "(T)");
                isString(evaluateForm("(string (T 1))", env), "(T 1)");
                isString(evaluateForm("(string (T (T)))", env), "(T (T))");
            });

        });

        suite("misc", function () {

            test("identity", function () {
                isNumber(evaluateForm("(identity 1)"), 1);
            });

            test("inc", function () {
                isNumber(evaluateForm("(inc 1)"), 2);
            });

            test("dec", function () {
                isNumber(evaluateForm("(dec 2)"), 1);
            });

        });

    });

})(this.mocha || new require("mocha").Mocha,
   this.chai || require("chai"),
   this.teslo || require("../lib-js/teslo.prelude.js") && require("../test/teslo.test.helpers.js") && require("../"));
