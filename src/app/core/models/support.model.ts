// User's own support message with optional reply
export interface SupportMessage {
  id: number;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  reply: string | null;
  replied_at: string | null;
}

// Response when submitting a new message
export interface SupportMessageResponse {
  id: number;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

// Request body for submitting a message
export interface ContactSupportRequest {
  subject: string;
  message: string;
}

// Admin view of a support message
export interface AdminSupportMessage {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  subject: string;
  message: string;
  status: 'open' | 'replied' | 'closed' | 'pending';
  created_at: string;
  reply: string | null;
  replied_at: string | null;
}

// Admin paginated list response
export interface AdminSupportListResponse {
  items: AdminSupportMessage[];
  page: number;
  page_size: number;
  total_count: number;
}

// Request body for admin reply
export interface AdminSupportReplyRequest {
  message: string;
}

// Response after admin reply
export interface AdminSupportReplyResponse {
  id: number;
  status: string;
  replied_at: string;
}

