(function (teslo) {

    function compile (form, env) {
        return teslo.compile(teslo.macroExpand([form], env), []); }

    function step (state) {
        return teslo.step(state.ops, state.stack, state.env); }

    function stepper (state) {
        return function () {
            state = step(state);
            displayState(state);
        };
    }

    function p (op) {
        if (op[0] === "value") console.log("value", teslo.pp(op[1]));
        else if (op[0] === "invoke") console.log("invoke", op[1], teslo.pp(op[2]));
        else console.log(op[0], op[1]);
    }

    function opString (op) {
        if (op[0] === "value") return "value " + teslo.pp(op[1]);
        return op[0] + " " + op[1];
    }

    function mkStepper (src) {
        var env = teslo.environment();
        teslo.evaluate(teslo.prelude, env);
        var form = teslo.parse(src).forms[0];
        var ops = compile(form, env);
        console.log(ops);
        var state = { ops: ops, stack: [], env: env };
        return stepper(state); }

    function compilePrelude () {
        var env = teslo.environment();
        var forms = teslo.parse(teslo.prelude).forms;
        var prelude_ops = forms.map(
            function (form) {
                var expandedForm = teslo.macroExpand([form], env);
                var ops = teslo.compile(expandedForm, []);
                teslo.run(ops, env); // run the compiled code, to update env with any macro expansion time dependencies
                return ops;
            });
        return Array.prototype.concat.apply([], prelude_ops);
    }

    function test () {
        //teslo.evaluate(teslo.prelude, env);
        var stepper = mkStepper("(do (log* 1) (log* 2) (log* 3) (log* 4))");
        return stepper;
    }

    function mkPreludeStepper () {
        var states = [{ ops: compilePrelude(),
                        stack: [],
                        env: teslo.environment() }];
        displayState(states[0]);
        var i = -1;
        return {
            f: function () {
                i++;
                var state = states[i];
                states[i+1] = teslo.step(state.ops, state.stack, state.env);
                console.log(i+1);
                displayState(states[i+1]);
            },
            b: function () {
                i--;
                var state = states[i];
                //state = teslo.step(state.ops, state.stack, state.env);
                console.log(i);
                displayState(state);
            },
            canStepForward: function () { return states[i+1].ops.length > 0; },
            canStepBackward: function () { return i > 1; }
        };
    }

    var $ops = $("#ops");
    var $stack = $("#stack");

    function displayState (state) {
        console.log(state);
        $ops.empty();
        $stack.empty();
        state.ops.forEach(function (op) {
            $ops.append($("<div>")
                        .css("border", "red solid 1px")
                        .text(opString(op)));
        });
        state.stack.forEach(function (v) {
            $stack.append($("<div>")
                          .css("border", "blue solid 1px")
                          .text(teslo.pp(v) || "×"));
        });
    }

    var s = mkPreludeStepper();
    $("#forward").click(function () {
        if (s.canStepForward()) s.f();
        return false;
    });
    $("#backward").click(function () {
        if (s.canStepBackward()) s.b();
        return false;
    });

//    var $out = $("#out");
//
//    function print (result, cssClass, prefix) {
//        $out.append($("<div>")
//                    .addClass(cssClass)
//                    .text((prefix || "") + result)); }

    window.test = test;
    window.mkStepper = mkStepper;
    window.mkPreludeStepper = mkPreludeStepper;

})(this.teslo);
