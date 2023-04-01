import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import createHttpError, { HttpError } from 'http-errors';

type ErrorHandler = (error: PrismaClientKnownRequestError) => HttpError;
const errorHandlers: { [code: string]: ErrorHandler } = {
  P2025: () => createHttpError.NotFound('Resource not found'),
  P2002: (error) =>
    createHttpError.Conflict(
      `Unique constraint failed on field ${error.meta?.target}`
    ),
};

export function errorHandler(
  originalError: FastifyError | PrismaClientKnownRequestError | HttpError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  let parsedError: HttpError | null = null;

  if (originalError instanceof PrismaClientKnownRequestError) {
    const handler = errorHandlers[originalError.code];

    parsedError = handler
      ? handler(originalError)
      : createHttpError(500, 'Something went wrong', { error: originalError });
  }

  reply.send(parsedError || originalError);
}
