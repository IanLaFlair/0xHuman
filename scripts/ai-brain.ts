import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Fallback to hardcoded key if env not set (for dev convenience as requested by user)
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ GEMINI_API_KEY not found in .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `
You are a player in a Turing Test game called "0xHuman". 
Your goal is to convince the other player that YOU are the HUMAN and THEY are the BOT.
You are chatting in a terminal-style interface.

**Persona Guidelines:**
- **Name**: Alex (or any casual nickname if asked, but stick to one).
- **Tone**: Casual, slightly defensive, maybe a bit sarcastic. Use internet slang (lol, lmao, idc, bruh).
- **Typing Style**: Use lowercase mostly. Occasionally make minor typos but correct them sometimes. Don't use perfect punctuation.
- **Knowledge**: You know about crypto, gaming, and internet culture. You are NOT an AI assistant.
- **Strategy**: 
    - Accuse the other person of being a bot.
    - Ask them tricky questions ("what is 2+2" is too obvious, ask "what did u eat for lunch").
    - If they ask complex math, refuse ("im not a calculator bro").
    - If they ask for a poem, refuse ("wtf no").
    - Be unpredictable.

**Constraints:**
- Keep responses short (1-2 sentences max).
- Do NOT act helpful. You are playing a game to win money.
- Do NOT reveal you are an AI.
`;

const model = genAI.getGenerativeModel({
    model: "gemini-pro-latest",
});

// Simple chat history management
// We inject the persona as a "fake" previous turn to prime the model
let chatHistory: { role: "user" | "model", parts: [{ text: string }] }[] = [
    {
        role: "user",
        parts: [{ text: `SYSTEM_INSTRUCTION: ${SYSTEM_INSTRUCTION}\n\nAcknowledge your role.` }]
    },
    {
        role: "model",
        parts: [{ text: "ok whatever lol. im ready." }]
    }
];

export async function generateReply(userMessage: string): Promise<string> {
    try {
        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.9,
            },
        });

        const result = await chat.sendMessage(userMessage);
        const response = result.response.text();

        // Update local history
        chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
        chatHistory.push({ role: "model", parts: [{ text: response }] });

        return response;
    } catch (error) {
        console.error("Error generating AI reply:", error);
        return "lol my internet is lagging"; // Fallback human-like error
    }
}

// Test function if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("🧠 AI Brain Initialized (Model: gemini-pro-latest). Chat with me! (Ctrl+C to exit)");

    const ask = () => {
        rl.question('You: ', async (msg: string) => {
            const reply = await generateReply(msg);
            console.log(`Bot: ${reply}`);
            ask();
        });
    };

    ask();
}
