# Implementation Plan: Restaurant Table Reservation Assistant

Build and deploy a voice-enabled restaurant table reservation assistant for **Shiv Sagar** in a phased approach. The system hosts a web-based client utilizing REST APIs (Deepgram, Groq, Smallest AI) in Phase 1, migrating to a real-time full-duplex WebSocket stream (Gemini Live API) in Phase 2, with backend double-write holds managed via the Model Context Protocol (MCP) on Google Calendar and Google Sheets.

---

## User Review Required

Please review the following critical design decisions and configuration prerequisites before approving the plan:

> [!IMPORTANT]
> **API Credentials Requirement**
> Development and testing of this application require valid credentials for:
> 1. **Deepgram API Key** (for speech-to-text in Phase 1)
> 2. **Groq API Key** (for Llama 3.3 Versatile inference in Phase 1)
> 3. **Smallest AI API Key** (for Waves TTS voice generation in Phase 1)
> 4. **Gemini Live API access** (for real-time streaming in Phase 2)
> 5. **Google Workspace Service Account** (with permissions to write to target Google Sheets and Google Calendar)

> [!WARNING]
> **SSL/HTTPS Requirement for Browser Media API**
> Modern web browsers restrict microphone access (`navigator.mediaDevices.getUserMedia`) to secure contexts only (`localhost` or `https://` protocols). For hosting the staging test app, we must either run local development servers or deploy with HTTPS certificates.

---

## Open Questions

Before proceeding to code generation, please clarify:
1. **Google Service Account Credentials**: Do you have an existing service account JSON key file ready, or should the implementation package mock the MCP server responses during the initial development phases?
2. **Smallest AI Voice Preference**: Do you have a preferred voice ID/model from the Smallest AI Waves platform (e.g., male/female, specific dialect or language) to use for the restaurant assistant?
3. **Mock Inventory Presets**: Shall we pre-populate the mock database with a small number of occupied slots to test the "slot busy / offer alternatives" flow, or let it start completely empty?

---

## Proposed Changes

The codebase will be modularly organized between the frontend client assets and backend Node.js server directories.

---

### Backend Server Infrastructure

Responsible for security proxying, session orchestration, WebSocket tunneling, and hosting the MCP client.

#### [NEW] [package.json](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/package.json)
Contains script commands (`npm start`, `npm run dev`), server dependencies (`express`, `ws`, `dotenv`, `groq-sdk`, `@deepgram/sdk`, `@modelcontextprotocol/sdk`, `googleapis`), and node engine mappings.

#### [NEW] [.env](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/.env)
Configuration environment template containing placeholders for the external API keys and Google sheet IDs.

#### [NEW] [server.js](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/server.js)
The core backend application:
*   Sets up Express REST server and handles CORS.
*   Implements the `/api/voice-turn` REST endpoint for Phase 1.
*   Spawns the local WebSocket upgrade handler at `/api/live-stream` for Phase 2 audio proxying.
*   Maintains the active in-memory session states (track user occasion, date, time selection progress).
*   Integrates regex filters to strip phone numbers and emails (PII) before forwarding transcripts.

#### [NEW] [mcp_client.js](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/mcp_client.js)
Coordinates MCP calls:
*   Spawns child processes to connect to the Google Sheets MCP server and Google Calendar MCP server using stdio transport.
*   Exposes wrapper functions `checkInventory(date, slot)`, `createReservationHold(date, slot, occasion, code)`, and `updateReservation(code, date, slot, status)`.
*   Implements double-write safety: rolls back Calendar holds if Sheet logging fails.

---

### Frontend Web Client

Provides a premium dark glassmorphic landing page hosting the floating chat reservation widget.

#### [NEW] [index.html](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/index.html)
Static HTML5 page layout detailing the Shiv Sagar restaurant menu, locations, and including the hidden container drawer for the reservation assistant widget.

#### [NEW] [index.css](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/index.css)
CSS stylesheet defining:
*   Branding color variables (Obsidian Slate `#121214`, Warm Saffron `#E37A20`, Brass Gold `#D4AF37`).
*   Google Fonts `@import` references for `Outfit` and `Inter`.
*   Glassmorphic card visuals and visual state transition classes.
*   Voice wave visualizer canvas scaling.

#### [NEW] [app.js](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/app.js)
Client-side interactivity:
*   Initializes the browser Web Audio API contexts (Biquad high-pass filters at 120Hz, Dynamic Compressor thresholds).
*   **Phase 1 Code**: Logic for recording mic audio into Wav bytes, calling `/api/voice-turn`, playing base64-encoded audio returns, and populating chat dialogue bubbles.
*   **Phase 2 Code**: Sets up WebSocket connection to the backend proxy, streams continuous PCM audio chunks, listens for dynamic cancel cues, and instantly flushes play buffers on interruption.
*   Renders visualizer waves dynamically on the page canvas.

---

### Configuration Files

#### [NEW] [mcp_config.json](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/mcp_config.json)
Config file detailing paths and environments for Google Sheets and Calendar MCP node servers.

---

## Phased Implementation Sequence

```
Phase 0: Project Setup ────► Phase 1: Push-to-Speak ────► Phase 2: MCP Integrations ────► Phase 3: Gemini Streaming
  (Deps, config, keys)        (REST voice pipes, UI)      (GSheets, GCalendar hold)      (WebSockets, Live API)
```

### Phase 0: Setup and Environment (Day 1)
1. Initialize package structure and install all Node.js module dependencies.
2. Formulate system prompting rules for the LLM agent (enforcing time zone IST, allergy refusals, and PII filters).
3. Validate API credential validation routines on server startup.

### Phase 1: Turn-Based Conversational Flow (Day 2-3)
1. Develop frontend microphone recorders utilizing the Web Audio API filter node configurations.
2. Build backend proxy integrations with Deepgram STT, Groq Llama 3.3, and Smallest AI TTS APIs.
3. Code the main conversational workflow states (occasion, slot matching, alternatives suggestion).
4. Create the glassmorphism chat panel design with state transitions (idle, recording, speaking).

### Phase 2: Google Workspace Integration via MCP (Day 4)
1. Initialize the Google Sheets and Calendar MCP node servers.
2. Develop the backend double-write wrapper classes inside `mcp_client.js` with rollbacks.
3. Implement the random reservation code generator (e.g., `TABLE-B99`).
4. Validate that table holds create calendar events and log records on Google Sheets.

### Phase 3: Real-Time Audio Streaming (Day 5-6)
1. Set up the backend WebSocket proxy upgrade pathway.
2. Refactor frontend `app.js` to continuously stream raw PCM16 mic buffers over the socket.
3. Integrate the Gemini Live API client loop on the backend.
4. Program interruption handlers: clear browser audio buffers instantly on interruption command reception.
5. Create the 3D-like glowing canvas wave visualizer that matches active vocal heights.

---

## Verification Plan

### Automated Tests
To confirm third-party connectivity and tool accuracy, we will run node execution scripts from the terminal:
*   **API Ping Test**: `node scripts/test_apis.js`
    *   Verifies that Deepgram, Groq, and Smallest AI API keys are valid and responding.
*   **MCP Integration Test**: `node scripts/test_mcp.js`
    *   Verifies that local Google Workspace servers can search, block, and remove event slots on Google Calendar/Sheets.

### Manual Verification
1.  **Phase 1 Execution Loop**:
    *   Open page in browser, click "Microphone" button, and speak: *"Book a table for 4 people on Friday at 8 PM"*.
    *   Confirm the agent responds visually and vocally with the 15-minute hold message and time specified in IST.
2.  **State and Constraints Verification**:
    *   *PII Check*: Speak: *"My name is Ramesh Kumar, email ramesh@gmail.com, please book for 8 PM"*. Verify the backend logs strip name and email, and the generated Sheets record contains empty/no name/phone details.
    *   *Allergy Refusal*: Speak: *"Is your food safe for a severe nut allergy?"*. Verify the voice agent declines to offer medical advice and references `shivsagar.in`.
    *   *Menu redirection*: Speak: *"Can you tell me the prices of your paneer dishes?"*. Verify agent tells the user to check `shivsagar.in` for menu and timings.
3.  **Phase 2 Streaming and Interruption Verification**:
    *   Start a real-time call. While the agent is in the middle of speaking its greeting, speak over it: *"Actually, I want a table in the outdoor patio."*
    *   Confirm that the agent stops speaking immediately, processes the command, and changes the occasion slot to "Outdoor/Patio".
4.  **Double-Write Sync Verification**:
    *   Successfully book a table.
    *   Open the target Google Calendar and verify an event titled `Dining Hold — {Occasion} — {Code}` exists.
    *   Open the Google Sheet and check that the row has date, occasion, slot, and code correct.
