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
    var isFunction = isOfType("Function");
    var isList     = isOfType("List", function (o) { var r = []; for (var i = 0; i < o.length; i++) { r.push(simplify(o[i])); } return r; } );
    var isNumber   = isOfType("Number", function (o) { return o.value; });
    var isString   = isOfType("String", function (o) { return o.value; });
    var isSymbol   = isOfType("Symbol", function (o) { return o.name; });
    var isType     = isOfType("Type", function (o) { return o.name; });

    teslo.test.helpers = {
        isOfType:   isOfType,
        isFunction: isFunction,
        isList:     isList,
        isNumber:   isNumber,
        isString:   isString,
        isSymbol:   isSymbol,
        isType:     isType
    };
})(this.chai || require("chai"),
   this.teslo || require("../"));
