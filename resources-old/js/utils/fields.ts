import { EnumField, Field } from "@/types/field";

async function decodeFieldValue<T>(
  field: Field<T>,
  rawValue: unknown,
): Promise<T | undefined> {
  if (rawValue === undefined) rawValue = null;

  if (rawValue === null) {
    if (field.defaultValue !== undefined) return field.defaultValue as T;

    if (field.required) throw new Error(`Field ${field.name} is required`);

    return undefined;
  }

  switch (field.type) {
    case 'string':
      if (typeof rawValue !== 'string')
        throw new Error(`Invalid value ${rawValue} for ${field.name}: expected string`);

      return rawValue as T;

    case 'boolean':
      if (rawValue === null) rawValue = false;

      if (typeof rawValue !== 'boolean')
        throw new Error(`Invalid value ${rawValue} for ${field.name}: expected boolean`);

      return rawValue as T;

    case 'enum': {
      const enumField = field as EnumField;

      if (!enumField.enum) throw new Error(`Field ${field.name} is not defined as enum`);

      if (typeof rawValue !== 'string')
        throw new Error(`Invalid value ${rawValue} for ${field.name}: expected enum string`);

      if (!enumField.enum.includes(rawValue))
        throw new Error(
          `Invalid value ${rawValue} for ${field.name}: expected one of ${enumField.enum.join(', ')}`
        );

      return rawValue as T;
    }

    case 'number': {
      if (typeof rawValue === 'string') rawValue = parseFloat(rawValue);

      if (typeof rawValue !== 'number')
        throw new Error(`Invalid value ${rawValue} for ${field.name}: expected number`);

      return rawValue as T;
    }

    case 'date': {
      if (typeof rawValue !== 'string')
        throw new Error(`Invalid value ${rawValue} for ${field.name}: expected date string`);

      const date = new Date(rawValue);
      if (isNaN(date.getTime())) throw new Error(`Invalid date format for ${field.name}`);

      return date as T;
    }

    case 'array': {
      if (!Array.isArray(rawValue))
        throw new Error(`Invalid value ${rawValue} for ${field.name}: expected array`);

      return rawValue as T;
    }

    case 'object': {
      if (typeof rawValue !== 'object' || rawValue === null || Array.isArray(rawValue))
        throw new Error(`Invalid value ${rawValue} for ${field.name}: expected object`);

      return rawValue as T;
    }

    default:
      throw new Error(`Unknown field type: ${field.type}`);
  }
}

export async function decodeField<T>(
  fieldConf: Field<T>,
  rawData: Record<string, unknown>,
) {
  const rawValue = (rawData as Record<string, unknown>)[fieldConf.name];
  return await decodeFieldValue(fieldConf, rawValue);
}
