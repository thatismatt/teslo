;;; teslo.el --- Major mode for teslo code

;; Copyright © 2014 Matt Lee
;;
;; Author: Matt Lee
;; Keywords: languages, lisp

;; This file is not part of GNU Emacs.

;;; Commentary:

;; Provides an editing mode for the teslo programming language.

;;; Code:

(defvar teslo-keywords '("def" "defn" "defm" "deft" "fn" "let" "do" "match"))

(defvar teslo-font-lock-defaults
  `(((,(regexp-opt teslo-keywords 'words) . font-lock-keyword-face)
     ("\\([A-Z][a-z]*\\)+" . font-lock-type-face)
     ("\\(:[a-z]+\\)+" . font-lock-preprocessor-face)
     ("(def[mn]? \\([a-zA-Z0-9+=_*\/?.:$<>-]+\\)"
      (1 font-lock-function-name-face)))))

(define-derived-mode teslo-mode lisp-mode "teslo"
  "teslo mode is a major mode for editing teslo files"
  (setq font-lock-defaults teslo-font-lock-defaults))

(add-to-list 'auto-mode-alist '("\\.teslo\\'" . teslo-mode))

(provide 'teslo-mode)
;;; teslo.el ends here
