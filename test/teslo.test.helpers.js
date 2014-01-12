(function (chai, teslo) {
    teslo.test = teslo.test || {};
    var assert = chai.assert;

    // assert helpers
    function simplify (o) { return o.name || o; }
    function isOfType (type, propFn, typeFn) {
        // args: env, n
        //    OR env, n, v
        //    OR o
        //    OR o, v
        return function (a, b, c) {
            var aIsEnv = a && a.constructor.name === "Environment";
            var o = aIsEnv ? a.lookup(b) : a;
            var v = aIsEnv ? c : b;
            assert.isDefined(o);
            var actualType = typeFn ? typeFn(o) : getMeta(o, "type");
            assert.ok(actualType, "no type, expecting " + type);
            assert.equal(actualType, type, "Type is '" + actualType + "' but expected '" + type + "'");
            if (propFn && v !== undefined) assert.deepEqual(propFn(o), v); }; }


    function getMeta (o, k) { return (o["!meta"] || {})[k]; }
    function jsType (x) { return /\[object (\w*)\]/.exec(Object.prototype.toString.call(x))[1]; }
    function getType (x) { return getMeta(x, "type") || jsType(x); }

    teslo.test.helpers = {
        isOfType:   isOfType,
        isType:     isOfType("Type", function (o) { return o.name; }),
        isFunction: isOfType("Function", null, getType),
        isNumber:   isOfType("Number", function (x) { return x; }, jsType),
        isString:   isOfType("String", function (x) { return x; }, jsType),
        isSymbol:   isOfType("Symbol", function (o) { return o.name; }),
        isKeyword:  isOfType("Keyword", function (o) { return o.name; }),
        isArray:    isOfType("Array",
                             function (o) { var r = []; for (var i = 0; i < o.length; i++) {
                                 r.push(simplify(o[i])); } return r; },
                             jsType),
        isList:     isOfType("List",
                             function (o) { var r = []; for (var i = o; i.tail; i = i.tail) {
                                 r.push(simplify(i.head)); } return r; } ),
        isSequence: function (x) { return teslo.test.helpers["is" + getType(x)].apply(null, arguments); }
    };

})(this.chai || require("chai"),
   this.teslo || require("../"));
