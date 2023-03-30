import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import createHttpError, { HttpError } from 'http-errors';

type ErrorHandler = (error: FastifyError) => HttpError;
const errorHandlers: { [code: string]: ErrorHandler } = {
  P2025: () => createHttpError.NotFound('Resource not found'),
};

export function errorHandler(
  originalError: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  let parsedError: HttpError | null = null;

  if (originalError.constructor.name.startsWith('Prisma')) {
    const handler = errorHandlers[originalError.code];

    parsedError = handler
      ? handler(originalError)
      : createHttpError(500, 'Something went wrong', { error: originalError });
  }

  reply.send(parsedError || originalError);
}
