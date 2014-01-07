(defvar teslo-keywords '("def" "defn" "defm" "deft"))

(defvar teslo-font-lock-defaults
  `(((,(regexp-opt teslo-keywords 'words) . font-lock-keyword-face))))

(define-derived-mode teslo-mode lisp-mode "teslo"
  "teslo mode is a major mode for editing teslo files"
  (setq font-lock-defaults teslo-font-lock-defaults))

(add-to-list 'auto-mode-alist '("\\.teslo\\'" . teslo-mode))

(provide 'teslo-mode)
