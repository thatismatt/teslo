(function (teslo) {

    function opString (op) {
        if (op[0] === "value") return "value " + teslo.pp(op[1]);
        return op[0] + " " + op[1];
    }

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

    var $ops = $("#ops");
    var $stack = $("#stack");

    function displayState (state) {
        $ops.empty();
        $stack.empty();
        state.ops.forEach(function (op) {
            $ops.append($("<div>")
                        .addClass("op")
                        .text(opString(op)));
        });
        state.stack.forEach(function (v) {
            $stack.append($("<div>")
                          .addClass("stack")
                          .text(teslo.pp(v) || "<undefined>"));
        });
    }

    var stepper = mkStepper(compilePrelude());
    $("#forward").click(function () {
        if (stepper.canStepForward()) {
            stepper.forward();
            displayState(stepper.current());
        }
        return false;
    });
    $("#backward").click(function () {
        if (stepper.canStepBackward()) {
            stepper.backward();
            displayState(stepper.current());
        }
        return false;
    });
    $("#play").click(function () {
        function playStep () {
            if (stepper.canStepForward()) {
                stepper.forward();
                displayState(stepper.current());
                setTimeout(playStep, 0);
            }
        }
        playStep();
        return false;
    });
    displayState(stepper.current());

    window.stepper = stepper;
    window.mkStepper = mkStepper;

})(this.teslo);
