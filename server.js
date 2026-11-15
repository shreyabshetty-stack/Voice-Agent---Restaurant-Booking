const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');
const mcpClient = require('./mcp_client');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Setup multer for handling audio file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

// In-Memory Database for Phase 1 (will integrate with MCP in Phase 2)
const reservations = [];
const occupiedSlots = new Set([
  '2026-08-07T19:30:00+05:30', // Friday 7:30 PM occupied for test
  '2026-08-07T20:00:00+05:30'  // Friday 8:00 PM occupied for test
]);

// Active chat sessions storage
const sessions = {};

// Helper: Generate Reservation Code
function generateReservationCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const d1 = Math.floor(Math.random() * 10);
  const d2 = Math.floor(Math.random() * 10);
  return `TABLE-${letter}${d1}${d2}`;
}

// Helper: Calculate Alternative Slots
function getAlternativeSlots(targetDateTimeStr) {
  const targetDate = new Date(targetDateTimeStr);
  const alternatives = [];
  const offsets = [-30, 30, -60, 60, -90, 90]; // minute offsets to search
  
  for (const offset of offsets) {
    const candidate = new Date(targetDate.getTime() + offset * 60000);
    // Format candidate back to ISO with IST offset (+05:30)
    // For simplicity, handle timezone formatting manually
    const offsetMs = 5.5 * 60 * 60 * 1000;
    const candidateIST = new Date(candidate.getTime() + offsetMs);
    const candidateISO = candidateIST.toISOString().replace('Z', '+05:30');
    
    if (!occupiedSlots.has(candidateISO)) {
      // Format a readable time: e.g., "7:00 PM"
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

// Regex to scrub PII (phone numbers, email addresses)
function scrubPII(text) {
  if (!text) return '';
  // Phone numbers (matches various Indian/International patterns)
  let scrubbed = text.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[MASKED PHONE]');
  // Simple email pattern
  scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[MASKED EMAIL]');
  return scrubbed;
}

// Helper: Sanitize tool name from LLM (strips leaked special tokens like <|channel|>commentary)
function sanitizeToolName(name) {
  if (!name) return '';
  let clean = name.replace(/<\|.*?\|>/g, '').replace(/commentary/gi, '').replace(/thought/gi, '').trim();
  if (clean.includes('book_table')) return 'book_table';
  if (clean.includes('check_availability')) return 'check_availability';
  if (clean.includes('cancel_reservation')) return 'cancel_reservation';
  return clean;
}

// System Prompt mapping all business rules, dynamic date context, and confirmation flow
function getSystemPrompt() {
  const now = new Date();
  const options = { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const currentIST = new Intl.DateTimeFormat('en-IN', options).format(now);
  const currentMonth = now.toLocaleString('en-US', { month: 'long', timeZone: 'Asia/Kolkata' });
  const currentYear = now.getFullYear();

  return `
You are the Voice Table Reservation Assistant for Shiv Sagar, a premium Indian vegetarian restaurant.
Timezone: Strictly Indian Standard Time (IST).
CURRENT LOCAL TIME IN IST: ${currentIST}.

CRITICAL DATE RULES - NEVER ASSUME THE MONTH:
- If the diner specifies a date number without explicitly stating the month name (e.g., "16th", "on the 16th", "20th"):
  DO NOT ASSUME THE MONTH (do NOT assume November, December, or any month)!
  You MUST politely ask: "Which month would you like to book for?"
  Only proceed once the diner explicitly states the month.
- If the diner says "tomorrow" or "today", you may use the immediate relative date.

ANSWERING QUESTIONS VS BOOKING:
- If the diner asks what an option means (e.g. "What does outdoor/patio mean?", "What is bar/lounge?"):
  Answer their question politely in 1-2 brief sentences, and then ask which option they prefer.
  CRITICAL: DO NOT assume they chose that option! An explanation is NOT a selection.
  CRITICAL: DO NOT call check_availability or book_table when the diner is asking a general or clarifying question!

MANDATORY INFORMATION NEEDED BEFORE CHECKING:
1. Date (with explicitly confirmed month).
2. Time slot in IST.
3. Party Size (number of guests). If missing, ask: "How many guests will be dining?"
4. Table Type / Occasion. If missing, ask: "Would you prefer Standard Dining, Outdoor/Patio, Large Group, or Special Occasion?"

CRITICAL 2-STEP CONFIRMATION PROTOCOL:
- STEP 1 (Check): When you have the date, time, party size, and table type, call the 'check_availability' tool.
- STEP 2 (Ask Confirmation): If available, DO NOT call 'book_table' yet!
  State that the table is available and explicitly ask:
  "We have an [Occasion] table available for [Guests] guests on [Date] at [Time] IST. Shall I go ahead and confirm this reservation for you?"
- STEP 3 (Final Booking): ONLY call the 'book_table' tool AFTER the diner explicitly replies with "Yes", "Confirm", "Go ahead", "Book it", or "Sure".
  Upon booking, provide their unique Reservation Code (e.g. TABLE-XXX) and state the 15-minute hold policy.
- If the slot is unavailable, offer the 2 alternative times returned by the tool.

STYLE:
- Keep spoken answers crisp, natural, and brief (1 to 2 sentences max).
- NO PII: Never ask for or record diner names, emails, or phone numbers.
- For menu prices or hours, refer diners to shivsagar.in.
- For allergen safety or medical guarantees, decline liability and refer to shivsagar.in.
`;
}

// Initialize Groq SDK Client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'MOCK_KEY' });

// Define tools for Groq Function Calling
const tools = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Checks if a specific date and time slot is available for dining.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          time: { type: 'string', description: 'Time in 24-hour HH:MM format (e.g. 19:30)' }
        },
        required: ['date', 'time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'book_table',
      description: 'Books a table after the user has explicitly confirmed the details (date, time, occasion, party size).',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          time: { type: 'string', description: 'Time in 24-hour HH:MM format (e.g. 19:30)' },
          occasion: { 
            type: 'string', 
            enum: ['Standard Dining', 'Large Group 6+', 'Outdoor/Patio', 'Special Occasion/Anniversary', 'Bar/Lounge']
          },
          guests: {
            type: 'integer',
            description: 'Number of guests dining (e.g. 2, 4, 6)'
          }
        },
        required: ['date', 'time', 'occasion']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cancel_reservation',
      description: 'Cancels an existing reservation using the reservation code.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The reservation code, e.g. TABLE-B99' }
        },
        required: ['code']
      }
    }
  }
];

// Backend tool caller routing to MCP Client wrapper (Phase 2 with Phase 1 fallback)
async function handleToolCall(toolCall) {
  const name = sanitizeToolName(toolCall.function.name);
  let args = {};
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch (e) {
    console.error("Error parsing tool arguments:", toolCall.function.arguments);
  }
  
  if (name === 'check_availability') {
    if (!args.date || !args.time) {
      return { available: false, error: 'Both date and time are required to check availability.' };
    }
    return await mcpClient.checkAvailability(args.date, args.time);
  }
  
  if (name === 'book_table') {
    const code = generateReservationCode();
    const occasionSummary = args.guests ? `${args.occasion} (${args.guests} guests)` : args.occasion;
    return await mcpClient.bookReservation(args.date, args.time, occasionSummary, code);
  }
  
  if (name === 'cancel_reservation') {
    return await mcpClient.cancelReservation(args.code);
  }
  
  return { error: 'Unknown tool' };
}

// Phase 1 API: Speech-to-Text (Deepgram)
async function transcribeAudio(audioBuffer) {
  if (process.env.DEEPGRAM_API_KEY === 'your_deepgram_api_key_here' || !process.env.DEEPGRAM_API_KEY) {
    console.log('Using Mock STT (No Deepgram Key)');
    return 'I want to reserve a table for patio dining this Friday at 7:30 PM';
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/wav'
      },
      body: audioBuffer
    });

    const data = await response.json();
    return data.results?.channels[0]?.alternatives[0]?.transcript || '';
  } catch (error) {
    console.error('Deepgram transcription error:', error);
    throw error;
  }
}

// Phase 1 API: Text-to-Speech (Smallest AI Waves)
async function synthesizeSpeech(text) {
  if (process.env.SMALLEST_AI_API_KEY === 'your_smallest_ai_api_key_here' || !process.env.SMALLEST_AI_API_KEY) {
    console.log('Using Mock TTS (No Smallest AI Key)');
    return Buffer.alloc(0); // Return empty buffer if key is not configured
  }

  // Ensure text is non-empty and stripped of markdown
  const cleanSpeechText = (text || '')
    .toString()
    .replace(/[*#_`]/g, '')
    .trim() || 'Understood.';

  try {
    const response = await fetch('https://api.smallest.ai/waves/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SMALLEST_AI_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav'
      },
      body: JSON.stringify({
        text: cleanSpeechText,
        voice_id: 'meher', // Default Indian voice ID
        model: 'lightning_v3.1_pro',
        sample_rate: 16000,
        output_format: 'wav'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Smallest AI synthesis warning: ${errText}`);
      return Buffer.alloc(0); // Graceful fallback
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn('Smallest AI synthesis error (graceful fallback):', error.message);
    return Buffer.alloc(0);
  }
}

// REST Route: Process Turn (Phase 1)
app.post('/api/voice-turn', upload.single('audio'), async (req, res) => {
  const sessionId = req.body.sessionId || 'default';
  let userText = '';
  
  try {
    // 1. Transcribe audio if uploaded, otherwise fallback to text parameter
    if (req.file) {
      userText = await transcribeAudio(req.file.buffer);
    } else if (req.body.text) {
      userText = req.body.text;
    }

    if (!userText || !userText.trim()) {
      return res.status(400).json({ error: 'No audio or text query provided' });
    }

    // Scrub PII from user text
    userText = scrubPII(userText);

    // Initialize session history if it doesn't exist
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        history: [{ role: 'system', content: getSystemPrompt() }]
      };
    }
    
    const session = sessions[sessionId];
    session.history.push({ role: 'user', content: userText });

    const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    // 2. Call Groq LLM with tools
    let runner = await groq.chat.completions.create({
      messages: session.history,
      model: groqModel,
      tools: tools,
      tool_choice: 'auto'
    });

    let message = runner.choices[0].message;

    // Loop to handle tool calls if any are requested by the model
    while (message.tool_calls) {
      // Sanitize tool call names to prevent model token leakage (e.g. <|channel|>commentary)
      for (const tc of message.tool_calls) {
        if (tc.function && tc.function.name) {
          tc.function.name = sanitizeToolName(tc.function.name);
        }
      }
      session.history.push(message); // Save assistant tool request to history
      
      for (const toolCall of message.tool_calls) {
        const cleanName = sanitizeToolName(toolCall.function.name);
        toolCall.function.name = cleanName;
        const result = await handleToolCall(toolCall);
        session.history.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: cleanName,
          content: JSON.stringify(result)
        });
      }

      // Re-run completions with tool outputs
      runner = await groq.chat.completions.create({
        messages: session.history,
        model: groqModel,
        tools: tools
      });
      message = runner.choices[0].message;
    }

    let assistantText = (message.content || '').trim();
    if (!assistantText) {
      assistantText = 'I have noted that. How else can I assist with your table reservation?';
    }
    session.history.push({ role: 'assistant', content: assistantText });

    // 3. Call Smallest AI for Voice synthesis
    const audioBuffer = await synthesizeSpeech(assistantText);

    // Return response text & base64 encoded audio
    res.json({
      userTranscript: userText,
      agentResponse: assistantText,
      audioBase64: audioBuffer.toString('base64')
    });

  } catch (error) {
    console.error('Error handling voice turn:', error);
    // Graceful recovery: If tool validation fails or model acts up, answer the user in natural text!
    try {
      if (sessions[sessionId]) {
        const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
        const cleanHistory = sessions[sessionId].history.filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system');
        const fallbackRunner = await groq.chat.completions.create({
          messages: cleanHistory,
          model: groqModel
        });
        const fallbackText = (fallbackRunner.choices[0].message.content || '').trim() || 'I am ready to help with your reservation. Which date and time would you prefer?';
        sessions[sessionId].history.push({ role: 'assistant', content: fallbackText });
        const audioBuffer = await synthesizeSpeech(fallbackText);
        return res.json({
          userTranscript: userText || 'Audio input',
          agentResponse: fallbackText,
          audioBase64: audioBuffer.toString('base64')
        });
      }
    } catch (fbErr) {
      console.error('Graceful fallback failed:', fbErr);
    }
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

// Phase 2 WebSocket Upgrade Handler (Scaffolding)
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  
  if (pathname === '/api/live-stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Phase 2 WebSocket Streaming Connection (Gemini Live API Proxy)
wss.on('connection', (ws) => {
  console.log('Phase 2 Client connected to WebSocket stream');
  let geminiWs = null;

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey === 'your_gemini_api_key_here') {
    console.warn('⚠️ Gemini API Key not configured. Mocking WebSocket live call.');
    ws.send(JSON.stringify({ type: 'status', text: 'Connected (Demo Mode)' }));
    
    // Send a mock greeting
    setTimeout(async () => {
      try {
        const welcomeText = "Hello! Welcome to Shiv Sagar's automated booking assistant. I am running in streaming demo mode. How can I help you today?";
        const audioBuffer = await synthesizeSpeech(welcomeText);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(audioBuffer);
        }
      } catch (e) {
        console.error('Mock welcome synthesis failed:', e);
      }
    }, 1000);
    
    ws.on('message', (message) => {
      // Echo back some voice in demo mode or log
    });
    return;
  }

  // Connect to Gemini Live WSS Endpoint
  const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`;
  
  try {
    geminiWs = new WebSocket(url);
    
    geminiWs.on('open', () => {
      console.log('🟢 Proxy connection opened to Gemini Live API');
      
      // Configure Gemini Live Session (BidiGenerateContentSetup)
      const setupMessage = {
        setup: {
          model: "models/gemini-2.0-flash-exp",
          generationConfig: {
            responseModalities: ["AUDIO"]
          },
          systemInstruction: {
            parts: [
              { text: getSystemPrompt() }
            ]
          },
          tools: tools
        }
      };
      
      geminiWs.send(JSON.stringify(setupMessage));
      ws.send(JSON.stringify({ type: 'status', text: 'Call Connected' }));
    });

    geminiWs.on('message', async (data) => {
      try {
        const response = JSON.parse(data.toString());
        
        // 1. Process agent output audio
        if (response.serverContent?.modelTurn?.parts) {
          for (const part of response.serverContent.modelTurn.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
              const audioBase64 = part.inlineData.data;
              const pcmBuffer = Buffer.from(audioBase64, 'base64');
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(pcmBuffer); // Send raw binary PCM16 stream to client
              }
            }
          }
        }
        
        // 2. Handle user interruption
        if (response.serverContent?.interrupted) {
          console.log('⚡ Gemini Live detected user speech interruption');
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'cancel_current_audio' }));
          }
        }
        
        // 3. Handle tool calls (Google Calendar / Sheets double-writes)
        if (response.toolCall?.functionCalls) {
          const functionResponses = [];
          
          for (const call of response.toolCall.functionCalls) {
            const toolCallMock = {
              id: call.id,
              function: {
                name: call.name,
                arguments: JSON.stringify(call.args)
              }
            };
            
            console.log(`🛠️ Tool execution triggered by streaming agent: ${call.name}`);
            const result = await handleToolCall(toolCallMock);
            
            functionResponses.push({
              id: call.id,
              response: {
                output: result
              }
            });
          }
          
          // Send responses back to Gemini Live API
          const toolResponseMessage = {
            toolResponse: {
              functionResponses: functionResponses
            }
          };
          
          if (geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.send(JSON.stringify(toolResponseMessage));
          }
        }
      } catch (err) {
        console.error('Error processing Gemini WS frame:', err);
      }
    });

    geminiWs.on('error', (err) => {
      console.error('Gemini Live socket error:', err);
      ws.send(JSON.stringify({ type: 'status', text: 'Error in AI service connection' }));
    });

    geminiWs.on('close', (code, reason) => {
      console.log(`Gemini Live socket closed. Code: ${code}, Reason: ${reason}`);
      ws.close();
    });

  } catch (error) {
    console.error('Failed to construct Gemini Live WebSocket:', error);
    ws.close();
  }

  // Stream raw client PCM audio to Gemini Live
  ws.on('message', (message) => {
    if (Buffer.isBuffer(message)) {
      if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
        const pcmBase64 = message.toString('base64');
        const audioInput = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm",
                data: pcmBase64
              }
            ]
          }
        };
        geminiWs.send(JSON.stringify(audioInput));
      }
    }
  });

  ws.on('close', () => {
    console.log('Phase 2 Client disconnected');
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.close();
    }
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server is running in workspace on port ${PORT}`);
  await mcpClient.initMcp();
});
