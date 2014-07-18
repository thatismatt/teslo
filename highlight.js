(function (teslo) {
    var code = [
        "(defn f () (+ (g) (h)))",
        "(defn g () (identity 1))",
        "(defn h () (identity 2))",
        "(f)"
    ].join("\n");

    var env = teslo.environment();
    teslo.evaluate(teslo.prelude, env);

    var ast = teslo.read(code).forms;
    var ops;
    for (var i = 0; i < ast.length; i++) {
        var mx = teslo.macroExpand([ast[i]], env);
        ops = teslo.compile(mx, []);
        teslo.run(ops, env);
    }

    function mkStepper (ops, env) {
        var states = [{ ops: ops,
                        stack: [],
                        env: env || teslo.environment() }];
        var i = 0;
        return {
            current: function () { return states[i]; },
            forward: function () {
                var state = states[i];
                i++;
                states[i] = teslo.step(state.ops, state.stack, state.env);
            },
            backward: function () {
                i--;
                var state = states[i];
            },
            canStepForward: function () { return states[i].ops.length > 0; },
            canStepBackward: function () { return i > 0; },
            states: function () { return states; }
        };
    }

    // TODO: factor out from teslo - teslo.utils?
    function getMeta (o, k) { return (o["!meta"] || {})[k]; }
    function jsType (x) { return /\[object (\w*)\]/.exec(Object.prototype.toString.call(x))[1]; }
    function getType (x) { return getMeta(x, "type") || jsType(x); }
    function isOfType (t) { return function (x) { return x && getType(x) === t; }; }
    function isJsFunction (x) { return jsType(x) === "Function"; }
    var isList = isOfType("List");
    var isArray = isOfType("Array");
    var isSymbol = isOfType("Symbol");
    var isKeyword = isOfType("Keyword");
    var isFunction = isOfType("Function");
    var isType = isOfType("Type");
    function isSequence (x) { return isList(x) || isArray(x); }

    function walk (f, ast) {
        if (!isArray(ast)) return;
        f.pre(ast);
        for (var i = 0; i < ast.length; i++) {
            walk(f, ast[i]);
        }
        f.post(ast);
    }

    var $code = $("#code");
    var $env = $("#env");

    function highlight (high, id) {
        return function () {
            $("#" + id)[high ? "addClass" : "removeClass"]("highlight");
        };
    }

    function gen_id (form) {
        var start = getMeta(form, "start");
        var end = getMeta(form, "end");
        return "form-" + start + "-" + end;
    }

    function update () {
        $code.empty();
        var html = "";
        var index = 0;
        walk({
            pre: function (form) {
                if (!form["!meta"]) return;
                var start = getMeta(form, "start");
                var end = getMeta(form, "end");
                var pre = code.substring(index, start);
                html += pre + "<span id='" + gen_id(form) + "'>";
                index = start;
            },
            post: function (form) {
                if (!form["!meta"]) return;
                var start = getMeta(form, "start");
                var end = getMeta(form, "end");
                var pre = code.substring(index, end);
                html += pre + "</span>";
                index = end;
            }
        }, ast);
        $code.html(html);

        // TODO: distinguish builtins / prelude and user's defs
        // - ["!meta"].filename ?
        // - env.currentFrame() ?
        // env.defs().sort()
        ["f", "g", "h"]
            .map(function (n) {
                var form = env.lookup(n).overloads[0][0].body;
                $env.append(
                    $("<div>").addClass("var")
                        .append($("<span>").text(n))
                        .hover(highlight(true, gen_id(form)), highlight(false, gen_id(form)))
                );
            });
    }

    update();

    var stepper = mkStepper(ops, env);

    var unhighight;
    function step () {
        if (unhighight) unhighight();
        unhighight = null;
        stepper.forward();
        var state = stepper.current();
        var f = state.stack[0];
        if (isFunction(f) && f.overloads && f.overloads[0]) {
            var form = f.overloads[0][0].body;
            highlight(true, gen_id(form))();
            unhighight = highlight(false, gen_id(form));
        }
    }

    window.step = step;

})(this.teslo);
