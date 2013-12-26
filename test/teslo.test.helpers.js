(function (chai, teslo) {
    teslo.test = teslo.test || {};
    var assert = chai.assert;

    // assert helpers
    function simplify (o) { return o.name || o; }
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
        isType:     isOfType("Type", function (o) { return o.name; }),
        isFunction: isOfType("Function"),
        isNumber:   function (x) { return Object.prototype.toString.call(x) == "[object Number]"; },
        isString:   function (x) { return Object.prototype.toString.call(x) == "[object String]"; },
        isSymbol:   isOfType("Symbol", function (o) { return o.name; }),
        isKeyword:  isOfType("Keyword", function (o) { return o.name; }),
        isArray:    isOfType("Array", function (o) { var r = []; for (var i = 0; i < o.length; i++) { r.push(simplify(o[i])); } return r; } ),
        isList:     isOfType("List",
                             function (o) { var r = []; for (var i = o; i.members.tail; i = i.members.head) {
                                 r.push(simplify(i.members.head)); } return r; } ),
        isSequence: function (x) { return teslo.test.helpers["is" + x.type].apply(null, arguments); }
    };
})(this.chai || require("chai"),
   this.teslo || require("../"));
