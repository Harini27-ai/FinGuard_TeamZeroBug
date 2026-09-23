import {useEffect,useState} from "react";
import {ShieldCheck,Activity,Network,Zap,RefreshCw,AlertTriangle} from "lucide-react";
const API=import.meta.env.VITE_API_URL||"http://localhost:8000";

function Metric({icon:Icon,label,value,sub}){return <div className="metric card"><div className="metric-icon"><Icon size={20}/></div><div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-sub">{sub}</div></div></div>}
function RiskBadge({action}){return <span className={`badge ${action.toLowerCase()}`}>{action}</span>}

export default function App(){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[selected,setSelected]=useState(null);
 async function load(){const r=await fetch(`${API}/api/dashboard`);setData(await r.json())}
 async function simulate(){setBusy(true);try{const r=await fetch(`${API}/api/transactions/simulate`,{method:"POST"});setSelected(await r.json());await load()}finally{setBusy(false)}}
 useEffect(()=>{load();const id=setInterval(load,5000);return()=>clearInterval(id)},[]);
 if(!data)return <div className="loading">Loading FinGuard…</div>;
 return <div className="app">
  <header><div className="brand"><div className="logo"><ShieldCheck size={24}/></div><div><h1>FinGuard</h1><p>AI Fraud Prevention</p></div></div>
  <button className="simulate" onClick={simulate} disabled={busy}><Zap size={17}/>{busy?"Scoring…":"Simulate Transaction"}</button></header>
  <section className="hero"><div><div className="eyebrow">TEAM ZEROBUG · REAL-TIME DEFENSE</div><h2>Detect fraud before the transaction becomes a loss.</h2><p>Behavioral signals + account relationship graphs + risk policy in one scoring pipeline.</p></div><div className="hero-status"><span className="pulse"></span>ENGINE ONLINE</div></section>
  <section className="metrics">
   <Metric icon={Activity} label="Transactions" value={data.total} sub="processed by demo engine"/>
   <Metric icon={AlertTriangle} label="High risk" value={data.high_risk} sub={`${data.high_risk_rate}% of transactions`}/>
   <Metric icon={Network} label="Step-up" value={data.step_up} sub="additional verification"/>
   <Metric icon={RefreshCw} label="Avg risk" value={data.avg_risk.toFixed(2)} sub="0.00 → 1.00"/>
  </section>
  <section className="grid">
   <div className="card"><div className="card-head"><h3>Execution Pipeline</h3><span>Sub-second target</span></div><div className="pipeline">
    <div><b>01</b><strong>Payload Stream</strong><small>Transaction + device signals</small></div>
    <div><b>02</b><strong>Graph Analysis</strong><small>Account/device/IP relationships</small></div>
    <div><b>03</b><strong>Behavior Model</strong><small>Biometric deviation scoring</small></div>
    <div><b>04</b><strong>Action Decision</strong><small>Approve / Step-up / Freeze</small></div>
   </div></div>
   <div className="card"><div className="card-head"><h3>Architecture</h3><span>FinGuard MVP</span></div><div className="architecture">
    <div>React Dashboard</div><span>→</span><div>FastAPI</div><span>→</span><div>Fraud Engine</div>
    <div>PostgreSQL</div><span>+</span><div>Neo4j</div><span>+</span><div>Redis</div>
   </div></div>
  </section>
  <section className="card feed"><div className="card-head"><h3>Live Risk Feed</h3><span>auto-refresh 5s</span></div><div className="table">
   <div className="tr th"><span>Account</span><span>Merchant</span><span>Amount</span><span>Risk</span><span>Action</span></div>
   {data.recent.map(tx=><div className="tr" key={tx.id} onClick={()=>setSelected(tx)}><span>{tx.account_id}</span><span>{tx.merchant}</span><span>₹{Number(tx.amount).toLocaleString()}</span><span className="risk">{Number(tx.risk_score).toFixed(2)}</span><span><RiskBadge action={tx.action}/></span></div>)}
  </div></section>
  {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
   <div className="card-head"><h3>Transaction #{selected.id}</h3><RiskBadge action={selected.action}/></div>
   <div className="score-big">{Number(selected.risk_score).toFixed(2)}</div><p className="muted">Risk score</p><h4>Reasons</h4>
   <ul>{selected.reasons?.map((r,i)=><li key={i}>{r}</li>)}</ul><button className="close" onClick={()=>setSelected(null)}>Close</button>
  </div></div>}
 </div>
}
