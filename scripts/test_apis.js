// scripts/test_apis.js - Automated API Connection Verification
const dotenv = require('dotenv');
const Groq = require('groq-sdk');

dotenv.config();

console.log("🔍 Automated API Connection Verification starting...");
console.log("--------------------------------------------------");

async function testGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'your_groq_api_key_here') {
    console.log("❌ Groq: Key not configured in .env");
    return false;
  }

  try {
    const groq = new Groq({ apiKey: key });
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const res = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'test connection' }],
      model: model
    });
    if (res.choices[0].message.content) {
      console.log(`✅ Groq (${model}) API: Connected and responding successfully.`);
      return true;
    }
  } catch (error) {
    console.error("❌ Groq API Connection failed:", error.message);
  }
  return false;
}

async function testDeepgram() {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key || key === 'your_deepgram_api_key_here') {
    console.log("❌ Deepgram STT: Key not configured in .env");
    return false;
  }

  try {
    // Ping Deepgram model description endpoint
    const res = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { 'Authorization': `Token ${key}` }
    });
    if (res.ok) {
      console.log("✅ Deepgram STT API: Connected and responding successfully.");
      return true;
    } else {
      console.log("❌ Deepgram STT API: Response not ok, status:", res.status);
    }
  } catch (error) {
    console.error("❌ Deepgram STT API Connection failed:", error.message);
  }
  return false;
}

async function testSmallestAI() {
  const key = process.env.SMALLEST_AI_API_KEY;
  if (!key || key === 'your_smallest_ai_api_key_here') {
    console.log("❌ Smallest AI TTS: Key not configured in .env");
    return false;
  }

  try {
    // Ping Smallest AI endpoint with standard test content
    const res = await fetch('https://api.smallest.ai/waves/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav'
      },
      body: JSON.stringify({
        text: 'ping',
        voice_id: 'meher',
        model: 'lightning_v3.1_pro',
        sample_rate: 16000,
        output_format: 'wav'
      })
    });
    if (res.ok) {
      console.log("✅ Smallest AI Waves TTS API: Connected and responding successfully.");
      return true;
    } else {
      console.log("❌ Smallest AI Waves TTS API: Response not ok, status:", res.status);
    }
  } catch (error) {
    console.error("❌ Smallest AI Waves TTS API Connection failed:", error.message);
  }
  return false;
}

async function runTests() {
  await testGroq();
  await testDeepgram();
  await testSmallestAI();
  console.log("--------------------------------------------------");
  console.log("Verification checks complete.");
}

runTests();
