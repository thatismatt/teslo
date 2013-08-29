(function (teslo, cromp) {

    // Utils
    function first (arr) { return arr[0]; }
    function second (arr) { return arr[1]; }
    function third (arr) { return arr[2]; }
    function last (arr) { return arr[arr.length - 1]; }
    function toArray (x) { return Array.prototype.slice.call(x, 0); }
    function tail (arr) { return Array.prototype.slice.call(arr, 1); }
    function add (a, b) { return a + b; }
    function subtract (a, b) { return a - b; }
    function multiply (a, b) { return a * b; }
    function divide (a, b) { return a / b; }
    function each (arr, f) { for (var i = 0; i < arr.length; i++) { f(arr[i]); } }
    function map (arr, f) { var r = []; each(arr, function (x) { r.push(f(x)); }); return r; }
    function concat (x) { return Array.prototype.concat.apply([], x); };
    function reverseFind (arr, f) { var i = arr.length, r; while (!r && i--) { r = f(arr[i]); } return r; }
    function zip (as, bs) { return as.map(function(a, i) { return [a, bs[i]]; }); }
    function curry (f) { var args = tail(arguments);
                         return function () { return f.apply(null, args.concat(toArray(arguments))); }; }
    function typeEquals (a, b) { return a.type.name === b.type.name; }
    function equals (a, b) { return typeEquals(a, b) && a.value && b.value && a.value === b.value; }

    function isOfType (t) { return function(x) { return x.type && x.type.name === t; }; }
    var isList = isOfType("List");
    var isString = isOfType("String");
    var isNumber = isOfType("Number");
    var isSymbol = isOfType("Symbol");
    var isKeyword = isOfType("Keyword");
    var isFunction = isOfType("Function");
    function isMacro (x) { return isFunction(x) && x.macro; }
    function isSpecial (x) { return isFunction(x) && x.special; }

    // AST
    function mkType (x) { return { name: x, type: { name: "Type" } }; }
    function mkList () { var l = toArray(arguments); l.type = mkType("List"); return l; }
    function arrayToList (a) { return mkList.apply(null, a); }
    function mkSymbol (x) { return { name: x, type: mkType("Symbol") }; }
    function mkString (x) { return { value: x, type: mkType("String") }; }
    function mkNumber (x) { return { value: x, type: mkType("Number") }; }
    function mkKeyword (x) { return { name: x, type: mkType("Keyword") }; };
    function mkMacro (f) { var m = mkFunction(f); m.macro = true; return m; };
    function mkSpecial (f) { var s = mkFunction(f); s.special = true; return s; };
    function mkFunction (f) { return { invoke: f, type: mkType("Function") }; };

    // Parser
    var open = cromp.character("(");
    var close = cromp.character(")");
    var symbol = cromp.regex(/[a-zA-Z0-9+=\-_*\/?.$]+/).map(first).map(mkSymbol);
    var whitespace = cromp.regex(/\s+/);
    var optionalWhitespace = cromp.optional(whitespace);
    var eof = cromp.regex(/$/);
    var number = cromp.regex(/[0-9]+/).map(first)
            .map(function (x) { return mkNumber(parseInt(x, 10)); });
    var string = cromp.between(
        cromp.character('"'), cromp.character('"'),
        cromp.optional(cromp.regex(/[^"]+/)).map(function (m) { return m || [""]; }).map(first))
            .map(mkString);
    var keyword = cromp.seq(cromp.character(":"), cromp.regex(/[a-z]+/))
            .map(second).map(mkKeyword);
    var list = cromp.recursive(function () {
        return cromp.between(open, close, cromp.optional(forms))
            .map(arrayToList); });
    var macro = cromp.recursive(function () {
        return cromp.choose(quote,
                            syntaxQuote,
                            unquote,
                            unquoteSplice,
                            comment); });
    var literal = cromp.choose(number, string, keyword);
    var form = cromp.choose(macro, list, literal, symbol);
    var forms = cromp.interpose(optionalWhitespace, form)
            .map(function (x) { return x.filter(function (x, i) { return i % 2; }); });
    var file = cromp.seq(forms, eof).map(first);

    // Reader Macros
    var quote = cromp.seq(cromp.character("'"), form)
            .map(function (x) { return mkList(mkSymbol("quote"), second(x)); });
    var syntaxQuote = cromp.seq(cromp.character("`"), form)
            .map(function (x) { return mkList(mkSymbol("syntax-quote"), second(x)); });
    var unquote = cromp.seq(cromp.character("~"), form)
            .map(function (x) { return mkList(mkSymbol("unquote"), second(x)); });
    var unquoteSplice = cromp.seq(cromp.string("~@"), form)
            .map(function (x) { return mkList(mkSymbol("unquote-splice"), second(x)); });
    var comment = cromp.seq(cromp.character(";"),
                            cromp.regex(/.*[\s\S]/)) // [\s\S] matches & consumes newline (unlike $)
            .map(function (x) { return mkList(mkSymbol("comment"),
                                              mkString(second(x))); });

    teslo.parse = function (src) {
        var a = cromp.parse(file, src);
        //console.log(a);
        return { forms: a.result,
                 success: a.success,
                 message: a.message }; };

    // Bootstrap
    var bootstrap = {};
    bootstrap["def"] = mkSpecial(function (env, args) {
        // Q: if symbol is not a symbol, should we eval it? to support (def (symbol "a") 1)
        // A: have something similar to set & setq in elisp,
        //    i.e. def quotes first arg, like setq, and "def-unquoted" evals first arg?
        //    Then def is defined in terms of def-unquoted
        var symbol = first(args);
        var val = evaluateForm(env, second(args));
        env.def(symbol.name, val);
        return symbol; });

    bootstrap["deft"] = mkMacro(function (env, args) {
        var isImplicitType = args.length === 1;
        var type = isImplicitType ? first(first(args)) : first(args);
        var constructors = isImplicitType ? args : tail(args);
        var defs = constructors.map(function (constructor) {
            var ctorName = first(constructor);
            var ctorParams = tail(constructor);
            var ctor = mkFunction(function (env, args) {
                var instance = { type: mkType(type.name), members: {}, constructor: ctorName.name };
                each(zip(ctorParams, args), function(x) { instance.members[first(x).name] = second(x); });
                return instance; });
            ctor.params = ctorParams;
            return [[ctorName, ctor]].concat(
                ctorParams.map(function (param) {
                    return [mkSymbol(ctorName.name + "." + param.name),
                            mkFunction(function (env, args) { return first(args).members[param.name]; })]; })); });
        var defForms = concat(defs).map(function (x) { return mkList(mkSymbol("def"), first(x), second(x)); });
        return arrayToList([mkSymbol("do")].concat(defForms)); });

    bootstrap["eval"] = mkFunction(function (env, args) {
        var x = first(args);
        if (isList(x)) {
            // TODO: (eval ()) ?
            var f = evaluateForm(env, first(x));
            // TODO: check f is a function
            var fargs = isMacro(f) || isSpecial(f)
                    ? tail(x) // if evaluating a macro or special form, don't evaluate args
                    : tail(x).map(curry(evaluateForm, env));
            var result = f.invoke(env, fargs);
            return isMacro(f)
                ? evaluateForm(env, result)
                : result; }
        else if (isSymbol(x)) {
            var v = env.lookup(x.name);
            if (!v) throw new Error("'" + x.name + "' not in scope.");
            return v; }
        else {
            return x; } });

    bootstrap["quote"] = mkSpecial(function (env, args) { return first(args); });

    function compile (mk) {
        return function (lexEnv, args) {
            var lexFrames = tail(lexEnv.frames);
            var params = first(args);
            var body = second(args);
            return mk(function (env, args) {
                // TODO: check this.params.length === args.length
                each(lexFrames, function (f) { env.pushFrame(f); });
                var frame = {};
                env.pushFrame(frame);
                each(zip(params, args), function(x) { frame[first(x).name] = second(x); });
                var result = evaluateForm(env, body);
                env.popFrame();
                each(lexFrames, function () { env.popFrame(); });
                return result; }); }; }

    bootstrap["fn"] = mkMacro(compile(mkFunction));
    bootstrap["macro"] = mkMacro(compile(mkMacro));

    function appliedFunctionForm (params, body, args) {
        // ((fn (names) body) args)
        return arrayToList([mkList(mkSymbol("fn"), arrayToList(params), body)].concat(args)); }

    bootstrap["let"] = mkMacro(function (env, args) {
        // TODO: verify 2 args
        // TODO: verify even number of binding forms
        var bindings = first(args);
        var names = [];
        var fargs = [];
        for (var i = 0; i < bindings.length; i += 2) { names.push(bindings[i]); fargs.push(bindings[i + 1]); }
        return appliedFunctionForm(names, second(args), fargs); });

    bootstrap["match"] = mkMacro(function (env, args) {
        var toMatch = evaluateForm(env, first(args));
        var matchForms = tail(args);
        for (var i = 0; i < matchForms.length; i += 2) {
            var pattern = matchForms[i];
            var body = matchForms[i + 1];
            if (equals(pattern, toMatch)) return body;
            if (isSymbol(pattern)) return appliedFunctionForm([pattern], body, [toMatch]);
            if (isList(pattern) && first(pattern).name === toMatch.constructor) {
                var params = env.lookup(toMatch.constructor).params;
                var fargs = params.map(function(x) { return toMatch.members[x.name]; });
                return appliedFunctionForm(tail(pattern), body, fargs); } }
        return undefined; });

    bootstrap["comment"] = mkSpecial(function (env, args) { });

    bootstrap["type"] = mkFunction(function (env, args) { return first(args).type; });
    bootstrap["create-type"] = mkFunction(function (env, args) {
        var name = first(args);
        return mkType(name && name.value); });

    bootstrap["do"] = mkSpecial(function (env, args) {
        var results = args.map(curry(evaluateForm, env));
        return last(results); });

    bootstrap["string"] = mkFunction(function(env, args) {
        var arg = first(args);
        return isSymbol(arg) ? arg.name :
            isString(arg)    ? '"' + arg.value + '"' :
            isNumber(arg)    ? arg.value :
            isKeyword(arg)   ? ":" + arg.name :
            isFunction(arg)  ? "<Function>" :
            isMacro(arg)     ? "<Macro>" :
            isList(arg)      ? "(" + map(arg, mkList).map(curry(bootstrap.string.invoke, env)).join(" ") + ")" :
            /* otherwise */    arg; });

    bootstrap["print"] = mkFunction(function (env, args) {
        console.log(bootstrap.string.invoke(env, args)); });

    // TODO: atom, =, cons, head, tail, cond, defn, defmacro, ns
    // TODO: "interop"/"introspection" - name, vars, lookup/env

    // Numeric functions
    each([["+", add], ["-", subtract], ["*", multiply], ["/", divide]],
         function (p) { var n = first(p); var f = second(p);
             bootstrap[n] = mkFunction(function (env, args) { return mkNumber(
                 args.map(function (x) { return x.value; })
                     .reduce(f)); }); });

    // Evaluation
    function Environment (frame) { this.frames = mkList(frame); }
    Environment.prototype.lookup = function (n) { return reverseFind(this.frames, function(f) { return f[n]; }); };
    Environment.prototype.pushFrame = function (frame) { this.frames.push(frame || {}); };
    Environment.prototype.popFrame = function () { this.frames.pop(); };
    Environment.prototype.def = function (n, v) { first(this.frames)[n] = v; };

    teslo.environment = function () {
        var globals = {};
        for (var n in bootstrap) { globals[n] = bootstrap[n]; }
        return new Environment(globals); };

    function evaluateForm (env, form) { return bootstrap.eval.invoke(env, mkList(form)); }

    teslo.evaluate = function (src, env) {
        var result = teslo.parse(src);
        if (result.success)
            return result.forms.map(curry(evaluateForm, env));
        else
            throw new Error("Parse error: " + (result.message || "unknown error")); };

})(typeof exports === "undefined" ? this["teslo"] = {} : exports,
   this.cromp || require("cromp"));
