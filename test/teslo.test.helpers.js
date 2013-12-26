(function (chai, teslo) {
    teslo.test = teslo.test || {};
    var assert = chai.assert;

    // assert helpers
    function simplify (o) { return o.type === "Number" ? o.value : o.name; }
    function isOfType (type, propFn) {
        // args: env, n
        //    OR env, n, v
        //    OR o
        //    OR o, v
        return function (a, b, c) {
            var aIsEnv = a && a.constructor.name === "Environment";
            var o = aIsEnv ? a.lookup(b) : a;
            var v = aIsEnv ? c : b;
            assert.isDefined(o);
            assert.ok(o.type, "no type property");
            assert.equal(o.type, type);
            if (propFn && v !== undefined) assert.deepEqual(propFn(o), v); }; }

    teslo.test.helpers = {
        isOfType:   isOfType,
        isFunction: isOfType("Function"),
        isList:     isOfType("List", function (o) { var r = []; for (var i = 0; i < o.length; i++) { r.push(simplify(o[i])); } return r; } ),
        isNumber:   isOfType("Number", function (o) { return o.value; }),
        isString:   isOfType("String", function (o) { return o.value; }),
        isSymbol:   isOfType("Symbol", function (o) { return o.name; }),
        isKeyword:  isOfType("Keyword", function (o) { return o.name; }),
        isType:     isOfType("Type", function (o) { return o.name; })
    };
})(this.chai || require("chai"),
   this.teslo || require("../"));
