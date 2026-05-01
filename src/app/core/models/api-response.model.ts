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
  ban_reason: string | null;
  ban_expires_at: string | null;
  is_permanent: boolean | null;
}

export interface BanDetails {
  ban_reason: string;
  ban_expires_at: string | null;
  is_permanent: boolean;
}
