import { TransformFnParams } from 'class-transformer';
import { Types } from 'mongoose';

function stringifyObjectId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Types.ObjectId) {
    return value.toHexString();
  }

  throw new TypeError('Expected a MongoDB ObjectId or string');
}

export function objectIdToString({
  value,
}: TransformFnParams): string | undefined {
  return value == null ? undefined : stringifyObjectId(value);
}

export function objectIdsToStrings({ value }: TransformFnParams): string[] {
  return Array.isArray(value)
    ? value.map((objectId: unknown) => stringifyObjectId(objectId))
    : [];
}

export function nullableObjectIdsToStrings({
  value,
}: TransformFnParams): Array<string | null> {
  return Array.isArray(value)
    ? value.map((objectId: unknown) =>
        objectId == null ? null : stringifyObjectId(objectId),
      )
    : [];
}
