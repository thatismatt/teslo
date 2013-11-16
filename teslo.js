(function (teslo, cromp) {

    // Utils
    function first (arr) { return arr[0]; }
    function second (arr) { return arr[1]; }
    function third (arr) { return arr[2]; }
    function last (arr) { return arr[arr.length - 1]; }
    function toArray (x) { return Array.prototype.slice.call(x, 0); }
    function rest (arr) { return Array.prototype.slice.call(arr, 1); }
    function add (a, b) { return a + b; }
    function subtract (a, b) { return a - b; }
    function multiply (a, b) { return a * b; }
    function divide (a, b) { return a / b; }
    function each (arr, f) { for (var i = 0; i < arr.length; i++) { f(arr[i], i); } }
    function each2 (arr, f) { for (var i = 0; i < arr.length; i += 2) { f(arr[i], arr[i + 1]); } }
    function map (arr, f) { var r = []; each(arr || [], function (x, i) { r.push(f(x, i)); }); return r; }
    function concat (x) { return Array.prototype.concat.apply([], x); };
    function cons (a, b) { return arrayToList(concat([[a], b])); }
    function find (arr, f) { for (var i = 0; i < arr.length; i++) { if (f(arr[i], i)) return arr[i]; } return undefined; }
    function reverseFind (arr, f) { var i = arr.length, r; while (!r && i--) { r = f(arr[i]); } return r; }
    function zip (as, bs) { return map(as, function (a, i) { return [a, bs[i]]; }); }
    function zipmap (ks, vs) { var r = {}; map(zip(ks, vs), function (x) { r[x[0]] = x[1]; }); return r; }
    function all (arr, f) { for (var i = 0; i < arr.length; i++) { if (!f(arr[i])) { return false; } } return true; }
    function any (arr, f) { for (var i = 0; i < arr.length; i++) { if (f(arr[i])) { return true; } } return false; }
    function compose (f, g, h) { return h ? compose(f, compose(g, h)) : function () { return f(g.apply(null, arguments)); }; }
    function curry (f) { var args = rest(arguments);
                         return function () { return f.apply(null, args.concat(toArray(arguments))); }; }
    var flatmap = compose(concat, map);
    function typeEquals (a, b) { return a.type.name === b.type.name; }
    function equals (a, b) { return typeEquals(a, b) && a.value !== undefined && b.value !== undefined && a.value === b.value; }
    function name (x) { return x.name; }

    function isOfType (t) { return function (x) { return x.type && x.type.name === t; }; }
    var isList = isOfType("List");
    var isString = isOfType("String");
    var isNumber = isOfType("Number");
    var isSymbol = isOfType("Symbol");
    var isKeyword = isOfType("Keyword");
    var isFunction = isOfType("Function");
    var isType = isOfType("Type");
    function isMacro (x) { return isFunction(x) && x.macro; }
    function isSpecial (x) { return isFunction(x) && x.special; }

    // AST
    function mkType (x, constructorList) {
        var cs = {};
        constructorList && each(constructorList, function (c) { cs[c.length] = c; });
        return { name: x, type: { name: "Type" }, constructors: cs,
                 invoke: function (env, args) {
                     var c = this.constructors[args.length];
                     if (!c) throw new Error("No matching constructor");
                     return { type: this, constructor: c, members: zipmap(map(c, name), args) }; } }; }
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

    function tryExpandForm (env, form) {
        var f = first(form);
        if (isSymbol(f)) {
            var x = env.lookup(f.name);
            if (x && isMacro(x)) return x.invoke(env, rest(form)); }
        return form; }

    bootstrap["macro-expand"] = mkSpecial(function (env, args) {
        var form = first(args);
        if (isList(form) && form.length > 0) {
            var expanded = tryExpandForm(env, form);
            if (!isList(expanded)) return expanded;
            return arrayToList(map(expanded, compose(curry(bootstrap["macro-expand"].invoke, env), mkList))); }
        return form; });

    bootstrap["eval"] = mkFunction(function (env, args) {
        var x = bootstrap["macro-expand"].invoke(env, args);
        if (isList(x)) {
            if (x.length === 0) return x;
            var f = evaluateForm(env, first(x));
            if (!f.invoke) throw new Error(bootstrap.string.invoke(null, [f]) + " can't be invoked.");
            var fargs = isSpecial(f)
                    ? rest(x) // if evaluating a special form, don't evaluate args
                    : rest(x).map(curry(evaluateForm, env));
            return f.invoke(env, fargs); }
        if (isSymbol(x)) {
            var v = env.lookup(x.name);
            if (!v) throw new Error("'" + x.name + "' not in scope.");
            return v; }
        return x; });

    bootstrap["quote"] = mkSpecial(function (env, args) { return first(args); });
    bootstrap["syntax-quote"] = mkSpecial(function (env, args) {
        function isUnquote (f) { return isSymbol(f) && (f.name === "unquote" || f.name === "unquote-splice"); }
        function isSplicedForm (f) { return isList(f) && isSymbol(first(f)) && first(f).name === "unquote-splice"; }
        function unquoteForm (form) {
            if (!isList(form)) return form;
            if (isUnquote(first(form))) return evaluateForm(env, second(form));
            return arrayToList(
                flatmap(form, function (f) { return isSplicedForm(f) ? unquoteForm(f) : [unquoteForm(f)]; })); }
        return unquoteForm(args[0]); });

    function bind (frame, params, args) {
        for (var i = 0; i < params.length; i++) {
            if (isList(params[i])) {
                var targs = map(args[i].constructor, function (p) { return args[i].members[p.name]; });
                bind(frame, rest(params[i]), targs); }
            if (params[i].name === ".") {
                frame[params[i + 1].name] = mkList.apply(null, args.slice(i));
                // TODO: error if there are params after the rest param
                break; }
            frame[params[i].name] = args[i]; } }

    function match (pattern, arg) {
        return isList(pattern) &&
            first(pattern).name === arg.type.name &&
            rest(pattern).length === arg.constructor.length; }

    function matches (ads, args) {
        if (ads.length === 1) return first(ads);
        var ad = find(ads, function (ad) {
            return all(zip(ad.params, args), function (x) {
                var pattern = first(x), arg = second(x);
                return equals(pattern, arg) || isSymbol(pattern) || match(pattern, arg); }); });
            if (ad) return ad;
        throw new Error("No matching pattern"); }

    function compile (mk) {
        return function (lexEnv, args) {
            var env = lexEnv.clone();
            var arityDispatch = {};
            each2(args, function (params, body) {
                var isVariadic = any(params, function(p) { return p.name === "."; });
                // TODO: only allow one variadic signature
                var k = isVariadic ? "." : params.length;
                arityDispatch[k] = arityDispatch[k] || [];
                arityDispatch[k].push({ params: params, body: body }); });
            return mk(function (_env, fargs) {
                var ads = arityDispatch[fargs.length] // exact arity match
                        || arityDispatch["."];        // variadic signature
                // if (!ads) { TODO: error on arity }
                var ad = matches(ads, fargs);
                var frame = {};
                bind(frame, ad.params, fargs);
                env.pushFrame(frame);
                var result = evaluateForm(env, ad.body);
                env.popFrame();
                return result; }); }; }

    bootstrap["fn"] = mkSpecial(compile(mkFunction));
    bootstrap["macro"] = mkSpecial(compile(mkMacro));

    function appliedFunctionForm (fs, args) {
        var nbs = flatmap(fs, function (f) { return [arrayToList(f.params), f.body]; });
        return cons(cons(mkSymbol("fn"), nbs), args); }

    bootstrap["let"] = mkMacro(function (env, args) {
        // TODO: verify 2 args
        // TODO: verify even number of binding forms
        var names = [];
        var fargs = [];
        each2(first(args), function(n, v) { names.push(n); fargs.push(v); });
        return appliedFunctionForm([{ params: names, body: second(args) }], fargs); });

    bootstrap["match"] = mkMacro(function (env, args) {
        var fs = [];
        each2(rest(args), function (pattern, body) { fs.push({ params: [pattern], body: body }); });
        return appliedFunctionForm(fs, [first(args)]); });

    bootstrap["comment"] = mkSpecial(function (env, args) { });

    bootstrap["type"] = mkFunction(function (env, args) { return first(args).type; });
    bootstrap["create-type"] = mkSpecial(function (env, args) {
        var name = evaluateForm(env, first(args));
        return mkType(name && name.value, rest(args)); });

    bootstrap["name"] = mkSpecial(function (env, args) {
        return mkString(first(args).name); });

    bootstrap["do"] = mkSpecial(function (env, args) {
        var results = args.map(curry(evaluateForm, env));
        return last(results); });

    bootstrap["string"] = mkFunction(function (env, args) {
        var arg = first(args);
        var str = compose(curry(bootstrap.string.invoke, env), mkList);
        return isSymbol(arg) ? arg.name :
            isString(arg)    ? '"' + arg.value + '"' :
            isNumber(arg)    ? arg.value :
            isKeyword(arg)   ? ":" + arg.name :
            isSpecial(arg)   ? "<Special>" :
            isMacro(arg)     ? "<Macro>" :
            isFunction(arg)  ? "<Function>" :
            isType(arg)      ? "<Type " + arg.name + ">" :
            isList(arg)      ? "(" + map(arg, str).join(" ") + ")" :
            arg.type         ? str(cons(arg.type.name, map(Object.keys(arg.members),
                                         function (k) { return str(arg.members[k]); }))) :
            /* otherwise */    arg; });

    bootstrap["print"] = mkFunction(function (env, args) {
        console.log(bootstrap.string.invoke(env, args)); });

    // Array functions, used in prelude macros
    bootstrap["first"] = mkFunction(function (env, args) {
        return first(first(args)); });
    bootstrap["rest"] = mkFunction(function (env, args) {
        return arrayToList(rest(first(args))); });

    // TODO: atom, =, cond, ns
    // TODO: "interop"/"introspection" - vars, lookup/env

    // Numeric functions
    each([["+", add], ["-", subtract], ["*", multiply], ["/", divide]],
         function (p) { var n = first(p); var f = second(p);
             bootstrap[n] = mkFunction(function (env, args) { return mkNumber(
                 args.map(function (x) { return x.value; })
                     .reduce(f) * (n === "-" && args.length === 1 ? -1 : 1)); }); });

    // Evaluation
    function Environment (frame) { this.frames = mkList(frame); }
    Environment.prototype.lookup = function (n) { return reverseFind(this.frames, function (f) { return f[n]; }); };
    Environment.prototype.pushFrame = function (frame) { this.frames.push(frame || {}); };
    Environment.prototype.popFrame = function () { this.frames.pop(); };
    Environment.prototype.def = function (n, v) { first(this.frames)[n] = v; };
    Environment.prototype.clone = function () {
        var env = new Environment();
        env.frames = toArray(this.frames);
        return env; };

    teslo.environment = function () {
        var globals = {};
        for (var n in bootstrap) { globals[n] = bootstrap[n]; }
        return new Environment(globals); };

    function evaluateForm (env, form) { return bootstrap.eval.invoke(env, mkList(form)); }
    // DEBUG
    // function log (args) { bootstrap.print.invoke(null, mkList(args)); }

    teslo.evaluate = function (src, env) {
        var result = teslo.parse(src);
        if (result.success)
            return result.forms.map(compose(curry(evaluateForm, env),
                                            curry(bootstrap["macro-expand"].invoke, env),
                                            mkList));
        else
            throw new Error("Parse error: " + (result.message || "unknown error")); };

})(typeof exports === "undefined" ? this["teslo"] = {} : exports,
   this.cromp || require("cromp"));
