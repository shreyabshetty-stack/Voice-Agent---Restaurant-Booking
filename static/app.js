// App.js - Restaurant Voice Booking Assistant Client Logic

// Generate a random session ID for the user's booking flow
const sessionId = 'session_' + Math.random().toString(36).substring(2, 9);

// DOM Elements
const launcherBtn = document.getElementById('voice-widget-launcher');
const heroBookBtn = document.getElementById('hero-book-btn');
const drawer = document.getElementById('voice-widget-drawer');
const closeBtn = document.getElementById('drawer-close-btn');
const containerP1 = document.getElementById('phase-1-container');

// Chat UI elements
const chatMessages = document.getElementById('chat-messages');
const p1MicBtn = document.getElementById('p1-mic-btn');
const p1StateLabel = document.getElementById('p1-state-label');

// Audio Context Variables
let audioContext = null;
let mediaStream = null;
let audioProcessor = null;
let micSource = null;

// Recording State
let isRecording = false;
let audioChunks = [];
let recordingSampleRate = 16000; // Target downsampled sample rate

// Toggle Drawer open/close
function toggleDrawer() {
  if (!drawer) return;
  drawer.classList.toggle('hidden');
  initAudioContext();
}

if (launcherBtn) launcherBtn.addEventListener('click', toggleDrawer);
if (heroBookBtn) heroBookBtn.addEventListener('click', toggleDrawer);
if (closeBtn) closeBtn.addEventListener('click', () => {
  if (drawer) drawer.classList.add('hidden');
});

// Initialize Web Audio Context on first interaction
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// ----------------------------------------------------
// PHASE 1: Push-To-Speak Logic with Auto-VAD & Barge-In
// ----------------------------------------------------
let currentAssistantSource = null;
let isAssistantSpeaking = false;
let hasUserSpoken = false;
let silenceStartTimestamp = null;
const SPEECH_RMS_THRESHOLD = 0.015; // Threshold to detect active speech
const SILENCE_TIMEOUT_MS = 1200;    // 1.2s of silence after speaking auto-sends

function stopAssistantAudio() {
  if (currentAssistantSource) {
    try {
      currentAssistantSource.stop();
      currentAssistantSource.disconnect();
    } catch (e) {}
    currentAssistantSource = null;
  }
  isAssistantSpeaking = false;
  if (!isRecording) {
    p1StateLabel.textContent = 'Tap microphone to speak';
  }
}

p1MicBtn.addEventListener('click', async () => {
  initAudioContext();
  
  // BARGE-IN: If assistant is talking, cut audio off immediately!
  stopAssistantAudio();

  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
});

async function startRecording() {
  stopAssistantAudio(); // Cut assistant audio immediately
  
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      } 
    });
    
    isRecording = true;
    hasUserSpoken = false;
    silenceStartTimestamp = null;
    audioChunks = [];
    const recordStart = Date.now();
    
    p1MicBtn.className = 'mic-button recording';
    p1StateLabel.textContent = 'Listening... Speak now';
    
    // Set up raw audio processing using Web Audio nodes
    micSource = audioContext.createMediaStreamSource(mediaStream);
    
    // Apply High-pass Biquad filter (120Hz)
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(120, audioContext.currentTime);
    
    // Apply dynamics compressor (gate)
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-45, audioContext.currentTime);
    compressor.knee.setValueAtTime(40, audioContext.currentTime);
    compressor.ratio.setValueAtTime(12, audioContext.currentTime);
    compressor.attack.setValueAtTime(0, audioContext.currentTime);
    compressor.release.setValueAtTime(0.25, audioContext.currentTime);
    
    // Process input buffer
    audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    
    audioProcessor.onaudioprocess = (e) => {
      if (!isRecording) return;
      const inputBuffer = e.inputBuffer.getChannelData(0);
      
      // Calculate RMS for Voice Activity Detection (VAD)
      let sum = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sum += inputBuffer[i] * inputBuffer[i];
      }
      const rms = Math.sqrt(sum / inputBuffer.length);
      const now = Date.now();
      
      if (rms > SPEECH_RMS_THRESHOLD) {
        if (!hasUserSpoken && (now - recordStart > 200)) {
          hasUserSpoken = true;
          p1StateLabel.textContent = 'Hearing you... 🎙️';
        }
        silenceStartTimestamp = null; // Reset silence timer while speech is active
      } else {
        // Voice level is below threshold (silence/pause)
        if (hasUserSpoken) {
          if (!silenceStartTimestamp) {
            silenceStartTimestamp = now;
          } else if (now - silenceStartTimestamp >= SILENCE_TIMEOUT_MS) {
            // AUTO-STOP: User spoke and paused for 1.2s -> automatically send!
            p1StateLabel.textContent = 'Sending reservation request...';
            stopRecording();
            return;
          }
        }
      }
      
      // Downsample float32 array to 16kHz
      const downsampled = downsample(inputBuffer, audioContext.sampleRate, recordingSampleRate);
      audioChunks.push(...downsampled);
    };
    
    micSource.connect(filter);
    filter.connect(compressor);
    compressor.connect(audioProcessor);
    
    // Connect to zero-gain node so processor fires without echoing user voice to speakers
    const silentGain = audioContext.createGain();
    silentGain.gain.setValueAtTime(0, audioContext.currentTime);
    audioProcessor.connect(silentGain);
    silentGain.connect(audioContext.destination);
    
  } catch (err) {
    console.error('Error starting microphone record:', err);
    p1StateLabel.textContent = 'Microphone access denied';
    p1MicBtn.className = 'mic-button idle';
  }
}

function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  p1MicBtn.className = 'mic-button thinking';
  p1StateLabel.textContent = 'Checking availability...';
  
  // Stop mic capture track
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }
  
  // Disconnect audio nodes
  if (audioProcessor) audioProcessor.disconnect();
  if (micSource) micSource.disconnect();
  
  // If user spoke or has recorded audio chunks, upload to backend
  if (audioChunks.length > 0) {
    const wavBlob = encodeWav(audioChunks, recordingSampleRate);
    sendAudioPayload(wavBlob);
  } else {
    p1MicBtn.className = 'mic-button idle';
    p1StateLabel.textContent = 'Tap microphone to speak';
  }
}

// REST call to server for Phase 1 voice turn
async function sendAudioPayload(wavBlob) {
  const formData = new FormData();
  formData.append('audio', wavBlob, 'user_speech.wav');
  formData.append('sessionId', sessionId);
  
  try {
    const response = await fetch('/api/voice-turn', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    p1MicBtn.className = 'mic-button idle';
    p1StateLabel.textContent = 'Tap to speak (auto-sends on pause)';
    
    if (data.error) {
      addMessage('agent', `Sorry, an error occurred: ${data.error}`);
      return;
    }
    
    // Append transcript bubbles
    addMessage('user', data.userTranscript);
    addMessage('agent', data.agentResponse);
    
    // Play synthesized voice response
    if (data.audioBase64) {
      playBase64Audio(data.audioBase64);
    }
    
    // If confirmation code exists, render ticket voucher UI in messages
    if (data.agentResponse.includes('TABLE-')) {
      const codeMatch = data.agentResponse.match(/TABLE-[A-Z]\d{2}/);
      if (codeMatch) {
        // Render beautiful confirmation voucher
        addVoucherMessage(codeMatch[0], data.agentResponse);
      }
    }
    
  } catch (err) {
    console.error('Error sending audio chunk:', err);
    p1MicBtn.className = 'mic-button idle';
    p1StateLabel.textContent = 'Error connecting to reservation server';
    addMessage('agent', 'Sorry, I couldn\'t process that booking turn. Please try again.');
  }
}

// ----------------------------------------------------
// UTILITIES AND HELPERS
// ----------------------------------------------------

// Append textual chat bubbles
function addMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;
  
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'bubble';
  bubbleDiv.textContent = text;
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'timestamp';
  timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  msgDiv.appendChild(bubbleDiv);
  msgDiv.appendChild(timeSpan);
  chatMessages.appendChild(msgDiv);
  
  // Auto scroll
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add beautiful confirmation ticket voucher bubble
function addVoucherMessage(code, responseText) {
  const container = document.createElement('div');
  container.className = 'message agent';
  
  const card = document.createElement('div');
  card.className = 'voucher-card';
  
  // Try to parse slot date/time
  let dateText = "Upcoming Booking";
  const dateMatch = responseText.match(/(?:on\s+)([A-Za-z]+,?\s+[A-Za-z]+\s+\d+|[A-Za-z]+\s+\d+)/i);
  const timeMatch = responseText.match(/(?:at\s+)(\d{1,2}:\d{2}\s+[AP]M)/i);
  if (dateMatch && timeMatch) {
    dateText = `${dateMatch[1]} at ${timeMatch[1]}`;
  } else {
    // Fallback date details
    dateText = "Confirmed Reservation Slot";
  }

  // Occasion parser
  let occasion = "Standard Dining";
  const occasions = ['Standard Dining', 'Large Group 6+', 'Outdoor/Patio', 'Special Occasion/Anniversary', 'Bar/Lounge'];
  for (const occ of occasions) {
    if (responseText.toLowerCase().includes(occ.toLowerCase())) {
      occasion = occ;
      break;
    }
  }

  card.innerHTML = `
    <div class="voucher-header">SHIV SAGAR RESERVATION</div>
    <div class="voucher-code">${code}</div>
    <div class="voucher-pill">${occasion}</div>
    <div class="voucher-time">${dateText}</div>
    <div class="voucher-timezone">Indian Standard Time (IST)</div>
    <div class="voucher-warning">Table held for 15 minutes past target time.</div>
  `;
  
  container.appendChild(card);
  chatMessages.appendChild(container);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Play base64 encoded audio return with barge-in support
function playBase64Audio(base64Data) {
  stopAssistantAudio(); // Stop any active playback first
  if (!audioContext) initAudioContext();

  const audioData = base64ToArrayBuffer(base64Data);
  audioContext.decodeAudioData(audioData, (buffer) => {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    currentAssistantSource = source;
    isAssistantSpeaking = true;
    p1StateLabel.textContent = 'Assistant speaking... (Tap mic to speak now)';
    
    source.onended = () => {
      if (currentAssistantSource === source) {
        currentAssistantSource = null;
        isAssistantSpeaking = false;
        if (!isRecording) {
          p1StateLabel.textContent = 'Tap to speak (auto-sends on pause)';
        }
      }
    };
    
    source.start(0);
  }, (err) => console.error('Audio decode failed:', err));
}

// Base64 decoder
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Float32 to PCM16 downsampler
function downsample(buffer, inputSampleRate, outputSampleRate) {
  if (inputSampleRate === outputSampleRate) return buffer;
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const nextOffset = Math.round((i + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let offset = Math.round(i * sampleRateRatio); offset < nextOffset && offset < buffer.length; offset++) {
      accum += buffer[offset];
      count++;
    }
    result[i] = count > 0 ? accum / count : 0;
  }
  return result;
}

// Convert float32 array to 16bit buffer
function floatTo16BitPCMBuffer(floatSamples) {
  const buffer = new ArrayBuffer(floatSamples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < floatSamples.length; i++) {
    let s = Math.max(-1, Math.min(1, floatSamples[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

// Write string to DataView
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Encode float arrays to WAV Blob
function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([view], { type: 'audio/wav' });
}
