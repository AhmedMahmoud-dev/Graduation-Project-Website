export interface ApiResponse<T> {
  is_success: boolean;
  message: string;
  data: T | null;
  status_code: number;
  errors: string[] | null;
  timestamp: string;
}

// Validation error shape (from .NET ModelState)
export interface ValidationErrorResponse {
  type: string;
  title: string;
  status: number;
  errors: Record<string, string[]>;
  trace_id: string;
}

export interface AuthUser {
  token: string;
  user_id: string;
  email: string;
  full_name: string;
  roles: string[];
  expires_at: string;
}
