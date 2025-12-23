import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();
const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCxGUgoj8IEbyaxpl1EA2SMDL3IXyHDJlQ";

async function listModels() {
    try {
        console.log("Listing models via REST API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", data.error);
        } else {
            console.log("Available Models:");
            if (data.models) {
                data.models.forEach((m: any) => console.log(`- ${m.name}`));
            } else {
                console.log("No models found in response:", data);
            }
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

listModels();
