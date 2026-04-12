import type { ToolboxDefinition } from 'blockly/core/utils/toolbox'

export const BLOCKLY_TOOLBOX: ToolboxDefinition = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Entradas',
      colour: '#995ba5',
      contents: [
        {
          kind: 'block',
          type: 'text_prompt_ext',
          inputs: {
            TEXT: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'abc' },
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Salidas',
      colour: '#995ba5',
      contents: [
        {
          kind: 'block',
          type: 'text_print',
          inputs: {
            TEXT: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'abc' },
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Lógica',
      categorystyle: 'logic_category',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' },
        { kind: 'block', type: 'logic_null', enabled: false },
        { kind: 'block', type: 'logic_ternary' },
      ],
    },
    {
      kind: 'category',
      name: 'Ciclos',
      categorystyle: 'loop_category',
      contents: [
        {
          kind: 'block',
          type: 'controls_repeat_ext',
          inputs: {
            TIMES: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 10 },
              },
            },
          },
        },
        { kind: 'block', type: 'controls_repeat', enabled: false },
        { kind: 'block', type: 'controls_whileUntil' },
        {
          kind: 'block',
          type: 'controls_for',
          inputs: {
            FROM: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 1 },
              },
            },
            TO: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 10 },
              },
            },
            BY: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 1 },
              },
            },
          },
        },
        { kind: 'block', type: 'controls_forEach' },
        { kind: 'block', type: 'controls_flow_statements' },
      ],
    },
    {
      kind: 'category',
      name: 'Matemáticas',
      categorystyle: 'math_category',
      contents: [
        {
          kind: 'block',
          type: 'math_number',
          gap: 32,
          fields: { NUM: 123 },
        },
        {
          kind: 'block',
          type: 'math_arithmetic',
          inputs: {
            A: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 1 },
              },
            },
            B: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 1 },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'math_single',
          inputs: {
            NUM: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 9 },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'math_trig',
          inputs: {
            NUM: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 45 },
              },
            },
          },
        },
        { kind: 'block', type: 'math_constant' },
        {
          kind: 'block',
          type: 'math_number_property',
          inputs: {
            NUMBER_TO_CHECK: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 0 },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'math_round',
          inputs: {
            NUM: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 3.1 },
              },
            },
          },
        },
        { kind: 'block', type: 'math_on_list' },
        {
          kind: 'block',
          type: 'math_modulo',
          inputs: {
            DIVIDEND: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 64 },
              },
            },
            DIVISOR: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 10 },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'math_constrain',
          inputs: {
            VALUE: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 50 },
              },
            },
            LOW: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 1 },
              },
            },
            HIGH: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 100 },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'math_random_int',
          inputs: {
            FROM: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 1 },
              },
            },
            TO: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 100 },
              },
            },
          },
        },
        { kind: 'block', type: 'math_random_float' },
        {
          kind: 'block',
          type: 'math_atan2',
          inputs: {
            X: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 1 },
              },
            },
            Y: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 1 },
              },
            },
          },
        },
        { kind: 'block', type: 'convert_to_int' },
      ],
    },
    {
      kind: 'category',
      name: 'Texto',
      categorystyle: 'text_category',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_multiline' },
        { kind: 'block', type: 'text_join' },
        {
          kind: 'block',
          type: 'text_append',
          inputs: {
            TEXT: {
              shadow: {
                type: 'text',
                fields: { TEXT: '' },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'text_length',
          inputs: {
            VALUE: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'abc' },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'text_isEmpty',
          inputs: {
            VALUE: {
              shadow: {
                type: 'text',
                fields: { TEXT: '' },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'text_indexOf',
          inputs: {
            VALUE: {
              block: {
                type: 'variables_get',
                fields: { VAR: { name: 'text' } },
              },
            },
            FIND: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'abc' },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'text_charAt',
          inputs: {
            VALUE: {
              block: {
                type: 'variables_get',
                fields: { VAR: { name: 'text' } },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'text_getSubstring',
          inputs: {
            STRING: {
              block: {
                type: 'variables_get',
                fields: { VAR: { name: 'text' } },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'text_changeCase',
          inputs: {
            TEXT: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'abc' },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'text_trim',
          inputs: {
            TEXT: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'abc' },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'text_count',
          inputs: {
            SUB: {
              shadow: {
                type: 'text',
                fields: { TEXT: '' },
              },
            },
            TEXT: {
              shadow: {
                type: 'text',
                fields: { TEXT: '' },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'text_replace',
          inputs: {
            FROM: {
              shadow: {
                type: 'text',
                fields: { TEXT: '' },
              },
            },
            TO: {
              shadow: {
                type: 'text',
                fields: { TEXT: '' },
              },
            },
            TEXT: {
              shadow: {
                type: 'text',
                fields: { TEXT: '' },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'text_reverse',
          inputs: {
            TEXT: {
              shadow: {
                type: 'text',
                fields: { TEXT: '' },
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Listas',
      categorystyle: 'list_category',
      contents: [
        {
          kind: 'block',
          type: 'lists_create_with',
          extraState: { itemCount: 0 },
        },
        { kind: 'block', type: 'lists_create_with' },
        {
          kind: 'block',
          type: 'lists_repeat',
          inputs: {
            NUM: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 5 },
              },
            },
          },
        },
        { kind: 'block', type: 'lists_length' },
        { kind: 'block', type: 'lists_isEmpty' },
        {
          kind: 'block',
          type: 'lists_indexOf',
          inputs: {
            VALUE: {
              block: {
                type: 'variables_get',
                fields: { VAR: { name: 'list' } },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'lists_getIndex',
          inputs: {
            VALUE: {
              block: {
                type: 'variables_get',
                fields: { VAR: { name: 'list' } },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'lists_setIndex',
          inputs: {
            LIST: {
              block: {
                type: 'variables_get',
                fields: { VAR: { name: 'list' } },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'lists_getSublist',
          inputs: {
            LIST: {
              block: {
                type: 'variables_get',
                fields: { VAR: { name: 'list' } },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'lists_split',
          inputs: {
            DELIM: {
              shadow: {
                type: 'text',
                fields: { TEXT: ',' },
              },
            },
          },
        },
        { kind: 'block', type: 'lists_sort' },
        { kind: 'block', type: 'lists_reverse' },
      ],
    },
    { kind: 'sep' },
    {
      kind: 'category',
      name: 'Variables',
      categorystyle: 'variable_category',
      custom: 'VARIABLE',
    },
    {
      kind: 'category',
      name: 'Funciones',
      categorystyle: 'procedure_category',
      custom: 'PROCEDURE',
    },
  ],
}
