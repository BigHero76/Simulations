# NSE Terminal 📈

**[🔴 Live Demo Complete Application Here](https://simulations-sigma.vercel.app/)**

![App Screenshoot](https://img.shields.io/badge/Status-Live-00e5a0?style=for-the-badge)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)

A high-performance, real-time Indian Stock Market tracking dashboard and portfolio manager built with React and Vite. It features live NSE quotes, dynamic mutual fund tracking, and an integrated **Google Gemini 2.0 AI Advisor** for personalized financial insights.

## ✨ Features

- **🔴 Live Market Tracking:** Streams live stock prices (NIFTY 50, SENSEX, NIFTY BANK, NIFTY IT, INDIA VIX) dynamically fetched via Yahoo Finance through a dedicated Express.js backend proxy.
- **📊 50 NSE Stocks Tracked:** Covers **50 popular equities** across **13 sectors** — Energy, IT, Banking, NBFC, Consumer/FMCG, Auto, Pharma, Metals, Telecom, Cement, Infrastructure, Insurance, and Chemicals.
- **🏦 Mutual Funds (AMFI):** Automatically parses daily official `NAVAll.txt` feeds from the Association of Mutual Funds in India (AMFI) for live NAV data.
- **💼 Dynamic Portfolio Manager:** Add or remove stocks & mutual funds with interactive `+` and `−` controls to build a highly personalized, unified P&L view. P&L, sector allocations, and invested metrics update in real-time. Portfolio state persists via `localStorage`.
- **👁️ Watchlist:** Star any stock to add it to a personal watchlist tab with dedicated tracking and intraday sparklines.
- **📰 Live News Feed:** Aggregated financial news headlines for all tracked stocks via Yahoo Finance RSS, filterable by symbol.
- **📈 1-Year Price Charts:** Click any stock card to view an interactive 1-year historical price chart powered by Recharts.
- **⚡ Intraday Sparklines:** Each stock card displays an intraday mini-chart (5-minute intervals) showing the day's price action at a glance.
- **🤖 Live AI Advisor:** Integrated directly with the Google Gemini SDK. The AI is fed your live portfolio and real-time market indices as context, providing bespoke buy/hold/sell advice, sentiment analysis, and macro insights.
- **🔒 Secure API Key Handling:** API keys are stored in a `.env` file excluded from version control via `.gitignore`, preventing accidental exposure.
- **🎨 Modern UI:** A fully custom, sleek, dark-mode terminal-style UI with shimmer loading skeletons, smooth transitions, and zero external component libraries.

---

## 📊 Tracked Stocks (50)

| Sector | Stocks |
|---|---|
| **Energy** | RELIANCE, ONGC, NTPC, POWERGRID, ADANIGREEN |
| **IT** | TCS, INFY, WIPRO, HCLTECH, TECHM, LTIM |
| **Banking** | HDFCBANK, ICICIBANK, SBIN, KOTAKBANK, AXISBANK, INDUSINDBK |
| **NBFC** | BAJFINANCE, BAJAJFINSV |
| **Consumer** | ASIANPAINT, HINDUNILVR, ITC, NESTLEIND, TITAN, BRITANNIA |
| **Auto** | TATAMOTORS, MARUTI, M&M, BAJAJ-AUTO, EICHERMOT |
| **Pharma** | SUNPHARMA, DRREDDY, CIPLA, APOLLOHOSP, DIVISLAB |
| **Metals** | TATASTEEL, JSWSTEEL, HINDALCO, COALINDIA |
| **Telecom** | BHARTIARTL |
| **Cement** | ULTRACEMCO, GRASIM |
| **Infra** | LT, ADANIENT, ADANIPORTS |
| **Insurance** | SBILIFE, HDFCLIFE |
| **Chemicals** | PIDILITIND, UPL |

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
GEMINI_API_KEY=your_api_key_here
```
> **Note:** The `.env` file is git-ignored — your keys will never be committed to the repository.

### 4. Start the Application
You will need **two terminal windows**.

**Terminal 1 (Backend Finance Proxy):**
```bash
node server.js
```
*This robust express server runs on port `3001` and proxies Yahoo Finance while bypassing their User-Agent blocks.*

**Terminal 2 (React Frontend):**
```bash
npm run dev
```
*Vite binds aggressively to localhost on port `8888` to avoid Windows networking conflicts. The UI will be available at `http://127.0.0.1:8888`.*

---

## 🛠 Tech Stack

- **Frontend:** React + Vite (Vanilla CSS)
- **Charts:** Recharts (line charts & sparklines)
- **Backend:** Node.js + Express
- **APIs:** Yahoo Finance (Stocks, Indices, Charts & News), AMFI (Mutual Funds), `@google/genai` (Gemini 2.0 LLM)
- **Deployment:** Vercel (Serverless Functions)

---

## 📁 Project Structure

```
nse-dashboard/
├── api/                  # Vercel serverless functions
│   ├── chat.js           # Gemini AI chat endpoint
│   ├── finance.js        # Stock quote proxy
│   ├── history.js        # 1-year historical data
│   ├── intraday.js       # Intraday chart data
│   └── news.js           # Yahoo Finance news
├── src/
│   ├── App.jsx           # Main application (all components)
│   ├── App.css           # Global styles
│   └── main.jsx          # React entry point
├── server.js             # Local Express dev proxy
├── vercel.json           # Vercel deployment config
├── .env                  # API keys (git-ignored)
└── .gitignore            # Includes .env exclusion
```

---

*Disclaimer: This is a simulation project. It is not intended as certified financial advice. Stock market data may be delayed.*
