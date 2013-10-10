# teslo

Teslo is:
 * a functional language
 * a Lisp dialect
 * an interpreted language
 * written in JavaScript, that runs on Node.js and in the browser

## Features

Teslo has:
 * macros - read and run time
 * first class functions
 * data types - with overloading on constructor argument count
 * pattern matching
 * argument destructuring - in function arguments, let bindings, and match expressions
 * repl
 * function overloading on argument count and type
 * variadic functions
 * lexical scoping & closures

## Tell me more

Well... teslo is very early on in its development, to see example code the best place to look is the test suite, you can [see them run in the browser](http://thatismatt.github.com/teslo) or [see their source](https://github.com/thatismatt/teslo/blob/master/test/teslo.evaluate.tests.js).

Or, if you're really brave (and have Node.js installed) you code try out the repl.

    git clone https://github.com/thatismatt/teslo.git
    cd teslo
    npm install
    node repl.js
