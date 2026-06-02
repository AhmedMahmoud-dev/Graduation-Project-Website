import { Component, inject, signal, OnInit, computed, DestroyRef, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormattingService } from '../../../core/services/formatting.service';
import { AdminSupportMessage } from '../../../core/models/support.model';
import { AdminUser } from '../../../core/models/admin.model';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { DropdownMenuComponent, DropdownOption } from '../../../shared/components/dropdown-menu/dropdown-menu.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ChatBubble, ChatMessageGroup, flattenAdminSupportMessages, groupMessagesByDate } from '../../../core/utils/support-chat.util';

interface CachedSupportData {
  messages: AdminSupportMessage[];
  total: number;
  page: number;
  status: string;
}

export interface UserChatSummary {
  userId: string;
  userName: string;
  userEmail: string;
  lastMessageText: string;
  lastMessageTime: string;
  isPending: boolean;
  isActive: boolean;
  isOnline: boolean;
  tickets: AdminSupportMessage[];
}

const CACHE_KEY = 'emotra_admin_support_v2';

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingStateComponent, EmptyStateComponent, DropdownMenuComponent, PaginationComponent],
  templateUrl: './admin-support.component.html',
  styleUrls: ['./admin-support.component.css']
})
export class AdminSupportComponent implements OnInit, AfterViewChecked {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  protected format = inject(FormattingService);
  private cache = inject(AppCacheService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('adminChatContainer') private adminChatContainer!: ElementRef;

  // State Signals
  messages = signal<AdminSupportMessage[]>([]);
  usersList = signal<AdminUser[]>([]);
  statusFilter = signal<string>('all');
  
  // Sorting State
  sortColumn = signal<string | null>('created_at');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Pagination State (Sidebar Contacts)
  currentPage = signal<number>(1);
  pageSize = signal<number>(50); // Fetch a larger pool to group contacts
  totalMessages = signal<number>(0);

  isLoading = signal(true);
  error = signal<string | null>(null);
  isRefreshing = signal<boolean>(false);

  // Split Screen / Active Chat State
  selectedUserId = signal<string | null>(null);
  newMessageText = signal<string>('');
  isSendingReply = signal<boolean>(false);
  searchQuery = signal<string>('');

  // Context Menu State
  contextMenu = signal<{
    isOpen: boolean;
    x: number;
    y: number;
    type: 'contact' | 'chat';
    targetUserId?: string;
  }>({ isOpen: false, x: 0, y: 0, type: 'contact' });

  private shouldScrollToBottom = false;

  statusOptions: DropdownOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'open' },
    { label: 'Replied', value: 'replied' }
  ];

  // Group tickets by user and compute user summaries for the sidebar
  groupedUsers = computed<UserChatSummary[]>(() => {
    const msgs = this.messages();
    const query = this.searchQuery().toLowerCase().trim();
    const userMap = new Map<string, AdminSupportMessage[]>();
    const usersData = this.usersList();

    msgs.forEach(m => {
      const id = m.user_id;
      if (!userMap.has(id)) {
        userMap.set(id, []);
      }
      userMap.get(id)!.push(m);
    });

    const summaries: UserChatSummary[] = [];
    userMap.forEach((tickets, userId) => {
      // Find matching user info to get ban and online status
      const matchingUser = usersData.find(u => u.id === userId);
      const isActive = matchingUser ? matchingUser.is_active : true;
      const isOnline = matchingUser ? matchingUser.is_online : false;

      // Sort user tickets chronologically (oldest first for chat flow)
      const sortedTickets = [...tickets].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const latestTicket = sortedTickets[sortedTickets.length - 1];
      const isPending = sortedTickets.some(t => t.status === 'open' || t.status === 'pending');

      const matchesSearch = 
        latestTicket.user_name.toLowerCase().includes(query) || 
        latestTicket.user_email.toLowerCase().includes(query) ||
        latestTicket.message.toLowerCase().includes(query);

      if (!query || matchesSearch) {
        summaries.push({
          userId,
          userName: latestTicket.user_name,
          userEmail: latestTicket.user_email,
          lastMessageText: latestTicket.message,
          lastMessageTime: latestTicket.created_at,
          isPending,
          isActive,
          isOnline,
          tickets: sortedTickets
        });
      }
    });

    // Sort contacts by latest message timestamp (newest activity at top)
    return summaries.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  });

  // Get active selected user details
  activeUser = computed<UserChatSummary | null>(() => {
    const id = this.selectedUserId();
    if (!id) return null;
    return this.groupedUsers().find(u => u.userId === id) || null;
  });

  // Flatten and group active conversation messages into date buckets
  activeChatGroups = computed<ChatMessageGroup[]>(() => {
    const user = this.activeUser();
    if (!user) return [];
    const flat = flattenAdminSupportMessages(user.tickets);
    return groupMessagesByDate(flat);
  });

  totalPages = computed(() => Math.ceil(this.totalMessages() / this.pageSize()) || 1);
  pendingMessagesCount = computed(() => this.messages().filter(m => m.status === 'open' || m.status === 'pending').length);
  hasAnyChats = computed(() => {
    if (this.messages().length > 0) return true;
    if (this.searchQuery().trim() !== '' || this.statusFilter() !== 'all') return true;
    return false;
  });

  updateStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.fetchMessages();
  }

  ngOnInit() {
    const cached = this.cache.getItem<CachedSupportData>(CACHE_KEY);
    if (cached) {
      this.messages.set(cached.messages);
      this.totalMessages.set(cached.total);
      this.currentPage.set(cached.page);
      this.statusFilter.set(cached.status || 'all');
      this.isLoading.set(false);
      this.fetchMessages(true);
    } else {
      this.fetchMessages(false);
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      const savedChatUserId = sessionStorage.getItem('emotra_active_support_chat');
      if (savedChatUserId) {
        this.selectedUserId.set(savedChatUserId);
        this.shouldScrollToBottom = true;
      }
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  fetchMessages(isBackground: boolean = false) {
    if (!isBackground) {
      if (this.messages().length === 0 && this.isLoading()) {
        this.isLoading.set(true);
      } else {
        this.isRefreshing.set(true);
      }
    }
    this.error.set(null);

    // Fetch user details to get real-time online/ban status in support contacts
    this.adminService.getUsers(1, 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (userRes) => {
          if (userRes.is_success && userRes.data) {
            this.usersList.set(userRes.data);
          }
        }
      });

    this.adminService.getSupportMessages(
      this.currentPage(),
      this.pageSize(),
      this.statusFilter(),
      this.sortColumn(),
      this.sortDirection()
    )
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.messages.set(res.data);
          this.totalMessages.set(res.total);
          
          this.cache.setItem<CachedSupportData>(CACHE_KEY, {
            messages: res.data,
            total: res.total,
            page: this.currentPage(),
            status: this.statusFilter()
          });

          // Trigger scrolling in case current active chat received new messages
          if (this.selectedUserId()) {
            this.shouldScrollToBottom = true;
          }
        } else {
          if (this.messages().length === 0) {
            this.error.set(res.message || 'Failed to load support queue');
          }
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        if (this.messages().length === 0) {
          this.error.set(err.message || 'Failed to load support queue');
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }
    });
  }

  selectUser(userId: string) {
    this.selectedUserId.set(userId);
    this.newMessageText.set('');
    this.shouldScrollToBottom = true;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem('emotra_active_support_chat', userId);
    }
  }

  closeChat() {
    this.selectedUserId.set(null);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('emotra_active_support_chat');
    }
  }

  submitReply() {
    const user = this.activeUser();
    if (!user || !user.isPending) return;

    const reply = this.newMessageText().trim();
    if (!reply || this.isSendingReply()) return;

    // Find the latest pending (open/pending) support ticket to reply to.
    // Fall back to replying to the latest ticket overall if there are no pending tickets.
    const pendingTickets = user.tickets.filter(t => t.status === 'open' || t.status === 'pending');
    const targetTicket = pendingTickets.length > 0 
      ? pendingTickets[pendingTickets.length - 1] 
      : user.tickets[user.tickets.length - 1];

    if (!targetTicket) return;

    this.isSendingReply.set(true);
    this.adminService.replyToSupportMessage(targetTicket.id, { message: reply })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        if (res.is_success) {
          this.toastService.show('Reply Sent', 'Your response has been sent to the user.', 'success', 'check');
          this.newMessageText.set('');
          
          // Re-fetch all messages in background
          this.fetchMessages(true);
          this.shouldScrollToBottom = true;
        }
        this.isSendingReply.set(false);
      },
      error: () => {
        this.isSendingReply.set(false);
      }
    });
  }

  scrollToBottom(): void {
    try {
      if (this.adminChatContainer) {
        const el = this.adminChatContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.selectedUserId.set(null);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('emotra_active_support_chat');
    }
    this.fetchMessages();
  }

  onContactContextMenu(event: MouseEvent, userId: string) {
    event.preventDefault();
    event.stopPropagation();
    
    const menuWidth = 192; // 12rem = 192px
    const menuHeight = 50; // Approximate height of menu
    let x = event.clientX;
    let y = event.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 12;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 12;
    }

    this.contextMenu.set({
      isOpen: true,
      x,
      y,
      type: 'contact',
      targetUserId: userId
    });
  }

  onChatContextMenu(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (this.selectedUserId() === null) return;

    const menuWidth = 192;
    const menuHeight = 50; // Approximate height of menu
    let x = event.clientX;
    let y = event.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 12;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 12;
    }

    this.contextMenu.set({
      isOpen: true,
      x,
      y,
      type: 'chat'
    });
  }

  closeContextMenu() {
    this.contextMenu.update(c => ({ ...c, isOpen: false }));
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeContextMenu();
  }

  @HostListener('document:contextmenu', ['$event'])
  onDocumentContextMenu(event: MouseEvent) {
    // Unhandled right clicks bubble up here; close any custom context menus
    this.closeContextMenu();
  }

  @HostListener('window:keydown.escape')
  onEscapePressed() {
    if (this.selectedUserId() !== null) {
      this.closeChat();
      this.closeContextMenu();
    }
  }

  deleteConversation(userId: string) {
    this.closeContextMenu();
    this.toastService.confirm(
      'Delete Support Chat?',
      'Are you sure you want to permanently delete this support conversation history? This will delete all messages for both you and the user.',
      () => {
        this.adminService.deleteSupportChat(userId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              if (res.is_success) {
                this.toastService.show('Chat Deleted', 'The conversation history has been permanently removed.', 'success');
                if (this.selectedUserId() === userId) {
                  this.selectedUserId.set(null);
                  if (typeof window !== 'undefined' && window.sessionStorage) {
                    sessionStorage.removeItem('emotra_active_support_chat');
                  }
                }
                this.fetchMessages(true);
              } else {
                this.toastService.show('Error', res.message || 'Failed to delete support chat.', 'error');
              }
            },
            error: () => {
              this.toastService.show('Error', 'Failed to delete support chat. Server error.', 'error');
            }
          });
      },
      { confirmLabel: 'Delete', type: 'error', icon: 'trash' }
    );
  }
}

