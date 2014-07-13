(function (teslo) {

    function opString (op) {
        if (op[0] === "value") return "value " + teslo.pp(op[1]);
        if (op[0] === "env") return "env";
        return op[0] + " " + op[1];
    }

    function compileSource (source, env) {
        var forms = teslo.read(source).forms;
        var all_ops = forms.map(
            function (form) {
                var expandedForm = teslo.macroExpand([form], env);
                var ops = teslo.compile(expandedForm, []);
                teslo.run(ops, env); // run the compiled code, to update env with any macro expansion time dependencies
                return ops;
            });
        return Array.prototype.concat.apply([], all_ops);
    }

    function mkStepper (source, env) {
        var ops = compileSource(source, env);
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

    function mkUI (s) {

        var $ops = $("#ops");
        var $stack = $("#stack");
        var $forward = $("#forward");
        var $backward = $("#backward");
        var stepper = s;

        function displayState () {
            var state = stepper.current();
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
                              .text(teslo.pp(v) || "×"));
            });
            $forward.attr("disabled", !stepper.canStepForward());
            $backward.attr("disabled", !stepper.canStepBackward());
        }

        $forward.click(function () {
            stepper.forward();
            displayState();
            return false;
        });
        $backward.click(function () {
            stepper.backward();
            displayState();
            return false;
        });
        $("#play").click(function () {
            function playStep () {
                if (stepper.canStepForward()) {
                    stepper.forward();
                    displayState();
                    setTimeout(playStep, 0);
                }
            }
            playStep();
            return false;
        });
        displayState();

        return {
            stepper: function (s) {
                if (!s) return stepper;
                stepper = s;
                displayState();
            }
        };
    };

    (function () {
        var ui = mkUI(mkStepper(teslo.prelude, teslo.environment()));

        window.ui = ui;
        window.go = function (source) {
            var stepper = ui.stepper();
            stepper = mkStepper(source || "(identity (identity 1))", stepper.current().env);
            ui.stepper(stepper);
        };
    })();

})(this.teslo);
