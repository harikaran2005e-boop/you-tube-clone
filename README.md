# Video Download & Commenting Management Platform

A full-stack, enterprise-grade video management and streaming ecosystem featuring controlled video downloads with quota management, AI-powered multilingual community discussions, Razorpay subscription lifecycle billing, WebRTC real-time video conferencing, and device security auditing.

---

## 📁 Repository Structure

```text
├── backend/                  # Node.js + Express + MongoDB REST API Server
│   ├── config/              # MongoDB connection configuration
│   ├── models/              # Mongoose data schemas (User, Video, Meeting, Comment, etc.)
│   ├── routes/              # Express API endpoints
│   ├── scratch/             # Automated test suites (52 passing audit tests)
│   ├── .env.example         # Template for environment variables
│   ├── package.json         # Backend dependencies & scripts
│   └── server.js            # Express server entry point (Port 5000)
│
├── frontend/                 # React 19 + Vite Modern Web Application
│   ├── src/                 # React components, design system & hooks
│   │   ├── components/      # CommentSystem, VideoCallingDashboard, CustomVideoPlayer, etc.
│   │   ├── App.jsx          # Main application dashboard & tab navigation
│   │   └── App.css          # Curated full-viewport design system (Light & Dark themes)
│   ├── index.html           # HTML5 entry template
│   ├── package.json         # Frontend dependencies & scripts
│   └── vite.config.js       # Vite build configuration (Port 5173)
│
├── Vanilla/                  # Pure Vanilla Web Implementation
│   ├── intern.html          # Semantic HTML5 layout
│   ├── intern.css           # Vanilla CSS styles & layout
│   └── intern.js            # Vanilla JavaScript client logic
│
├── .gitignore               # Unified monorepo ignore rules
├── package.json             # Root monorepo orchestration scripts
└── README.md                # Project documentation & setup guide
```

---

## 🚀 Key Modules & Features

1. **Controlled Video Download Manager (Task 1)**
   * Daily quotas enforced per subscription tier (Free: 1/day, Bronze: 5/day, Silver: 10/day, Gold: 20/day).
   * 15-minute grace window for duplicate re-downloads without quota decrement.
   * Unauthorized device binding & fingerprint tracking.
   * Simultaneous download stream prevention (`429 Too Many Requests`).

2. **Multilingual Discussion & Commenting Board (Task 2)**
   * Real-time nested replies and multi-level discussion threads.
   * On-demand AI translation in 40+ international languages.
   * Automated moderation (profanity blocking, spam detection, malicious link protection).
   * 15-minute edit & delete window with full version audit logging.
   * Comment flood rate limiting with challenge-response CAPTCHA.

3. **Subscription Lifecycle & Razorpay Billing (Task 3)**
   * Tier management: Free, Bronze ($5/mo), Silver ($15/mo), Gold ($30/mo).
   * Monthly vs. Yearly billing toggles with dynamic discount calculations.
   * Razorpay simulated checkout flow (Success, Failed, Signature mismatch, Cancelled).
   * Automated invoice generation and downloadable PDF records.

4. **Time Adaptation & Security Device Audit (Task 4)**
   * Auto-detection of Indian Standard Time (IST): Light theme (5 AM – 12 PM), Dark theme (12 PM – 5 AM).
   * Suspicious login detection triggering Email OTP verification.
   * Trusted device management with session revocation capabilities.

5. **Custom HTML5 Video Player (Task 5)**
   * Custom volume sliders, playback rates, fullscreen & theater mode.
   * Interactive hover timeline previews and keyboard hotkeys.
   * Auto-resume from last saved playback position.
   * 90% watch threshold completion detection and playlist autoplay.

6. **WebRTC Real-Time Video Conferencing (Task 6)**
   * Instant room creation and 1-click demo room join (`call-demo101`, `call-design99`).
   * Camera and microphone controls with front/rear camera toggle.
   * In-call chat with file attachment sharing.
   * Screen sharing & host moderation controls (lock meeting, mute all, hand raise).
   * Client-side call recording with instant `.webm` export.

---

## 🛠️ Local Setup & Installation

### Prerequisites
* **Node.js** (v18.0.0 or higher recommended)
* **MongoDB** (Local instance running at `mongodb://127.0.0.1:27017` or MongoDB Atlas URI)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <your-repository-url>
cd "internship 2026"

# Install dependencies for both Backend and Frontend in one command
npm run install:all
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory (you can copy the provided `.env.example`):
```bash
cp backend/.env.example backend/.env
```
Inside `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/internship
```

### 3. Running the Application

Open two terminal windows:

* **Terminal 1: Start Backend API Server**
  ```bash
  npm run start:backend
  # Server will run on http://localhost:5000
  ```

* **Terminal 2: Start Frontend Application**
  ```bash
  npm run start:frontend
  # Web app will run on http://localhost:5173
  ```

---

## 🧪 Automated Test Suite

To run the complete 52-point database and API verification audit:
```bash
npm run test:backend
```
Expected result: **`52 / 52 TESTS PASSED (100%)`**.

---

## 📄 License
ISC License.
