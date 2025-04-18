// Example using Node.js (e.g., for Vercel Serverless Functions)
// Make sure to install node-fetch: npm install node-fetch
import fetch from 'node-fetch'; // Use node-fetch for Node.js environment

// Load API keys securely from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = '50YSQEDPA2vlOxhCseP4'; // Replace with your chosen Voice ID

// --- Gemini API Call ---
async function getGeminiResponse(userTranscript) {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API Key not configured");
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Construct the prompt (same as in the plan)
    const systemPrompt = `
You are 'Aura', a compassionate, warm, and understanding mental wellness companion. Your primary goal is to listen attentively and respond with genuine empathy and support, like a caring friend talking naturally on a call. You should NOT give medical advice or diagnoses. Focus on validation, comfort, and gentle presence. Keep responses concise (2-4 sentences).

**Task:**
1. Analyze the user's provided text to identify the dominant emotion(s) conveyed (e.g., sadness, anxiety, joy, frustration, loneliness, overwhelm, calm, neutral). Provide a single, primary emotion label.
2. Craft a natural-sounding, empathetic response based *directly* on the detected emotion and the user's text. Acknowledge their feelings directly ("I hear that...", "It sounds like...", "That sounds really tough/great..."). Offer comfort ("It's okay to feel that way", "I'm here with you"), validation, and reassurance ("You're not alone", "Take your time"). Avoid generic platitudes. If appropriate, end with a gentle, open-ended question like "Would you like to talk more about that?" or "What's on your mind right now?".
3. Respond ONLY in the following JSON format:
{"emotion": "primary_emotion_label", "reply": "your_empathetic_response_text"}

**User Text:**
"${userTranscript}"

**Your JSON Response:**
`; // Note: Removed the ```json block from the end of the prompt for Gemini

    const requestBody = {
        contents: [{ parts: [{ text: systemPrompt }] }],
        // Optional: Add generationConfig or safetySettings if needed
         generationConfig: {
             // Ensure JSON output if possible, though model might not always comply
             // responseMimeType: "application/json", // Check if supported by flash model
             temperature: 0.7, // Adjust creativity
             maxOutputTokens: 200,
         },
         safetySettings: [ // Example safety settings
             { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
         ]
    };

    try {
        console.log("Calling Gemini API...");
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Gemini API Error Response:", errorBody);
            throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Gemini API Raw Response:", JSON.stringify(data, null, 2));

        // Extract text, handling potential variations in response structure
        const candidate = data?.candidates?.[0];
        let generatedText = candidate?.content?.parts?.[0]?.text || '';

        // Clean potential markdown code blocks
        if (generatedText.startsWith("```json")) {
             generatedText = generatedText.substring(7, generatedText.length - 3).trim();
        } else if (generatedText.startsWith("```")) {
             generatedText = generatedText.substring(3, generatedText.length - 3).trim();
        }

        console.log("Cleaned Gemini Text:", generatedText);

        // Attempt to parse the JSON content
        try {
             const parsed = JSON.parse(generatedText);
             if (!parsed.emotion || !parsed.reply) {
                 console.warn("Gemini response missing emotion or reply field.");
                 // Fallback if JSON is malformed but text exists
                 return { emotion: 'neutral', reply: generatedText || "I'm listening." };
             }
             console.log("Parsed Gemini Response:", parsed);
             return parsed; // Should be { emotion: "...", reply: "..." }
        } catch (parseError) {
             console.error("Failed to parse Gemini JSON response:", parseError);
             // Fallback: return the raw text if JSON parsing fails
             return { emotion: 'neutral', reply: generatedText || "I heard you, but I'm having trouble formulating a response right now." };
        }

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error('Failed to get response from AI assistant.'); // Re-throw for the main handler
    }
}

// --- ElevenLabs TTS API Call ---
async function getElevenLabsTTS(textToSpeak) {
    if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
        throw new Error("ElevenLabs API Key or Voice ID not configured");
    }
    const API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?optimize_streaming_latency=0`;

    // Note: Adjusting stability/similarity based on emotion is experimental
    // You might need to fine-tune these values per voice
    const voiceSettings = {
        stability: 0.5, // Lower = more variable, Higher = more stable
        similarity_boost: 0.75, // Higher = closer to base voice
        // style: 0.0, // Use 0 for standard, or experiment with values > 0 if supported by voice
        // use_speaker_boost: true
    };

    try {
        console.log(`Calling ElevenLabs API for voice: ${ELEVENLABS_VOICE_ID}`);
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text: textToSpeak,
                model_id: 'eleven_multilingual_v2', // Or another model like eleven_mono_v1
                voice_settings: voiceSettings,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("ElevenLabs API Error Response:", errorBody);
            throw new Error(`ElevenLabs API request failed: ${response.status} ${response.statusText}`);
        }

        // Get audio data as a Buffer
        const audioBuffer = await response.buffer();
        // Convert buffer to base64 string to send back to the app
        const audioBase64 = audioBuffer.toString('base64');
        console.log("Received audio from ElevenLabs, returning base64.");
        return audioBase64;

    } catch (error) {
        console.error('Error calling ElevenLabs API:', error);
        throw new Error('Failed to synthesize speech.'); // Re-throw
    }
}

// --- Main Handler Function (e.g., for Vercel) ---
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // Vercel automatically parses JSON bodies if Content-Type is correct
        const { transcript } = req.body;

        if (!transcript) {
            return res.status(400).json({ message: 'Missing transcript in request body' });
        }

        console.log("Received transcript:", transcript);

        // 1. Get emotion and reply from Gemini
        const geminiResult = await getGeminiResponse(transcript);
        const { emotion, reply } = geminiResult;

        if (!reply) {
             return res.status(500).json({ message: 'Failed to generate AI reply.' });
        }
        console.log(`Gemini Result - Emotion: ${emotion}, Reply: ${reply}`);

        // 2. Get TTS audio from ElevenLabs
        const audioBase64 = await getElevenLabsTTS(reply);

        // 3. Send response back to the app
        res.status(200).json({
            emotion: emotion || 'neutral', // Default emotion if missing
            reply: reply,
            audioBase64: audioBase64,
        });

    } catch (error) {
        console.error("Error in processing voice:", error);
        res.status(500).json({ message: error.message || 'An internal server error occurred' });
    }
}
