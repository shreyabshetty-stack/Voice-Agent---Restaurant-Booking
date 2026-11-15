# 🎙️ Shiv Sagar - Voice-Enabled Restaurant Reservation Agent

A production-ready conversational voice assistant and luxury booking interface for **Shiv Sagar** (pure vegetarian dining). The assistant allows diners to book, check availability, reschedule, and cancel reservations using natural spoken speech with zero latency friction.

🔗 **Live Production URL**: [https://voice-agent-restaurant-booking.vercel.app/](https://voice-agent-restaurant-booking.vercel.app/)

---

## 🌟 Key Features

1. **Natural Voice Interaction & Barge-In**:
   - **Speech-to-Text (STT)**: Powered by Deepgram `nova-2` with intelligent sentence formatting.
   - **Text-to-Speech (TTS)**: Ultra-low latency voice synthesis via Smallest AI Waves (`lightning_v3.1_pro`, Indian voice *Meher*).
   - **Voice Activity Detection (Auto-VAD)**: Automatically detects when speech stops (1.2s silence window) and submits the turn without requiring double taps.
   - **Instant Barge-In**: Tapping the microphone immediately cuts off assistant speech and listens to the user.

2. **Autonomous Tool Calling & Strict Guardrails**:
   - **Orchestration**: Groq (`openai/gpt-oss-20b`) handles reasoning and multi-turn dialogue.
   - **Explicit Month & Date Confirmation**: Never assumes a month when only a date is given (e.g. "on the 16th").
   - **Mandatory 2-Step Confirmation**: Verifies all details (date, time, guest count, table occasion) and asks: *"Shall I go ahead and confirm this reservation for you?"* before booking.
   - **Explanations != Selections**: Asking what "Outdoor/Patio" means answers the query without falsely booking or selecting that option.
   - **Strict No-PII Policy**: Diners are identified solely by anonymous alpha-numeric codes (e.g., `TABLE-B99`). No names, phone numbers, or emails are collected.
   - **Medical Liability & Allergen Guard**: Courteously directs dietary and medical inquiries to `shivsagar.in` and restaurant management.

3. **Dual-Sync Model Context Protocol (MCP) Backend**:
   - **Google Sheets MCP Server**: Real-time append and status tracking to the manager's master reservation spreadsheet.
   - **Google Calendar MCP Server**: Creates 15-minute tentative holds in Indian Standard Time (IST) on the host table schedule.
   - Automatic rollback and atomic consistency across both platforms.

---

## 🏗️ Architecture

```
[ Diner Web Browser ]
      │ (Voice Audio via Web Audio API / PCM WAV)
      ▼
[ Express Server (Node.js) ]
      │
      ├──> Deepgram API (STT: nova-2)
      │       │
      │       ▼
      ├──> Groq API (LLM Function Calling)
      │       │
      │       ▼
      ├──> MCP Stdio Client
      │       ├──> Google Sheets MCP Server (Google Sheets API v4)
      │       └──> Google Calendar MCP Server (Google Calendar API v3)
      │
      └──> Smallest AI Waves API (TTS: lightning_v3.1_pro)
              │
              ▼
[ Audio Response & Ticket Voucher rendered on UI ]
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18.0.0
- Google Cloud Service Account with Google Sheets and Google Calendar API permissions enabled.

### 2. Installation
```bash
git clone https://github.com/shreyabshetty-stack/Voice-Agent---Restaurant-Booking.git
cd Voice-Agent---Restaurant-Booking
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000

# STT & TTS Providers
DEEPGRAM_API_KEY=your_deepgram_api_key
SMALLEST_AI_API_KEY=your_smallest_ai_api_key

# LLM Provider
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b

# Google Integrations
GOOGLE_APPLICATION_CREDENTIALS=service_account.json
# Alternatively in cloud environments:
# GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com
```

### 4. Running Locally
```bash
npm start
```
Visit `http://localhost:3000` in your browser.

---

## ☁️ Deployment Guide

### Option 1: Render.com (Recommended - Free Web Service)
1. Fork or push this repository to GitHub.
2. Sign in to [Render](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Select your repository: `Voice-Agent---Restaurant-Booking`.
4. Configure the service:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   - `DEEPGRAM_API_KEY`
   - `GROQ_API_KEY`
   - `GROQ_MODEL`: `openai/gpt-oss-20b`
   - `SMALLEST_AI_API_KEY`
   - `GOOGLE_SPREADSHEET_ID`
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: (Paste the raw JSON content of your `service_account.json`)
6. Click **Deploy Web Service**.

### Option 2: Railway.app
1. Go to [Railway](https://railway.app/) and select **New Project** -> **Deploy from GitHub repo**.
2. Select `Voice-Agent---Restaurant-Booking`.
3. Go to **Variables** and add the same environment variables as above.
4. Railway will automatically build and start the Express server.

---

## 📄 License
ISC License
