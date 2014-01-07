(define-derived-mode teslo-mode lisp-mode "teslo")

(progn
  (add-to-list 'auto-mode-alist '("\\.teslo\\'" . teslo-mode)))
