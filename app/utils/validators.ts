import { z } from "zod";

export const UserSchema = z.object({
  username: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-_]+$/),
  password: z.string().min(6),
});

export const FILENAME_REGEX = /^[a-zA-Z0-9-_]+\.(gif|jpg|png|jpeg)$/;

export const MediaSchema = z.object({
  filename: z.string().regex(FILENAME_REGEX),
  labels: z.string().trim().optional(),
  altText: z.string().trim().optional(),
});
