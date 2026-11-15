# Walkthrough: Restaurant Table Reservation Assistant Implementation

We have built and verified the complete end-to-end codebase for the **Restaurant Table Reservation Assistant (Shiv Sagar Web App)**. The system is operating in live production mode with all third-party APIs (Deepgram STT, Groq LLM, Smallest AI Waves TTS) and live Google Workspace integration (Google Sheets & Google Calendar) over the Model Context Protocol (MCP).

---

## Technical Architecture & Components

### 1. Backend Orchestration & MCP Servers
*   **[server.js](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/server.js)**: 
    *   Express static file and API server running on port `3000`.
    *   HTTP POST `/api/voice-turn` router: receives spoken audio/text, scrubs PII (`[MASKED PHONE]`, `[MASKED EMAIL]`), calls Groq function-calling tools with `openai/gpt-oss-120b`, and synthesizes Indian voice audio via Smallest AI Waves.
    *   Live Google Workspace integration using Model Context Protocol (MCP) clients.
*   **[mcp_servers/google_sheets_server.js](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/mcp_servers/google_sheets_server.js)**:
    *   MCP Stdio Server connected via `googleapis` service account.
    *   Manages header initialization and appends rows: `[Timestamp, Date, Slot (IST), Occasion, Reservation Code, Status, Calendar Event ID]`.
    *   Supports `update_reservation_status` (updates status e.g. to `CANCELED`).
*   **[mcp_servers/google_calendar_server.js](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/mcp_servers/google_calendar_server.js)**:
    *   MCP Stdio Server querying free/busy calendar events.
    *   Creates tentative 15-minute holds on Google Calendar.
    *   Deletes calendar events upon cancellation or rollback.
*   **[mcp_client.js](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/mcp_client.js)**: 
    *   Coordinates double-write transactions with rollback protection: deletes Calendar holds if Google Sheets logging fails.

### 2. Front-End Web Client (Shiv Sagar UI)
*   **[index.html](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/static/index.html)**: Luxury dark-mode landing page with interactive food cards, menu, and floating voice reservation widget.
*   **[index.css](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/static/index.css)**: Implements visual tokens (Obsidian Slate `#121214`, Warm Saffron `#E37A20`, Gold `#D4AF37`), glassmorphic styling, and ticket vouchers.
*   **[app.js](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/static/app.js)**:
    *   Configures Web Audio API nodes: `BiquadFilterNode` (120Hz high-pass) + `DynamicsCompressorNode` (-45dB noise gate) for background noise suppression.
    *   Zero-gain audio routing to eliminate acoustic feedback into user speakers.
    *   WAV recording uploader and audio player.

---

## Live Validation Results

### 1. Live API Diagnostic Check (`test_apis.js`)
```powershell
node scripts/test_apis.js
```
**Output**:
```
🔍 Automated API Connection Verification starting...
--------------------------------------------------
✅ Groq (openai/gpt-oss-120b) API: Connected and responding successfully.
✅ Deepgram STT API: Connected and responding successfully.
✅ Smallest AI Waves TTS API: Connected and responding successfully.
--------------------------------------------------
Verification checks complete.
```

### 2. Live Double-Write MCP Integration Check (`test_mcp.js`)
```powershell
node scripts/test_mcp.js
```
**Output**:
```
🔍 Running Model Context Protocol (MCP) and Reservation Logic checks...
----------------------------------------------------------------------
🔌 Initializing MCP Google Sheets Server client...
🔌 Initializing MCP Google Calendar Server client...
🟢 MCP SUCCESS: Successfully connected to Google Sheets and Google Calendar MCP servers.

1. Testing availability check for August 10th at 7:30 PM...
Result: {"available":true}
✅ Availability check passed (slot is free).

2. Testing table hold booking creation...
Result: {"confirmed":true,"code":"TABLE-B99","calendarEventId":"7t3kuu2og47ktv8dv2plun6kds"}
✅ Booking creation passed.

3. Testing cancellation of TABLE-B99 hold...
Result: {"success":true}
✅ Cancellation passed.
----------------------------------------------------------------------
MCP Client logical tests complete.
```

### 3. End-to-End Live Voice Reservation Test
We made a live booking call through `/api/voice-turn`:
* **User Instruction**: *"I want to reserve a table for special occasion on November 25th at 8:00 PM"*
* **Agent Spoken Response**: *"Your special-occasion table is confirmed for 25 Nov 2026 at 20:00 IST. Reservation Code: TABLE-S84 – we will hold the table for up to 15 minutes after your arrival. We look forward to celebrating with you! Have a wonderful day."*

**Verified Live on Google Sheets**:
Row appended in spreadsheet *Restaurant booking*:
* **Date**: `2026-11-25`
* **Slot**: `20:00`
* **Occasion**: `Special Occasion/Anniversary`
* **Reservation Code**: `TABLE-S84`
* **Status**: `ACTIVE`
* **Calendar Event ID**: `m603uo22nm85ouaqd6dq41j69o`

**Verified Live on Google Calendar**:
Event created on calendar `227dc256d4f6065055b95b6f12af3f97b28678a100d43e5501b44a51b8f4339c@group.calendar.google.com`:
* **Summary**: `Dining Hold — Special Occasion/Anniversary — TABLE-S84`
* **Start Time**: `2026-11-25T20:00:00+05:30` (IST)
* **Status**: `tentative`
