import { z } from "zod";

export const UserSchema = z.object({
  username: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-_]+$/),
  password: z.string().min(6),
});
