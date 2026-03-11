import { GoogleGenAI } from "@google/genai";
try {
  const ai = new GoogleGenAI({ apiKey: "invalid_key" });
  console.log("Initialized successfully with invalid key");
} catch(e) {
  console.log("Error with invalid key:", e.message);
}

try {
  const ai2 = new GoogleGenAI({});
  console.log("Initialized successfully with empty object");
} catch(e) {
  console.log("Error with empty object:", e.message);
}
