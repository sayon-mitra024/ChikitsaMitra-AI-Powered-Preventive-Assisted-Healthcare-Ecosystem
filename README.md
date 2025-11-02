# ChikitsaMitra: AI-Powered Preventive & Assisted Healthcare Ecosystem

##  **Project Vision**

**ChikitsaMitra** is a comprehensive, multi-modal AI companion designed to bridge critical gaps in the Indian healthcare landscape.

We address issues of **access**, **misinformation**, **language barriers**, and **fragmented appointment systems** by combining verified AI guidance with integrated hospital booking and gamified preventative wellness.

###  Problems Solved

* Lack of **24x7 medical guidance** for rural and elderly users.

* Confusion and difficulty in **government hospital appointment booking** (ORS/eSwasthya systems).

* Need for an **engaging platform** to encourage preventive health habits.

##  **Core Features**

ChikitsaMitra is divided into three core modules, all accessible via a unified, responsive web interface:

###  1. AI Health Companion (Chatbot)

| **Feature** | **Description** | 
 | ----- | ----- | 
| **Multi-Modal Input** | Accepts voice commands (via Web Speech API) and text for accessibility. | 
| **Intelligent Triage** | Provides verified medical guidance and detects early health or stress symptoms. | 
| **Multilingual Support** | Designed for accessibility, addressing language barriers for regional users. | 

###  2. Assisted Appointment Booking

| **Feature** | **Description** | 
 | ----- | ----- | 
| **Integrated Booking** | Allows users to book appointments across Hospitals and Departments. | 
| **Cascading Selectors** | Dynamic, validated forms based on State, District, Hospital, and Department. | 
| **Security & Confirmation** | Includes OTP verification logic for phone numbers and generates a downloadable PDF appointment slip using **jspdf** and **html2canvas**. | 

###  3. Gamified Wellness & Engagement

To encourage daily usage and mental health monitoring, we integrated simple, coin-based reward games:

*  **Inhale & Exhale**: A guided breathing exercise that rewards coins upon cycle completion.

  *(File: `inhaleexhale.html`)* - 🕹️ **Tic-Tac-Toe**: A quick game against the AI, also linked to the reward system.

  *(File: `tictactoe.html`)*

## 🛠️ **Technology Stack**

This project is built as a **highly performant, serverless web application** combining front-end best practices with Google's robust backend services.

| **Category** | **Technologies Used** | 
 | ----- | ----- | 
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), Font Awesome | 
| **Styling** | Custom CSS (Responsive, Clean UI) and Tailwind CSS (for games) | 
| **Services (Backend)** | Google Apps Script (GAS): Used as a serverless API endpoint for form submission and potential OTP/data services | 
| **Data Storage** | Local Storage (for basic demo/bookings list), Firestore/Firebase (for coin/point tracking in games) | 
| **Key Libraries** | html2canvas, jspdf (for PDF generation), Web Speech API | 

## 📐 **Architecture & Data Flow**

The **ChikitsaMitra** web application follows a clean separation of concerns:

* **Client (Web App):** `index.html`, `styles.css`, and `script.js` manage the UI, user interaction, and client-side validation.

* **Serverless API:** Critical data (like appointment forms) is sent via `fetch` to the configured **APPS_SCRIPT_EXEC_URL**.

* **Data Persistence:** - Booking status is managed via **Local Storage** for quick retrieval.

  * Gamification state (user coins/points) is persisted using **Google Firestore** for a real-time, multi-session experience.

##  **Getting Started**

Follow these simple steps to set up and run **ChikitsaMitra** locally:

### 🔹 1. Clone the Repository
