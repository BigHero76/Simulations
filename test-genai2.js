import { GoogleGenAI } from "@google/genai";
async function test() {
  try {
    const ai = new GoogleGenAI({});
    const chat = ai.chats.create({ model: "gemini-2.5-flash" });
    await chat.sendMessage({ message: "hello" });
    console.log("Success");
  } catch(e) {
    console.log("Error empty:", e.message);
  }
}
test();
