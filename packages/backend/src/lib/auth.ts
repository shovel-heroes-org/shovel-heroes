/**
 * Authentication middleware for Fastify
 * Implements unified authorization checking
 */

import type { FastifyRequest, FastifyReply } from "fastify";

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Basic authentication middleware
 * Checks for Authorization header and validates token
 */
export async function requireAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Authorization header required",
    });
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Valid token required",
    });
  }

  try {
    // TODO: Implement proper token validation
    // For now, accept any non-empty token as valid
    // In production, validate JWT or session token here

    // Mock user data - replace with real token validation
    request.user = {
      id: "user-" + token.slice(0, 8),
      name: "Authenticated User",
      email: "user@example.com",
    };

    // Continue to route handler
  } catch (error) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid token",
    });
  }
}

/**
 * Optional authentication middleware
 * Sets user if token is valid, but doesn't block request
 */
export async function optionalAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (authHeader) {
    try {
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

      if (token) {
        // Mock user data - same as requireAuth
        request.user = {
          id: "user-" + token.slice(0, 8),
          name: "Authenticated User",
          email: "user@example.com",
        };
      }
    } catch (error) {
      // Ignore auth errors for optional auth
      console.warn("Optional auth failed:", error);
    }
  }

  // Always continue to route handler
}
