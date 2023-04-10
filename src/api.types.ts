import { Static, Type, TSchema } from '@sinclair/typebox';
import { FILENAME_REGEX } from './file-storage';

export const Nullable = <T extends TSchema>(schema: T) =>
  Type.Union([schema, Type.Null()]);

export const Asset = Type.Object(
  {
    id: Type.Number(),
    url: Type.String({ format: 'uri' }),
    comment: Type.Optional(Nullable(Type.String())),
    alt: Type.Optional(Nullable(Type.String())),
    createdAt: Type.Date(),
    updatedAt: Type.Date(),
    width: Type.Optional(Nullable(Type.Number())),
    height: Type.Optional(Nullable(Type.Number())),
    color: Type.Optional(Nullable(Type.String())),
  },
  { additionalProperties: false }
);
export type AssetType = Static<typeof Asset>;

export const AssetUpdate = Type.Object(
  {
    url: Type.Optional(Type.String({ format: 'uri' })),
    comment: Type.Optional(Nullable(Type.String())),
    alt: Type.Optional(Nullable(Type.String())),
    width: Type.Optional(Nullable(Type.Number())),
    height: Type.Optional(Nullable(Type.Number())),
    color: Type.Optional(Nullable(Type.String())),
  },
  { additionalProperties: false }
);
export type AssetUpdateType = Static<typeof AssetUpdate>;

export const UpdateParams = Type.Object({ id: Type.Number() });
export type UpdateParamsType = Static<typeof UpdateParams>;

export const AssetCreate = Type.Pick(Asset, [
  'url',
  'comment',
  'alt',
  'width',
  'height',
  'color',
]);
export type AssetCreateType = Static<typeof AssetCreate>;

export const AssetSearch = Type.Object({
  search: Type.Optional(Type.String()),
});
export type AssetSearchType = Static<typeof AssetSearch>;

export const Upload = Type.Object(
  {
    url: Type.String({ format: 'uri' }),
    filename: Type.RegEx(FILENAME_REGEX),
  },
  { additionalProperties: false }
);
export type UploadType = Static<typeof Upload>;

export const UploadResponse = Type.Object({
  url: Type.String({ format: 'uri' }),
  etag: Type.String(),
});
export type UploadResponseType = Static<typeof UploadResponse>;

export const User = Type.Object(
  {
    account: Type.String(),
    createdAt: Type.Date(),
  },
  { additionalProperties: false }
);
export type UserType = Static<typeof User>;

export const Login = Type.Object(
  {
    account: Type.String(),
  },
  { additionalProperties: false }
);
export type LoginType = Static<typeof Login>;
