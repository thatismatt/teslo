# Features

 * Modularisation
   * Namespacing
   * Loading / Requiring
   * Private defs
   * Parameterised modules
 * Debugger
   * op code level - *DONE*
   * source level - *STARTED*
 * Dependent let bindings `(let (x 1 y x) ...)`
 * Variadic type constructors `(deft T (. xs))`
 * Type constraints in contructors `(deft List (h (t : List)))`
 * Defining/extending the application of a data type

    ```
    (defn apply ((s : String) (n : Number)) (nth s n)) ("asdf" 1) ;=> "a"
    ```

   * Keywords as member getters

    ```
    (deft A (x)) (def a (A "x")) (a :x) ;=> "x"
    ;; implementation:
    (defn apply ((A x) :x) x)
    ```

 * More read literals
   * Arrays - []
   * Maps - {}
   * Sets?
   * Regexs?
 * Interfaces / Type Classes / Type Groups
 * Repeated symbols in function params should match when arguments are equal

    ```
    (def f (x x) :equal
           (x y) :not-equal)
    ```

 * Function dispatch on predicate `(defn f ((s : String : (fn (x) (> (length x) 5)))) ...)`
 * Reader macros written in teslo
 * Metadata
   * Documentation `(doc f)`
   * Source code `(source f)`
 * Threads
 * Auto complete for web repl - *STARTED*
 * Function extension `(defn f () 0) (defnx f (x) 1)`

# Issues
 * Code organisation / build process
   * Split teslo.js
   * Automated build of teslo.js
 * Split prelude into:
   * core - required
   * prelude - optional but useful
 * Quoted macros are expanded `'(-> a b) ;=> (b a)`
 * Split `macro-expand` in to `macro-expand` and `macro-expand-all`
 * `def` overwriting
   * Builtins can be overwritten
   * defn doesn't overwrite overloads `(defn f () 0) (defn f () 1) (f) ;=> 0`
 * Variadic functions don't check arg count `(defn f (x . xs) x) (f) ;=> Error: 'x' not in scope.`
 * Change read to do one form at a time
 * No line numbers in errors
 * `def` isn't global `(def a 1) ((fn () (def a 2))) a ;=> 1`
 * Stack grows for every top level form
   * Because the result of all forms is added to stack
   * For top level forms should we throw away the stack?
 * Environment is mutable
 * Error message when braces unmatched is unclear

    ```
    teslo.read("(") ;=> Object { forms: undefined, success: false, message: "regex '/$/' failed to parse at 0" }`
    ```

# Comms

 * Example code on REPL & Debugger, click to eval
 * Add rationale / reasoning / comparison section to README

# Done

 * Separate read and eval
 * Constructor functions for some built in types:

    ```
    (Symbol "name")
    (Keyword "name")
    ```

 * Comments are "seen" by macros
 * Mention prelude in Readme, as an example of source code
 * Link to github repo in nav
 * Move tests to test.html
 * Add an intro (index.html)
 * Function matching on type, without destructuring:

    ```
    (deft A ()) (defn f ((a : A)) a) (f (A)) ;=> (A)
    ```

 * Expose the function's overloads for additions
 * Partial functions over a subset of a types contructors:

    ```
    (deft T (x) ())
    (defn f ((T)) 1 (x y) 2)
    (f (T 1)) ;=> 2
    (f 1 2 3) ;=> TypeError: Cannot read property 'length' of undefined
    ```

 * Nested pattern matching issues:

    ```
     (deft A (a)) (deft (B b)) (defn f ((A (B 1))) 1) (f (A (A 1))) ;=> 1
     (f (A 1))     ;=> TypeError: Cannot read property 'name' of undefined
    ```

 * Change types to be stored in a "registry"
   * registry stores id to type mappings
   * data types have the id
   * `type` looks up the id in the registry
 * JS Arrays are of type "List"
   * Rewrite parse tests to use helper functions to test type
 * Numbers & Strings are boxed
 * Correct Readme:
   * link to tests (now there are gh-pages)
   * how to test the repl (no npm step required or online)
 * Negative numbers
 * Escape characters in strings
