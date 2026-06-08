# Emotra: Multimodal Emotion Detection Platform

## Comprehensive Project Report

---

# 1. Project Introduction

Emotra is an AI-powered multimodal emotion detection platform designed to recognize and analyze human emotions from different types of digital content, including text, audio, images, and video. The platform combines modern web technologies with advanced machine learning models to transform raw user input into meaningful emotional insights through interactive visualizations and historical analytics.

The system follows a scalable Tri-Tier architecture that separates presentation, business logic, and AI inference into independent layers, ensuring maintainability, high performance, and future extensibility.

---

# 2. Abstract

This project presents the design and implementation of a comprehensive emotion detection platform capable of analyzing multiple forms of human communication through artificial intelligence. The solution integrates an Angular-based frontend with an ASP.NET Core backend responsible for authentication, data management, quota enforcement, and API orchestration, while a dedicated Python inference engine performs computationally intensive emotion recognition tasks.

The platform supports multimodal analysis across text, audio, image, and video inputs, providing users with detailed emotional distributions, historical trends, interactive timelines, and comprehensive visual reports. By combining modern web technologies with advanced deep learning models, Emotra delivers an intelligent, scalable, and user-friendly environment suitable for emotion analysis in various domains, including human-computer interaction, mental health research, educational systems, and customer experience evaluation.

---

# 3. Problem Statement

Human emotions play a fundamental role in communication, decision-making, and social interaction. However, traditional computer systems are unable to accurately understand emotional context, particularly when information is conveyed through multiple communication channels simultaneously.

Conventional sentiment analysis techniques generally classify content into simple categories such as positive, negative, or neutral, making them inadequate for applications requiring deeper emotional understanding. Furthermore, many existing emotion recognition systems specialize in only one modality, limiting their effectiveness in real-world scenarios.

Therefore, there is a growing need for an integrated platform capable of analyzing emotions from text, speech, facial expressions, and video while presenting the extracted information through a unified, intuitive, and interactive interface.

---

# 4. Project Goals

The primary goals of the Emotra platform are:

- Develop an intelligent system capable of accurately recognizing multiple human emotions.
- Support multimodal emotion detection using text, audio, image, and video inputs.
- Provide intuitive visualizations that simplify the interpretation of AI-generated results.
- Build a scalable architecture that separates AI inference from business logic.
- Deliver a secure and responsive web application with modern user experience principles.

---

# 5. Project Objectives

To achieve these goals, the project aims to:

- Develop a responsive Angular Single Page Application with interactive dashboards and data visualization components.
- Build a secure ASP.NET Core RESTful API following Clean Architecture principles.
- Integrate advanced machine learning models through dedicated Python inference services.
- Implement authentication, authorization, and user management mechanisms.
- Develop a dynamic quota management system for computational resource control.
- Store analysis history for future review and comparison.
- Provide administrative tools for monitoring users, feedback, reports, and platform health.

---

# 6. Project Scope

The scope of the project includes the complete development of an intelligent emotion detection platform, starting from user authentication and media submission to AI inference, result visualization, historical storage, and administrative management.

The platform supports:

- User registration and authentication.
- Google OAuth integration.
- Text emotion analysis.
- Audio emotion analysis.
- Image emotion analysis.
- Video emotion analysis.
- Historical analysis management.
- Interactive dashboards.
- PDF export functionality.
- Public sharing of analysis results.
- User quota management.
- Administrative monitoring and management.

---

# 7. Project Outputs

The final outputs of the project include:

- A responsive web application built using Angular.
- A robust ASP.NET Core Web API responsible for business logic and data persistence.
- A Python-based AI inference service for emotion recognition.
- A centralized SQL Server database storing user information and analysis records.
- Interactive dashboards displaying emotional distributions and historical trends.
- Secure sharing functionality for published analysis results.

---

# 8. System Overview

The Emotra platform follows a modern Tri-Tier architecture consisting of three independent layers.

### Client Tier (Frontend)

The Angular frontend provides the user interface where users authenticate, upload media, initiate analyses, and visualize emotion detection results. The application utilizes a modular architecture with reusable components, responsive layouts, and interactive charts to enhance user experience.

### Management Tier (ASP.NET Core Backend)

The backend serves as the central coordinator of the system. It manages authentication, authorization, quota verification, database persistence, report sharing, and communication between the frontend and AI inference services.

Following Clean/Onion Architecture principles, the backend separates domain logic, infrastructure, and presentation layers, improving maintainability and scalability.

### AI Inference Tier (Python)

The AI inference layer is responsible for executing computationally intensive machine learning models. Dedicated services process text, audio, image, and video inputs and return structured JSON responses containing emotion probabilities, confidence scores, and timeline information for visualization.

---

# 9. Detailed Frontend Analysis

The frontend is implemented using Angular with a feature-based modular architecture and TailwindCSS for responsive design.

### Landing Page

Serves as the public entry point of the platform, introducing users to the project's capabilities through feature descriptions, pricing information, FAQs, and navigation links.

### Authentication Module

Provides secure user access through Login, Registration, Forgot Password, and Google OAuth authentication mechanisms.

### Dashboard

Acts as the central insights hub, displaying user statistics, dominant emotions, analysis history, weekly quotas, and emotional trends through interactive charts.

### Analysis Module

The core functionality of the platform.

Users can perform:

- Text emotion analysis
- Audio emotion analysis
- Image emotion analysis
- Video emotion analysis

Each analysis page provides intuitive input interfaces, loading states, result visualizations, and detailed emotional breakdowns.

### History Module

Stores previous analyses and allows users to browse, search, filter, compare, and manage historical records.

### Compare Module

Enables side-by-side comparison between two analyses, helping users identify emotional similarities and differences.

### Settings Module

Allows users to customize themes, notification preferences, and account settings.

### Admin Dashboard

Provides administrators with tools to manage users, testimonials, bug reports, quotas, platform health, and system statistics.

### Shared Analysis

Generates secure public links that allow external users to view analysis results without exposing private account information.

### Frontend State Management

The application utilizes modern Angular state management techniques, including Signals and specialized Stores, to maintain reactive UI updates, efficient caching, and optimized rendering performance.

API communication is handled through dedicated services and interceptors responsible for authentication, request transformation, session management, and centralized error handling.

---

# 10. Detailed Backend Analysis

## Architecture

The backend follows Clean/Onion Architecture, separating business entities, service abstractions, infrastructure implementations, and presentation logic.

### Core Layer

Contains domain entities and interface definitions representing the fundamental business rules of the application.

### Infrastructure Layer

Implements repositories, Entity Framework Core database operations, business services, and data persistence mechanisms.

### Presentation Layer

Exposes RESTful API endpoints consumed by the frontend application.

---

## Major Backend Components

### Analysis Controller

Receives analysis requests, validates user permissions, coordinates AI processing, and persists generated results.

### Authentication Controller

Handles login, registration, JWT authentication, Google OAuth integration, password management, and session control.

### Quota Service

Monitors computational resource consumption and enforces weekly usage limits across all supported modalities.

### Analysis Service

Transforms AI-generated JSON responses into normalized relational database entities while maintaining historical records.

### Alert Service

Automatically evaluates emotional results after analysis and generates notifications for predefined emotional conditions when necessary.

### Sharing Service

Creates secure public tokens that allow users to share selected analysis results externally while preserving privacy.

---

# 11. AI Emotion Detection Pipeline

The Python inference engine hosts specialized machine learning pipelines for each supported modality.

### Text Analysis

Text is divided into meaningful segments before being processed through transformer-based language models capable of recognizing multiple emotional categories.

Sentence-level and document-level predictions are combined to generate comprehensive emotional profiles.

### Audio Analysis

Audio recordings undergo preprocessing steps including normalization, noise reduction, and silence detection before feature extraction.

Speech transcription and acoustic emotion recognition are combined to produce more accurate emotional predictions, while temporal smoothing techniques improve timeline consistency.

### Image Analysis

Facial features are extracted and processed using computer vision models capable of recognizing emotional expressions from static images.

### Video Analysis

Video processing combines facial tracking and frame-by-frame emotion recognition to generate continuous emotional timelines representing changes throughout the recording.

---

# 12. Complete System Workflow

1. The user logs into the platform.

2. The frontend verifies authentication status and available processing quota.

3. The user selects an analysis modality and submits input data.

4. The ASP.NET backend validates the request and forwards media to the appropriate AI inference service.

5. Python machine learning models process the input and generate structured emotion predictions.

6. The backend validates quotas, maps the returned data into relational entities, and stores the results within the SQL database.

7. Historical records, timelines, and analysis metadata are persisted for future retrieval.

8. The frontend retrieves the processed results and renders interactive charts, dominant emotion summaries, and detailed visualizations for the user.

---

# 13. Technologies Used

## Frontend

- Angular
- TypeScript
- TailwindCSS
- ECharts
- Angular Signals
- HttpClient
- Functional Interceptors

## Backend

- ASP.NET Core
- C#
- Entity Framework Core
- SQL Server
- Clean Architecture
- REST API

## AI Inference

- Python
- PyTorch
- Hugging Face Transformers
- Whisper
- FunASR
- Librosa
- OpenCV
- ONNX Runtime

---

# 14. Features and Functionalities

- Multimodal emotion detection
- User authentication and authorization
- Google OAuth integration
- Interactive dashboards
- Historical analysis management
- Emotion comparison tools
- Public analysis sharing
- Dynamic quota management
- Administrative dashboard
- Feedback and bug reporting
- Data visualization
- PDF export functionality
- Responsive user interface
- AI-powered emotion recognition
- Secure data persistence

---

# 15. Conclusion

Emotra demonstrates the successful integration of artificial intelligence and modern web technologies into a unified emotion detection platform. By combining Angular, ASP.NET Core, SQL Server, and Python-based machine learning services within a scalable architecture, the system provides accurate emotion recognition across multiple media types while maintaining security, performance, and usability.

The separation of presentation, business logic, and AI inference enables efficient maintenance and future expansion, making the platform suitable for both academic research and practical real-world applications.

---

# 16. Future Enhancements

Future development may include:

- Real-time streaming emotion analysis.
- Advanced multimodal fusion techniques.
- Personalized emotion baseline calibration.
- Mobile application support.
- Enhanced AI model optimization.
- Live collaborative analysis sessions.
- Cloud-native deployment with automatic scaling.
- Expanded multilingual emotion recognition capabilities.

The modular architecture adopted by Emotra provides a strong foundation for incorporating these enhancements while preserving system stability and scalability.
