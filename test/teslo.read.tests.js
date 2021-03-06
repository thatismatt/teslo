(function (mocha, chai, teslo) {

    chai.config.includeStack = true;
    var assert = chai.assert;

    var isOfType   = teslo.test.helpers.isOfType;
    var isFunction = teslo.test.helpers.isFunction;
    var isSequence = teslo.test.helpers.isSequence;
    var isNumber   = teslo.test.helpers.isNumber;
    var isString   = teslo.test.helpers.isString;
    var isSymbol   = teslo.test.helpers.isSymbol;
    var isKeyword  = teslo.test.helpers.isKeyword;
    var isType     = teslo.test.helpers.isType;
    var isIndexedAt = teslo.test.helpers.isIndexedAt;

    suite("read", function () {

        suite("forms", function () {

            test("one empty top level list", function () {
                var result = teslo.read("()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 1);
                assert.equal(result.forms[0].length, 0);
            });

            test("invalid list fails", function () {
                var result = teslo.read("(");
                assert.ok(!result.success);
            });

            test("list containing symbol", function () {
                var result = teslo.read("(f)");
                assert.ok(result.success);
                assert.equal(result.forms[0].length, 1);
                isSymbol(result.forms[0][0], "f");
            });

            test("list containing 2 symbols", function () {
                var result = teslo.read("(f a)");
                assert.ok(result.success);
                assert.equal(result.forms[0].length, 2);
                isSymbol(result.forms[0][0], "f");
                isSymbol(result.forms[0][1], "a");
            });

            test("multi character symbols", function () {
                var result = teslo.read("(zero one two three)");
                assert.ok(result.success);
                isSymbol(result.forms[0][0], "zero");
                isSymbol(result.forms[0][1], "one");
                isSymbol(result.forms[0][2], "two");
                isSymbol(result.forms[0][3], "three");
            });

            test("multiple top level lists", function () {
                var result = teslo.read("()()()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 3);
            });

            test("different whitespace between top level lists", function () {
                var result = teslo.read("()\n()\t() () \n()\t ()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 6);
            });

            test("nested lists", function () {
                var result = teslo.read("(())");
                assert.ok(result.success);
                assert.equal(result.forms.length, 1);
                assert.equal(result.forms[0].length, 1);
            });

        });

        suite("literals", function () {

            test("number", function () {
                var result = teslo.read("123");
                assert.ok(result.success);
                isNumber(result.forms[0], 123);
            });

            test("number - decimal", function () {
                var result = teslo.read("123.123 .456");
                assert.ok(result.success);
                isNumber(result.forms[0], 123.123);
                isNumber(result.forms[1], 0.456);
            });

            test("number - negative", function () {
                var result = teslo.read("-0 -1 -2.3");
                assert.ok(result.success);
                isNumber(result.forms[0], -0); // 0 does not deepEqual -0
                isNumber(result.forms[1], -1);
                isNumber(result.forms[2], -2.3);
            });

            test("string", function () {
                var result = teslo.read('"Hello world!"');
                assert.ok(result.success);
                isString(result.forms[0], "Hello world!");
            });

            test("string - newline", function () {
                var result = teslo.read('"line 1\\nline 2"');
                assert.ok(result.success);
                isString(result.forms[0], "line 1\nline 2");
            });

            test("string - escape characters", function () {
                var result = teslo.read('"\\t\\""');
                assert.ok(result.success);
                isString(result.forms[0], "\t\"");
            });

            test("empty string", function () {
                var result = teslo.read('""');
                assert.ok(result.success);
                isString(result.forms[0], "");
            });

            test("keyword", function () {
                var result = teslo.read(':kwd');
                assert.ok(result.success);
                isKeyword(result.forms[0], "kwd");
            });

        });

        suite("reader macros", function () {

            test("quote list", function () {
                var result = teslo.read("'()"); // (quote ())
                assert.ok(result.success);
                isSequence(result.forms[0]);
                isSymbol(result.forms[0][0], "quote");
                isSequence(result.forms[0][1]);
                assert.equal(result.forms[0][1].length, 0);
            });

            test("quote symbol in list", function () {
                var result = teslo.read("(f 'x)"); // (f (quote x))
                assert.ok(result.success);
                isSymbol(result.forms[0][1][0], "quote");
                isSymbol(result.forms[0][1][1], "x");
            });

            test("comment", function () {
                var result = teslo.read("; a comment");
                assert.ok(result.success);
                assert.equal(result.forms.length, 0);
            });

            test("comment between lists", function () {
                var result = teslo.read("()\n; a comment\n()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 2);
            });

            test("multiple comments between lists", function () {
                var result = teslo.read("()\n; a comment\n; another\n()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 2);
            });

            test("syntax quote", function () {
                var result = teslo.read("`(a)"); // (syntax-quote (a))
                assert.ok(result.success);
                isSequence(result.forms[0]);
                isSymbol(result.forms[0][0], "syntax-quote");
                isSymbol(result.forms[0][1][0], "a");
            });

            test("unquote", function () {
                var result = teslo.read("`(~a)"); // (syntax-quote ((unquote a)))
                assert.ok(result.success);
                isSequence(result.forms[0]);
                isSymbol(result.forms[0][1][0][0], "unquote");
                isSymbol(result.forms[0][1][0][1], "a");
            });

            test("unquote splice", function () {
                var result = teslo.read("`(~@a)"); // (syntax-quote ((unquote-splice a)))
                assert.ok(result.success);
                isSequence(result.forms[0]);
                isSymbol(result.forms[0][1][0][0], "unquote-splice");
                isSymbol(result.forms[0][1][0][1], "a");
            });

        });

        suite("source index", function () {

            test("list at start", function () {
                var result = teslo.read("()");
                assert.ok(result.success);
                isSequence(result.forms[0]);
                isIndexedAt(result.forms[0], 0, 2);
            });

            test("list preceded by whitespace", function () {
                var sp = teslo.read(" ()");
                assert.ok(sp.success);
                isSequence(sp.forms[0]);
                isIndexedAt(sp.forms[0], 1, 3);
                var tb = teslo.read("\t()");
                assert.ok(tb.success);
                isSequence(tb.forms[0]);
                isIndexedAt(tb.forms[0], 1, 3);
                var nl = teslo.read("\n()");
                assert.ok(nl.success);
                isSequence(nl.forms[0]);
                isIndexedAt(nl.forms[0], 1, 3);
            });

            test("nested list", function () {
                var result = teslo.read("(())");
                assert.ok(result.success);
                isSequence(result.forms[0]);
                isSequence(result.forms[0][0]);
                isIndexedAt(result.forms[0][0], 1, 3);
            });

        });

    });

})(this.mocha || new require("mocha").Mocha,
   this.chai || require("chai"),
   this.teslo || require("../test/teslo.test.helpers.js") && require("../"));
