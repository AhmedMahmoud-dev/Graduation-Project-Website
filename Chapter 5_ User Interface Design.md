<!-- page 1 -->

# Chapter 5: User Interface Design

## 5.1 Introduction

*The user interface of the Emotion Detection with Timeline Analysis system was designed with a* *focus on clarity, accessibility, and ease of use. The goal was to build an interactive and visually* *intuitive platform that makes complex AI-driven emotional data understandable to users at all* *levels of technical expertise. The frontend was implemented using* ***Angular****, a modern* *component-based framework, and follows a modular design that separates public-facing* *pages, authenticated user pages, and administrative panels.*

*This chapter presents the complete user interface design of the system, organized according* *to the three categories of users the system serves:*

1. ***Guest Users*** *— unauthenticated visitors who can explore the landing page, read model*
*documentation, and access publicly shared analyses.* 2. ***Registered Users*** *— authenticated users who can perform emotion analyses, view*

*history, manage alerts, compare sessions, and configure settings.* 3. ***Administrators*** *— privileged users who manage the platform through a dedicated admin*

*panel covering users, quotas, support, testimonials, bugs, and system health.*

*Each section below presents the key screens for each user type, accompanied by a* *description of the screen's purpose and the main UI elements it contains.*

## 5.2 Guest User Interface

*Guest users are visitors who have not yet registered or logged in to the system. They can* *access the public-facing pages of the platform, which are designed to introduce the system's* *capabilities and encourage registration.*

### 5.2.1 Landing Page

*The Landing Page is the main entry point of the application. It serves as the marketing and* *presentation layer of the system, introducing visitors to the platform's core features and value* *proposition.*

*The page is divided into several sections:*

---

<!-- page 2 -->
● ***Hero Section:*** *A visually prominent introduction to the system with a headline, a brief* *description, and a call-to-action button directing visitors to register or log in.*

● ***Features Section:*** *Showcases the supported analysis modalities through interactive* *cards — Text Analysis, Audio Analysis, and Image & Video Analysis — each with a brief* *description and a link to its model documentation.*

---

<!-- page 3 -->
● ***How It Works Section:*** *A simple 3-step guide explaining the user journey: upload your* *file, let the AI analyze it, and view your emotion timeline results.*

● ***Testimonials Section:*** *Displays verified feedback from registered users of the platform.*

---

<!-- page 4 -->
● ***FAQ Section****: Answers common questions users may have about the platform, its* *capabilities, and how to get started.*

---

<!-- page 5 -->

### 5.2.2 Login Page

*The Login Page allows existing users to authenticate and access the system. It is accessible via* *the /auth/login route.*

*Key UI elements include:*

● *An email input field and a password input field.* ● *A "Forgot Password?" link directing users to the password recovery flow.* ● *A primary "Login" button to submit credentials.* ● *A "Sign in with Google" button for OAuth-based authentication.* ● *A link to the Register page for new users.*

### 5.2.3 Register Page

*The Register Page allows new visitors to create an account on the platform. It is accessible via* *the /auth/register route.*

*Key UI elements include:*

● *Input fields for full name, email address, and password.* ● *A password confirmation field.* ● *A "Sign Up" button to submit the registration form.* ● *A "Sign up with Google" button for OAuth-based registration.* ● *A link back to the Login page for existing users.*

---

<!-- page 6 -->

### 5.2.4 Forgot Password Page

*The Forgot Password Page allows users who have lost access to their account to initiate a* *password reset process. It is accessible via the /auth/forgot-password route.*

*Key UI elements include:*

● *An email input field where the user enters their registered email address.* ● *A "Send Reset Link" button that triggers the backend to send a password reset email.* ● *A brief instruction message explaining the next steps.*

---

<!-- page 7 -->

### 5.2.5 Reset Password Page

*The Reset Password Page is accessed through the link sent to the user's email. It allows the* *user to define a new password for their account. It is accessible via the /auth/reset-password* *route (protected by a reset password guard that validates the token from the email link).*

*Key UI elements include:*

● *A new password input field.* ● *A confirm new password input field.* ● *A "Reset Password" button to submit and apply the new credentials.*

---

<!-- page 8 -->

### 5.2.6 Model Documentation Pages (Public)

*The Model Documentation pages are publicly accessible and provide detailed technical and* *conceptual descriptions of the four AI models integrated into the system. These pages are* *accessible even without logging in, allowing visitors to understand the system's capabilities* *before registering.*

*There are three documentation pages:*

● ***Text Model*** *(/models/text) — Explains the text-based emotion detection model, its* *architecture, and how it processes textual input.*

● ***Audio Model*** *(/models/audio) — Explains the audio-based emotion detection model and its* *approach to speech analysis.*

---

<!-- page 9 -->
● ***Image & Video Model*** *(/models/image-video) — Describes the image and video emotion* *detection model, including face detection and frame-level analysis.*

*Each documentation page follows a consistent layout:*

● *A title and overview section.* ● *A technical description of the model's architecture and processing pipeline.* ● *Input/output specifications.* ● *Sample results or example outputs.*

### 5.2.7 Shared Analysis Page (Public Link)

*The Shared Analysis Page allows registered users to share the results of a specific analysis* *session with others via a unique public link, even if the recipient is not registered. This page is* *accessible via the /shared-analysis/:shareToken route.*

*Key UI elements include:*

● *A read-only display of the analysis results (emotion timeline chart, dominant emotion, and* *summary statistics).* ● *The input type and file name of the analyzed session.* ● *A banner or header indicating that this is a shared view.* ● *A call-to-action encouraging the viewer to register and try the platform themselves.*

---

<!-- page 10 -->

## 5.3 Registered User Interface

*Registered users have full access to the platform's core features after logging in. The* *authenticated interface is wrapped in a consistent* ***App Layout*** *that includes a sidebar* *navigation and a top navigation bar, providing easy access to all features.*

### 5.3.1 Dashboard

*The Dashboard is the first screen a registered user sees after logging in. It provides a high-* *level summary of the user's activity and emotional trends. It is accessible via the /dashboard* *route.*

*Key UI elements include:*

● ***Statistics Cards:*** *Summary metrics such as total number of analyses performed, analyses* *by modality (text, audio, image, video), and the number of active alerts.* ● ***Recent Analyses:*** *A list or card view of the most recently performed analysis sessions,* *each showing the modality type, date, and dominant emotion result.* ● ***Emotion Trend Chart:*** *A chart visualizing the user's overall emotional patterns over time* *across all sessions.* ● ***Quick Action Buttons:*** *Shortcuts to start a new analysis for each modality.*

---

<!-- page 11 -->

### 5.3.2 Analysis Hub

*The Analysis Hub is the central starting point for performing emotion analysis. It is accessible* *via the /analysis route and allows the user to choose the type of analysis they want to perform.*

*Key UI elements include:*

● ***Four modality selection cards:*** ***Text****,* ***Audio****,* ***Image****, and* ***Video****, each with an icon, a brief* *description, and a button to navigate to the specific analysis page.*

### 5.3.3 Text Analysis Page

*The Text Analysis page allows users to perform emotion analysis on written text. It is accessible* *via the /analysis/text route.*

*Key UI elements include:*

● *A large text input area where the user can type or paste text.* ● *A character/word count indicator.* ● *An "Analyze" button to submit the text for processing.* ● ***Results Section*** *(displayed after submission):* ○ *An emotion timeline chart showing the emotional progression across sentences or* *paragraphs.* ○ *A summary card showing the dominant emotion and its confidence score.* ○ *A breakdown table showing the detected emotion for each text segment.* ○ *Options to share the analysis or save it to history.*

---

<!-- page 12 -->

---

<!-- page 13 -->

---

<!-- page 14 -->

---

<!-- page 15 -->

### 5.3.4 Audio Analysis Page

*The Audio Analysis page allows users to upload or record an audio file for emotion analysis. It is* *accessible via the /analysis/audio route.*

*Key UI elements include:*

● *A drag-and-drop file upload area (supporting .wav, .mp3, and other audio formats).* ● *An optional audio recording button to record directly from the microphone.* ● *An audio player to preview the uploaded file before submission.* ● *An "Analyze" button to submit the audio for processing.* ● ***Results Section*** *(displayed after submission):* ○ *An emotion timeline chart showing emotional fluctuations across audio segments.* ○ *A dominant emotion summary card.* ○ *A transcription of the spoken content (if available).* ○ *Options to share or save the analysis.*

---

<!-- page 16 -->

---

<!-- page 17 -->

---

<!-- page 18 -->

---

<!-- page 19 -->

### 5.3.5 Image Analysis Page

*The Image Analysis page allows users to upload a still image (such as a photograph or* *screenshot) for emotion analysis based on facial expressions. It is accessible via the* */analysis/image route.*

*Key UI elements include:*

● *A drag-and-drop or file browser upload area (supporting .jpg, .png formats).* ● *A preview of the uploaded image.* ● *An "Analyze" button to submit the image.* ● ***Results Section*** *(displayed after submission):* ○ *An annotated version of the image with detected faces highlighted and labeled with* *emotion tags.* ○ *A summary card showing the dominant emotion detected.* ○ *A confidence score breakdown for all detected emotions.* ○ *Options to share or save the analysis.*

---

<!-- page 20 -->

### 5.3.6 Video Analysis Page

*The Video Analysis page allows users to upload a video file for frame-by-frame emotion* *analysis. It is accessible via the /analysis/video route.*

*Key UI elements include:*

● *A drag-and-drop or file browser upload area (supporting .mp4, .avi, and other video* *formats).* ● *A video player to preview the uploaded file.* ● *An "Analyze" button to submit the video for processing.* ● ***Results Section*** *(displayed after submission):* ○ *An emotion timeline chart showing the emotional progression across video frames or* *time segments.* ○ *A dominant emotion summary.* ○ *A per-face tracking breakdown (if multiple faces are detected).* ○ *Options to share or save the analysis.*

### 5.3.7 History Page

*The History page provides users with a full log of all their past analysis sessions. It is accessible* *via the /history route.*

*Key UI elements include:*

---

<!-- page 21 -->
● *A filterable and searchable list of all past analyses.* ● *Filter options by modality type (text, audio, image, video) and date range.* ● *Each history item displays:* ○ *The modality icon and analysis type.* ○ *The date and time of the analysis.* ○ *The dominant emotion result.* ○ *A "open report" button to open the full analysis results.* ○ *A "Delete" button to remove the record.*

---

<!-- page 22 -->

### 5.3.8 Compare Analyses Page

*The Compare Analyses page allows users to select two or more past analysis sessions and* *compare their emotional timelines side by side. It is accessible via the /compare route.*

*Key UI elements include:*

● *A selection interface to pick two analysis sessions from the user's history.* ● *Side-by-side emotion timeline charts for the selected sessions.* ● *A comparison summary table highlighting differences in dominant emotions and* *emotional patterns.*

---

<!-- page 23 -->

---

<!-- page 24 -->

---

<!-- page 25 -->

### 5.3.9 Alerts Page

*The Alerts page displays all active and historical alerts generated by the system based on the* *user's emotional patterns. It is accessible via the /alerts route. The system automatically* *generates alerts when it detects recurring negative emotional states (e.g., sustained high* *stress or persistent sadness).*

*Key UI elements include:*

● *A list of all alerts, each showing:* ○ *Alert type (e.g., "High Stress Detected", "Mood Shift Alert").* ○ *The date and time the alert was triggered.* ○ *A brief description of the detected emotional pattern.* ○ *A link to the related analysis session.* ● *Filter options to view active alerts vs. resolved alerts.* ● *A real-time notification badge on the sidebar icon to indicate new alerts.*

---

<!-- page 26 -->

### 5.3.10 Settings Page

*The Settings page allows users to personalize their experience on the platform. It is accessible* *via the /settings route, with sub-pages for different configuration categories.*

*The settings page contains the following sub-sections:*

● ***Profile Settings:*** *Update display name, profile picture, and email address.* ● ***Color / Theme Settings*** *(/settings/colors): Choose between light and dark mode or a* *custom color theme for the interface.* ● ***Alert Thresholds Settings:*** *Configure the emotion thresholds that trigger automatic* *alerts (e.g., set the minimum stress level percentage that generates an alert).* ● ***Notification Preferences:*** *Enable or disable email notifications and push alerts.* ● ***Account Security:*** *Change password and manage connected accounts (e.g., Google* *OAuth).*

---

<!-- page 27 -->

## 5.4 Administrator Interface

*The Administrator Interface is accessible only to users with admin-level privileges. It shares the* *same App Layout (sidebar and top navigation bar) as the regular user interface but provides a* *completely different set of pages focused on platform management and oversight. Admin* *users are automatically redirected to /admin/dashboard upon login.*

### 5.4.1 Admin Dashboard

*The Admin Dashboard provides a high-level overview of the platform's overall activity and* *health. It is accessible via the /admin/dashboard route.*

*Key UI elements include:*

● ***Platform Statistics Cards:*** *Total number of registered users, total analyses performed,* *number of active alerts across all users, number of open support tickets, and number of* *unresolved bug reports.* ● ***User Growth Chart:*** *A chart showing the trend of new user registrations over time.* ● ***Analysis Activity Chart:*** *A breakdown of analysis activity by modality over a selected* *time period.* ● ***Recent Activity Feed:*** *A live feed of recent platform events such as new registrations,* *new analyses, and new support tickets.*

---

<!-- page 28 -->

---

<!-- page 29 -->

### 5.4.2 User Management Page

*The User Management page allows administrators to view, search, and manage all registered* *users on the platform. It is accessible via the /admin/users route.*

*Key UI elements include:*

● *A searchable and paginated table of all users, with columns for:* ○ *User (Avatar, full name, live online/offline status indicator, and last seen timestamp).* ○ Email address. ○ Total number of analyses performed. ○ Joined (registration date) ○ Status badge (Online, Offline, or Banned). ● *Action buttons per user row:* ○ ***Manage Quota*** *—* *opens a modal displaying real-time weekly usage bars and allowing* *custom weekly limits for text tokens, audio seconds, image count, and video seconds.* ○ ***Ban / Unban*** *— to restrict or restore a user's access.* ○ ***Nuclear Delete*** *— allows administrators to permanently purge a user and all their* *data after typing their admin password for validation.* ● *A search bar and filter controls for finding specific users.*

---

<!-- page 30 -->

---

<!-- page 31 -->

### 5.4.3 Testimonials Management Page

*The Testimonials Management page allows administrators to review, approve, or remove user-* *submitted testimonials that appear on the public Landing Page. It is accessible via the* */admin/testimonials route.*

*Key UI elements include:*

● *A list of all submitted testimonials, each showing:* ○ *The user's name and profile picture.* ○ *The testimonial text and star rating.* ○ *The submission date.* ● *Action buttons per testimonial:* ○ ***Approve*** *— to make the testimonial visible on the Landing Page.* ○ ***Reject*** *— to hide the testimonial from the public.*

---

<!-- page 32 -->

### 5.4.4 Bug Reports Page

*The Bug Reports page allows administrators to view and manage bug reports submitted by* *users through the platform. It is accessible via the /admin/bugs route.*

*Key UI elements include:*

● *A searchable list of all submitted bug reports, each showing:* ○ *Report ID, submitting user, report title, submission date, and status.* ● *Detailed view panel (on click):* ○ *Full bug description and reproduction steps.* ○ *Screenshots attached by the user (if any).* ○ *Status management actions: Mark as* ***Resolved****,* ***In Progress****, or* ***Dismissed****.*

---

<!-- page 33 -->

### 5.4.5 System Health Page

*The System Health page provides administrators with a real-time view of the platform's* *backend services and AI microservices status. It is accessible via the /admin/health route.*

*Key UI elements include:*

● *A status panel for each service (e.g., .NET Core Backend, Text Microservice, Audio* *Microservice, Image/Video Microservice, Database).* ● *Each service displays:* ○ *Current status:* ***Online****,* ***Degraded****, or* ***Offline*** *(color-coded: green, yellow, red).* ○ *Response time and uptime percentage.* ○ *A refresh button to manually trigger a health check.* ● *Historical uptime chart for each service.*

---

<!-- page 34 -->

### 5.4.6 Support Page

*The Support page allows administrators to view and respond to support tickets submitted by* *users. It is accessible via the /admin/support route.*

*Key UI elements include:*

● *A list of all open and resolved support tickets, each showing:* ○ *Ticket ID, user name, subject, submission date, and status (Open/In* *Progress/Resolved).* ● *A conversation view panel for each ticket, showing the full message thread between the* *user and the support team.* ● *A reply text box for the administrator to respond to the user's message in real time.*

---

<!-- page 35 -->

### 5.4.7 Quota Management Page

*The Quota Management page allows administrators to configure and manage the usage limits* *applied to users. It is accessible via the /admin/quota route.*

*Key UI elements include:*

● *A global quota settings panel where administrators can define default limits, such as:* ○ *Maximum number of analyses per user per day/month.* ○ *Maximum file size allowed for uploads.* ○ *Maximum allowed video/audio duration.* ● *A per-user quota override table for setting custom limits for specific users.* ● *A usage statistics panel showing which users are approaching or have exceeded their* *quota limits.*

---

<!-- page 36 -->

## 5.5 Summary

*This chapter presented the complete user interface design of the Emotion Detection with* *Timeline Analysis system, organized across three user categories: Guest Users, Registered* *Users, and Administrators.*

*The guest interface focuses on discoverability, allowing visitors to learn about the platform and* *its capabilities before registering. The registered user interface provides a comprehensive and* *intuitive analytical workflow — from uploading a file and receiving an emotion timeline to* *managing history, comparing sessions, and configuring personal alerts. The administrator* *interface equips privileged users with the tools necessary to maintain and govern the platform,* *covering user management, content moderation, system health monitoring, support ticket* *handling, and quota control.*

*Together, these interfaces reflect the system's core design philosophy: making powerful AI-* *driven emotion analysis accessible, transparent, and actionable for all types of users.*
