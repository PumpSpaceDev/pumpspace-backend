export function customSerialize(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return { type: 'bigint', value: value.toString() };
    }
    if (value instanceof Date) {
      return { type: 'date', value: value.toISOString() };
    }
    return value;
  });
}
export function customDeserialize(json: string): any {
  return JSON.parse(json, (key, value) => {
    if (value && typeof value === 'object' && value.type) {
      if (value.type === 'bigint') {
        return BigInt(value.value);
      }
      if (value.type === 'date') {
        return new Date(value.value);
      }
    }
    return value;
  });
}
