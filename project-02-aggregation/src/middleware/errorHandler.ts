import { FastifyReply, FastifyRequest } from 'fastify';

export const errorHandler = async (
  error: Error,
  _request: FastifyRequest,
  reply: FastifyReply
) => {
  reply.status(500).send({
    success: false,
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
};