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
 * repl - with tab completion
 * function overloading on argument count and type
 * variadic functions
 * lexical scoping & closures

## Tell me more

Well... teslo is very early on in its development, so there isn't much more!

### Tests

For example code the best place to look is the test suite, [view the source](https://github.com/thatismatt/teslo/blob/master/test/teslo.evaluate.tests.js) or [run them online](http://thatismatt.github.io/teslo/).

### REPL

There's a web REPL at http://thatismatt.github.io/teslo/repl.html .

Or, if you're feeling brave (and have Node.js installed) you code try out the node REPL:

    git clone https://github.com/thatismatt/teslo.git
    cd teslo
    npm install
    node repl.js

## License

(The MIT License)

Copyright (c) 2013 Matt Lee

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
