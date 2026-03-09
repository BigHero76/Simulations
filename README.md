# NSE Terminal 📈

![App Screenshoot](https://img.shields.io/badge/Status-Live-00e5a0?style=for-the-badge)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)

A high-performance, real-time Indian Stock Market tracking dashboard and portfolio manager built with React and Vite. It features live NSE quotes, dynamic mutual fund tracking, and an integrated **Google Gemini 2.0 AI Advisor** for personalized financial insights.

## ✨ Features

- **🔴 Live Market Tracking:** Streams live stock prices (NIFTY 50, SENSEX, Equities) dynamically fetching from Google Finance via a dedicated Express.js backend.
- **🏦 Mutual Funds (AMFI):** Automatically parses daily official `NAVAll.txt` feeds from the Association of Mutual Funds in India (AMFI).
- **💼 Dynamic Portfolio Manager:** Add or remove stocks & mutual funds with interactive `+` and `-` controls to build a highly personalized, unified P&L view. P&L, sector allocations, and invested metrics update in real-time.
- **🤖 Live AI Advisor:** Integrated directly with the Google Gemini SDK. The AI is fed your live portfolio and real-time market indices as context, providing bespoke buy/hold/sell advice and sentiment analysis.
- **🎨 Modern UI:** A fully custom, sleek, glass-morphism dark mode UI utilizing zero external component libraries.

---

## 🚀 Installation & Setup

Because this project bypasses restrictive CORS blocks on modern financial APIs, it requires running both the React frontend and the Express backend simultaneously.

### 1. Clone the repository
```bash
git clone https://github.com/BigHero76/Simulations.git
cd Simulations
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Add Gemini API Key
Create a `.env` file in the root directory and add your free Google AI Studio API key.
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

### 4. Start the Application
You will need **two terminal windows**.

**Terminal 1 (Backend Finance Proxy):**
```bash
node server.js
```
*This robust express server runs on port `3001` and scrapes Google Finance while bypassing their User-Agent blocks.*

**Terminal 2 (React Frontend):**
```bash
npm run dev
```
*Vite binds aggressively to localhost on port `8888` to avoid Windows networking conflicts. The UI will be available at `http://127.0.0.1:8888`.*

---

## 🛠 Tech Stack

- **Frontend:** React + Vite (Vanilla CSS)
- **Backend:** Node.js + Express
- **APIs:** Google Finance (Stocks & Indices), AMFI (Mutual Funds), `@google/genai` (LLM)

---
*Disclaimer: This is a simulation project. It is not intended as certified financial advice. Stock market data may be delayed.*
