import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import * as XLSX from "xlsx";

// ── Helpers ────────────────────────────────────────────────────────────────
const today   = () => new Date().toISOString().split("T")[0];
const nowTime = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const fmtDate = d  => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// ── Global Styles ──────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'DM Sans',sans-serif;background:#f0fdf4;-webkit-tap-highlight-color:transparent}
      @keyframes fadein{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes pulse-ring{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.65);opacity:0}}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
      .card{background:#fff;border-radius:20px;box-shadow:0 2px 18px rgba(0,0,0,.07);padding:22px;animation:fadein .4s ease}
      .inp{width:100%;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:12px;padding:13px 15px;color:#111827;font-size:15px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
      .inp:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.12)}
      .inp-dark{background:#0f172a!important;border-color:#1f2937!important;color:#e5e7eb!important}
      .inp-dark:focus{border-color:#16a34a!important}
      .btn-green{width:100%;padding:15px;background:linear-gradient(135deg,#16a34a,#15803d);border:none;border-radius:13px;color:#fff;font-size:16px;font-weight:700;font-family:inherit;cursor:pointer;transition:opacity .2s,transform .1s;display:flex;align-items:center;justify-content:center;gap:8px}
      .btn-green:hover{opacity:.9}.btn-green:active{transform:scale(.98)}
      .btn-green:disabled{opacity:.6;cursor:not-allowed}
      .tab-btn{flex:1;padding:9px 0;border:none;background:transparent;cursor:pointer;font-family:inherit;font-size:12px;color:#6b7280;border-radius:12px;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:3px}
      .tab-btn.emp.active{background:#dcfce7;color:#16a34a;font-weight:600}
      .tab-btn.adm.active{background:#ede9fe;color:#7c3aed;font-weight:600}
      .badge{display:inline-block;padding:3px 11px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap}
      .spinner{width:20px;height:20px;border:3px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
    `}</style>
  </>
);

// ══════════════════════════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  if (session === undefined) return <Splash />;
  if (!session || !profile)  return <LoginPage />;
  if (profile.role === "admin") return <AdminApp  session={session} profile={profile} />;
  return <EmployeeApp session={session} profile={profile} />;
}

// ── Splash ─────────────────────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20}}>
      <GlobalStyles/>
      <div style={{fontSize:52}}>⏱</div>
      <div className="spinner" style={{borderColor:"#16a34a33",borderTopColor:"#16a34a",width:28,height:28}}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN / REGISTER
// ══════════════════════════════════════════════════════════════════════════════
function LoginPage() {
  const [mode,     setMode]     = useState("login");
  const [mobile,   setMobile]   = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [dept,     setDept]     = useState("");
  const [empId,    setEmpId]    = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const toEmail = m => `${m.trim()}@attendease.app`;

  const handleLogin = async () => {
    if (!mobile || !password) { setError("Please enter mobile number and password."); return; }
    setError(""); setLoading(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email: toEmail(mobile), password });
    if (e) setError("Invalid mobile number or password.");
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name||!mobile||!password||!dept||!empId) { setError("Please fill all fields."); return; }
    if (mobile.trim().length < 10) { setError("Enter a valid 10-digit mobile number."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError(""); setLoading(true);
    const { data, error: signUpErr } = await supabase.auth.signUp({ email: toEmail(mobile), password });
    if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: data.user.id, name: name.trim(), mobile: mobile.trim(),
      dept: dept.trim(), emp_id: empId.trim(), role: "employee",
    });
    if (profileErr) setError("Account created but profile save failed. Try logging in.");
    setLoading(false);
  };

  const submit = mode === "login" ? handleLogin : handleRegister;

  return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",padding:20,position:"relative",overflow:"hidden"}}>
      <GlobalStyles/>
      {/* Background orbs */}
      {[[-180,120,"#10b98118",280],[220,-100,"#6366f112",200],[80,400,"#f59e0b0d",230]].map(([x,y,c,s],i)=>(
        <div key={i} style={{position:"absolute",left:`calc(50% + ${x}px)`,top:`calc(50% + ${y}px)`,width:s,height:s,borderRadius:"50%",background:c,filter:"blur(60px)",animation:`float ${4+i}s ease-in-out infinite`,animationDelay:`${i*0.9}s`,pointerEvents:"none"}}/>
      ))}

      <div style={{position:"relative",width:"100%",maxWidth:400,animation:"fadein .6s ease"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:30}}>
          <div style={{position:"relative",display:"inline-block",marginBottom:14}}>
            <div style={{width:68,height:68,borderRadius:18,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>⏱</div>
            <div style={{position:"absolute",inset:-8,borderRadius:26,border:"2px solid #10b98130",animation:"pulse-ring 2.4s ease-out infinite"}}/>
          </div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:800,color:"#f9fafb",margin:"0 0 5px"}}>AttendEase</h1>
          <p style={{color:"#6b7280",fontSize:13}}>Workforce Attendance Management</p>
        </div>

        <div style={{background:"#111827",border:"1px solid #1f2937",borderRadius:22,padding:28}}>
          {/* Toggle */}
          <div style={{display:"flex",background:"#0a0f1e",borderRadius:12,padding:4,marginBottom:22}}>
            {[["login","Sign In"],["register","Register"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"9px 0",border:"none",borderRadius:9,background:mode===m?"#16a34a":"transparent",color:mode===m?"#fff":"#6b7280",fontFamily:"inherit",fontWeight:mode===m?700:400,fontSize:14,cursor:"pointer",transition:"all .2s"}}>{l}</button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            {mode==="register" && (
              <>
                <DarkField label="Full Name"   value={name}  onChange={setName}  placeholder="e.g. Arjun Menon"/>
                <DarkField label="Employee ID" value={empId} onChange={setEmpId} placeholder="e.g. EMP001"/>
                <DarkField label="Department"  value={dept}  onChange={setDept}  placeholder="e.g. Engineering"/>
              </>
            )}
            <DarkField label="Mobile Number" value={mobile}   onChange={setMobile}   placeholder="10-digit mobile" type="tel"/>
            <DarkField label="Password"      value={password} onChange={setPassword} placeholder="Min. 6 characters"  type="password" onEnter={submit}/>

            {error && (
              <div style={{background:"#7f1d1d22",border:"1px solid #ef444440",borderRadius:10,padding:"10px 14px",color:"#fca5a5",fontSize:13}}>{error}</div>
            )}
            <button className="btn-green" onClick={submit} disabled={loading} style={{marginTop:4}}>
              {loading ? <><span className="spinner"/>{mode==="login"?"Signing in…":"Creating account…"}</> : mode==="login"?"Sign In →":"Create Account →"}
            </button>
          </div>

          <div style={{marginTop:20,padding:14,background:"#0a0f1e",borderRadius:12,border:"1px solid #1f2937"}}>
            <p style={{color:"#6b7280",fontSize:12,margin:"0 0 4px",fontWeight:500}}>👑 Admin?</p>
            <p style={{color:"#4b5563",fontSize:12,margin:0}}>Use the mobile number and password set up for you in Supabase.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DarkField({ label, value, onChange, placeholder, type="text", onEnter }) {
  return (
    <div>
      <label style={{color:"#9ca3af",fontSize:11,fontWeight:600,letterSpacing:".07em",textTransform:"uppercase",display:"block",marginBottom:7}}>{label}</label>
      <input className="inp inp-dark" type={type} placeholder={placeholder} value={value}
        onChange={e=>onChange(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onEnter&&onEnter()}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE APP
// ══════════════════════════════════════════════════════════════════════════════
function EmployeeApp({ session, profile }) {
  const [tab,        setTab]        = useState("home");
  const [attendance, setAttendance] = useState([]);
  const [leaves,     setLeaves]     = useState([]);
  const [loading,    setLoading]    = useState(true);

  const fetchData = useCallback(async () => {
    const [attRes, leaveRes] = await Promise.all([
      supabase.from("attendance").select("*").eq("user_id", session.user.id).order("date", { ascending: false }),
      supabase.from("leaves").select("*").eq("user_id", session.user.id).order("applied_on", { ascending: false }),
    ]);
    if (attRes.data)   setAttendance(attRes.data);
    if (leaveRes.data) setLeaves(leaveRes.data);
    setLoading(false);
  }, [session.user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    const attSub = supabase.channel("emp-att")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance", filter: `user_id=eq.${session.user.id}` }, fetchData)
      .subscribe();
    const leaveSub = supabase.channel("emp-leave")
      .on("postgres_changes", { event: "*", schema: "public", table: "leaves", filter: `user_id=eq.${session.user.id}` }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(attSub); supabase.removeChannel(leaveSub); };
  }, [session.user.id, fetchData]);

  const todayRec    = attendance.find(r => r.date === today()) || null;
  const isClockedIn = todayRec && !todayRec.clock_out;
  const isClockedOut= todayRec && !!todayRec.clock_out;

  const clockIn = async () => {
    if (todayRec) return;
    await supabase.from("attendance").insert({
      user_id: session.user.id, name: profile.name, dept: profile.dept,
      emp_id: profile.emp_id, date: today(), clock_in: nowTime(), clock_out: null,
    });
  };

  const clockOut = async () => {
    if (!todayRec || todayRec.clock_out) return;
    await supabase.from("attendance").update({ clock_out: nowTime() }).eq("id", todayRec.id);
  };

  const submitLeave = async (from, to, reason, type) => {
    await supabase.from("leaves").insert({
      user_id: session.user.id, name: profile.name, dept: profile.dept,
      emp_id: profile.emp_id, from_date: from, to_date: to,
      reason, leave_type: type, status: "Pending", applied_on: today(),
    });
  };

  const tabs = [["home","🏠","Home"],["history","📅","History"],["leave","🌿","Leave"]];

  return (
    <div style={{minHeight:"100vh",background:"#f0fdf4"}}>
      <GlobalStyles/>
      <div style={{background:"linear-gradient(135deg,#16a34a,#15803d)",padding:"22px 20px 32px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <p style={{color:"#bbf7d0",fontSize:12,marginBottom:2}}>Welcome back,</p>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:"#fff",margin:"0 0 6px"}}>{profile.name}</h2>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:"#86efac",background:"#ffffff18",padding:"3px 10px",borderRadius:20}}>{profile.dept}</span>
              <span style={{fontSize:11,color:"#86efac",background:"#ffffff18",padding:"3px 10px",borderRadius:20}}>ID: {profile.emp_id}</span>
            </div>
          </div>
          <button onClick={()=>supabase.auth.signOut()} style={{background:"#ffffff20",border:"none",borderRadius:10,color:"#fff",padding:"8px 14px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>
        </div>
      </div>

      <div style={{padding:"0 16px 88px",marginTop:-10}}>
        {loading
          ? <div style={{textAlign:"center",paddingTop:60}}><div className="spinner" style={{borderColor:"#16a34a33",borderTopColor:"#16a34a",margin:"0 auto",width:28,height:28}}/></div>
          : <>
            {tab==="home"    && <EmpHome    todayRec={todayRec} isClockedIn={isClockedIn} isClockedOut={isClockedOut} onClockIn={clockIn} onClockOut={clockOut} attendance={attendance} leaves={leaves}/>}
            {tab==="history" && <EmpHistory attendance={attendance}/>}
            {tab==="leave"   && <EmpLeave   leaves={leaves} onSubmit={submitLeave}/>}
          </>
        }
      </div>

      <nav style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #e5e7eb",padding:"7px 14px 12px",display:"flex",gap:6}}>
        {tabs.map(([id,icon,label])=>(
          <button key={id} className={`tab-btn emp${tab===id?" active":""}`} onClick={()=>setTab(id)}>
            <span style={{fontSize:21}}>{icon}</span><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function EmpHome({ todayRec, isClockedIn, isClockedOut, onClockIn, onClockOut, attendance, leaves }) {
  const [tick, setTick] = useState(new Date());
  const [busy, setBusy] = useState(false);
  useEffect(()=>{ const t=setInterval(()=>setTick(new Date()),1000); return()=>clearInterval(t); },[]);

  const handle = async (fn) => { setBusy(true); await fn(); setBusy(false); };
  const presentDays   = attendance.filter(r=>r.clock_out).length;
  const pendingLeaves = leaves.filter(l=>l.status==="Pending").length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,paddingTop:14}}>
      <div className="card" style={{textAlign:"center"}}>
        <p style={{color:"#9ca3af",fontSize:13,marginBottom:2}}>
          {tick.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}
        </p>
        <p style={{color:"#111827",fontSize:36,fontWeight:800,fontFamily:"'Syne',sans-serif",margin:"4px 0 20px",letterSpacing:"-1px"}}>
          {tick.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
        </p>

        {!todayRec && (
          <button className="btn-green" onClick={()=>handle(onClockIn)} disabled={busy} style={{fontSize:17}}>
            {busy?<span className="spinner"/>:"🟢  Clock In"}
          </button>
        )}
        {isClockedIn && (
          <>
            <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:"11px 14px",marginBottom:14}}>
              <p style={{color:"#15803d",fontWeight:600,fontSize:14,margin:0}}>✅ Clocked in at {todayRec.clock_in}</p>
            </div>
            <button className="btn-green" onClick={()=>handle(onClockOut)} disabled={busy} style={{background:"linear-gradient(135deg,#dc2626,#b91c1c)",fontSize:17}}>
              {busy?<span className="spinner"/>:"🔴  Clock Out"}
            </button>
          </>
        )}
        {isClockedOut && (
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:16}}>
            <p style={{color:"#1d4ed8",fontWeight:700,margin:"0 0 4px",fontSize:15}}>Day Complete ✓</p>
            <p style={{color:"#3b82f6",margin:0,fontSize:13}}>In: {todayRec.clock_in} · Out: {todayRec.clock_out}</p>
          </div>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {[["📊","Present Days",presentDays,"#16a34a","#f0fdf4"],["⏳","Pending Leaves",pendingLeaves,"#d97706","#fffbeb"]].map(([icon,label,val,c,bg])=>(
          <div key={label} className="card" style={{background:bg,textAlign:"center",padding:18}}>
            <div style={{fontSize:24,marginBottom:5}}>{icon}</div>
            <div style={{fontSize:28,fontWeight:800,color:c,fontFamily:"'Syne',sans-serif"}}>{val}</div>
            <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmpHistory({ attendance }) {
  return (
    <div style={{paddingTop:14}}>
      <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:18,margin:"0 0 14px"}}>My Attendance</h3>
      {attendance.length===0
        ? <div className="card" style={{textAlign:"center",color:"#9ca3af",padding:40}}>No records yet</div>
        : attendance.map(r=>(
          <div key={r.id} className="card" style={{marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{fontWeight:600,color:"#111827",fontSize:14,margin:"0 0 3px"}}>{fmtDate(r.date)}</p>
              <p style={{color:"#6b7280",fontSize:13,margin:0}}>In: {r.clock_in}{r.clock_out?` · Out: ${r.clock_out}`:""}</p>
            </div>
            <span className="badge" style={{background:r.clock_out?"#dcfce7":"#fef9c3",color:r.clock_out?"#16a34a":"#854d0e"}}>
              {r.clock_out?"Done":"Active"}
            </span>
          </div>
        ))
      }
    </div>
  );
}

function EmpLeave({ leaves, onSubmit }) {
  const [from,setFrom]=useState(""); const [to,setTo]=useState("");
  const [type,setType]=useState("Casual Leave"); const [reason,setReason]=useState("");
  const [success,setSuccess]=useState(false); const [loading,setLoading]=useState(false);

  const handle = async () => {
    if (!from||!to||!reason) return;
    setLoading(true);
    await onSubmit(from,to,reason,type);
    setFrom(""); setTo(""); setReason(""); setSuccess(true);
    setTimeout(()=>setSuccess(false),3000);
    setLoading(false);
  };

  const sc = s=>s==="Approved"?["#dcfce7","#16a34a"]:s==="Rejected"?["#fee2e2","#dc2626"]:["#fef9c3","#854d0e"];

  return (
    <div style={{paddingTop:14}}>
      <div className="card" style={{marginBottom:14}}>
        <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:16,margin:"0 0 16px"}}>Apply for Leave</h3>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <select value={type} onChange={e=>setType(e.target.value)} style={{background:"#f9fafb",border:"1.5px solid #e5e7eb",borderRadius:10,padding:"12px 14px",fontFamily:"inherit",fontSize:14,color:"#111827",outline:"none"}}>
            {["Casual Leave","Sick Leave","Emergency Leave","Work from Home"].map(t=><option key={t}>{t}</option>)}
          </select>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["From",from,setFrom],["To",to,setTo]].map(([l,v,s])=>(
              <div key={l}>
                <label style={{fontSize:11,color:"#9ca3af",display:"block",marginBottom:5,fontWeight:600,textTransform:"uppercase"}}>{l}</label>
                <input type="date" className="inp" value={v} onChange={e=>s(e.target.value)}/>
              </div>
            ))}
          </div>
          <textarea className="inp" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason for leave…" rows={3} style={{resize:"none"}}/>
          {success && <div style={{background:"#dcfce7",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 14px",color:"#16a34a",fontSize:13,fontWeight:600}}>✅ Request submitted!</div>}
          <button className="btn-green" onClick={handle} disabled={loading}>
            {loading?<span className="spinner"/>:"Submit Request"}
          </button>
        </div>
      </div>

      <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:16,margin:"0 0 12px"}}>My Requests</h3>
      {leaves.length===0
        ? <div className="card" style={{textAlign:"center",color:"#9ca3af",padding:32}}>No requests yet</div>
        : leaves.map(l=>{
          const[bg,c]=sc(l.status);
          return(
            <div key={l.id} className="card" style={{marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <p style={{fontWeight:600,fontSize:14,color:"#111827",margin:"0 0 3px"}}>{l.leave_type}</p>
                <p style={{color:"#6b7280",fontSize:13,margin:"0 0 2px"}}>{l.from_date} → {l.to_date}</p>
                <p style={{color:"#9ca3af",fontSize:12,margin:0}}>{l.reason}</p>
              </div>
              <span className="badge" style={{background:bg,color:c}}>{l.status}</span>
            </div>
          );
        })
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN APP
// ══════════════════════════════════════════════════════════════════════════════
function AdminApp({ session, profile }) {
  const [tab,        setTab]        = useState("overview");
  const [attendance, setAttendance] = useState([]);
  const [leaves,     setLeaves]     = useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  const fetchAll = useCallback(async () => {
    const [attRes, leaveRes, empRes] = await Promise.all([
      supabase.from("attendance").select("*").order("date", { ascending: false }),
      supabase.from("leaves").select("*").order("applied_on", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "employee"),
    ]);
    if (attRes.data)   setAttendance(attRes.data);
    if (leaveRes.data) setLeaves(leaveRes.data);
    if (empRes.data)   setEmployees(empRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const ch = supabase.channel("admin-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "leaves" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  const updateLeave = async (id, status) => {
    await supabase.from("leaves").update({ status }).eq("id", id);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const attRows = attendance.map(r=>({
      "Employee Name": r.name, "Employee ID": r.emp_id||"",
      "Department":    r.dept, "Date":        r.date,
      "Clock In":      r.clock_in, "Clock Out": r.clock_out||"—",
      "Status":        r.clock_out?"Complete":"Incomplete",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attRows), "Attendance");

    const leaveRows = leaves.map(l=>({
      "Employee Name": l.name, "Employee ID": l.emp_id||"",
      "Department":    l.dept, "Leave Type":  l.leave_type,
      "From":          l.from_date, "To":      l.to_date,
      "Reason":        l.reason, "Status":    l.status,
      "Applied On":    l.applied_on,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leaveRows), "Leave Requests");

    const summaryRows = employees.map(emp=>{
      const ea = attendance.filter(r=>r.user_id===emp.id);
      const el = leaves.filter(l=>l.user_id===emp.id);
      return {
        "Employee Name":   emp.name, "Employee ID":     emp.emp_id||"",
        "Department":      emp.dept, "Mobile":          emp.mobile,
        "Days Present":    ea.filter(r=>r.clock_out).length,
        "Incomplete Days": ea.filter(r=>!r.clock_out).length,
        "Approved Leaves": el.filter(l=>l.status==="Approved").length,
        "Pending Leaves":  el.filter(l=>l.status==="Pending").length,
        "Rejected Leaves": el.filter(l=>l.status==="Rejected").length,
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Employee Summary");

    XLSX.writeFile(wb, `AttendEase_${today()}.xlsx`);
  };

  const tabs = [["overview","📊","Overview"],["attendance","📋","Attendance"],["leaves","🌿","Leaves"]];

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <GlobalStyles/>
      <div style={{background:"linear-gradient(135deg,#7c3aed,#6d28d9)",padding:"22px 20px 32px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <p style={{color:"#c4b5fd",fontSize:12,marginBottom:2}}>Admin Panel</p>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:"#fff",margin:"0 0 5px"}}>AttendEase</h2>
            <span style={{fontSize:11,color:"#c4b5fd",background:"#ffffff18",padding:"3px 10px",borderRadius:20}}>Manager View</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
            <button onClick={()=>supabase.auth.signOut()} style={{background:"#ffffff20",border:"none",borderRadius:10,color:"#fff",padding:"8px 14px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>
            <button onClick={exportExcel} style={{background:"#16a34a",border:"none",borderRadius:10,color:"#fff",padding:"8px 14px",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>⬇ Export Excel</button>
          </div>
        </div>
      </div>

      <div style={{padding:"0 16px 88px",marginTop:-10}}>
        {loading
          ? <div style={{textAlign:"center",paddingTop:60}}><div className="spinner" style={{borderColor:"#7c3aed33",borderTopColor:"#7c3aed",margin:"0 auto",width:28,height:28}}/></div>
          : <>
            {tab==="overview"   && <AdminOverview   employees={employees} attendance={attendance} leaves={leaves}/>}
            {tab==="attendance" && <AdminAttendance attendance={attendance}/>}
            {tab==="leaves"     && <AdminLeaves     leaves={leaves} onUpdate={updateLeave}/>}
          </>
        }
      </div>

      <nav style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #e5e7eb",padding:"7px 14px 12px",display:"flex",gap:6}}>
        {tabs.map(([id,icon,label])=>(
          <button key={id} className={`tab-btn adm${tab===id?" active":""}`} onClick={()=>setTab(id)}>
            <span style={{fontSize:21}}>{icon}</span><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function AdminOverview({ employees, attendance, leaves }) {
  const todayAtt     = attendance.filter(r=>r.date===today());
  const presentToday = new Set(todayAtt.map(r=>r.user_id)).size;
  const absentToday  = employees.length - presentToday;
  const pending      = leaves.filter(l=>l.status==="Pending").length;

  const stats = [
    ["👥","Employees",  employees.length,"#7c3aed","#f5f3ff"],
    ["✅","Present",    presentToday,    "#16a34a","#f0fdf4"],
    ["❌","Absent",     absentToday,     "#dc2626","#fef2f2"],
    ["⏳","Pending",    pending,         "#d97706","#fffbeb"],
  ];

  return (
    <div style={{paddingTop:14,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {stats.map(([icon,label,val,c,bg])=>(
          <div key={label} className="card" style={{background:bg,textAlign:"center",padding:18}}>
            <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
            <div style={{fontSize:26,fontWeight:800,color:c,fontFamily:"'Syne',sans-serif"}}>{val}</div>
            <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:15,margin:"0 0 14px"}}>Today's Status</h3>
        {employees.length===0
          ? <p style={{color:"#9ca3af",fontSize:14}}>No employees registered yet.</p>
          : employees.map(emp=>{
            const rec = todayAtt.find(r=>r.user_id===emp.id);
            return(
              <div key={emp.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
                <div style={{display:"flex",alignItems:"center",gap:11}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#6d28d9)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14,flexShrink:0}}>
                    {emp.name[0]}
                  </div>
                  <div>
                    <p style={{margin:0,fontWeight:600,fontSize:14,color:"#111827"}}>{emp.name}</p>
                    <p style={{margin:0,fontSize:12,color:"#9ca3af"}}>{emp.dept} · {emp.emp_id}</p>
                  </div>
                </div>
                <span className="badge" style={{background:rec?"#dcfce7":"#fee2e2",color:rec?"#16a34a":"#dc2626"}}>
                  {rec?(rec.clock_out?"Done":"Present"):"Absent"}
                </span>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

function AdminAttendance({ attendance }) {
  const [search,setSearch]=useState(""); const [dateF,setDateF]=useState("");
  const filtered = attendance.filter(r=>{
    const m = !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.emp_id||"").toLowerCase().includes(search.toLowerCase()) || r.dept.toLowerCase().includes(search.toLowerCase());
    return m && (!dateF || r.date===dateF);
  });

  return (
    <div style={{paddingTop:14}}>
      <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:18,margin:"0 0 12px"}}>All Attendance</h3>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
        <input className="inp" placeholder="🔍 Search name, ID or dept…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <input className="inp" type="date" value={dateF} onChange={e=>setDateF(e.target.value)}/>
      </div>
      {filtered.length===0
        ? <div className="card" style={{textAlign:"center",color:"#9ca3af",padding:40}}>No records found</div>
        : filtered.map(r=>(
          <div key={r.id} className="card" style={{marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:11}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#6d28d9)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14,flexShrink:0}}>
                {r.name[0]}
              </div>
              <div>
                <p style={{margin:"0 0 1px",fontWeight:600,fontSize:14,color:"#111827"}}>{r.name}</p>
                <p style={{margin:"0 0 1px",color:"#6b7280",fontSize:12}}>{r.dept} · {fmtDate(r.date)}</p>
                <p style={{margin:0,color:"#9ca3af",fontSize:12}}>In: {r.clock_in}{r.clock_out?` · Out: ${r.clock_out}`:""}</p>
              </div>
            </div>
            <span className="badge" style={{background:r.clock_out?"#dcfce7":"#fef9c3",color:r.clock_out?"#16a34a":"#854d0e"}}>
              {r.clock_out?"Done":"Active"}
            </span>
          </div>
        ))
      }
    </div>
  );
}

function AdminLeaves({ leaves, onUpdate }) {
  const [filter,setFilter]=useState("Pending");
  const sc = s=>s==="Approved"?["#dcfce7","#16a34a"]:s==="Rejected"?["#fee2e2","#dc2626"]:["#fef9c3","#854d0e"];
  const filtered = filter==="All"?leaves:leaves.filter(l=>l.status===filter);

  return (
    <div style={{paddingTop:14}}>
      <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:18,margin:"0 0 12px"}}>Leave Requests</h3>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {["Pending","Approved","Rejected","All"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 16px",border:"none",borderRadius:10,fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",background:filter===f?"#7c3aed":"#fff",color:filter===f?"#fff":"#6b7280",boxShadow:"0 1px 4px #0001",transition:"all .2s"}}>{f}</button>
        ))}
      </div>
      {filtered.length===0
        ? <div className="card" style={{textAlign:"center",color:"#9ca3af",padding:40}}>No {filter.toLowerCase()} requests</div>
        : filtered.map(l=>{
          const[bg,c]=sc(l.status);
          return(
            <div key={l.id} className="card" style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:l.status==="Pending"?12:0}}>
                <div>
                  <p style={{fontWeight:700,fontSize:15,color:"#111827",margin:"0 0 2px"}}>{l.name}</p>
                  <p style={{color:"#6b7280",fontSize:13,margin:"0 0 2px"}}>{l.dept} · {l.emp_id} · {l.leave_type}</p>
                  <p style={{color:"#6b7280",fontSize:13,margin:"0 0 2px"}}>{l.from_date} → {l.to_date}</p>
                  <p style={{color:"#9ca3af",fontSize:12,margin:0}}>{l.reason}</p>
                </div>
                <span className="badge" style={{background:bg,color:c}}>{l.status}</span>
              </div>
              {l.status==="Pending" && (
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>onUpdate(l.id,"Approved")} style={{flex:1,padding:"9px 0",border:"none",borderRadius:10,background:"#dcfce7",color:"#16a34a",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>✓ Approve</button>
                  <button onClick={()=>onUpdate(l.id,"Rejected")} style={{flex:1,padding:"9px 0",border:"none",borderRadius:10,background:"#fee2e2",color:"#dc2626",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>✕ Reject</button>
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );
}
