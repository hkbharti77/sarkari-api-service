export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    path?: string;
    version?: string;
    [key: string]: any;
  };
}
