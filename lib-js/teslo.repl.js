(function (teslo) {
  teslo.repl = {
    source: [
"(defn x () 1)",
""
].join('\n'),
    ops: [
["value",{"name":"x","!meta":{"type":"Symbol"}}],
["value",[{"name":"fn","!meta":{"type":"Symbol"}},[],1]],
["lookup","def"],
["invoke",2]
]
  };
})(this.teslo || require('../'));