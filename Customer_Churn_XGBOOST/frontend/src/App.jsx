import { useEffect, useMemo, useState } from "react";
import {
  Activity, BarChart3, BrainCircuit, ChevronRight, CircleHelp,
  LayoutDashboard, Menu, Search, Settings, ShieldCheck, Users,
  WandSparkles, History, RefreshCw, Trash2, X, AlertCircle
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis, BarChart, Bar, Legend
} from "recharts";
import {
  getDashboardStats, getCustomers, getPredictions, getCustomer,
  createPrediction, deleteCustomer, getApiError
} from "./services/api";

const navItems = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "predict", label: "Churn prediction", icon: BrainCircuit },
  { id: "customers", label: "Customers", icon: Users },
  { id: "history", label: "Prediction history", icon: History }
];

const initialForm = {
  gender: "Male", SeniorCitizen: 0, Partner: "Yes", Dependents: "No",
  tenure: 12, PhoneService: "Yes", MultipleLines: "No",
  InternetService: "Fiber optic", OnlineSecurity: "No",
  OnlineBackup: "No", DeviceProtection: "No", TechSupport: "No",
  StreamingTV: "No", StreamingMovies: "No",
  Contract: "Month-to-month", PaperlessBilling: "Yes",
  PaymentMethod: "Electronic check", MonthlyCharges: 70,
  TotalCharges: 840, ServiceCount: 1
};

function App() {
  const [page, setPage] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refreshAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, c, p] = await Promise.all([
        getDashboardStats(), getCustomers(), getPredictions()
      ]);
      setStats(s.data);
      setCustomers(Array.isArray(c.data) ? c.data : (c.data.items || c.data.customers || []));
      setPredictions(Array.isArray(p.data) ? p.data : (p.data.items || p.data.predictions || []));
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshAll(); }, []);

  const filteredCustomers = useMemo(() => customers.filter((c) =>
    [c.id, c.gender, c.contract, c.internet_service, c.payment_method]
      .some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  ), [customers, search]);

  const openCustomer = async (id) => {
    try {
      const result = await getCustomer(id);
      setSelectedCustomer(result.data);
    } catch (e) { setError(getApiError(e)); }
  };

  const removeCustomer = async (id) => {
    if (!window.confirm(`Delete customer #${id} and their prediction history?`)) return;
    try {
      await deleteCustomer(id);
      setSelectedCustomer(null);
      await refreshAll();
    } catch (e) { setError(getApiError(e)); }
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={22} /></div>
          <div><strong>ChurnGuard</strong><span>Customer intelligence</span></div>
          <button className="icon-btn mobile-close" onClick={() => setSidebarOpen(false)}><X size={18}/></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${page === id ? "active" : ""}`}
              onClick={() => { setPage(id); setSidebarOpen(false); }}>
              <Icon size={18}/><span>{label}</span>{page === id && <ChevronRight size={15} className="nav-chevron"/>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="model-status"><span className="status-dot"/> <div><b>Models connected</b><small>Logistic Regression · XGBoost</small></div></div>
          <button className="nav-link muted" onClick={() => setPage("dashboard")}><Settings size={18}/> Settings</button>
          <div className="profile"><div className="avatar">CG</div><div><b>ChurnGuard Admin</b><small>ML workspace</small></div><CircleHelp size={17}/></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setSidebarOpen(true)}><Menu/></button>
          <div className="breadcrumb">Workspace <span>/</span> <b>{navItems.find(n => n.id === page)?.label || "Overview"}</b></div>
          <div className="top-actions"><span className="live-indicator"><i/> API workspace</span>
            <button className="icon-btn" onClick={refreshAll} title="Refresh data"><RefreshCw size={17}/></button>
            <div className="avatar top-avatar">P</div>
          </div>
        </header>
        <section className="content">
          {error && <div className="alert"><AlertCircle size={18}/><span>{error}</span><button onClick={() => setError("")}><X size={16}/></button></div>}
          {page === "dashboard" && <Dashboard stats={stats} customers={customers} predictions={predictions} loading={loading} onNavigate={setPage}/>}
          {page === "predict" && <PredictPage onDone={async () => { await refreshAll(); setPage("history"); }} setError={setError}/>}
          {page === "customers" && <CustomersPage customers={filteredCustomers} search={search} setSearch={setSearch} onOpen={openCustomer} onDelete={removeCustomer} loading={loading}/>}
          {page === "history" && <HistoryPage predictions={predictions} loading={loading}/>}
        </section>
        <footer className="footer"><span>© 2026 ChurnGuard</span><span>Customer churn intelligence <b>•</b> Powered by ML</span></footer>
      </main>
      {selectedCustomer && <CustomerModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onDelete={removeCustomer}/>}
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function StatCard({ label, value, note, icon: Icon, tone = "blue" }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}><Icon size={19}/></div></div><div className="stat-value">{value ?? "—"}</div><div className="stat-note">{note}</div></div>;
}

function Dashboard({ stats, customers, predictions, loading, onNavigate }) {
  const totalCustomers = stats?.total_customers ?? stats?.customers_count ?? customers.length;
  const totalPredictions = stats?.total_predictions ?? stats?.predictions_count ?? predictions.length;
  const lr = stats?.lr_churn_predictions ?? stats?.lr_churn_count ?? stats?.logistic_regression_churn ?? "—";
  const xgb = stats?.xgb_churn_predictions ?? stats?.xgb_churn_count ?? stats?.xgboost_churn ?? "—";
  const recent = customers.slice(0, 5);
  const chartData = [
    { name: "Logistic Regression", churn: typeof lr === "number" ? lr : 0 },
    { name: "XGBoost", churn: typeof xgb === "number" ? xgb : 0 }
  ];
  return <>
    <PageHeading eyebrow="OVERVIEW" title="Customer intelligence" description="Monitor customer activity and understand churn risk across your business."
      action={<button className="primary-btn" onClick={() => onNavigate("predict")}><WandSparkles size={17}/> New prediction</button>}/>
    {loading && <div className="loading-line">Refreshing workspace data…</div>}
    <div className="stat-grid">
      <StatCard label="Total customers" value={totalCustomers} note="Customers saved in database" icon={Users}/>
      <StatCard label="Total predictions" value={totalPredictions} note="Prediction records created" icon={Activity} tone="purple"/>
      <StatCard label="LR churn predictions" value={lr} note="Predicted churn by Logistic Regression" icon={BarChart3} tone="orange"/>
      <StatCard label="XGBoost churn predictions" value={xgb} note="Predicted churn by XGBoost" icon={BrainCircuit} tone="green"/>
    </div>
    <div className="dashboard-grid">
      <div className="panel chart-panel"><div className="panel-heading"><div><h3>Model churn comparison</h3><p>Churn-positive prediction counts</p></div><span className="tag">MODEL INSIGHTS</span></div>
        <div className="chart-wrap">{typeof lr === "number" && typeof xgb === "number" ?
          <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{top:10,right:10,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5"/><XAxis dataKey="name" tick={{fontSize:12,fill:"#7c8798"}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fontSize:12,fill:"#7c8798"}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="churn" name="Churn predictions" fill="#5876e8" radius={[7,7,0,0]} barSize={48}/></BarChart></ResponsiveContainer> :
          <div className="empty-chart"><BarChart3 size={28}/><b>Model statistics will appear here</b><span>Check the dashboard stats response from your API.</span></div>}
        </div>
      </div>
      <div className="panel insight-panel"><div className="panel-heading"><div><h3>Prediction workflow</h3><p>How ChurnGuard works</p></div><div className="soft-icon"><BrainCircuit size={19}/></div></div>
        <div className="workflow"><div className="workflow-step"><span>01</span><div><b>Customer data</b><small>Enter customer and service details</small></div></div><div className="workflow-line"/><div className="workflow-step"><span>02</span><div><b>ML models</b><small>Logistic Regression and XGBoost</small></div></div><div className="workflow-line"/><div className="workflow-step"><span>03</span><div><b>Churn insight</b><small>Compare prediction and probability</small></div></div></div>
        <button className="text-btn" onClick={() => onNavigate("predict")}>Start a prediction <ChevronRight size={16}/></button>
      </div>
    </div>
    <div className="panel table-panel"><div className="panel-heading"><div><h3>Recent customers</h3><p>Latest customer records saved in your database</p></div><button className="text-btn" onClick={() => onNavigate("customers")}>View all <ChevronRight size={16}/></button></div>
      <CustomerTable customers={recent} onOpen={() => onNavigate("customers")} compact/>
    </div>
  </>;
}

const selectOptions = {
  gender: ["Male", "Female"], SeniorCitizen: [0, 1], Partner: ["Yes", "No"], Dependents: ["Yes", "No"],
  PhoneService: ["Yes", "No"], MultipleLines: ["Yes", "No", "No phone service"],
  InternetService: ["DSL", "Fiber optic", "No"], OnlineSecurity: ["Yes", "No", "No internet service"],
  OnlineBackup: ["Yes", "No", "No internet service"], DeviceProtection: ["Yes", "No", "No internet service"],
  TechSupport: ["Yes", "No", "No internet service"], StreamingTV: ["Yes", "No", "No internet service"],
  StreamingMovies: ["Yes", "No", "No internet service"], Contract: ["Month-to-month", "One year", "Two year"],
  PaperlessBilling: ["Yes", "No"],
  PaymentMethod: ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"]
};
const fieldLabels = {
  gender: "Gender", SeniorCitizen: "Senior citizen", Partner: "Has partner", Dependents: "Has dependents",
  tenure: "Tenure (months)", PhoneService: "Phone service", MultipleLines: "Multiple lines",
  InternetService: "Internet service", OnlineSecurity: "Online security", OnlineBackup: "Online backup",
  DeviceProtection: "Device protection", TechSupport: "Tech support", StreamingTV: "Streaming TV",
  StreamingMovies: "Streaming movies", Contract: "Contract", PaperlessBilling: "Paperless billing",
  PaymentMethod: "Payment method", MonthlyCharges: "Monthly charges", TotalCharges: "Total charges",
  ServiceCount: "Service count"
};
function PredictPage({ onDone, setError }) {
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const update = (key, value) => setForm(prev => ({...prev, [key]: value}));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const payload = {...form, tenure: Number(form.tenure), MonthlyCharges: Number(form.MonthlyCharges), TotalCharges: Number(form.TotalCharges), SeniorCitizen: Number(form.SeniorCitizen), ServiceCount: Number(form.ServiceCount)};
      const response = await createPrediction(payload);
      setResult(response.data);
    } catch (err) { setError(getApiError(err)); }
    finally { setBusy(false); }
  };
  const sections = [
    ["Personal details", ["gender","SeniorCitizen","Partner","Dependents"]],
    ["Services", ["PhoneService","MultipleLines","InternetService","OnlineSecurity","OnlineBackup","DeviceProtection","TechSupport","StreamingTV","StreamingMovies"]],
    ["Account details", ["tenure","Contract","PaperlessBilling","PaymentMethod","MonthlyCharges","TotalCharges","ServiceCount"]]
  ];
  return <>
    <PageHeading eyebrow="PREDICTION STUDIO" title="Predict customer churn" description="Enter a customer's account details to compare predictions from both machine learning models."/>
    <form className="panel prediction-form" onSubmit={submit}>
      {sections.map(([section, keys]) => <div className="form-section" key={section}><div className="form-section-title"><span className="section-bullet"/><h3>{section}</h3></div><div className="form-grid">
        {keys.map(key => <label className="field" key={key}><span>{fieldLabels[key]}</span>
          {selectOptions[key] ? <select value={form[key]} onChange={e => update(key, key === "SeniorCitizen" ? Number(e.target.value) : e.target.value)}>{selectOptions[key].map(v => <option key={v} value={v}>{v === 0 ? "No" : v === 1 ? "Yes" : v}</option>)}</select> :
          <input type="number" min="0" step={key === "tenure" || key === "ServiceCount" ? "1" : "0.01"} value={form[key]} onChange={e => update(key, e.target.value)} required/>}
        </label>)}
      </div></div>)}
      <div className="form-footer"><span>Customer details are sent to your local FastAPI backend.</span><button className="primary-btn" type="submit" disabled={busy}>{busy ? "Predicting…" : <><WandSparkles size={17}/> Run prediction</>}</button></div>
    </form>
    {result && <div className="panel result-panel"><div className="panel-heading"><div><h3>Prediction results</h3><p>Customer ID #{result.customer_id ?? "saved"} · Both models completed</p></div><span className="success-tag">SAVED TO DATABASE</span></div>
      <div className="result-grid"><ResultCard title="Logistic Regression" prediction={result.lr_prediction} probability={result.lr_probability}/><ResultCard title="XGBoost" prediction={result.xgb_prediction} probability={result.xgb_probability}/></div>
      <button className="primary-btn" onClick={onDone}>View prediction history <ChevronRight size={17}/></button>
    </div>}
  </>;
}

function ResultCard({ title, prediction, probability }) {
  const isChurn = String(prediction).toLowerCase() === "yes";
  const percent = typeof probability === "number" ? (probability <= 1 ? probability * 100 : probability) : null;
  return <div className="result-card"><div className="result-card-top"><span>{title}</span><span className={`risk-pill ${isChurn ? "risk-high" : "risk-low"}`}>{isChurn ? "Churn predicted" : "No churn predicted"}</span></div><div className="result-prediction">{prediction ?? "—"}</div><div className="probability-row"><span>Churn probability</span><b>{percent === null ? "—" : `${percent.toFixed(2)}%`}</b></div><div className="progress"><i style={{width: `${Math.max(0, Math.min(100, percent || 0))}%`}}/></div></div>;
}

function CustomersPage({ customers, search, setSearch, onOpen, onDelete, loading }) {
  return <>
    <PageHeading eyebrow="CUSTOMER DIRECTORY" title="Customers" description="Browse customer records stored in your PostgreSQL database."/>
    <div className="panel table-panel"><div className="table-toolbar"><div className="search-box"><Search size={17}/><input placeholder="Search by ID, gender, contract or service…" value={search} onChange={e => setSearch(e.target.value)}/></div><span className="record-count">{customers.length} records</span></div>
      {loading ? <div className="empty-state">Loading customers…</div> : <CustomerTable customers={customers} onOpen={onOpen} onDelete={onDelete}/>}
    </div>
  </>;
}

function CustomerTable({ customers, onOpen, onDelete, compact = false }) {
  if (!customers.length) return <div className="empty-state"><Users size={26}/><b>No customer records yet</b><span>Run a churn prediction to add your first customer.</span></div>;
  return <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Tenure</th><th>Contract</th><th>Internet service</th><th>Monthly charges</th>{!compact && <th>Actions</th>}</tr></thead><tbody>{customers.map(c => <tr key={c.id}><td><div className="customer-cell"><div className="mini-avatar">{String(c.gender || "C").slice(0,1)}</div><div><b>Customer #{c.id}</b><small>{c.gender || "—"}</small></div></div></td><td>{c.tenure ?? "—"} mo</td><td>{c.contract || "—"}</td><td>{c.internet_service || "—"}</td><td>{c.monthly_charges == null ? "—" : `₹${Number(c.monthly_charges).toFixed(2)}`}</td>{!compact && <td><div className="row-actions"><button className="small-action" onClick={() => onOpen(c.id)}>View</button><button className="danger-icon" title="Delete customer" onClick={() => onDelete(c.id)}><Trash2 size={15}/></button></div></td>}</tr>)}</tbody></table></div>;
}

function HistoryPage({ predictions, loading }) {
  return <>
    <PageHeading eyebrow="MODEL ACTIVITY" title="Prediction history" description="Review predictions generated by Logistic Regression and XGBoost."/>
    <div className="panel table-panel"><div className="panel-heading"><div><h3>All predictions</h3><p>{predictions.length} prediction records</p></div><span className="tag">LIVE DATA</span></div>
      {loading ? <div className="empty-state">Loading predictions…</div> : !predictions.length ? <div className="empty-state"><History size={26}/><b>No predictions yet</b><span>Predictions will appear here after you submit the form.</span></div> :
      <div className="table-scroll"><table><thead><tr><th>Prediction</th><th>Customer ID</th><th>Logistic Regression</th><th>LR probability</th><th>XGBoost</th><th>XGB probability</th><th>Date</th></tr></thead><tbody>{predictions.map((p, i) => <tr key={p.id ?? i}><td><span className="history-dot">{i + 1}</span></td><td>#{p.customer_id}</td><td><PredictionBadge value={p.lr_prediction}/></td><td>{formatProbability(p.lr_probability)}</td><td><PredictionBadge value={p.xgb_prediction}/></td><td>{formatProbability(p.xgb_probability)}</td><td>{p.predicted_at ? new Date(p.predicted_at).toLocaleString() : "—"}</td></tr>)}</tbody></table></div>}
    </div>
  </>;
}

function PredictionBadge({ value }) {
  return <span className={`prediction-badge ${String(value).toLowerCase() === "yes" ? "yes" : "no"}`}>{value ?? "—"}</span>;
}
function formatProbability(value) {
  if (typeof value !== "number") return "—";
  return `${(value <= 1 ? value * 100 : value).toFixed(2)}%`;
}

function CustomerModal({ customer, onClose, onDelete }) {
  const c = customer.customer || customer;
  const history = customer.predictions || c.predictions || [];
  return <div className="modal-backdrop" onClick={onClose}><div className="modal panel" onClick={e => e.stopPropagation()}><div className="modal-header"><div><div className="eyebrow">CUSTOMER PROFILE</div><h2>Customer #{c.id}</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <div className="detail-grid">{Object.entries({Gender:c.gender, Tenure:`${c.tenure ?? "—"} months`, Contract:c.contract, "Internet service":c.internet_service, "Monthly charges":c.monthly_charges, "Total charges":c.total_charges, "Payment method":c.payment_method, "Service count":c.service_count}).map(([k,v]) => <div className="detail-item" key={k}><span>{k}</span><b>{v ?? "—"}</b></div>)}</div>
    <h3 className="modal-subtitle">Prediction history</h3>
    {history.length ? history.map(p => <div className="modal-prediction" key={p.id}><span>Prediction #{p.id}</span><PredictionBadge value={p.lr_prediction}/><PredictionBadge value={p.xgb_prediction}/></div>) : <p className="muted-text">No prediction history found.</p>}
    <div className="modal-footer"><button className="danger-btn" onClick={() => onDelete(c.id)}><Trash2 size={16}/> Delete customer</button><button className="secondary-btn" onClick={onClose}>Close</button></div>
  </div></div>;
}

export default App;