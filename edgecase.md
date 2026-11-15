# Edge Cases & Exception Handling Blueprint (edgecase.md)
## Restaurant Voice Reservation Assistant (Shiv Sagar Web App)

This document details the critical edge cases, structural exceptions, and operational mitigation strategies designed into the table reservation assistant across its conversational, signal processing, and external integration layers.

---

### 1. Conversational & Dialogue Edge Cases

#### 1.1 Vague Date/Time Inputs
*   **Scenario**: Diner asks: *"I want to book a table for sometime next week around dinner time."*
*   **Impact**: LLM tool calls cannot execute without discrete parameters (`YYYY-MM-DD` and `HH:MM`).
*   **Mitigation Strategy**: The system instructions restrict the agent from guessing. The agent is forced to reply with clarifying bounds: 
    *   *Agent Response:* *"I can certainly help you book for dinner. Which specific day next week were you thinking of? Our dinner slots run between 7:00 PM and 10:30 PM Indian Standard Time (IST)."*
    *   Once the diner provides a day (e.g., *"Thursday"*), the system resolves the relative date to an absolute timestamp relative to current local time.

#### 1.2 PII Leakage in Spelled Inputs
*   **Scenario**: Diner attempts to circumvent the No-PII constraint by spelling out details: *"No phone number, but my name is R-A-M-E-S-H."* or *"My email is test at gmail dot com."*
*   **Impact**: Exposure of PII on Sheets logs and Calendar events, breaching compliance guidelines.
*   **Mitigation Strategy**:
    *   **Tier 1 (Regex Filtering)**: The backend proxy inspects raw STT transcripts. Standard regex expressions sweep and redact alphanumeric sequences resembling emails, phone numbers, or credit card hashes before Groq LLM processing.
    *   **Tier 2 (System Prompts)**: Groq system instructions explicitly direct the LLM to ignore names or contact methods: *"If the user shares names or contact details, do not write them to database tools. Generate the TABLE-XXX code and confirm the booking solely using that code."*

#### 1.3 Allergy and Medical Safety Inquiries
*   **Scenario**: Diner asks: *"Is your Sagar Special Pav Bhaji completely safe for a child with a severe peanut allergy? Can you guarantee the kitchen has zero cross-contamination?"*
*   **Impact**: Restaurant takes on major liability if an automated voice agent guarantees allergen safety.
*   **Mitigation Strategy**:
    *   **Strict Refusal Tool**: The Groq LLM system prompt has a high-priority guardrail block.
    *   If words like `allergy`, `allergic`, `severe`, `safe for my baby`, `celiac` are matched in intent, the agent executes the refusal prompt: *"For safety reasons, I cannot give medical or ingredient safety guarantees. Please contact the restaurant staff directly at our physical number or visit shivsagar.in to review our kitchen allergen protocols."*

#### 1.4 Out-of-Scope Request Redirection
*   **Scenario**: Diner asks: *"What is the recipe for your paneer special?"* or *"Can I book a table at the restaurant next door?"*
*   **Impact**: Deflects from the core booking funnel and increases processing costs.
*   **Mitigation Strategy**: The LLM intercepts out-of-scope queries, politely refuses, and redirects: *"I can only help you manage reservations at Shiv Sagar. For menu details, recipes, or other inquiries, please visit shivsagar.in."*

---

### 2. Audio Processing & Signal Exceptions

#### 2.1 Heavy Ambient Background Noise
*   **Scenario**: User is walking on a busy urban street, driving in traffic, or calling from a crowded railway station.
*   **Impact**: High Word Error Rate (WER) in transcription, or false silence detection cutting the user off.
*   **Mitigation Strategy**:
    *   **Client-side Node Graph**: In [app.js](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/static/app.js), the microphone channel is filtered through a `BiquadFilterNode` (High-Pass at 120Hz) to remove low hums and traffic rumbles, and a `DynamicsCompressorNode` setting a threshold gate at `-45dB` to eliminate low-volume ambient noises when the user is silent.
    *   **Deepgram STT Config**: The backend specifies the `nova-2` model optimized for noise handling, utilizing background-noise suppression query parameters in the REST API.

#### 2.2 Voice Streaming False Interruption (Phase 2)
*   **Scenario**: During a continuous stream, the user coughs, clears their throat, or there is background chatter in their room.
*   **Impact**: Gemini Live interprets this as an interruption, halting its output audio mid-sentence.
*   **Mitigation Strategy**:
    *   The Web Audio API client measures voice activity detection (VAD) parameters. It applies a debounce threshold: incoming audio must cross the voice threshold for at least `400ms` before a stream transmission starts, preventing short noises (coughs, sneezes) from triggering cancellation flags.

#### 2.3 Microphone Permission Blocked
*   **Scenario**: Diner blocks microphone access when prompted by the browser, or opens the app via an unencrypted HTTP link (which blocks MediaDevices APIs).
*   **Impact**: User cannot speak; app is completely broken.
*   **Mitigation Strategy**:
    *   [app.js](file:///d:/Voice%20Agent%20-%20Restaurant%20Booking/static/app.js) captures microphone check rejections. If `getUserMedia` fails, the client automatically displays a text input box in the footer and alerts the user: *"Microphone access blocked. You can still type your reservation instructions here."*

---

### 3. Integration & Third-Party Connection Failures

#### 3.1 Google Workspace API Offline (MCP Offline)
*   **Scenario**: Google Sheets or Calendar API is down, or the local MCP server crashes.
*   **Impact**: Double-write fails, leaving bookings unlogged.
*   **Mitigation Strategy**:
    *   **SQLite Local Cache**: If the MCP connection fails, `mcp_client.js` saves the transaction structure `[Date, Time, Occasion, Code, Status: 'PENDING_SYNC']` to a local backup cache on the backend.
    *   **Cron Synchronization**: A background cron worker sweeps the local database every 60 seconds and retries syncing to Google Sheets and Calendar once connection is re-established.
    *   **Optimistic Booking Confirmation**: The agent completes the booking and conveys the code `TABLE-XXX` to the diner, preventing user frustration.

#### 3.2 Partial Double-Write Failure
*   **Scenario**: The Calendar Hold is created successfully, but writing the entry to the Google Sheet log fails (e.g. sheet cell lock or permission error).
*   **Impact**: Event blocked in Calendar, but no record exists in the central Reservation Sheets Log.
*   **Mitigation Strategy**:
    *   **Transaction Rollbacks**: Inside `mcp_client.js`, the booking execution is wrapped in a `try/catch` block. If the Sheets write fails, the client fires a cancellation event `cancel_tentative_hold` referencing the generated `event_id` to delete the Calendar slot hold before throwing the server error.

#### 3.3 Low Bandwidth Socket Drops (Phase 2)
*   **Scenario**: A diner walking home drops from a 5G connection to a low-speed 2G signal, causing WebSocket packets to buffer.
*   **Impact**: Audio stream buffers, high latency, call lag.
*   **Mitigation Strategy**:
    *   **Automatic Fallback**: The client-side WebSocket client monitors packet round-trip time. If latency exceeds `2.5 seconds` or the socket disconnects unexpectedly, the client automatically closes the stream, displays a banner: *"Connection slow. Swapping to Push-to-Talk mode."*, and loads the Phase 1 HTTP recorder.

#### 3.4 Calendar Inventory Locking (No-Show Holds)
*   **Scenario**: A diner initiates a table booking, the agent blocks a slot on the Google Calendar, but the diner disconnects before finalizing.
*   **Impact**: Table remains locked in Calendar, blocking other diners from reserving that slot.
*   **Mitigation Strategy**:
    *   **TTL Holds**: Every tentative calendar hold is created with a `15-minute` time-to-live parameter. A backend server scheduler keeps track of reservation codes. If no final confirmation write is completed on Google Sheets within 15 minutes, the event is automatically deleted from Google Calendar.
