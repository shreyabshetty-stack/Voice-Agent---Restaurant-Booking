// mcp_servers/google_calendar_server.js
// Model Context Protocol (MCP) Server for Google Calendar Integration
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { google } = require("googleapis");
const fs = require("fs");

const server = new Server(
  {
    name: "google-calendar-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

let calendarApi = null;
const calendarId = process.env.CALENDAR_ID || process.env.GOOGLE_CALENDAR_ID || "primary";

function getCalendarClient() {
  if (calendarApi) return calendarApi;
  let auth;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = typeof process.env.GOOGLE_SERVICE_ACCOUNT_JSON === 'string' 
        ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) 
        : process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]
      });
    } catch (e) {
      console.error("Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:", e);
    }
  }

  if (!auth) {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentialsPath || !fs.existsSync(credentialsPath)) {
      throw new Error(`Google credentials file not found at: ${credentialsPath}`);
    }
    auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]
    });
  }
  calendarApi = google.calendar({ version: "v3", auth });
  return calendarApi;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "check_calendar_availability",
        description: "Checks if a specific time slot on Google Calendar is available",
        inputSchema: {
          type: "object",
          properties: {
            start_time: { type: "string", description: "ISO 8601 start time (e.g. 2026-08-07T19:30:00+05:30)" },
            end_time: { type: "string", description: "ISO 8601 end time (e.g. 2026-08-07T20:30:00+05:30)" }
          },
          required: ["start_time", "end_time"]
        }
      },
      {
        name: "create_tentative_hold",
        description: "Creates a tentative 15-minute hold on Google Calendar for a dining reservation",
        inputSchema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Event title (e.g. Dining Hold — Outdoor/Patio — TABLE-B99)" },
            start_time: { type: "string", description: "ISO 8601 start time" },
            end_time: { type: "string", description: "ISO 8601 end time" }
          },
          required: ["summary", "start_time", "end_time"]
        }
      },
      {
        name: "cancel_tentative_hold",
        description: "Deletes a tentative hold event from Google Calendar using the event ID",
        inputSchema: {
          type: "object",
          properties: {
            event_id: { type: "string", description: "Google Calendar Event ID to delete" }
          },
          required: ["event_id"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const calendar = getCalendarClient();

  if (name === "check_calendar_availability") {
    // Check freebusy or events.list
    const res = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date(args.start_time).toISOString(),
      timeMax: new Date(args.end_time).toISOString(),
      singleEvents: true,
      orderBy: "startTime"
    });

    const events = res.data.items || [];
    const available = events.length === 0;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ available, conflictingCount: events.length })
        }
      ]
    };
  }

  if (name === "create_tentative_hold") {
    const res = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: {
        summary: args.summary,
        description: "Shiv Sagar Restaurant Voice Reservation Tentative Hold. Tables are held for 15 minutes maximum.",
        start: {
          dateTime: new Date(args.start_time).toISOString()
        },
        end: {
          dateTime: new Date(args.end_time).toISOString()
        },
        status: "tentative"
      }
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ event_id: res.data.id, htmlLink: res.data.htmlLink })
        }
      ]
    };
  }

  if (name === "cancel_tentative_hold") {
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: args.event_id
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, deletedEventId: args.event_id })
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error running Calendar MCP server:", err);
  process.exit(1);
});
