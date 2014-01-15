# Features

 * Modularisation
   * Namespacing
   * Loading / Requiring
   * Private defs
   * Parameterised modules
 * Debugger
 * Dependent let bindings:

    ```
    (let (x 1 y x) ...)
    ```

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
 * Constructor functions for some built in types:

    ```
    (Symbol "name")
    (Keyword "name")
    ```

 * Interfaces / Type Classes / Type Groups
 * Reader macros written in teslo
 * Metadata
   * Documentation
 * Threads

# Issues

 * Comments are "seen" by macros
 * `def` overwriting
   * Builtins can be overwritten
   * defn doesn't overwrite overloads

    ```
    (defn f () 0) (defn f () 1) (f) ;=> 0
    ```

 * Macros don't check arg count

    ```
    (deft) ;=> Error: 'tname' not in scope.
    ```

 * Separate read and eval
 * Change read/parse to do one form at a time
 * No line numbers in errors
 * `def` isn't global

    ```
    (def a 1) ((fn () (def a 2))) a ;=> 1
    ```

# Comms

 * Link to github repo in nav
 * Mention prelude in readme
 * Example code on repl.html, click to eval

# Done

 * Move tests to test.html
 * Add an intro (index.html)
 * Function matching on type, without destructuring:

    ```
    (deft A ()) (defn f ((a : A)) a) (f (A)) ;=> (A)
    ```

 * "Extending" functions, e.g.:

    ```
    (defn f () 0)
    (defn f (x) 1)
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
