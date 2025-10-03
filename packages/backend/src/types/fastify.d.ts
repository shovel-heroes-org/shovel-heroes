// Fastify module augmentation to add our custom properties (user, db)
import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    // Minimal typing for the db decorator we attach elsewhere
    db: {
      query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>
    };
  }
  interface FastifyRequest {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      avatar_url?: string | null;
      role?: string | null;
    };
    startTime?: number;
  }

  interface FastifyReply {
    locals?: Record<string, any>;
  }
}

export {}; // ensure this file is treated as a module
