import { Static, Type, TSchema } from '@sinclair/typebox';

export const Nullable = <T extends TSchema>(schema: T) =>
  Type.Union([schema, Type.Null()]);

export const Asset = Type.Object({
  id: Type.Number(),
  url: Type.String({ format: 'url' }),
  comment: Type.Optional(Nullable(Type.String())),
  createdAt: Type.Date(),
  updatedAt: Type.Date(),
});

export const AssetCreate = Type.Pick(Asset, ['url', 'comment']);

export type AssetCreateType = Static<typeof AssetCreate>;
export type AssetType = Static<typeof Asset>;
