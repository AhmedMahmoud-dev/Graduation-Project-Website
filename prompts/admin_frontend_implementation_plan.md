# Admin Dashboard - Frontend Implementation Plan

Congratulations on completing the backend integration and setting up the Angular models and services! Building an admin dashboard is exciting. To ensure a smooth, perfect, and professional outcome, it is best to build it incrementally. 

This document outlines a highly recommended, step-by-step plan to implement the Admin pages in your Angular application.

---

## 🏗️ Phase 1: The Foundation (Layout & Routing)
Before building any specific features, you need a solid shell to house the admin panel. The admin area should feel distinct from the public user area.

**Step 1: Admin Layout Component**
- Create an `AdminLayoutComponent` that includes a **Sidebar** (left navigation) and a **Topbar** (header with admin profile, logout, and breadcrumbs).
- The sidebar should have links to: Dashboard, Users, Bug Reports, Testimonials, and System Health.
- Use a responsive design (e.g., a collapsible sidebar for mobile).

**Step 2: Routing Setup**
- Set up child routes under an `/admin` path (e.g., `/admin/dashboard`, `/admin/users`).
- **Crucial:** Ensure your `AdminGuard` is applied to the parent `/admin` route so no unauthorized users can even load the layout.
- Add an HTTP Interceptor to catch `403 Forbidden` responses. If a banned admin tries to act, log them out instantly.

---

## 📊 Phase 2: The Dashboard Overview (Stats)
Start with the most visually rewarding page first. This acts as the landing page when the admin logs in.

**Step 1: Metric Cards**
- Call `getStats()` and display the core metrics at the top in 4 beautiful cards: Total Users, Active Users, Total Analyses, and Total Bug Reports. Include icons for each.

**Step 2: Data Visualization (Charts)**
- Integrate a charting library (like `Chart.js` via `ng2-charts` or `ApexCharts`).
- **Line Chart:** Display the `AnalysisTrend` and `NewUsersTrend` over the last 30 days.
- **Doughnut/Pie Chart:** Display the `EmotionDistribution` to show which emotions are most detected platform-wide.

---

## 👥 Phase 3: User Management (Data Table)
This is the most critical operational page.

**Step 1: The Paginated Table**
- Build a table component to display the list from `getUsers(page, pageSize)`.
- Columns: Name, Email, Total Analyses, Join Date, and Status (Active/Banned).
- Add pagination controls at the bottom (Next, Previous, Page Numbers) connected to your new paginated API response.

**Step 2: Ban/Activate Actions**
- Add a "Toggle" switch or an "Action" menu (three dots) in the last column.
- When clicked, show a confirmation modal ("Are you sure you want to ban this user?").
- On confirm, call the `updateUserStatus()` service, show a success toast/alert, and refresh the table.

---

## 📝 Phase 4: Testimonial Moderation
This feature directly affects your public landing page, so it's high priority.

**Step 1: Moderation Queue UI**
- Instead of a traditional table, consider a **Grid of Cards** or a clean list view.
- Each card should show: User Name, Star Rating (1-5), the Comment, and the Submission Date.

**Step 2: Approve / Reject Actions**
- Add two prominent buttons on each card: a green "Approve" (check icon) and a red "Reject" (trash/cross icon).
- When clicked, call `moderateTestimonial()`.
- On success, smoothly animate the card fading out and remove it from the array without requiring a full page reload.

---

## 🐛 Phase 5: Bug Report Management
Help your support workflow by organizing issues.

**Step 1: Bug Reports Table**
- Create a paginated table for `getBugReports()`.
- Columns: Title, Category, Priority (use colored badges: Red=High, Yellow=Medium, Green=Low), Date, and Status.

**Step 2: Detail View & Status Update**
- Add an "Expand" or "View Details" button to see the full description and the JSON `metadata` (browser, OS).
- Add a dropdown menu to change the status (e.g., from "Open" to "In Progress" or "Closed").
- Call `updateBugStatus()` on change.

---

## 🩺 Phase 6: Infrastructure Health Monitor
A simple but vital page to ensure your AI servers are running.

**Step 1: Health Status Cards**
- Call `getHealth()`.
- Display a card for each service (Text AI, Audio AI).
- **UI Elements:** Use a pulsing green dot for "Online" and a red dot for "Offline". Display the `response_time_ms` (e.g., "45ms").
- Add a "Refresh" button at the top so you can manually ping the servers without reloading the page.

---

## 🎯 Summary Checklist for Implementation:
1. [ ] Implement HTTP Interceptor for 403 errors.
2. [ ] Build `AdminLayout` with Sidebar.
3. [ ] Build `/admin/dashboard` (Stats & Charts).
4. [ ] Build `/admin/users` (Table + Pagination + Ban toggle).
5. [ ] Build `/admin/testimonials` (Approval Cards).
6. [ ] Build `/admin/bugs` (Table + Status dropdown).
7. [ ] Build `/admin/health` (Status monitor).
