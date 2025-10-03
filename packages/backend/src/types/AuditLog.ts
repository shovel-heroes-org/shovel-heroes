export interface AuditLog {
  user: any | null;               
  method: string;                 
  path: string;                   
  query: Record<string, any>;     
  ip: string;                     
  headers: Record<string, any>;   
  requestBody: unknown;           
  responseBody: unknown;          
  statusCode: number;             
  eventTime: string;              
  durationMs: number;             
}