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
    function cons (a, b) { return concat([[a], b]); }
    function find (arr, f) { for (var i = 0; i < arr.length; i++) { if (f(arr[i], i)) return arr[i]; } return undefined; }
    function zip (as, bs) { return map(as, function (a, i) { return [a, bs[i]]; }); }
    function zipmap (ks, vs) { var r = {}; map(zip(ks, vs), function (x) { r[x[0]] = x[1]; }); return r; }
    function all (arr, f) { for (var i = 0; i < arr.length; i++) { if (!f(arr[i])) { return false; } } return true; }
    function any (arr, f) { for (var i = 0; i < arr.length; i++) { if (f(arr[i])) { return true; } } return false; }
    function merge (a, b, conflictFn) {
        return [{}, a, b].reduce(function (r, x) {
            for (var i in x) { r[i] = r[i] && conflictFn ? conflictFn(r[i], x[i]) : x[i]; } return r; }); }
    function compose (f, g, h) { return h ? compose(f, compose(g, h)) : function () { return f(g.apply(null, arguments)); }; }
    function curry (f) { var args = rest(arguments);
                         return function () { return f.apply(null, args.concat(toArray(arguments))); }; }
    var flatmap = compose(concat, map);
    function equals (a, b) { return a === b || (isKeyword(a) && isKeyword(b) && get("name")(a) === get("name")(b)); }
    function get (p) { return function (x) { return x.members[p]; }; }

    function jsType (x) { return /\[object (\w*)\]/.exec(Object.prototype.toString.call(x))[1]; }
    function getType (x) { return x.type || jsType(x); }
    function isOfType (t) { return function (x) { return x && getType(x) === t; }; }
    var isList = isOfType("List");
    var isArray = isOfType("Array");
    var isString = isOfType("String");
    var isNumber = isOfType("Number");
    var isSymbol = isOfType("Symbol");
    var isKeyword = isOfType("Keyword");
    var isFunction = isOfType("Function");
    var isType = isOfType("Type");
    function isSequence (x) { return isList(x) || isArray(x); }
    function isMacro (x) { return isFunction(x) && x.macro; }
    function isSpecial (x) { return isFunction(x) && x.special; }
    function isParticularSymbol (name) { return function (s) { return isSymbol(s) && get("name")(s) === name; }; }
    var isOfTypeSymbol = isParticularSymbol(":");
    var isVariadicSymbol = isParticularSymbol(".");

    // Types
    var types = {};
    var typeId = 0;
    function mkType (name, constructorList) {
        name = name || "__type__" + typeId++;
        var cs = {};
        constructorList && each(constructorList, function (c) { cs[c.length] = c; });
        var t = { name: name, type: "Type", constructors: cs,
                  invoke: function (env, args) {
                      var c = this.constructors[args.length];
                      if (!c) throw new Error("No matching constructor.");
                      return { type: name, constructor: c, members: zipmap(map(c, get("name")), args) }; } };
        types[name] = t;
        return t; }
    each(["Type", "Function", "Symbol", "String", "Number", "Keyword", "List", "Array"], mkType);

    function mkArray () { return toArray(arguments); }
    function mkSymbol (x) { return { members: { name: x }, type: "Symbol" }; }
    function mkKeyword (x) { return { members: { name: x }, type: "Keyword" }; };
    function mkMacro (f) { var m = mkFunction(f); m.macro = true; return m; };
    function mkSpecial (f) { var s = mkFunction(f); s.special = true; return s; };
    function mkFunction (f) { return { invoke: f, type: "Function" }; };

    // Parser
    var open = cromp.character("(");
    var close = cromp.character(")");
    var symbol = cromp.regex(/[a-zA-Z0-9+=\-_*\/?.:$]+/).map(first).map(mkSymbol);
    var whitespace = cromp.regex(/\s+/);
    var optionalWhitespace = cromp.optional(whitespace);
    var eof = cromp.regex(/$/);
    var number = cromp.regex(/-?((\.[0-9]+)|[0-9]+(\.[0-9]+)?)/)
            .map(first).map(parseFloat);
    var character = cromp.choose(
        cromp.regex(/[^"\\]/).map(first),
        cromp.seq(cromp.character("\\"), cromp.regex(/./).map(first))
            .map(function (m) { return { "n": "\n",
                                         "t": "\t",
                                         '"': '"' }[second(m)]; }));
    var string = cromp.between(
        cromp.character('"'), cromp.character('"'),
        cromp.many(character)).map(function (m) { return m.join(""); });
    var keyword = cromp.seq(cromp.character(":"), cromp.regex(/[a-z]+/).map(first))
            .map(second).map(mkKeyword);
    var list = cromp.recursive(function () {
        return cromp.between(open, close, cromp.optional(forms)); });
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
            .map(function (x) { return mkArray(mkSymbol("quote"), second(x)); });
    var syntaxQuote = cromp.seq(cromp.character("`"), form)
            .map(function (x) { return mkArray(mkSymbol("syntax-quote"), second(x)); });
    var unquote = cromp.seq(cromp.character("~"), form)
            .map(function (x) { return mkArray(mkSymbol("unquote"), second(x)); });
    var unquoteSplice = cromp.seq(cromp.string("~@"), form)
            .map(function (x) { return mkArray(mkSymbol("unquote-splice"), second(x)); });
    var comment = cromp.seq(cromp.character(";"),
                            cromp.regex(/.*[\s\S]/).map(first)) // [\s\S] matches & consumes newline (unlike $)
            .map(function (x) { return mkArray(mkSymbol("comment"), second(x)); });

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
        var currentVal = env.lookup(get("name")(symbol));
        // function extension
        if (isFunction(currentVal)) {
            currentVal.overloads = merge(currentVal.overloads, val.overloads, function (a, b) { return concat([a, b]); }); }
        // function definition
        else { env.def(get("name")(symbol), val); }
        return symbol; });

    function tryExpandForm (env, form) {
        var f = first(form);
        if (isSymbol(f)) {
            var x = env.lookup(get("name")(f));
            if (x && isMacro(x)) return x.invoke(env, rest(form)); }
        return form; }

    bootstrap["macro-expand"] = mkSpecial(function (env, args) {
        var form = first(args);
        if (isSequence(form) && form.length > 0) {
            var expanded = tryExpandForm(env, form);
            if (!isSequence(expanded)) return expanded;
            return map(expanded, compose(curry(bootstrap["macro-expand"].invoke, env), mkArray)); }
        return form; });

    bootstrap["eval"] = mkFunction(function (env, args) {
        var x = bootstrap["macro-expand"].invoke(env, args);
        if (isSequence(x)) {
            if (x.length === 0) return x;
            var f = evaluateForm(env, first(x));
            if (!f.invoke) throw new Error(bootstrap.string.invoke(null, [f]) + " can't be invoked.");
            var fargs = isSpecial(f)
                    ? rest(x) // if evaluating a special form, don't evaluate args
                    : rest(x).map(curry(evaluateForm, env));
            return f.invoke(env, fargs); }
        if (isSymbol(x)) {
            var v = env.lookup(get("name")(x));
            if (v === undefined) throw new Error("'" + get("name")(x) + "' not in scope.");
            return v; }
        return x; });

    bootstrap["quote"] = mkSpecial(function (env, args) { return first(args); });
    bootstrap["syntax-quote"] = mkSpecial(function (env, args) {
        function isUnquote (f) { return isParticularSymbol("unquote")(f) || isParticularSymbol("unquote-splice")(f); }
        function isSplicedForm (f) { return isSequence(f) && isParticularSymbol("unquote-splice")(first(f)); }
        function unquoteForm (form) {
            if (!isSequence(form)) return form;
            if (isUnquote(first(form))) return evaluateForm(env, second(form));
            return flatmap(form, function (f) { return isSplicedForm(f) ? unquoteForm(f) : [unquoteForm(f)]; }); }
        return unquoteForm(args[0]); });

    function membersToArray (x) {
        return map(x.constructor, function (p) { return x.members[get("name")(p)]; }); }

    function bind (params, args) {
        var frame = {};
        for (var i = 0; i < params.length; i++) {
            if (isSequence(params[i])) {
                if (params[i].length === 3 && isOfTypeSymbol(second(params[i]))) {
                    frame[get("name")(first(params[i]))] = args[i];
                    return frame; }
                return merge(frame, bind(rest(params[i]), membersToArray(args[i]))); }
            if (isVariadicSymbol(params[i])) {
                frame[get("name")(params[i + 1])] = mkArray.apply(null, args.slice(i));
                // TODO: error if the rest param is malformed - it must be one symbol
                return frame; }
            if (isSymbol(params[i])) frame[get("name")(params[i])] = args[i]; }
        return frame; }

    function findMatch (os, args) {
        return find(os, function (o) {
            return all(zip(o.params, args), isMatch); }); }

    function isMatch (x) {
        var pattern = first(x), arg = second(x);
        return isSymbol(pattern) || equals(pattern, arg) || isTypeMatch(pattern, arg); }

    function isTypeMatch (pattern, arg) {
        if (!isSequence(pattern)) return false;
        if (pattern.length === 3 && isOfTypeSymbol(second(pattern)))
            return get("name")(third(pattern)) === getType(arg);
        return get("name")(first(pattern)) === arg.type
            && rest(pattern).length === arg.constructor.length
            && all(zip(rest(pattern), membersToArray(arg)), isMatch); }

    function compile (mk) {
        return function (env, args) {
            var overloads = {};
            each2(args, function (params, body) {
                // TODO: only allow one variadic signature
                var k = any(params, isVariadicSymbol) ? "." : params.length;
                overloads[k] = overloads[k] || [];
                overloads[k].push({ params: params, body: body }); });
            var f = mk(function (_env, fargs) {
                var os = f.overloads[fargs.length] // exact arity match
                      || f.overloads["."];         // variadic signature
                if (!os) throw new Error("No matching overload.");
                var o = findMatch(os, fargs);
                if (!o) throw new Error("No matching pattern.");
                var frame = bind(o.params, fargs);
                var result = evaluateForm(env.child(frame), o.body);
                return result; });
            f.overloads = overloads;
            return f; }; }

    bootstrap["fn"] = mkSpecial(compile(mkFunction));
    bootstrap["macro"] = mkSpecial(compile(mkMacro));

    function appliedFunctionForm (fs, args) {
        var nbs = flatmap(fs, function (f) { return [f.params, f.body]; });
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

    bootstrap["type"] = mkFunction(function (env, args) {
        return types[getType(first(args))]; });
    bootstrap["create-type"] = mkSpecial(function (env, args) {
        var name = evaluateForm(env, first(args));
        return mkType(name, rest(args)); });

    bootstrap["name"] = mkFunction(function (env, args) {
        return get("name")(first(args)); });

    bootstrap["do"] = mkSpecial(function (env, args) {
        var results = args.map(curry(evaluateForm, env));
        return last(results); });

    function str (env) { return function (x) { return env.lookup("string").invoke(env, [x]); }; }
    bootstrap["sequence-string*"] = mkFunction(function (env, args) {
        return "(" + map(first(args), str(env)).join(" ") + ")"; });

    bootstrap["string*"] = mkFunction(function (env, args) {
        var arg = first(args);
        return isSpecial(arg)   ? "<Special>" :
            isMacro(arg)     ? "<Macro>" :
            isFunction(arg)  ? "<Function>" :
            isType(arg)      ? "<Type " + arg.name + ">" :
            arg.type         ? str(cons(arg.type, map(Object.keys(arg.members),
                                                      function (k) { return str(arg.members[k]); }))) :
            /* otherwise */    arg; });

    bootstrap["log*"] = mkFunction(function (env, args) {
        console.log(first(args)); });

    // Array functions
    bootstrap["array-first*"] = mkFunction(function (env, args) {
        return first(first(args)); });
    bootstrap["array-rest*"] = mkFunction(function (env, args) {
        return rest(first(args)); });

    // TODO: atom, =, cond, ns
    // TODO: "interop"/"introspection" - vars, lookup/env

    // Numeric functions
    each([["+", add], ["-", subtract], ["*", multiply], ["/", divide]],
         function (p) { var n = first(p); var f = second(p);
             bootstrap[n] = mkFunction(function (env, args) {
                 return n === "-" && args.length === 1
                     ? -1 * first(args)
                     : args.reduce(f); }); });

    // Evaluation
    function Environment (parent) {
        function x () {}
        if (parent) x.prototype = parent.frames;
        this.frames = new x; }
    Environment.prototype.lookup = function (n) { return this.frames[n]; };
    Environment.prototype.def = function (n, v) { this.frames[n] = v; };
    Environment.prototype.child = function (f) {
        var c = new Environment(this);
        for (var n in f) { c.def(n, f[n]); }
        return c; };

    teslo.environment = function () {
        var env = new Environment();
        for (var n in bootstrap) { env.def(n, bootstrap[n]); }
        //for (var t in types) { env.def(t, types[t]); }
        return env; };

    function evaluateForm (env, form) { return bootstrap.eval.invoke(env, mkArray(form)); }
    // DEBUG
    // function log (args) { bootstrap.print.invoke(null, mkArray(args)); }

    teslo.evaluate = function (src, env) {
        var result = teslo.parse(src);
        if (result.success)
            return result.forms.map(compose(curry(evaluateForm, env),
                                            curry(bootstrap["macro-expand"].invoke, env),
                                            mkArray));
        else
            throw new Error("Parse error: " + (result.message || "unknown error.")); };

})(typeof exports === "undefined" ? this["teslo"] = {} : exports,
   this.cromp || require("cromp"));
