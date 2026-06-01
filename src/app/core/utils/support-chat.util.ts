import { SupportMessage, AdminSupportMessage } from '../models/support.model';

export interface ChatBubble {
  id: number; // ticket ID reference
  sender: 'user' | 'admin';
  content: string;
  timestamp: string; // ISO string
  formattedTime: string; // e.g. "8:47 pm"
  subject?: string;
}

export interface ChatMessageGroup {
  dateLabel: string; // Today, Yesterday, Sunday, May 25, 2026
  messages: ChatBubble[];
}

/**
 * Strips hours/minutes/seconds from a Date object to get start of the day.
 */
function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Calculates a human-readable relative date label:
 * - "Today"
 * - "Yesterday"
 * - Day of the week (e.g., "Sunday") if within the last 7 days.
 * - Calendar date (e.g., "Jun 1, 2026") otherwise.
 */
export function getRelativeDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  
  const dDate = getStartOfDay(date);
  const dNow = getStartOfDay(now);
  
  const diffTime = dNow.getTime() - dDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays > 1 && diffDays < 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Formats an ISO date string into standard time format (e.g. "8:47 pm").
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // Hour '0' -> '12'
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Flattens a list of User Support Tickets into a stream of singular user and admin ChatBubble items.
 */
export function flattenUserSupportMessages(tickets: SupportMessage[]): ChatBubble[] {
  const bubbles: ChatBubble[] = [];
  tickets.forEach(ticket => {
    // 1. Add user's question
    bubbles.push({
      id: ticket.id,
      sender: 'user',
      content: ticket.message,
      timestamp: ticket.created_at,
      formattedTime: formatTime(ticket.created_at),
      subject: ticket.subject
    });
    
    // 2. Add admin's reply (if exists)
    if (ticket.status === 'replied' && ticket.reply && ticket.replied_at) {
      bubbles.push({
        id: ticket.id,
        sender: 'admin',
        content: ticket.reply,
        timestamp: ticket.replied_at,
        formattedTime: formatTime(ticket.replied_at)
      });
    }
  });
  return bubbles;
}

/**
 * Flattens a list of Admin Support Tickets into a stream of user and admin ChatBubble items.
 */
export function flattenAdminSupportMessages(tickets: AdminSupportMessage[]): ChatBubble[] {
  const bubbles: ChatBubble[] = [];
  tickets.forEach(ticket => {
    // 1. Add user's question
    bubbles.push({
      id: ticket.id,
      sender: 'user',
      content: ticket.message,
      timestamp: ticket.created_at,
      formattedTime: formatTime(ticket.created_at),
      subject: ticket.subject
    });
    
    // 2. Add admin's reply (if exists)
    if (ticket.reply && ticket.replied_at) {
      bubbles.push({
        id: ticket.id,
        sender: 'admin',
        content: ticket.reply,
        timestamp: ticket.replied_at,
        formattedTime: formatTime(ticket.replied_at)
      });
    }
  });
  return bubbles;
}

/**
 * Groups and sorts messages chronologically into date sections.
 */
export function groupMessagesByDate(messages: ChatBubble[]): ChatMessageGroup[] {
  const groups: Record<string, ChatBubble[]> = {};
  
  // Sort messages chronologically (oldest first) so that conversation flows down
  const sorted = [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  sorted.forEach(msg => {
    const label = getRelativeDateLabel(msg.timestamp);
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(msg);
  });
  
  // Map back to maintain chronological ordering of groups
  const orderedLabels: string[] = [];
  sorted.forEach(msg => {
    const label = getRelativeDateLabel(msg.timestamp);
    if (!orderedLabels.includes(label)) {
      orderedLabels.push(label);
    }
  });
  
  return orderedLabels.map(label => ({
    dateLabel: label,
    messages: groups[label]
  }));
}
