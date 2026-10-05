export const FieldTypes = [
  'string',
  'number',
  'boolean',
  'date',
  'enum',
  'array',
  'object',
];

interface BaseField<T> {
  name: string;
  type: (typeof FieldTypes)[number];
  required?: boolean;
  defaultValue?: T;
}

export interface EnumField extends BaseField<string> {
  enum: string[];
}

export type Field<T> = BaseField<T> | EnumField;
