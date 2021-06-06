const PREC = {
  COMMA: -1,
  ASSIGN: 0,
  COMMENT: 1,
  VAR: 2,
  multiplicative: 6,
  additive: 5,
  comparative: 4,
  and: 2,
  or: 1,
};

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function maybeCommaSep(rule) {
  return repeat(seq(rule, optional(',')))
}

function constructedType(name, rule) {
  return seq(name, "(", rule, ")")
}

const grammarObject = {
  name: 'terraform',

  extras: $ => [
    $.comment,
    /[\s\uFEFF\u2060\u200B\u00A0]/,
  ],

  rules: {
    configuration: $ => repeat(choice(
      $.data,
      $.locals,
      $.module,
      $.output,
      $.provider,
      $.resource,
      $.terraform,
      $.variable,
    )),

    terraform: $ => seq(
      'terraform',
      $.block,
    ),

    variable: $ => seq(
      'variable',
      alias($.string_literal, $.variable_name),
      $.variable_block,
    ),

    variable_block: $ => seq('{',
      repeat($._typeOrDescriptionOrDefault),
    '}'),

    _typeOrDescriptionOrDefault: $ => choice(
      $.type,
      $._description,
      $.default,
      $.validation
    ),

    validation: $ => seq('validation', $.validation_block),

    validation_block: $ => seq('{', repeat($.attribute), '}'),

    _description: $ => seq(alias("description", $.description_identifier), "=", alias($.string_literal, $.description)),

    default: $ => seq(alias("default", $.identifier), "=", choice($._literalValue, $.string_literal, $.default_block)),

    default_block: $ => seq('{', repeat(seq($.identifier, '=', $._literalValue)), '}'),

    type: $ => seq(alias("type", $.type_identifier), "=", $._types),

    _types: $ => choice(
      $.list_ty,
      $.map_ty,
      $.object_ty,
      $.set_ty,
      $.tuple_ty,
      alias("bool", $.bool_ty),
      alias("number", $.number_ty),
      alias("string", $.string_ty),
    ),

    list_ty: $ => constructedType("list", $._types),
    set_ty: $ => constructedType("set", $._types),
    map_ty: $ => constructedType("map", $._types),
    object_ty: $ => seq( 'object',
      '(',
      '{',
        maybeCommaSep($.object_field),
      '}',
      ')'
    ),
    object_field: $ => seq(alias($.identifier, $.field_name), "=", $._types),
    tuple_ty: $ => seq('tuple', '(', '[', commaSep($._types), ']', ')'),


    provider: $ => seq('provider', alias($.string_literal, $.provider_name), $.block),

    output: $ => seq('output', alias($.string_literal, $.output_name), $.block),

    module: $ => seq('module', alias($.string_literal, $.module_name), $.block),

    resource: $ => seq(
      'resource',
      alias($.string_literal, $.resource_type),
      choice(
        alias($.string_literal, $.resource_name),
        $.query,
      ),
      $.block,
    ),

    query: $ => token(seq("$(", /[^)]+/, ")")),

    data: $ => seq(
      'data',
      alias($.string_literal, $.data_type),
      alias($.string_literal, $.data_name),
      $.block,
    ),

    locals: $ => seq(
      'locals',
      $.block,
    ),

    attribute: $ => choice(
      prec.right(PREC.ASSIGN, seq($.identifier, $._initializer)),
      $.named_map,
    ),

    _expression: $ => choice(
      $._expressionTerm,
      $._operation,
      $.interpolation_string,
    ),

    _expressionTerm: $ => choice(
      $._literalValue,
      $.string_literal,
      $.list,
      $.map,
      $.reference,
      $.reference_bracketed,
      $.function,
    ),

    _literalValue: $ => choice(
      $.number,
      $.boolean,
      alias("null", $.null),
    ),

    map: $ => seq("{", maybeCommaSep($.keyValue), "}"),

    value_or_query: $ => choice($._expression, $.query),

    keyValue: $ => seq($._stringLike, "=", $.value_or_query),

    _stringLike: $ => choice($.identifier, $.string_literal),

    _operation: $ => choice(
      $._unary,
      $._binary,
      $.ternary,
    ),

    ternary: $ => prec.left(seq(alias($._expression, $.comparison), "?", $._expression, ":", $._expression)),

    _unary: $ => prec(3, choice(
      seq("-", $._expressionTerm),
      seq("+", $._expressionTerm),
    )),

    _binary: $ => {
      const multiplicative = [
        alias("*", $.multiplication),
        alias("/", $.division)
      ]

      const additive = [
        alias("+", $.addition),
        alias("-", $.substraction)
      ]

      const comparative = [
        alias("==", $.eq),
        alias(">", $.gt),
        alias(">=", $.gt_eq),
        alias("<", $.lt),
        alias("<=", $.lt_eq),
      ]

      const table = [
        [PREC.multiplicative, choice(...multiplicative)],
        [PREC.additive, choice(...additive)],
        [PREC.comparative, choice(...comparative)],
        [PREC.and, "&&"],
        [PREC.or, "||"],
        [0, "!"],
      ]

      return choice(...table.map(([precedence, operator]) =>
        prec.left(precedence, seq( $._expression, operator, $._expression)
      )))
    },

    function: $ => seq(choice(
      "merge",
      "length",
      "file",
      "md5",
      "replace",
      "toset",
      "concat",
    ),
    "(", repeat(seq(alias($._expression, $.fn_param), optional(','))), ")"),

    _initializer: $ => seq(
      '=',
      choice(
        $.query,
        $._expression,
      ),
    ),

    named_map: $ => seq(
      $.identifier,
      optional($.string_literal),
      alias($.block, $.map),
    ),

    list: $ => seq(
      '[',
      optional($.for_comprehension),
      commaSep($._expression),
      optional(','),
      ']',
    ),

    for_comprehension: $ => seq("for", $.identifier, "in", choice($.reference, $.reference_bracketed), ":"),

    identifier: ($) => {
      const alpha = /[a-zA-Z_]+/;
      const alphaNumeric = /[a-zA-Z0-9-_]+/;

      return token(seq(alpha, repeat(alphaNumeric)));
    },

    builtin_object: $ => {
      return choice('var', 'data', 'module', 'local');
    },

    member: $ => {
      const alphaNumeric = /[a-zA-Z0-9-_]+/;
      return token(repeat(alphaNumeric));
    },

    nested_member: $ => {
      const alphaNumeric = /[a-zA-Z0-9-_\.]+/;
      return token(repeat(alphaNumeric));
    },

    member_expression: $ => {
      const alphaNumeric = /[a-zA-Z0-9-_]+/;

      return seq(
        field('object', choice($.builtin_object, alphaNumeric)),
        '.',
        field('property', choice($.member, $.nested_member))
      )
    },

    raw_reference: $ => {
      const alpha = /[a-zA-Z]/;
      const alphaNumeric = /[a-zA-Z0-9-_\.]+/;

      return token(seq(alpha, repeat(alphaNumeric)));
    },

    reference: $ => {
      return choice($.member_expression);
    },

    reference_bracketed: $ => {
      const alpha = /[a-zA-Z]/;
      const alphaNumeric = /[a-zA-Z0-9-_\.]+/;
      const bracketed = seq("[", alphaNumeric, "]")

      return token(seq(alpha, repeat(choice(bracketed))));
    },

    comment: $ => token(prec(PREC.COMMENT, choice(
      seq('#', /.*/),
      seq('//', /.*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      ),
    ))),


    block: $ => seq(
      '{',
      repeat($.attribute),
      '}',
    ),

    boolean: $ => choice('true', 'false'),

    number: $ => {
      const decimalDigits = /\d+/;
      const hexLiteral = seq('0x', /[\da-fA-F]+/);

      const decimalIntegerLiteral = choice(
        '0',
        seq(optional('-'), optional('0'), /[1-9]/, optional(decimalDigits)),
      );

      const signedInteger = seq(
        optional(choice('-', '+')),
        decimalDigits,
      );

      const exponentPart = seq(choice('e', 'E'), signedInteger);

      const decimalLiteral = choice(
        seq(decimalIntegerLiteral, '.', optional(decimalDigits), optional(exponentPart)),
        seq('.', decimalDigits, optional(exponentPart)),
        seq(decimalIntegerLiteral, optional(exponentPart)),
      );
      return token(choice(
        decimalLiteral,
        hexLiteral,
      ));
    },

    interpolation_string: $ => seq(
      '"',
      repeat(choice(
        $._template_chars,
        $.interpolation_substitution,
      )),
      '"',
    ),

    interpolation_substitution: $ => seq(
      '${',
      $._expressions,
      '}',
    ),

    _expressions: $ => choice(
      $._expression,
      $.sequence_expression,
    ),

    _template_chars: $ => token(choice(repeat1(choice(
      /[^\\"$]/,
      /\$[^{"$]/,
      /\\(.|\n)/,
    )))),

    sequence_expression: $ => prec(PREC.COMMA, seq(
      $._expression,
      ',',
      choice(
        $.sequence_expression,
        $._expression,
      ),
    )),

    string_literal: $ => token(
      seq(
        '"',
        repeat(/[^"]|(\\\")/),
        '"'
      )),
  },

};

module.exports = grammar(grammarObject);
