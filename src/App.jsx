import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ── Static definitions ────────────────────────────────────────────────────────
const STOCK_DEFS = [
  { symbol: "RELIANCE",   name: "Reliance Industries",        sector: "Energy"   },
  { symbol: "TCS",        name: "Tata Consultancy Services",  sector: "IT"       },
  { symbol: "HDFCBANK",   name: "HDFC Bank",                  sector: "Banking"  },
  { symbol: "INFY",       name: "Infosys",                    sector: "IT"       },
  { symbol: "ICICIBANK",  name: "ICICI Bank",                 sector: "Banking"  },
  { symbol: "WIPRO",      name: "Wipro Ltd",                  sector: "IT"       },
  { symbol: "BAJFINANCE", name: "Bajaj Finance",              sector: "NBFC"     },
  { symbol: "ASIANPAINT", name: "Asian Paints",               sector: "Consumer" },
  { symbol: "TATAMOTORS", name: "Tata Motors",                sector: "Auto"     },
  { symbol: "SUNPHARMA",  name: "Sun Pharmaceutical",         sector: "Pharma"   },
];

const MUTUAL_FUNDS = [
  { code: "110021", name: "Mirae Asset Large Cap Fund",  category: "Large Cap", nav: 92.34,  returns1y: 18.4, returns3y: 14.2, returns5y: 16.8, aum: "₹32,450 Cr", rating: 5, risk: "Moderate"      },
  { code: "112275", name: "Axis Bluechip Fund",          category: "Large Cap", nav: 54.21,  returns1y: 16.2, returns3y: 12.8, returns5y: 15.4, aum: "₹41,200 Cr", rating: 5, risk: "Moderate"      },
  { code: "122639", name: "Parag Parikh Flexi Cap",      category: "Flexi Cap", nav: 71.89,  returns1y: 22.1, returns3y: 18.6, returns5y: 20.3, aum: "₹58,300 Cr", rating: 5, risk: "Moderate High" },
  { code: "111537", name: "SBI Small Cap Fund",          category: "Small Cap", nav: 134.56, returns1y: 31.4, returns3y: 24.7, returns5y: 28.9, aum: "₹22,100 Cr", rating: 4, risk: "High"          },
  { code: "106886", name: "HDFC Mid-Cap Opportunities",  category: "Mid Cap",   nav: 118.43, returns1y: 26.8, returns3y: 21.3, returns5y: 22.6, aum: "₹45,600 Cr", rating: 4, risk: "High"          },
  { code: "100870", name: "Kotak Equity Hybrid Fund",    category: "Hybrid",    nav: 48.72,  returns1y: 14.6, returns3y: 11.9, returns5y: 13.2, aum: "₹8,400 Cr",  rating: 4, risk: "Moderate"      },
];

// The hardcoded portfolios have been replaced by dynamic user state in the App component.

// ── Google Finance Price Fetcher (via Vercel Serverless or Local Proxy) ───
async function fetchLivePrices(symbols) {
  try {
    const querySymbols = symbols.map(s => `${s}.NS`).join(',');
    const url = import.meta.env.PROD ? `/api/finance?symbols=${querySymbols}` : `http://localhost:3001/api/finance/quote?symbols=${querySymbols}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.quoteResponse || !data.quoteResponse.result) return null;
    
    return data.quoteResponse.result.map(quote => ({
      symbol: quote.symbol.replace('.NS', '').replace('.BO', ''),
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      pct: quote.regularMarketChangePercent,
      volume: quote.regularMarketVolume,
      mcap: quote.marketCap
    }));
  } catch (err) {
    console.error("Error fetching prices:", err);
    return null;
  }
}

async function fetchLiveIndices() {
  try {
    const indexMap = {
      '^NSEI': 'NIFTY 50',
      '^BSESN': 'SENSEX',
      '^NSEBANK': 'NIFTY BANK',
      '^CNXIT': 'NIFTY IT',
      '^INDIAVIX': 'INDIA VIX'
    };
    const querySymbols = Object.keys(indexMap).join(',');
    const url = import.meta.env.PROD ? `/api/finance?symbols=${querySymbols}` : `http://localhost:3001/api/finance/quote?symbols=${querySymbols}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.quoteResponse || !data.quoteResponse.result) return null;
    
    return data.quoteResponse.result.map(quote => ({
      name: indexMap[quote.symbol],
      val: quote.regularMarketPrice,
      chg: quote.regularMarketChangePercent
    }));
  } catch (err) {
    console.error("Error fetching indices:", err);
    return null;
  }
}

async function fetchIntradayData(symbol) {
  try {
    const url = import.meta.env.PROD ? `/api/intraday?symbol=${symbol}.NS` : `http://localhost:3001/api/finance/chart/${symbol}.NS?interval=5m&range=1d`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.intraday) return data.intraday;
    // Fallback for local dev server (raw Yahoo response)
    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const timestamps = result.timestamp || [];
      const closes = result.indicators.quote[0].close || [];
      return timestamps.map((ts, i) => ({
        time: new Date(ts * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }),
        price: closes[i] || null
      })).filter(p => p.price !== null);
    }
    return null;
  } catch (err) {
    console.error("Error fetching intraday:", err);
    return null;
  }
}

async function fetchLiveHistory(symbol) {
  try {
    const url = import.meta.env.PROD ? `/api/history?symbol=${symbol}.NS` : `http://localhost:3001/api/finance/history?symbol=${symbol}.NS`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.history) return null;
    return data.history;
  } catch (err) {
    console.error("Error fetching history:", err);
    return null;
  }
}

async function fetchLiveNews(symbol) {
  try {
    const url = import.meta.env.PROD ? `/api/news?symbol=${symbol}.NS` : `http://localhost:3001/api/finance/news?symbol=${symbol}.NS`;
    const res = await fetch(url);
    const data = await res.json();
    return data.news || [];
  } catch (err) {
    console.error("Error fetching news:", err);
    return [];
  }
}

async function fetchAllNews(symbols) {
  try {
    const querySymbols = symbols.map(s => `${s}.NS`).join(',');
    const url = import.meta.env.PROD ? `/api/news?symbols=${querySymbols}` : `http://localhost:3001/api/finance/news?symbols=${querySymbols}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.news || {};
  } catch (err) {
    console.error("Error fetching all news:", err);
    return {};
  }
}

async function fetchLiveMutualFunds() {
  try {
    const res = await fetch("/amfi-proxy/spages/NAVAll.txt");
    const text = await res.text();
    const lines = text.split('\n');

    // Create a dictionary of SchemeCode -> NAV
    const navDict = {};
    for (const line of lines) {
      const parts = line.split(';');
      if (parts.length >= 5) {
        const code = parts[0].trim();
        const nav = parseFloat(parts[4].trim());
        if (!isNaN(nav)) {
          navDict[code] = nav;
        }
      }
    }
    return navDict;
  } catch (err) {
    console.error("Error fetching AMFI NAVs:", err);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (n) => n?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "—";
const fmtCur  = (n) => n != null ? `₹${fmt(n)}` : "—";
const fmtVol  = (n) => { if (!n) return "—"; if (n>=1e7) return `${(n/1e7).toFixed(1)}Cr`; if (n>=1e5) return `${(n/1e5).toFixed(1)}L`; return n?.toLocaleString("en-IN"); };
const fmtMcap = (n) => { if (!n) return "—"; if (n>=1e12) return `₹${(n/1e12).toFixed(1)}T`; if (n>=1e9) return `₹${(n/1e9).toFixed(0)}B`; return `₹${(n/1e7).toFixed(0)}Cr`; };
const clr     = (v) => (v ?? 0) >= 0 ? "#00e5a0" : "#ff4d6d";
const sign    = (v) => (v ?? 0) > 0 ? "+" : "";

function Skeleton({ w = "100%", h = 16 }) {
  return <div style={{ width: w, height: h, background: "linear-gradient(90deg,#1a1a1a 25%,#252525 50%,#1a1a1a 75%)", backgroundSize: "200% 100%", borderRadius: 4, animation: "shimmer 1.4s infinite" }} />;
}

function MiniBar({ pct, positive }) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const x = (i / 11) * 80;
    const noise = (Math.sin(i * 2.3 + (positive ? 1 : 3)) * 8);
    const trend = positive ? i * 1.8 : -i * 1.8;
    const y = 14 - ((noise + trend) / 40) * 14;
    return `${x},${Math.max(2, Math.min(26, y))}`;
  }).join(" ");
  return (
    <svg width="80" height="30">
      <polyline points={pts} fill="none" stroke={positive ? "#00e5a0" : "#ff4d6d"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

function IntradaySparkline({ data, positive }) {
  if (!data || data.length < 2) return <MiniBar positive={positive} />;
  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 80, h = 30, pad = 2;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = pad + (1 - (d.price - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const color = positive ? "#00e5a0" : "#ff4d6d";
  // Create gradient fill area
  const firstPt = pts.split(" ")[0];
  const lastPt = pts.split(" ").pop();
  const fillPts = `${pts} ${lastPt.split(",")[0]},${h} ${firstPt.split(",")[0]},${h}`;
  return (
    <svg width={w} height={h}>
      <polygon points={fillPts} fill={`${color}15`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

function StarRating({ n }) {
  return <span>{Array.from({ length: 5 }, (_, i) => <span key={i} style={{ color: i < n ? "#f5a623" : "#252525", fontSize: 12 }}>★</span>)}</span>;
}

function ChartModal({ symbol, name, onClose }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchLiveHistory(symbol).then(setData);
  }, [symbol]);

  const yDomain = data ? [Math.min(...data.map(d=>d.price))*0.95, Math.max(...data.map(d=>d.price))*1.05] : ['auto','auto'];

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#000000cc", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#0f0f0f", border: "1px solid #222", borderRadius: 16, padding: 24, width: "90%", maxWidth: 800 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ color: "#e0e0e0", fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>{symbol}</div>
            <div style={{ color: "#666", fontSize: 13 }}>{name} · 1Y History</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
        
        <div style={{ height: 350, width: "100%" }}>
          {!data ? (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#555" }}>Loading Chart Data...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="date" stroke="#333" tick={{fill:"#666", fontSize: 10}} minTickGap={30} />
                <YAxis domain={yDomain} stroke="#333" tick={{fill:"#666", fontSize: 10}} tickFormatter={(v)=>`₹${v.toFixed(0)}`} width={60} />
                <Tooltip 
                  contentStyle={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, fontFamily: "monospace" }}
                  labelStyle={{ color: "#888", marginBottom: 4 }}
                  itemStyle={{ color: "#00e5a0", fontWeight: 700 }}
                  formatter={(v) => [`₹${v.toFixed(2)}`, "Price"]}
                />
                <Line type="monotone" dataKey="price" stroke="#00e5a0" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: "#000", stroke: "#00e5a0", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Index Bar ─────────────────────────────────────────────────────────────────
function IndexBar({ indices, loading }) {
  const FALLBACK = [
    { name: "NIFTY 50", val: null, chg: null },
    { name: "SENSEX",   val: null, chg: null },
    { name: "NIFTY BANK", val: null, chg: null },
    { name: "NIFTY IT", val: null, chg: null },
    { name: "INDIA VIX", val: null, chg: null },
  ];
  const data = (indices && indices.length > 0) ? indices : FALLBACK;

  return (
    <div style={{ background: "#0a0a0a", borderBottom: "1px solid #1a1a1a", padding: "8px 24px", display: "flex", gap: 32, overflowX: "auto", alignItems: "center" }}>
      {data.map((idx) => (
        <div key={idx.name} style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
          <span style={{ color: "#444", fontSize: 11, fontFamily: "monospace" }}>{idx.name}</span>
          {idx.val != null
            ? <>
                <span style={{ color: "#e0e0e0", fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>{fmt(idx.val)}</span>
                <span style={{ color: clr(idx.chg), fontSize: 11, fontFamily: "monospace" }}>{sign(idx.chg)}{idx.chg?.toFixed(2)}%</span>
              </>
            : <Skeleton w={90} h={12} />}
        </div>
      ))}
      {loading && <span style={{ color: "#333", fontSize: 10, marginLeft: "auto" }}>fetching live data…</span>}
    </div>
  );
}

// ── Stocks Tab ────────────────────────────────────────────────────────────────
function StocksTab({ stocks, loading, lastRefresh, onRefresh, refreshing, userStocks, buyStock, sellStock, intradayData = {}, watchlist = [], toggleWatchlist }) {
  const [sectorFilter, setSectorFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [chartAsset, setChartAsset] = useState(null);
  const sectors  = ["All", ...new Set(STOCK_DEFS.map((s) => s.sector))];
  const filtered = stocks.filter((s) => (sectorFilter === "All" || s.sector === sectorFilter) && s.symbol.includes(search.toUpperCase()));

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search symbol…"
          style={{ background: "#0f0f0f", border: "1px solid #222", color: "#e0e0e0", padding: "8px 14px", borderRadius: 8, fontSize: 13, outline: "none", width: 180 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {sectors.map((s) => (
            <button key={s} onClick={() => setSectorFilter(s)}
              style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: sectorFilter===s?"#00e5a0":"#222", background: sectorFilter===s?"#00e5a018":"transparent", color: sectorFilter===s?"#00e5a0":"#555", cursor: "pointer", fontSize: 12 }}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {lastRefresh && <span style={{ color: "#2a2a2a", fontSize: 11 }}>updated {lastRefresh.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span>}
          <button onClick={onRefresh} disabled={refreshing || loading}
            style={{ background: "transparent", border: "1px solid #222", color: (refreshing||loading)?"#333":"#555", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
            {(refreshing||loading) ? "⟳ fetching…" : "⟳ refresh"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 12 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "16px 18px" }}>
              <Skeleton w="55%" h={16} /><div style={{ height: 8 }} /><Skeleton w="38%" h={12} /><div style={{ height: 14 }} /><Skeleton w="85%" h={22} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 12 }}>
          {filtered.map((s) => (
            <div key={s.symbol}
              onClick={() => setChartAsset(s)}
              style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "#2e2e2e"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <button onClick={(e) => { e.stopPropagation(); toggleWatchlist(s.symbol); }}
                    style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1, color: watchlist.includes(s.symbol) ? "#f5a623" : "#2a2a2a", transition: "color 0.2s" }}
                    title={watchlist.includes(s.symbol) ? "Remove from watchlist" : "Add to watchlist"}>
                    {watchlist.includes(s.symbol) ? "★" : "☆"}
                  </button>
                  <span style={{ color: "#e0e0e0", fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{s.symbol}</span>
                  <span style={{ background: "#161616", color: "#444", fontSize: 10, padding: "2px 8px", borderRadius: 4 }}>{s.sector}</span>
                </div>
                <div style={{ color: "#3a3a3a", fontSize: 12, marginBottom: 10 }}>{s.name}</div>
                <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#2e2e2e" }}>
                  <span>Vol: {fmtVol(s.volume)}</span>
                  <span>MCap: {fmtMcap(s.mcap)}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {s.price != null ? (
                  <>
                    <div style={{ color: "#e0e0e0", fontWeight: 700, fontSize: 18, fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                      {fmtCur(s.price)}
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={(e) => { e.stopPropagation(); sellStock(s); }} style={{ width: 22, height: 22, borderRadius: 4, background: "#ff4d6d20", color: "#ff4d6d", border: "1px solid #ff4d6d50", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, lineHeight: 1 }}>−</button>
                        <button onClick={(e) => { e.stopPropagation(); buyStock(s); }} style={{ width: 22, height: 22, borderRadius: 4, background: "#00e5a020", color: "#00e5a0", border: "1px solid #00e5a050", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>+</button>
                      </div>
                    </div>
                    <div style={{ color: clr(s.change), fontSize: 13, fontFamily: "monospace", marginTop: 4 }}>{sign(s.change)}{fmt(s.change)} ({sign(s.pct)}{s.pct?.toFixed(2)}%)</div>
                    {(() => {
                      const owned = userStocks.find(u => u.symbol === s.symbol);
                      return owned ? <div style={{ color: "#00b4d8", fontSize: 11, marginTop: 4 }}>Owned: {owned.qty}</div> : null;
                    })()}
                  </>
                ) : <><Skeleton w={110} h={22} /><div style={{ height: 6 }} /><Skeleton w={80} h={14} /></>}
                <div style={{ marginTop: 6 }}><IntradaySparkline data={intradayData[s.symbol]} positive={(s.pct ?? 0) >= 0} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 14, color: "#1e1e1e", fontSize: 11, textAlign: "right" }}>
        Live prices via web search · auto-refreshes every 5 min
      </div>
      {chartAsset && <ChartModal symbol={chartAsset.symbol} name={chartAsset.name} onClose={() => setChartAsset(null)} />}
    </div>
  );
}

// ── Mutual Funds Tab ──────────────────────────────────────────────────────────
function MutualFundsTab({ funds, userMFs, buyMF, sellMF }) {
  const [sort, setSort] = useState("returns1y");
  const sorted = [...funds].sort((a, b) => b[sort] - a[sort]);
  const riskColor = { "Low": "#00e5a0", "Moderate": "#f5a623", "Moderate High": "#ff8c42", "High": "#ff4d6d" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
        <span style={{ color: "#333", fontSize: 12, marginRight: 4 }}>Sort by</span>
        {[["returns1y","1Y Returns"],["returns3y","3Y Returns"],["returns5y","5Y Returns"]].map(([k,label]) => (
          <button key={k} onClick={() => setSort(k)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: sort===k?"#f5a623":"#222", background: sort===k?"#f5a62318":"transparent", color: sort===k?"#f5a623":"#555", cursor: "pointer", fontSize: 12 }}>
            {label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", color: "#222", fontSize: 11 }}>NAV data from AMFI · updated daily</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((f) => (
          <div key={f.name} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "18px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ color: "#e0e0e0", fontWeight: 700, fontSize: 15 }}>{f.name}</span>
                  <StarRating n={f.rating} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ background: "#161616", color: "#666", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>{f.category}</span>
                  <span style={{ background: "#161616", color: riskColor[f.risk]||"#888", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>{f.risk} Risk</span>
                </div>
                <div style={{ color: "#2e2e2e", fontSize: 12, marginTop: 6 }}>AUM: {f.aum}</div>
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                {[["1Y",f.returns1y],["3Y",f.returns3y],["5Y",f.returns5y]].map(([label,val]) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ color: "#333", fontSize: 11, marginBottom: 4 }}>{label} Returns</div>
                    <div style={{ color: "#00e5a0", fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{val}%</div>
                  </div>
                ))}
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#333", fontSize: 11, marginBottom: 4 }}>NAV</div>
                  <div style={{ color: "#e0e0e0", fontWeight: 700, fontSize: 20, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 12 }}>
                    {fmtCur(f.nav)}
                    <div style={{ display: "flex", gap: 4, flexDirection: "column" }}>
                      <button onClick={() => buyMF(f)} style={{ width: 22, height: 18, borderRadius: 4, background: "#00e5a020", color: "#00e5a0", border: "1px solid #00e5a050", cursor: "pointer", fontSize: 12 }}>+</button>
                      <button onClick={() => sellMF(f)} style={{ width: 22, height: 18, borderRadius: 4, background: "#ff4d6d20", color: "#ff4d6d", border: "1px solid #ff4d6d50", cursor: "pointer", fontSize: 12 }}>−</button>
                    </div>
                  </div>
                  {(() => {
                    const owned = userMFs.find(u => u.name === f.name);
                    return owned ? <div style={{ color: "#f5a623", fontSize: 11, marginTop: 4 }}>Owned: {owned.units}</div> : null;
                  })()}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
              {[["1Y",f.returns1y,35],["3Y",f.returns3y,35],["5Y",f.returns5y,35]].map(([l,v,mx]) => (
                <div key={l} style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#2e2e2e", marginBottom: 3 }}><span>{l}</span><span>{v}%</span></div>
                  <div style={{ background: "#161616", borderRadius: 4, height: 4 }}>
                    <div style={{ width: `${Math.min((v/mx)*100,100)}%`, height: "100%", background: "linear-gradient(90deg,#00e5a0,#00b4d8)", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Portfolio Tab ─────────────────────────────────────────────────────────────
function PortfolioTab({ stocks, userStocks, funds, userMFs }) {
  const enriched = userStocks.map((p) => {
    const live = stocks.find((s) => s.symbol === p.symbol);
    return { ...p, currentPrice: live?.price ?? null };
  });
  
  const enrichedMFs = userMFs.map((f) => {
    const live = funds?.find((lf) => lf.name === f.name);
    return { ...f, currentNav: live?.nav ?? f.currentNav ?? f.avgNav };
  });

  const stockTotal    = enriched.reduce((a,s) => a + (s.currentPrice ? s.qty * s.currentPrice : s.qty * s.avgPrice), 0);
  const stockInvested = enriched.reduce((a,s) => a + s.qty * s.avgPrice, 0);
  const mfTotal       = enrichedMFs.reduce((a,f) => a + f.units * f.currentNav, 0);
  const mfInvested    = enrichedMFs.reduce((a,f) => a + f.units * f.avgNav, 0);
  const total         = stockTotal + mfTotal;
  const invested      = stockInvested + mfInvested;
  const pnl           = total - invested;
  const pnlPct        = invested ? ((pnl / invested) * 100).toFixed(2) : "0.00";

  const sectorAlloc = enriched.reduce((acc,s) => {
    const val = (s.currentPrice ?? s.avgPrice) * s.qty;
    acc[s.sector] = (acc[s.sector] || 0) + val;
    return acc;
  }, {});
  const sectorColors = { Energy:"#ff6b35", IT:"#00b4d8", Banking:"#f5a623", NBFC:"#7c3aed", Pharma:"#00e5a0" };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Value",  val: fmtCur(total.toFixed(0)),     sub: "Portfolio",                   color: "#e0e0e0" },
          { label: "Invested",     val: fmtCur(invested.toFixed(0)),   sub: "Cost Basis",                  color: "#666"    },
          { label: "Total P&L",   val: `${pnl>0?"+":""}${fmtCur(pnl.toFixed(0))}`, sub: `${pnlPct}% overall`, color: clr(pnl) },
          { label: "Stocks Value", val: fmtCur(stockTotal.toFixed(0)), sub: `${enriched.length} holdings`, color: "#00b4d8" },
          { label: "MF Value",     val: fmtCur(mfTotal.toFixed(0)),    sub: `${userMFs.length} funds`, color: "#f5a623" },
        ].map((c) => (
          <div key={c.label} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ color: "#333", fontSize: 11, marginBottom: 6 }}>{c.label}</div>
            <div style={{ color: c.color, fontWeight: 700, fontSize: 20, fontFamily: "monospace" }}>{c.val}</div>
            <div style={{ color: "#2a2a2a", fontSize: 12, marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,340px),1fr))", gap: 16 }}>
        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ color: "#e0e0e0", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Stock Holdings <span style={{ color: "#2a2a2a", fontWeight: 400, fontSize: 11 }}>· live prices</span></div>
          {enriched.length === 0 ? (
            <div style={{ color: "#555", fontSize: 13, fontStyle: "italic", padding: "10px 0" }}>No stocks in portfolio. Add some from the Stocks tab.</div>
          ) : enriched.map((s) => {
            const cur  = s.currentPrice ?? s.avgPrice;
            const val  = s.qty * cur;
            const inv  = s.qty * s.avgPrice;
            const p2   = val - inv;
            const pct2 = ((p2 / inv) * 100).toFixed(1);
            const isLive = s.currentPrice != null;
            return (
              <div key={s.symbol} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #111", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#e0e0e0", fontWeight: 600, fontFamily: "monospace", fontSize: 13 }}>{s.symbol}</span>
                    {!isLive && <span style={{ color: "#555", fontSize: 9, background: "#1a1a1a", padding: "1px 5px", borderRadius: 3 }}>avg</span>}
                  </div>
                  <div style={{ color: "#2a2a2a", fontSize: 11 }}>{s.qty} × avg {fmtCur(s.avgPrice)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#e0e0e0", fontFamily: "monospace", fontSize: 13 }}>{fmtCur(val.toFixed(0))}</div>
                  <div style={{ color: clr(p2), fontSize: 12, fontFamily: "monospace" }}>{p2>0?"+":""}{fmtCur(p2.toFixed(0))} ({pct2}%)</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ color: "#e0e0e0", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>MF Holdings</div>
            {enrichedMFs.length === 0 ? (
              <div style={{ color: "#555", fontSize: 13, fontStyle: "italic", padding: "10px 0" }}>No mutual funds in portfolio. Add some from the MF tab.</div>
            ) : enrichedMFs.map((f) => {
              const val = f.units * f.currentNav, inv = f.units * f.avgNav, p = val - inv;
              return (
                <div key={f.name} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #111", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#e0e0e0", fontSize: 12, fontWeight: 600, maxWidth: 160 }}>{f.name}</div>
                    <div style={{ color: "#2a2a2a", fontSize: 11 }}>{f.units} units · avg {fmtCur(f.avgNav)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#e0e0e0", fontFamily: "monospace", fontSize: 13 }}>{fmtCur(val.toFixed(0))}</div>
                    <div style={{ color: clr(p), fontSize: 12, fontFamily: "monospace" }}>{p>0?"+":""}{fmtCur(p.toFixed(0))} ({((p/inv)*100).toFixed(1)}%)</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ color: "#e0e0e0", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Sector Allocation</div>
            {Object.entries(sectorAlloc).map(([sector, val]) => {
              const pct = stockTotal ? ((val / stockTotal) * 100).toFixed(1) : "0.0";
              return (
                <div key={sector} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "#666" }}>{sector}</span>
                    <span style={{ color: sectorColors[sector]||"#888", fontFamily: "monospace" }}>{pct}%</span>
                  </div>
                  <div style={{ background: "#161616", borderRadius: 4, height: 4 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: sectorColors[sector]||"#888", borderRadius: 4, transition: "width 0.6s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Watchlist Tab ──────────────────────────────────────────────────────────────
function WatchlistTab({ stocks, watchlist, toggleWatchlist, intradayData = {}, userStocks, buyStock, sellStock }) {
  const [chartAsset, setChartAsset] = useState(null);
  const watched = stocks.filter(s => watchlist.includes(s.symbol));

  return (
    <div>
      {watched.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "#333" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👁️</div>
          <div style={{ fontSize: 15, marginBottom: 8, color: "#555" }}>Your watchlist is empty</div>
          <div style={{ fontSize: 12, color: "#2a2a2a" }}>Click the ☆ icon on any stock card in the Stocks tab to start watching</div>
        </div>
      ) : (
        <>
          <div style={{ color: "#333", fontSize: 12, marginBottom: 16 }}>{watched.length} stock{watched.length !== 1 ? "s" : ""} watched</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 12 }}>
            {watched.map(s => (
              <div key={s.symbol}
                onClick={() => setChartAsset(s)}
                style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "border-color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#2e2e2e"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#1a1a1a"}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleWatchlist(s.symbol); }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1, color: "#f5a623" }}
                      title="Remove from watchlist">
                      ★
                    </button>
                    <span style={{ color: "#e0e0e0", fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{s.symbol}</span>
                    <span style={{ background: "#161616", color: "#444", fontSize: 10, padding: "2px 8px", borderRadius: 4 }}>{s.sector}</span>
                  </div>
                  <div style={{ color: "#3a3a3a", fontSize: 12, marginBottom: 10 }}>{s.name}</div>
                  <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#2e2e2e" }}>
                    <span>Vol: {fmtVol(s.volume)}</span>
                    <span>MCap: {fmtMcap(s.mcap)}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {s.price != null ? (
                    <>
                      <div style={{ color: "#e0e0e0", fontWeight: 700, fontSize: 18, fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                        {fmtCur(s.price)}
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={(e) => { e.stopPropagation(); sellStock(s); }} style={{ width: 22, height: 22, borderRadius: 4, background: "#ff4d6d20", color: "#ff4d6d", border: "1px solid #ff4d6d50", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, lineHeight: 1 }}>−</button>
                          <button onClick={(e) => { e.stopPropagation(); buyStock(s); }} style={{ width: 22, height: 22, borderRadius: 4, background: "#00e5a020", color: "#00e5a0", border: "1px solid #00e5a050", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>+</button>
                        </div>
                      </div>
                      <div style={{ color: clr(s.change), fontSize: 13, fontFamily: "monospace", marginTop: 4 }}>{sign(s.change)}{fmt(s.change)} ({sign(s.pct)}{s.pct?.toFixed(2)}%)</div>
                      {(() => {
                        const owned = userStocks.find(u => u.symbol === s.symbol);
                        return owned ? <div style={{ color: "#00b4d8", fontSize: 11, marginTop: 4 }}>Owned: {owned.qty}</div> : null;
                      })()}
                    </>
                  ) : <><Skeleton w={110} h={22} /><div style={{ height: 6 }} /><Skeleton w={80} h={14} /></>}
                  <div style={{ marginTop: 6 }}><IntradaySparkline data={intradayData[s.symbol]} positive={(s.pct ?? 0) >= 0} /></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {chartAsset && <ChartModal symbol={chartAsset.symbol} name={chartAsset.name} onClose={() => setChartAsset(null)} />}
    </div>
  );
}

// ── News Tab ──────────────────────────────────────────────────────────────────
function NewsTab() {
  const [newsData, setNewsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadNews = async () => {
    setLoading(true);
    const symbols = STOCK_DEFS.map(s => s.symbol);
    const data = await fetchAllNews(symbols);
    setNewsData(data);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => { loadNews(); }, []);

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const allSymbols = ["All", ...Object.keys(newsData)];

  // Flatten and sort all news items
  const allItems = Object.entries(newsData).flatMap(([sym, items]) =>
    (items || []).map(item => ({ ...item, symbol: sym }))
  ).sort((a, b) => {
    if (!a.pubDate || !b.pubDate) return 0;
    return new Date(b.pubDate) - new Date(a.pubDate);
  });

  const filtered = filter === "All" ? allItems : allItems.filter(i => i.symbol === filter);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {allSymbols.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: filter === s ? "#00b4d8" : "#222", background: filter === s ? "#00b4d818" : "transparent", color: filter === s ? "#00b4d8" : "#555", cursor: "pointer", fontSize: 12 }}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {lastUpdated && <span style={{ color: "#2a2a2a", fontSize: 11 }}>updated {lastUpdated.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span>}
          <button onClick={loadNews} disabled={loading}
            style={{ background: "transparent", border: "1px solid #222", color: loading ? "#333" : "#555", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
            {loading ? "⟳ fetching…" : "⟳ refresh"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "16px 20px" }}>
              <Skeleton w="60%" h={16} /><div style={{ height: 8 }} /><Skeleton w="90%" h={12} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#333" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📰</div>
          <div style={{ fontSize: 14 }}>No news available{filter !== "All" ? ` for ${filter}` : ""}.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((item, i) => (
            <a key={i} href={item.link || "#"} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, transition: "border-color 0.2s", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#2e2e2e"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#1a1a1a"}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ background: "#161616", color: "#00b4d8", fontSize: 10, padding: "2px 8px", borderRadius: 4, fontFamily: "monospace", fontWeight: 600 }}>{item.symbol}</span>
                  {item.pubDate && <span style={{ color: "#2a2a2a", fontSize: 11 }}>{timeAgo(item.pubDate)}</span>}
                </div>
                <div style={{ color: "#b0b0b0", fontSize: 13, lineHeight: 1.5 }}>{item.title}</div>
              </div>
              <div style={{ color: "#222", fontSize: 16, flexShrink: 0 }}>→</div>
            </a>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14, color: "#1e1e1e", fontSize: 11, textAlign: "right" }}>
        News headlines via Yahoo Finance RSS
      </div>
    </div>
  );
}

// ── AI Advisor Tab ────────────────────────────────────────────────────────────
function AIAdvisorTab({ stocks, indices, userStocks, userMFs }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Namaste! I'm your NSE Financial Advisor with live market data.\n\nI can help with:\n\n• **Buy / Hold / Sell** decisions with current price context\n• **Sentiment analysis** on news & macro events\n• **Portfolio review** using your actual holdings\n• **Sector outlooks** and RBI / macro analysis\n\nWhat would you like to know?",
  }]);
  const [input, setInput]         = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sentiment, setSentiment] = useState(null);
  const endRef = useRef(null);

  const SUGGESTIONS = [
    "Should I buy more RELIANCE at current price?",
    "How will RBI rate cut affect my banking stocks?",
    "Review my portfolio and suggest rebalancing",
    "Impact of weak INR on Indian IT stocks",
    "Is SBI Small Cap Fund worth holding for 5 years?",
  ];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const buildContext = () => {
    const liveStocks = stocks.filter((s) => s.price != null);
    const indexStr   = indices?.map((i) => `${i.name}: ${fmt(i.val)} (${sign(i.chg)}${i.chg?.toFixed(2)}%)`).join(", ") || "N/A";
    return `
Live NSE indices: ${indexStr}

Live stock prices:
${liveStocks.map((s) => `- ${s.symbol}: ₹${s.price?.toFixed(2)} | ${sign(s.pct)}${s.pct?.toFixed(2)}% | Vol: ${fmtVol(s.volume)}`).join("\n")}

User's stock portfolio:
${userStocks.length ? userStocks.map((p) => {
  const l = stocks.find((s) => s.symbol === p.symbol);
  const cur = l?.price;
  const pnl = cur ? ((cur - p.avgPrice) / p.avgPrice * 100).toFixed(1) + "%" : "N/A";
  return `- ${p.symbol}: ${p.qty} shares, avg ₹${p.avgPrice.toFixed(2)}, live ₹${cur?.toFixed(2) ?? "N/A"}, P&L ${pnl}`;
}).join("\n") : "None"}

User's MF holdings:
${userMFs.length ? userMFs.map((f) => `- ${f.name}: ${f.units} units, avg ₹${f.avgNav.toFixed(2)}, NAV ₹${f.currentNav.toFixed(2)}`).join("\n") : "None"}`;
  };

  const sendMessage = async (text, hiddenContext = "") => {
    const msg = text || input;
    if (!msg.trim()) return;
    setInput("");
    const newMsgs = [...messages, { role: "user", content: msg }];
    setMessages(newMsgs);
    setAiLoading(true);
    setSentiment(null);
    try {
      const systemInstruction = `You are an expert Indian stock market financial advisor specialising in NSE/BSE, mutual funds, macro, and RBI policy.
${buildContext()}
${hiddenContext}

Rules:
- Give concrete Buy / Hold / Sell recommendations with clear reasoning
- For news/events, perform sentiment analysis scored −100 (bearish) to +100 (bullish)
- Always end response with exactly this tag on its own line: [SENTIMENT:score:BULLISH|BEARISH|NEUTRAL]
- Use ₹ for INR. Reference real Indian market context and SEBI regulations
- Use bullet points (• ) for clarity`;

      const historyMsgs = messages.slice(1);
      const url = import.meta.env.PROD ? '/api/chat' : 'http://localhost:3001/api/ai/chat';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historyMsgs,
          message: msg,
          systemInstruction
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        let errMsg = errData.error || 'Server Side Error';
        try {
          const innerParse = JSON.parse(errData.error);
          if (innerParse.error && innerParse.error.message) errMsg = innerParse.error.message;
        } catch(e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      const reply_raw = data.text || "Unable to respond. Please try again.";

      const match = reply_raw.match(/\[SENTIMENT:(-?\d+):(\w+)\]/);
      if (match) setSentiment({ score: parseInt(match[1]), label: match[2] });
      
      const reply = reply_raw.replace(/\[SENTIMENT:(-?\d+):(\w+)\]/, "").trim();
      setMessages([...newMsgs, { role: "assistant", content: reply }]);
      
    } catch (e) {
      console.error("Gemini Error:", e);
      setMessages([...newMsgs, { role: "assistant", content: `⚠️ Error: ${e.message}` }]);
    }
    setAiLoading(false);
  };

  const SentimentMeter = ({ score, label }) => {
    const color = score > 20 ? "#00e5a0" : score < -20 ? "#ff4d6d" : "#f5a623";
    const pct   = ((score + 100) / 200) * 100;
    return (
      <div style={{ background: "#0f0f0f", border: `1px solid ${color}33`, borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#333", fontSize: 11, letterSpacing: 1 }}>SENTIMENT ANALYSIS</span>
          <span style={{ color, fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{label} ({score>0?"+":""}{score})</span>
        </div>
        <div style={{ background: "#161616", borderRadius: 4, height: 6, position: "relative" }}>
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg,#ff4d6d,#f5a623 50%,#00e5a0)", borderRadius: 4, opacity: 0.3 }} />
          <div style={{ position: "absolute", top: 0, left: `calc(${pct}% - 5px)`, width: 12, height: 12, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}66`, transform: "translateY(-3px)", transition: "left 0.5s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#2a2a2a" }}>
          <span>Bearish −100</span><span>Neutral 0</span><span>+100 Bullish</span>
        </div>
      </div>
    );
  };

  const formatMsg = (text) =>
    text.split("\n").map((line, i) => {
      const html = line.replace(/\*\*(.*?)\*\*/g, `<strong style="color:#e0e0e0">$1</strong>`);
      if (line.startsWith("• ") || line.startsWith("- "))
        return <div key={i} style={{ display:"flex", gap:8, marginBottom:3 }}><span style={{ color:"#00e5a0", flexShrink:0 }}>•</span><span dangerouslySetInnerHTML={{ __html: html.slice(2) }} /></div>;
      return <div key={i} style={{ marginBottom: line ? 4 : 8 }} dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 240px)", minHeight: 500 }}>
      {sentiment && <SentimentMeter score={sentiment.score} label={sentiment.label} />}

      {messages.length <= 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => sendMessage(s)}
              style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", color: "#555", padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor="#00e5a0"; e.currentTarget.style.color="#00e5a0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor="#1a1a1a"; e.currentTarget.style.color="#555"; }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role==="user"?"flex-end":"flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#00e5a0,#00b4d8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#000", marginRight:8, flexShrink:0, marginTop:2 }}>₹</div>
            )}
            <div style={{ maxWidth:"76%", background: m.role==="user"?"#0c2018":"#0f0f0f", border:`1px solid ${m.role==="user"?"#00e5a01a":"#1a1a1a"}`, borderRadius: m.role==="user"?"16px 16px 4px 16px":"4px 16px 16px 16px", padding:"12px 16px", color:"#888", fontSize:13, lineHeight:1.65 }}>
              {formatMsg(m.content)}
            </div>
          </div>
        ))}
        {aiLoading && (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#00e5a0,#00b4d8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#000" }}>₹</div>
            <div style={{ background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:"4px 16px 16px 16px", padding:"14px 16px" }}>
              <div style={{ display:"flex", gap:5 }}>
                {[0,1,2].map((j) => <div key={j} style={{ width:6, height:6, borderRadius:"50%", background:"#00e5a0", animation:`bounce 1s ${j*0.2}s infinite` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ display:"flex", gap:10, marginTop:12 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key==="Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask about live prices, portfolio advice, market events…"
          style={{ flex:1, background:"#0f0f0f", border:"1px solid #222", color:"#e0e0e0", padding:"12px 16px", borderRadius:10, fontSize:13, outline:"none" }}
          onFocus={(e) => e.target.style.borderColor="#00e5a0"}
          onBlur={(e)  => e.target.style.borderColor="#222"} />
          <button onClick={() => sendMessage()} disabled={aiLoading || !input.trim()}
          style={{ background: input.trim()?"linear-gradient(135deg,#00e5a0,#00b4d8)":"#111", border:"none", color: input.trim()?"#000":"#2e2e2e", padding:"12px 22px", borderRadius:10, cursor: input.trim()?"pointer":"default", fontWeight:700, fontSize:13, transition:"all 0.2s" }}>
          {aiLoading ? "…" : "Send →"}
        </button>
      </div>

      {userStocks.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
           <span style={{ color: "#555", fontSize: 11 }}>Analyze News For:</span>
           {userStocks.map(s => (
             <button key={s.symbol} onClick={async () => {
                const uiPrompt = `Analyze the current situation for ${s.symbol} given the latest news.`;
                setAiLoading(true);
                const news = await fetchLiveNews(s.symbol);
                setAiLoading(false);
                const hiddenCtx = `\n\nLATEST NEWS HEADLINES FOR ${s.symbol}:\n${news.length ? news.map(n => `- ${n}`).join("\n") : "None"}`;
                sendMessage(uiPrompt, hiddenCtx);
             }} disabled={aiLoading}
             style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", color: "#00b4d8", padding: "4px 10px", borderRadius: 6, cursor: aiLoading?"default":"pointer", fontSize: 11 }}>
               {s.symbol}
             </button>
           ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab]         = useState("stocks");
  const [stocks, setStocks]   = useState(STOCK_DEFS.map((d) => ({ ...d, price: null, change: null, pct: null, volume: null, mcap: null })));
  const [funds, setFunds]     = useState(MUTUAL_FUNDS);
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [intradayData, setIntradayData] = useState({});

  // Watchlist State (Persistent)
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('nse_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('nse_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (symbol) => {
    setWatchlist(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  };

  // Dynamic User Portfolio State (Persistent)
  const [userStocks, setUserStocks] = useState(() => {
    try {
      const saved = localStorage.getItem('nse_user_stocks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [userMFs, setUserMFs] = useState(() => {
    try {
      const saved = localStorage.getItem('nse_user_mfs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('nse_user_stocks', JSON.stringify(userStocks));
  }, [userStocks]);

  useEffect(() => {
    localStorage.setItem('nse_user_mfs', JSON.stringify(userMFs));
  }, [userMFs]);

  // Add 1 unit at a time
  const buyStock = (s) => {
    if (s.price == null) return;
    const qtyToAdd = 1;
    setUserStocks(prev => {
      const existing = prev.find(p => p.symbol === s.symbol);
      if (existing) {
        const newQty = existing.qty + qtyToAdd;
        // recalculate rolling average entry price
        const newAvg = ((existing.qty * existing.avgPrice) + (qtyToAdd * s.price)) / newQty;
        return prev.map(p => p.symbol === s.symbol ? { ...p, qty: newQty, avgPrice: newAvg } : p);
      }
      return [...prev, { symbol: s.symbol, qty: qtyToAdd, avgPrice: s.price, sector: s.sector }];
    });
  };

  const sellStock = (s) => {
    const qtyToSub = 1;
    setUserStocks(prev => {
      const existing = prev.find(p => p.symbol === s.symbol);
      if (!existing) return prev;
      if (existing.qty <= qtyToSub) return prev.filter(p => p.symbol !== s.symbol);
      return prev.map(p => p.symbol === s.symbol ? { ...p, qty: existing.qty - qtyToSub } : p);
    });
  };

  const buyMF = (f) => {
    if (f.nav == null) return;
    const unitsToAdd = 1;
    setUserMFs(prev => {
      const existing = prev.find(m => m.name === f.name);
      if (existing) {
        const newQty = existing.units + unitsToAdd;
        const newAvg = ((existing.units * existing.avgNav) + (unitsToAdd * f.nav)) / newQty;
        return prev.map(m => m.name === f.name ? { ...m, units: newQty, avgNav: newAvg, currentNav: f.nav } : m);
      }
      return [...prev, { name: f.name, units: unitsToAdd, avgNav: f.nav, currentNav: f.nav }];
    });
  };

  const sellMF = (f) => {
    const unitsToSub = 1;
    setUserMFs(prev => {
      const existing = prev.find(m => m.name === f.name);
      if (!existing) return prev;
      if (existing.units <= unitsToSub) return prev.filter(m => m.name !== f.name);
      return prev.map(m => m.name === f.name ? { ...m, units: existing.units - unitsToSub } : m);
    });
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const symbols = STOCK_DEFS.map((d) => d.symbol);

    const [priceData, indexData, amfiData] = await Promise.all([
      fetchLivePrices(symbols),
      fetchLiveIndices(),
      fetchLiveMutualFunds(),
    ]);

    // Fetch intraday data for all symbols in parallel
    const intradayResults = await Promise.all(
      symbols.map(async (sym) => {
        const data = await fetchIntradayData(sym);
        return { symbol: sym, data };
      })
    );
    const intradayMap = {};
    intradayResults.forEach(r => { if (r.data) intradayMap[r.symbol] = r.data; });
    setIntradayData(intradayMap);

    if (priceData) {
      setStocks(STOCK_DEFS.map((def) => {
        const live = priceData.find((p) => p.symbol === def.symbol);
        return { ...def, price: live?.price ?? null, change: live?.change ?? null, pct: live?.pct ?? null, volume: live?.volume ?? null, mcap: live?.mcap ?? null };
      }));
    }

    if (indexData) setIndices(indexData);

    if (amfiData) {
      setFunds(MUTUAL_FUNDS.map((f) => ({
         ...f, 
         nav: amfiData[f.code] || f.nav 
      })));
      
      // Keep dynamic user MF portfolio navs refreshed
      setUserMFs(prev => prev.map(portFund => {
         const matchingDef = MUTUAL_FUNDS.find(m => m.name === portFund.name);
         if (matchingDef && amfiData[matchingDef.code]) {
             return { ...portFund, currentNav: amfiData[matchingDef.code] };
         }
         return portFund;
      }));
    }

    setLoading(false);
    setRefreshing(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(() => loadData(true), 5 * 60 * 1000); // 5 min
    return () => clearInterval(t);
  }, [loadData]);

  const tabs = [
    { id:"stocks",    label:"Stocks",      icon:"📈" },
    { id:"watchlist", label:"Watchlist",    icon:"👁️" },
    { id:"mf",        label:"Mutual Funds", icon:"🏦" },
    { id:"portfolio", label:"Portfolio",    icon:"💼" },
    { id:"news",      label:"News",        icon:"📰" },
    { id:"advisor",   label:"AI Advisor",   icon:"🤖" },
  ];

  const dataOk = stocks.some((s) => s.price != null);

  return (
    <div style={{ minHeight:"100vh", background:"#070707", color:"#888", fontFamily:"'DM Mono','Courier New',monospace" }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        html, body { background:#070707; overflow-x:hidden; -webkit-overflow-scrolling:touch; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#0a0a0a; }
        ::-webkit-scrollbar-thumb { background:#222; border-radius:2px; }
        @keyframes bounce  { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap');
      `}</style>

      {/* Header */}
      <div style={{ background:"#0a0a0a", borderBottom:"1px solid #1a1a1a", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#00e5a0,#00b4d8)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#000", fontSize:16 }}>N</div>
          <div>
            <div style={{ color:"#e0e0e0", fontWeight:700, fontSize:16, fontFamily:"'Space Grotesk',sans-serif" }}>NSE Terminal</div>
            <div style={{ color:"#2e2e2e", fontSize:11 }}>Indian Market Intelligence · Live via Web Search</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background: loading?"#f5a623": dataOk?"#00e5a0":"#ff4d6d", boxShadow:`0 0 6px ${loading?"#f5a623": dataOk?"#00e5a0":"#ff4d6d"}` }} />
            <span style={{ color:"#333", fontSize:11 }}>{loading?"FETCHING…": refreshing?"REFRESHING…": dataOk?"LIVE":"UNAVAILABLE"}</span>
          </div>
          <LiveClock />
        </div>
      </div>

      <IndexBar indices={indices} loading={loading || refreshing} />

      <div style={{ background:"#0a0a0a", borderBottom:"1px solid #1a1a1a", padding:"0 16px", display:"flex", gap:2, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:"12px 14px", background:"transparent", border:"none", borderBottom:`2px solid ${tab===t.id?"#00e5a0":"transparent"}`, color: tab===t.id?"#e0e0e0":"#3a3a3a", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", gap:5, fontFamily:"'Space Grotesk',sans-serif", fontWeight: tab===t.id?600:400, transition:"all 0.2s", whiteSpace:"nowrap", flexShrink:0 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:"16px", maxWidth:1400, margin:"0 auto" }}>
        {tab==="stocks"    && <StocksTab stocks={stocks} loading={loading} lastRefresh={lastRefresh} refreshing={refreshing} onRefresh={() => loadData(true)} userStocks={userStocks} buyStock={buyStock} sellStock={sellStock} intradayData={intradayData} watchlist={watchlist} toggleWatchlist={toggleWatchlist} />}
        {tab==="watchlist" && <WatchlistTab stocks={stocks} watchlist={watchlist} toggleWatchlist={toggleWatchlist} intradayData={intradayData} userStocks={userStocks} buyStock={buyStock} sellStock={sellStock} />}
        {tab==="mf"        && <MutualFundsTab funds={funds} userMFs={userMFs} buyMF={buyMF} sellMF={sellMF} />}
        {tab==="portfolio" && <PortfolioTab stocks={stocks} userStocks={userStocks} funds={funds} userMFs={userMFs} />}
        {tab==="news"      && <NewsTab />}
        {tab==="advisor"   && <AIAdvisorTab stocks={stocks} indices={indices} userStocks={userStocks} userMFs={userMFs} />}
      </div>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return <div style={{ color:"#2a2a2a", fontSize:11, fontFamily:"monospace" }}>{time.toLocaleTimeString("en-IN", { timeZone:"Asia/Kolkata" })} IST</div>;
}
