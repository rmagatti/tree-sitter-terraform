[
  "module"
  "resource"
  "data"
  "locals"
  "variable"
] @keyword

(identifier) @property
(module_name) @definition

(member_expression) @field

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  (boolean)
  (null)
] @boolean


(resource (resource_type) @method)
(resource (resource_name) @parameter)

(data (data_type) @method)
(data (data_name) @parameter)

(module (module_name) @parameter)

(variable (variable_name) @parameter)
(variable (variable_block (description_identifier) @variable.builtin))
(variable (variable_block (description) @string))
(variable (variable_block (type (string_ty) @type.builtin)))
(variable (variable_block (type (object_ty) @type)))
(variable (variable_block (type (bool_ty) @type.builtin)))
(variable (variable_block (type (number_ty) @type.builtin)))
(variable (variable_block (default (identifier) @variable.builtin)))
(variable (variable_block (validation) @variable.builtin))
(variable (variable_block (validation (validation_block (attribute (identifier) @variable.builtin)))))
(variable (variable_block (type (object_ty (object_field (field_name) @field)))))
(variable (variable_block (type (object_ty (object_field (string_ty) @type)))))
(variable (variable_block (type (type_identifier) @variable.builtin)))

(string_literal) @string
(comment) @comment

((member) @field)
((nested_member) @field)


((number) @number)

(ERROR) @error

(locals (block (attribute (identifier) @definition.var)))
((builtin_object) @variable.builtin)

(attribute (function) @function.builtin)

; (value_or_query (function) @function)
; (keyValue (identifier) @field)
; (keyValue (identifier) @field)

(ternary ["?" ":"] @conditional)

[
"for"
] @repeat
