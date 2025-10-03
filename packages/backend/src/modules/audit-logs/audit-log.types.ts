export interface AuditLog {
  id?: string;                 
  method: string;
  path: string;
  query?: Record<string, any> | null;
  ip?: string | null;
  headers?: Record<string, any> | null;
  statusCode?: number | null;
  error?: string | null;
  durationMs?: number | null;
  requestBody?: any | null;
  responseBody?: any | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  } | null;
  userId?: string | null;       
  resourceId?: string | null;
  createdAt?: string;           
}
