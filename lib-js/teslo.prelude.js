(function (teslo) { teslo.prelude = "(def defm (macro (name signature body) `(def ~name (macro ~signature ~body))))\n\n(defm defn (name . signatures) `(def ~name (fn ~@signatures)))\n\n(defm deft (tname . params) `(def ~tname (create-type (name '~tname) ~@params)))\n\n(defn identity (x) x)\n\n(defn string ((k : Keyword)) (+ \":\" (name k))\n             ((s : Symbol))  (name s)\n             ((s : String))  (+ double-quote-string* s double-quote-string*)\n             ((n : Number))  (+ n \"\")\n             ((a : Array))   (sequence-string* a)\n             ((l : List))    (sequence-string* l)\n             (x) (string* x))\n;            ((a : Array))   (+ \"(\" (join (map string a) \" \") \")\")\n;            ((l : List))    (+ \"(\" (join (map string l) \" \") \")\"))\n\n(defn print (x) (log* (string x)))\n\n\n;; Lists\n\n(deft List ()\n           (head tail))\n\n(def nil (List))\n\n\n;; Sequences\n\n(defn first ((a : Array)) (array-first* a)\n            ((List h t)) h)\n(defn rest ((a : Array)) (array-rest* a)\n           ((List h t)) t\n           ((List)) nil)\n"; })(this.teslo || require('../'));