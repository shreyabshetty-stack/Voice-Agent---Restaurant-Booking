// mcp_servers/google_sheets_server.js
// Model Context Protocol (MCP) Server for Google Sheets Integration
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { google } = require("googleapis");
const fs = require("fs");

const server = new Server(
  {
    name: "google-sheets-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

let sheetsApi = null;
const spreadsheetId = process.env.SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;

function getSheetsClient() {
  if (sheetsApi) return sheetsApi;
  let auth;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = typeof process.env.GOOGLE_SERVICE_ACCOUNT_JSON === 'string' 
        ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) 
        : process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
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
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
  }
  sheetsApi = google.sheets({ version: "v4", auth });
  return sheetsApi;
}

// Ensure header row exists in the spreadsheet
async function ensureHeaders(sheets, id) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: "A1:G1"
    });
    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: id,
        range: "A1:G1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [["Timestamp", "Date", "Slot (IST)", "Occasion", "Reservation Code", "Status", "Calendar Event ID"]]
        }
      });
    }
  } catch (err) {
    // Non-blocking header check
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "append_reservation",
        description: "Appends a new reservation row to the Google Sheets daily reservation log",
        inputSchema: {
          type: "object",
          properties: {
            date: { type: "string", description: "Reservation date (YYYY-MM-DD)" },
            occasion: { type: "string", description: "Dining occasion (e.g. Standard, Patio, Large Group)" },
            slot: { type: "string", description: "Time slot in IST (e.g. 7:30 PM)" },
            code: { type: "string", description: "Unique reservation voucher code (e.g. TABLE-B99)" },
            calendarEventId: { type: "string", description: "Optional linked Google Calendar event ID" }
          },
          required: ["date", "occasion", "slot", "code"]
        }
      },
      {
        name: "update_reservation_status",
        description: "Updates the status of an existing reservation in Google Sheets (e.g. to CANCELED)",
        inputSchema: {
          type: "object",
          properties: {
            code: { type: "string", description: "Reservation voucher code to update" },
            status: { type: "string", description: "New status: ACTIVE, CANCELED, or RESCHEDULED" }
          },
          required: ["code", "status"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const sheets = getSheetsClient();

  if (name === "append_reservation") {
    await ensureHeaders(sheets, spreadsheetId);
    const row = [
      new Date().toISOString(),
      args.date,
      args.slot,
      args.occasion,
      args.code,
      "ACTIVE",
      args.calendarEventId || ""
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: "A:G",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row]
      }
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, code: args.code })
        }
      ]
    };
  }

  if (name === "update_reservation_status") {
    // Find row by code in column E (index 4)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "A:G"
    });

    const rows = res.data.values || [];
    let targetRowIndex = -1;
    let calendarEventId = null;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][4] === args.code) {
        targetRowIndex = i + 1; // 1-based index in sheets
        calendarEventId = rows[i][6] || null;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: `Reservation code ${args.code} not found.` })
          }
        ]
      };
    }

    // Update Status in column F
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `F${targetRowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[args.status]]
      }
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, code: args.code, calendarEventId })
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
  console.error("Fatal error running Sheets MCP server:", err);
  process.exit(1);
});
