(function (teslo, cromp) {

    // Utils
    function first (arr) { return arr[0]; }
    function second (arr) { return arr[1]; }
    function third (arr) { return arr[2]; }
    function last (arr) { return arr[arr.length - 1]; }
    function toArray (x) { return Array.prototype.slice.call(x, 0); }
    function isArray (x) { return Object.prototype.toString.call(x) === "[object Array]"; }
    function tail (arr) { return Array.prototype.slice.call(arr, 1); }
    function plus (a, b) { return a + b; }
    function each (arr, f) { for (var i = 0; i < arr.length; i++) { f(arr[i]); } }
    function reverseFind (arr, f) { var i = arr.length, r; while (!r && i--) { r = f(arr[i]); } return r; }
    function zip (as, bs) { return as.map(function(a, i) { return [a, bs[i]]; }); }
    function curry (f) { var args = tail(arguments);
                         return function () { return f.apply(null, args.concat(toArray(arguments))); }; }

    // AST
    function mkList (x) { var l = isArray(x) ? x :toArray(arguments); l.type = "list"; return l; }
    function mkSymbol (x) { return { name: x, type: "symbol" }; }
    function mkString (x) { return { value: x, type: "string" }; }
    function mkNumber (x) { return { value: x, type: "number" }; }
    function mkKeyword (x) { return { name: x, type: "keyword" }; };
    function mkFunction (lexEnv, args) {
        var lexFrames = tail(lexEnv.frames);
        return { params: first(args),
                 body: second(args),
                 type: "function",
                 invoke: function (env, args) {
                     // TODO: check this.params.length === args.params.length
                     each(lexFrames, function (f) { env.pushFrame(f); });
                     var frame = {};
                     env.pushFrame(frame);
                     each(zip(this.params, args), function(x) { frame[first(x).name] = second(x); });
                     var result = prelude.eval.invoke(env, this.body);
                     env.popFrame();
                     each(lexFrames, function () { env.popFrame(); });
                     return result; } }; };

    // Parser
    var open = cromp.character("(");
    var close = cromp.character(")");
    var symbol = cromp.regex(/[a-zA-Z0-9+=\-*?]+/).map(first).map(mkSymbol);
    var whitespace = cromp.regex(/\s+/);
    var optionalWhitespace = cromp.optional(whitespace);
    var eof = cromp.regex(/$/);
    var number = cromp.regex(/[0-9]+/).map(first)
            .map(function (x) { return mkNumber(parseInt(x, 10)); });
    var string = cromp.between(
        cromp.character('"'),
        cromp.character('"'),
        cromp.regex(/[^"]+/).map(first))
            .map(mkString);
    var keyword = cromp.seq(cromp.character(":"), cromp.regex(/[a-z]+/))
            .map(second).map(mkKeyword);
    var list = cromp.recursive(function () {
        return cromp.between(open, close, cromp.optional(forms))
            .map(mkList); });
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
                 success: a.success }; };

    // prelude
    var prelude = {
        "def": {
            invoke: function (env, args) {
                // Q: if symbol is not a symbol, should we eval it? to support (def (symbol "a") 1)
                var symbol = first(args);
                var val = prelude.eval.invoke(env, second(args));
                env.def(symbol.name, val);
            } },
        "eval": {
            invoke: function (env, x) {
                if (x.type === "list") {
                    // TODO: (eval ()) ?
                    var fn = prelude.eval.invoke(env, first(x));
                    return fn.invoke(env, tail(x));
                } else if (x.type === "symbol") {
                    var v = env.lookup(x.name);
                    if (!v) throw new Error("'" + x.name + "' not in scope.");
                    return v;
                } else {
                    return x;
                }
            } },
        "+": { invoke: function (env, args) { return mkNumber(
            args.map(function (x) { return prelude.eval.invoke(env, x).value; })
                .reduce(plus)); } },
        "quote": { invoke: function (env, form) { return first(form); } },
        "fn": { invoke: mkFunction },
        "let": { invoke: function (env, args) {
            // TODO: verify 2 args
            // TODO: verify even number of binding forms
            var bindings = first(args);
            var body = second(args);
            var frame = {};
            for (var i = 0; i < bindings.length; i += 2) { frame[bindings[i].name] = bindings[i + 1]; }
            env.pushFrame(frame);
            var result = prelude.eval.invoke(env, body);
            env.popFrame();
            return result; } }
        // TODO: atom, =, cons, head, tail, cond, defn, ns, -, *, /
        // TODO: "interop"/"introspection" - type, name, vars, lookup
    };

    // Evaluation
    function Environment (frame) { this.frames = frame ? [frame] : []; }
    Environment.prototype.lookup = function (n) { return reverseFind(this.frames, function(f) { return f[n]; }); };
    Environment.prototype.pushFrame = function (frame) { this.frames.push(frame || {}); };
    Environment.prototype.popFrame = function () { this.frames.pop(); };
    Environment.prototype.def = function (n, v) { first(this.frames)[n] = v; };

    teslo.environment = function () {
        var globals = {};
        for (var n in prelude) { globals[n] = prelude[n]; }
        return new Environment(globals); };

    teslo.evaluate = function (src, env) {
        var result = teslo.parse(src);
        if (result.success) {
            return result.forms.map(curry(prelude.eval.invoke, env));
        } else {
            throw new Error(result.message);
        } };

})(typeof exports === "undefined" ? this["teslo"] = {} : exports,
   this.cromp || require("cromp"));
