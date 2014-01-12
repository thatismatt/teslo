(function (teslo, cromp) {

    // Utils
    function first (arr) { return arr[0]; }
    function second (arr) { return arr[1]; }
    function third (arr) { return arr[2]; }
    function last (arr) { return arr[arr.length - 1]; }
    function pop (arr, n) { return [arr.slice(0, n).reverse(), arr.slice(n)]; }
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
    function get (p) { return function (x) { return x[p]; }; }
    function getMeta (o, k) { return (o["!meta"] || {})[k]; }
    function setMeta (o, k, v) { (o["!meta"] || (o["!meta"] = {}))[k] = v; return o; }

    function jsType (x) { return /\[object (\w*)\]/.exec(Object.prototype.toString.call(x))[1]; }
    function getType (x) { return getMeta(x, "type") || jsType(x); }
    function isOfType (t) { return function (x) { return x && getType(x) === t; }; }
    function isJsFunction (x) { return jsType(x) === "Function"; }
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
        return types[name] = setMeta({ name: name, constructors: cs }, "type", "Type"); }
    each(["Type", "Function", "Symbol", "String", "Number", "Keyword", "List", "Array"], mkType);
    function mkInstance (t, args) {
        var c = t.constructors[args.length];
        if (!c) throw new Error("No matching constructor.");
        return setMeta(setMeta(
            zipmap(map(c, get("name")), args),
            "type", t.name),
            "constructor", c); }

    function mkArray () { return toArray(arguments); }
    function mkSymbol (x) { return setMeta({ name: x }, "type", "Symbol"); }
    function mkKeyword (x) { return setMeta({ name: x }, "type", "Keyword"); }
    function mkMacro (f) { f.macro = true; return f; };
    function mkSpecial (f) { f.special = true; return f; };

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
    bootstrap["def"] = mkSpecial(function (args, env) {
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
            if (x && isMacro(x)) return runFunction(x, rest(form), env); }
        return form; }

    bootstrap["macro-expand"] = mkSpecial(function (args, env) {
        var form = first(args);
        if (isSequence(form) && form.length > 0) {
            var expanded = tryExpandForm(env, form);
            if (!isSequence(expanded)) return expanded;
            return map(expanded, compose(function (args) { return bootstrap["macro-expand"](args, env); }, mkArray)); }
        return form; });

    bootstrap["eval"] = function (args, env) {
        var ops = compile(first(args), []);
        var state = { ops: ops, stack: [], env: env };
        while (state.ops.length) {
            state = run(state.ops, state.stack, state.env); }
        return first(state.stack); };

    function compile (form, ops) {
        if (isSequence(form) && form.length > 0) {
            var f = compile(first(form), ops);
            var fargs = rest(form);
            var fops = isSpecialOperation(f)
                    ? fargs.map(function (a) { return ["value", a]; }) // if evaluating a special form, don't evaluate args
                    : flatmap(fargs, function (a) { return compile(a, []); });
            return concat([ops, fops, f, [["invoke", fargs.length]]]); }
        if (isSymbol(form)) {
            return [["lookup", get("name")(form)]]; }
        return [["value", form]]; };

    function run (ops, stack, env) {
        var op = first(ops);
        if (op[0] === "invoke") {
            var f = first(stack);
            var x = pop(rest(stack), op[1]);
            var fargs = x[0];
            if (isType(f)) {
                return { ops: rest(ops), stack: cons(mkInstance(f, fargs), x[1]), env: env }; }
            if (isFunction(f)) {
                if (isJsFunction(f)) {
                    return { ops: rest(ops), stack: cons(f(fargs, env), x[1]), env: env }; }
                var o = dispatch(f, fargs);
                var frame = bind(o.params, fargs);
                var fenv = f.env.child(frame);
                var ops2 = concat([o.compiled, [["env", env]], rest(ops)]);
                return { ops: ops2, stack: x[1], env: fenv }; }
            throw new Error("Invalid invoke operation, only functions and types can be invoked."); }
        if (op[0] === "env") {
            return { ops: rest(ops), stack: stack, env: op[1] }; }
        if (op[0] === "lookup") {
            var v = env.lookup(op[1]);
            if (v === undefined) throw new Error("'" + op[1] + "' not in scope.");
            return { ops: rest(ops), stack: cons(v, stack), env: env }; }
        if (op[0] === "value") {
            return { ops: rest(ops), stack: cons(op[1], stack), env: env }; }
        throw new Error("Unknown operation " + op[0]); }

    function runFunction (f, fargs, env) {
        if (isJsFunction(f)) return f(fargs, env);
        var o = dispatch(f, fargs);
        var frame = bind(o.params, fargs);
        return evaluateForm(f.env.child(frame), o.body); }

    function dispatch (f, fargs) {
        var os = f.overloads[fargs.length] // exact arity match
                || f.overloads["."];       // variadic signature
        if (!os) throw new Error("No matching overload.");
        var o = findMatch(os, fargs);
        if (!o) throw new Error("No matching pattern.");
        return o; }

    function isSpecialOperation (ops) {
        var x = first(ops);
        return bootstrap[x[1]] && bootstrap[x[1]].special; }

    bootstrap["quote"] = mkSpecial(function (args) { return first(args); });
    bootstrap["syntax-quote"] = mkSpecial(function (args, env) {
        function isUnquote (f) { return isParticularSymbol("unquote")(f) || isParticularSymbol("unquote-splice")(f); }
        function isSplicedForm (f) { return isSequence(f) && isParticularSymbol("unquote-splice")(first(f)); }
        function unquoteForm (form) {
            if (!isSequence(form)) return form;
            if (isUnquote(first(form))) return evaluateForm(env, second(form));
            return flatmap(form, function (f) { return isSplicedForm(f) ? unquoteForm(f) : [unquoteForm(f)]; }); }
        return unquoteForm(args[0]); });

    function membersToArray (x) {
        return map(getMeta(x, "constructor"), function (p) { return x[get("name")(p)]; }); }

    function bind (params, args) {
        var frame = {};
        for (var i = 0; i < params.length; i++) {
            if (isSequence(params[i])) {
                if (params[i].length === 3 && isOfTypeSymbol(second(params[i]))) {
                    frame[get("name")(first(params[i]))] = args[i];
                    return frame; }
                frame = merge(frame, bind(rest(params[i]), membersToArray(args[i]))); }
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
        return get("name")(first(pattern)) === getMeta(arg, "type")
            && rest(pattern).length === getMeta(arg, "constructor").length
            && all(zip(rest(pattern), membersToArray(arg)), isMatch); }

    function mkFunction (args, env) {
        var overloads = {};
        each2(args, function (params, body) {
            // TODO: only allow one variadic signature
            var compiled = compile(body, []);
            var k = any(params, isVariadicSymbol) ? "." : params.length;
            overloads[k] = overloads[k] || [];
            overloads[k].push({ params: params, body: body, compiled: compiled }); });
        return setMeta({ overloads: overloads, env: env }, "type", "Function"); }

    bootstrap["fn"] = mkSpecial(mkFunction);
    bootstrap["macro"] = mkSpecial(compose(mkMacro, mkFunction));

    function appliedFunctionForm (fs, args) {
        var nbs = flatmap(fs, function (f) { return [f.params, f.body]; });
        return cons(cons(mkSymbol("fn"), nbs), args); }

    bootstrap["let"] = mkMacro(function (args) {
        // TODO: verify 2 args
        // TODO: verify even number of binding forms
        var names = [];
        var fargs = [];
        each2(first(args), function(n, v) { names.push(n); fargs.push(v); });
        return appliedFunctionForm([{ params: names, body: second(args) }], fargs); });

    bootstrap["match"] = mkMacro(function (args) {
        var fs = [];
        each2(rest(args), function (pattern, body) { fs.push({ params: [pattern], body: body }); });
        return appliedFunctionForm(fs, [first(args)]); });

    bootstrap["comment"] = mkSpecial(function () { });

    bootstrap["type"] = function (args) {
        return types[getType(first(args))]; };
    bootstrap["create-type"] = mkSpecial(function (args, env) {
        var name = evaluateForm(env, first(args));
        return mkType(name, rest(args)); });

    bootstrap["name"] = function (args) {
        return get("name")(first(args)); };

    bootstrap["string*"] = function (args) {
        var arg = first(args);
        var str = second(args);
        return isSpecial(arg)    ? "<Special>" :
            isMacro(arg)         ? "<Macro>" :
            isFunction(arg)      ? "<Function>" :
            isType(arg)          ? "<Type " + arg.name + ">" :
            getMeta(arg, "type") ? runFunction(str, [cons(mkSymbol(getMeta(arg, "type")), membersToArray(arg))]) :
            /* otherwise */        arg; };

    bootstrap["log*"] = function (args) {
        console.log(first(args)); };

    // Array functions
    bootstrap["array-first*"] = function (args) {
        return first(first(args)); };
    bootstrap["array-rest*"] = function (args) {
        return rest(first(args)); };
    bootstrap["array-last*"] = function (args) {
        return last(first(args)); };
    bootstrap["array-length*"] = function (args) {
        return first(args).length; };

    // TODO: atom, =, cond, ns
    // TODO: "interop"/"introspection" - vars, lookup/env

    // Numeric functions
    each([["+", add], ["-", subtract], ["*", multiply], ["/", divide]],
         function (p) { var n = first(p); var f = second(p);
             bootstrap[n] = function (args) {
                 return n === "-" && args.length === 1
                     ? -1 * first(args)
                     : args.reduce(f); }; });

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

    function evaluateForm (env, form) { return bootstrap.eval(mkArray(form), env); }

    // DEBUG
    function pp (x) {
        if (isArray(x)) return "(" + x.map(pp).join(" ") + ")";
        return x && x.name || x; }

    teslo.evaluate = function (src, env) {
        var result = teslo.parse(src);
        if (result.success)
            return result.forms.map(function (arg) {
                var x = bootstrap["macro-expand"]([arg], env);
                return evaluateForm(env, x); });
        else
            throw new Error("Parse error: " + (result.message || "unknown error.")); };

})(typeof exports === "undefined" ? this["teslo"] = {} : exports,
   this.cromp || require("cromp"));
