// mcp_client.js - Model Context Protocol Client Wrapper
// Interfaces with Google Sheets and Google Calendar MCP servers

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const path = require('path');
const fs = require('fs');
const os = require('os');

// Local in-memory mock database as fallback
const mockReservations = [];
const mockOccupiedSlots = new Set([
  '2026-08-07T19:30:00+05:30',
  '2026-08-07T20:00:00+05:30'
]);

let calendarClient = null;
let sheetsClient = null;
let isMcpActive = false;

// Initialize MCP Connections
async function initMcp() {
  // If credentials are provided via JSON string (e.g. on Vercel or cloud environments)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS))) {
    try {
      const tmpPath = path.join(os.tmpdir(), 'service_account.json');
      fs.writeFileSync(tmpPath, typeof process.env.GOOGLE_SERVICE_ACCOUNT_JSON === 'string'
        ? process.env.GOOGLE_SERVICE_ACCOUNT_JSON
        : JSON.stringify(process.env.GOOGLE_SERVICE_ACCOUNT_JSON));
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
    } catch (e) {
      console.warn("Could not write temporary service_account.json:", e.message);
    }
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!credentialsPath || !fs.existsSync(credentialsPath) || !spreadsheetId) {
    console.warn("⚠️ MCP WARNING: Google service account credentials or Spreadsheet ID not found. Falling back to local in-memory mock database.");
    isMcpActive = false;
    return;
  }

  try {
    console.log("🔌 Initializing MCP Google Sheets Server client...");
    // Config path to local node-based MCP servers if available
    const sheetsTransport = new StdioClientTransport({
      command: "node",
      args: [path.join(__dirname, "mcp_servers", "google_sheets_server.js")],
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
        SPREADSHEET_ID: spreadsheetId
      }
    });

    sheetsClient = new Client({ name: "SheetsReservationClient", version: "1.0.0" });
    await sheetsClient.connect(sheetsTransport);

    console.log("🔌 Initializing MCP Google Calendar Server client...");
    const calendarTransport = new StdioClientTransport({
      command: "node",
      args: [path.join(__dirname, "mcp_servers", "google_calendar_server.js")],
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
        CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || 'primary'
      }
    });

    calendarClient = new Client({ name: "CalendarReservationClient", version: "1.0.0" });
    await calendarClient.connect(calendarTransport);

    isMcpActive = true;
    console.log("🟢 MCP SUCCESS: Successfully connected to Google Sheets and Google Calendar MCP servers.");
  } catch (error) {
    console.error("🔴 MCP CONNECTION ERROR: Failed to bootstrap MCP servers. Defaulting to local mock DB.", error);
    isMcpActive = false;
  }
}

// Check slot availability (Google Calendar tool query)
async function checkAvailability(date, time) {
  const isoString = `${date}T${time}:00+05:30`;

  if (!isMcpActive) {
    // Local check fallback
    const occupied = mockOccupiedSlots.has(isoString);
    if (occupied) {
      const alternatives = getMockAlternatives(isoString);
      return { available: false, alternative_slots: alternatives };
    }
    return { available: true };
  }

  try {
    // Call Google Calendar MCP tool
    const startTime = new Date(isoString);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1-hour slot default

    const result = await calendarClient.callTool({
      name: "check_calendar_availability",
      arguments: {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      }
    });

    // Parse MCP response
    const data = JSON.parse(result.content[0].text);
    if (!data.available) {
      const alternatives = await getMcpAlternatives(startTime);
      return { available: false, alternative_slots: alternatives };
    }
    return { available: true };
  } catch (error) {
    console.error("MCP checkAvailability failed, falling back to mock:", error);
    return { available: !mockOccupiedSlots.has(isoString) };
  }
}

// Book reservation (Double-Write: Google Calendar Event + Google Sheets Log)
async function bookReservation(date, time, occasion, code) {
  const isoString = `${date}T${time}:00+05:30`;

  if (!isMcpActive) {
    // Local write fallback
    mockOccupiedSlots.add(isoString);
    mockReservations.push({ code, date, time, occasion, status: 'ACTIVE' });
    return { confirmed: true, code };
  }

  let calendarEventId = null;

  try {
    const startTime = new Date(isoString);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // 1. Google Calendar Hold
    const calResult = await calendarClient.callTool({
      name: "create_tentative_hold",
      arguments: {
        summary: `Dining Hold — ${occasion} — ${code}`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      }
    });
    
    const calData = JSON.parse(calResult.content[0].text);
    calendarEventId = calData.event_id;

    // 2. Google Sheets Logging
    await sheetsClient.callTool({
      name: "append_reservation",
      arguments: {
        date: date,
        occasion: occasion,
        slot: time,
        code: code,
        calendarEventId: calendarEventId
      }
    });

    return { confirmed: true, code, calendarEventId };

  } catch (error) {
    console.error("🔴 MCP Transaction failed! Rolling back double-writes.", error);
    // ROLLBACK: If calendar event was created but Sheets logging failed, remove the event
    if (calendarEventId) {
      try {
        await calendarClient.callTool({
          name: "cancel_tentative_hold",
          arguments: { event_id: calendarEventId }
        });
        console.log("🔄 Rollback successful: Canceled tentative calendar hold.");
      } catch (rollbackError) {
        console.error("CRITICAL: Rollback calendar hold failed!", rollbackError);
      }
    }
    throw new Error(`Double-write reservation failed: ${error.message}`);
  }
}

// Cancel reservation
async function cancelReservation(code) {
  if (!isMcpActive) {
    // Local cancel fallback
    const resIdx = mockReservations.findIndex(r => r.code === code && r.status === 'ACTIVE');
    if (resIdx !== -1) {
      mockReservations[resIdx].status = 'CANCELED';
      const isoString = `${mockReservations[resIdx].date}T${mockReservations[resIdx].time}:00+05:30`;
      mockOccupiedSlots.delete(isoString);
      return { success: true };
    }
    return { success: false, error: "Code not found" };
  }

  try {
    // 1. Update Sheets log
    const sheetUpdate = await sheetsClient.callTool({
      name: "update_reservation_status",
      arguments: {
        code: code,
        status: "CANCELED"
      }
    });
    
    const updateResult = JSON.parse(sheetUpdate.content[0].text);
    if (!updateResult.success) {
      return { success: false, error: "Sheets update failed" };
    }

    // 2. Delete Calendar event hold
    if (updateResult.calendarEventId) {
      await calendarClient.callTool({
        name: "cancel_tentative_hold",
        arguments: {
          event_id: updateResult.calendarEventId
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("MCP cancelReservation failed:", error);
    return { success: false, error: error.message };
  }
}

// Helper: Local alternative calculations
function getMockAlternatives(targetDateTimeStr) {
  const targetDate = new Date(targetDateTimeStr);
  const alternatives = [];
  const offsets = [-30, 30, -60, 60];
  
  for (const offset of offsets) {
    const candidate = new Date(targetDate.getTime() + offset * 60000);
    const offsetMs = 5.5 * 60 * 60 * 1000;
    const candidateIST = new Date(candidate.getTime() + offsetMs);
    const candidateISO = candidateIST.toISOString().replace('Z', '+05:30');
    
    if (!mockOccupiedSlots.has(candidateISO)) {
      let hours = candidate.getHours();
      const minutes = candidate.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      alternatives.push(`${hours}:${minutes} ${ampm}`);
      if (alternatives.length >= 2) break;
    }
  }
  return alternatives;
}

// Helper: MCP-based alternative calculations
async function getMcpAlternatives(targetDate) {
  const alternatives = [];
  const offsets = [-30, 30, -60, 60];
  
  for (const offset of offsets) {
    const candidate = new Date(targetDate.getTime() + offset * 60000);
    const candidateEnd = new Date(candidate.getTime() + 60 * 60 * 1000);
    
    try {
      const res = await calendarClient.callTool({
        name: "check_calendar_availability",
        arguments: {
          start_time: candidate.toISOString(),
          end_time: candidateEnd.toISOString()
        }
      });
      const data = JSON.parse(res.content[0].text);
      if (data.available) {
        let hours = candidate.getHours();
        const minutes = candidate.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        alternatives.push(`${hours}:${minutes} ${ampm}`);
        if (alternatives.length >= 2) break;
      }
    } catch (e) {
      console.warn("MCP checking alternative slot failed", e);
    }
  }
  return alternatives;
}

function isReady() {
  return isMcpActive;
}

module.exports = {
  initMcp,
  isReady,
  checkAvailability,
  bookReservation,
  cancelReservation
};
