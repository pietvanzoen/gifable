import { json } from "@remix-run/node";

export type FormErrorResponse = {
  repopulateFields?: { [key: string]: string };
  formError?: string;
};

export const badRequest = <T>(data: T) => json<T>(data, { status: 400 });

export const notFound = <T>(data: T) => json<T>(data, { status: 404 });

export const serverError = <T>(data: T) => json<T>(data, { status: 500 });

export const payloadTooLarge = <T>(data: T) => json<T>(data, { status: 413 });

export const unauthorized = <T>(data: T) => json<T>(data, { status: 401 });

export const forbidden = <T>(data: T) => json<T>(data, { status: 403 });

export const conflict = <T>(data: T) => json<T>(data, { status: 409 });

export const tooManyRequests = <T>(data: T) => json<T>(data, { status: 429 });
