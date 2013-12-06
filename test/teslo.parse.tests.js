(function (mocha, chai, teslo) {

    chai.Assertion.includeStack = true;
    var assert = chai.assert;

    suite("parser", function () {

        suite("forms", function () {

            test("one empty top level list", function () {
                var result = teslo.parse("()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 1);
                assert.equal(result.forms[0].length, 0);
            });

            test("invalid list fails", function () {
                var result = teslo.parse("(");
                assert.ok(!result.success);
            });

            test("list containing symbol", function () {
                var result = teslo.parse("(f)");
                assert.ok(result.success);
                assert.equal(result.forms[0].length, 1);
                assert.equal(result.forms[0][0].name, "f");
                assert.equal(result.forms[0][0].type.name, "Symbol");
            });

            test("list containing 2 symbols", function () {
                var result = teslo.parse("(f a)");
                assert.ok(result.success);
                assert.equal(result.forms[0].length, 2);
                assert.equal(result.forms[0][0].name, "f");
                assert.equal(result.forms[0][0].type.name, "Symbol");
                assert.equal(result.forms[0][1].name, "a");
                assert.equal(result.forms[0][1].type.name, "Symbol");
            });

            test("multi character symbols", function () {
                var result = teslo.parse("(zero one two three)");
                assert.ok(result.success);
                assert.equal(result.forms[0][0].name, "zero");
                assert.equal(result.forms[0][1].name, "one");
                assert.equal(result.forms[0][2].name, "two");
                assert.equal(result.forms[0][3].name, "three");
            });

            test("multiple top level lists", function () {
                var result = teslo.parse("()()()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 3);
            });

            test("different whitespace between top level lists", function () {
                var result = teslo.parse("()\n()\t() () \n()\t ()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 6);
            });

            test("nested lists", function () {
                var result = teslo.parse("(())");
                assert.ok(result.success);
                assert.equal(result.forms.length, 1);
                assert.equal(result.forms[0].length, 1);
            });

        });

        suite("literals", function () {

            test("number", function () {
                var result = teslo.parse("123");
                assert.ok(result.success);
                assert.equal(result.forms[0].type.name, "Number");
                assert.equal(result.forms[0].value, 123);
            });

            test("number - decimal", function () {
                var result = teslo.parse("123.123");
                console.log(result);
                assert.ok(result.success);
                assert.equal(result.forms[0].type.name, "Number");
                assert.equal(result.forms[0].value, 123.123);
            });

            test("string", function () {
                var result = teslo.parse('"Hello world!"');
                assert.ok(result.success);
                assert.equal(result.forms[0].type.name, "String");
                assert.equal(result.forms[0].value, "Hello world!");
            });

            test("empty string", function () {
                var result = teslo.parse('""');
                assert.ok(result.success);
                assert.equal(result.forms[0].type.name, "String");
                assert.equal(result.forms[0].value, "");
            });

            test("keyword", function () {
                var result = teslo.parse(':kwd');
                assert.ok(result.success);
                assert.equal(result.forms[0].type.name, "Keyword");
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

            test("quote list", function () {
                var result = teslo.parse("'()"); // (quote ())
                assert.ok(result.success);
                assert.equal(result.forms[0].type.name, "List");
                assert.equal(result.forms[0][0].type.name, "Symbol");
                assert.equal(result.forms[0][0].name, "quote");
                assert.equal(result.forms[0][1].type.name, "List");
                assert.equal(result.forms[0][1].length, 0);
            });

            test("quote symbol in list", function () {
                var result = teslo.parse("(f 'x)"); // (f (quote x))
                assert.ok(result.success);
                assert.equal(result.forms[0][1][0].type.name, "Symbol");
                assert.equal(result.forms[0][1][0].name, "quote");
                assert.equal(result.forms[0][1][1].type.name, "Symbol");
                assert.equal(result.forms[0][1][1].name, "x");
            });

            test("comment", function () {
                var result = teslo.parse("; a comment");
                assert.ok(result.success);
                assert.equal(result.forms[0].type.name, "List");
                assert.equal(result.forms[0][0].type.name, "Symbol");
                assert.equal(result.forms[0][0].name, "comment");
                assert.equal(result.forms[0][1].type.name, "String");
                assert.equal(result.forms[0][1].value, " a comment");
            });

            test("comment between lists", function () {
                var result = teslo.parse("()\n; a comment\n()");
                assert.ok(result.success);
                assert.equal(result.forms.length, 3);
            });

            test("syntax quote", function () {
                var result = teslo.parse("`(a)"); // (syntax-quote (a))
                assert.ok(result.success);
                assert.equal(result.forms[0].type.name, "List");
                assert.equal(result.forms[0][0].type.name, "Symbol");
                assert.equal(result.forms[0][0].name, "syntax-quote");
                assert.equal(result.forms[0][1][0].name, "a");
            });

            test("unquote", function () {
                var result = teslo.parse("`(~a)"); // (syntax-quote ((unquote a)))
                assert.ok(result.success);
                assert.equal(result.forms[0].type.name, "List");
                assert.equal(result.forms[0][1][0][0].type.name, "Symbol");
                assert.equal(result.forms[0][1][0][0].name, "unquote");
                assert.equal(result.forms[0][1][0][1].name, "a");
            });

            test("unquote splice", function () {
                var result = teslo.parse("`(~@a)"); // (syntax-quote ((unquote-splice a)))
                assert.ok(result.success);
                assert.equal(result.forms[0].type.name, "List");
                assert.equal(result.forms[0][1][0][0].type.name, "Symbol");
                assert.equal(result.forms[0][1][0][0].name, "unquote-splice");
                assert.equal(result.forms[0][1][0][1].name, "a");
            });

        });

    });

})(this.mocha || new require("mocha").Mocha,
   this.chai || require("chai"),
   this.teslo || require("../"));
