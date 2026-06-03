'use client'
import { useState, useEffect } from 'react'

const MEMBERS = ["Sai", "Damian", "Watis", "Andyka", "Minh", "Vanessa"]
const MEMBER_COLORS = ["#6366f1","#ec4899","#f97316","#10b981","#3b82f6","#a855f7"]
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

const DEFAULT_RECURRING = {
  Sai:     {},
  Damian:  { Sat: "busy" },
  Watis:   { Mon:"busy", Tue:"busy", Wed:"busy", Thu:"busy", Fri:"busy", Sat:"busy" },
  Andyka:  { Wed:"busy", Sun:"busy" },
  Minh:    {},
  Vanessa: {},
}
const DEFAULT_NOTES = {
  Sai: "Away until 22nd June", Damian: "", Watis: "Works Mon–Sat",
  Andyka: "Busy Wed & Sun", Minh: "Any day works!", Vanessa: "",
}

const STATUS_CFG = {
  busy:  { bg:"#fecaca", text:"#7f1d1d", border:"#f87171", sym:"✕" },
  maybe: { bg:"#fef9c3", text:"#854d0e", border:"#fcd34d", sym:"?" },
  null:  { bg:"#f9fafb", text:"#d1d5db", border:"#e5e7eb", sym:"" },
}

function dateKey(d) { return d.toISOString().slice(0,10) }
function jsDay(d)   { const n=d.getDay(); return n===0?6:n-1 }
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r }
function weekMon(d) { const r=new Date(d); r.setDate(r.getDate()-jsDay(r)); return r }
function fmtShort(d){ return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}) }
function fmtMonth(d){ return d.toLocaleDateString("en-GB",{month:"long",year:"numeric"}) }
function fmtTime(iso){
  if(!iso) return ""
  const d=new Date(iso)
  return d.toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})
}

function getWeeks(from,to){
  const w=[]; let d=weekMon(from)
  while(d<=to){ w.push(new Date(d)); d=addDays(d,7) }
  return w
}
function groupByMonth(weeks){
  const m={}
  weeks.forEach(w=>{ const mid=addDays(w,3); const k=`${mid.getFullYear()}-${mid.getMonth()}`
    if(!m[k]) m[k]={label:fmtMonth(mid),weeks:[]}; m[k].weeks.push(w) })
  return Object.values(m)
}

export default function App() {
  const TODAY = new Date(2026,5,3)
  const END   = new Date(2026,11,31)

  const [data, setData]             = useState({})
  const [loading, setLoading]       = useState(true)
  const [selMember, setSelMember]   = useState(null)
  const [view, setView]             = useState("calendar")
  const [toast, setToast]           = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(()=>{
    fetch('/api/availability').then(r=>r.json()).then(d=>{ setData(d); setLoading(false) })
  },[])

  useEffect(()=>{
    const t = setInterval(()=>{
      fetch('/api/availability').then(r=>r.json()).then(d=>setData(d))
    }, 10000)
    return ()=>clearInterval(t)
  },[])

  function showToast(msg){ setToast(msg); setTimeout(()=>setToast(null),2000) }

  function getStatus(member, date){
    const dk=dateKey(date)
    const ov=data[member]?.overrides?.[dk]
    if(ov !== undefined) return ov
    return DEFAULT_RECURRING[member]?.[DAYS[jsDay(date)]] || null
  }

  async function toggleStatus(member, date){
    const cur=getStatus(member,date)
    const cycle = [null, "busy", "maybe"]
    const next = cycle[(cycle.indexOf(cur)+1) % cycle.length]
    const dk=dateKey(date)
    const now = new Date().toISOString()

    setData(prev=>({
      ...prev,
      [member]:{
        ...prev[member],
        overrides:{ ...(prev[member]?.overrides||{}), [dk]:next },
        lastUpdated: now
      }
    }))
    setLastUpdate({ member, time: now })

    await fetch('/api/availability',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({member, date:dk, status:next, updatedAt: now})
    })
    showToast("Saved ✓")
  }

  async function updateNotes(member, notes){
    setData(prev=>({ ...prev, [member]:{ ...prev[member], notes } }))
    await fetch('/api/notes',{ method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({member, notes}) })
  }

  const weeks  = getWeeks(TODAY, END)
  const months = groupByMonth(weeks)

  function getBestDays(){
    const s={}; DAYS.forEach(d=>{ s[d]={free:0,busy:0} })
    weeks.slice(0,8).forEach(ws=>{
      DAYS.forEach((day,di)=>{
        const date=addDays(ws,di); if(date<TODAY||date>END) return
        MEMBERS.forEach(m=>{
          const st=getStatus(m,date)
          if(st==="busy") s[day].busy++
          else s[day].free++
        })
      })
    })
    return s
  }
  const bestDays   = getBestDays()
  const sortedDays = [...DAYS].sort((a,b)=>(bestDays[b].free||0)-(bestDays[a].free||0))

  if(loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontSize:16,color:"#6b7280"}}>
      Loading...
    </div>
  )

  const btnBase = { padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" }

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#f4f4f8",minHeight:"100vh"}}>
      <div style={{background:"#18181b",color:"white",padding:"14px 18px",position:"sticky",top:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontWeight:800,fontSize:16}}>📅 Group Planner</div>
          <div style={{fontSize:11,color:"#a1a1aa",marginTop:2}}>Select your name → tap a cell to mark busy</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {lastUpdate && (
            <div style={{fontSize:11,color:"#a1a1aa"}}>
              Last edit: <span style={{color:MEMBER_COLORS[MEMBERS.indexOf(lastUpdate.member)],fontWeight:700}}>{lastUpdate.member}</span> · {fmtTime(lastUpdate.time)}
            </div>
          )}
          <button style={{...btnBase,background:view==="calendar"?"#6366f1":"#3f3f46",color:"white"}} onClick={()=>setView("calendar")}>Calendar</button>
          <button style={{...btnBase,background:view==="summary"?"#6366f1":"#3f3f46",color:"white"}} onClick={()=>setView("summary")}>Best Days</button>
        </div>
      </div>

      <div style={{background:"white",borderBottom:"1px solid #e4e4e7",padding:"10px 16px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <span style={{fontSize:11,color:"#71717a",fontWeight:700,whiteSpace:"nowrap"}}>You are:</span>
        {MEMBERS.map((m,i)=>(
          <button key={m} onClick={()=>setSelMember(selMember===m?null:m)} style={{
            padding:"5px 13px", borderRadius:20, cursor:"pointer", fontSize:12, fontWeight:700,
            fontFamily:"inherit", border:`2px solid ${selMember===m?MEMBER_COLORS[i]:"#e4e4e7"}`,
            background:selMember===m?MEMBER_COLORS[i]:"white", color:selMember===m?"white":"#374151",
            transition:"all 0.15s", display:"flex", alignItems:"center", gap:5
          }}>
            {m}
            {data[m]?.lastUpdated && (
              <span style={{fontSize:9,opacity:0.7,fontWeight:400}}>
                {fmtTime(data[m].lastUpdated)}
              </span>
            )}
          </button>
        ))}
        {selMember && (
          <span style={{fontSize:11,color:"#9ca3af",marginLeft:4}}>
            Tap cell → blank → ✕ busy → ? maybe → blank
          </span>
        )}
      </div>

      {view==="calendar" && (
        <div style={{padding:"14px 12px"}}>
          {months.map((month,mi)=>(
            <div key={mi} style={{marginBottom:24}}>
              <div style={{fontSize:13,fontWeight:800,color:"#6366f1",marginBottom:8}}>{month.label}</div>
              <div style={{overflowX:"auto"}}>
                <table style={{borderCollapse:"separate",borderSpacing:2}}>
                  <thead>
                    <tr>
                      <th style={{fontSize:11,color:"#9ca3af",fontWeight:600,textAlign:"left",minWidth:75,padding:"2px 6px"}}>Member</th>
                      {month.weeks.map((ws,wi)=>DAYS.map((day,di)=>{
                        const date=addDays(ws,di)
                        if(date<TODAY||date>END) return <th key={`${wi}-${di}`} style={{minWidth:30,width:30}} />
                        return (
                          <th key={`${wi}-${di}`} style={{minWidth:30,width:30,fontSize:9,color:"#9ca3af",fontWeight:700,textAlign:"center",padding:"2px 1px"}}>
                            <div>{day[0]}</div>
                            <div style={{fontWeight:800,color:"#6b7280"}}>{fmtShort(date).split(" ")[0]}</div>
                          </th>
                        )
                      }))}
                    </tr>
                  </thead>
                  <tbody>
                    {MEMBERS.map((member,mi2)=>(
                      <tr key={member}>
                        <td style={{fontSize:11,fontWeight:700,color:"#374151",padding:"2px 6px",whiteSpace:"nowrap"}}>
                          <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:MEMBER_COLORS[mi2],marginRight:5}} />
                          {member}
                        </td>
                        {month.weeks.map((ws,wi)=>DAYS.map((day,di)=>{
                          const date=addDays(ws,di)
                          if(date<TODAY||date>END) return <td key={`${wi}-${di}`} />
                          const st=getStatus(member,date)
                          const cfg=STATUS_CFG[st]||STATUS_CFG.null
                          const isEd=selMember===member
                          return (
                            <td key={`${wi}-${di}`}>
                              <div
                                onClick={()=>isEd&&toggleStatus(member,date)}
                                style={{
                                  width:30,minWidth:30,height:27,lineHeight:"27px",
                                  borderRadius:4,textAlign:"center",
                                  fontSize:11,fontWeight:800,userSelect:"none",
                                  background:cfg.bg,color:cfg.text,
                                  border:`1px solid ${cfg.border}`,
                                  outline:isEd?`2px solid ${MEMBER_COLORS[mi2]}`:"none",
                                  cursor:isEd?"pointer":"default",
                                  transition:"all 0.1s",
                                }}
                                onMouseEnter={e=>{ if(isEd) e.currentTarget.style.transform="scale(1.15)" }}
                                onMouseLeave={e=>{ e.currentTarget.style.transform="scale(1)" }}
                              >
                                {cfg.sym}
                              </div>
                            </td>
                          )
                        }))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div style={{background:"white",borderRadius:12,padding:16,border:"1px solid #e4e4e7",marginTop:8}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>📝 Notes</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
              {MEMBERS.map((m,i)=>(
                <div key={m} style={{border:`1.5px solid ${MEMBER_COLORS[i]}44`,borderRadius:10,padding:12}}>
                  <div style={{fontSize:12,fontWeight:700,color:MEMBER_COLORS[i],marginBottom:6}}>{m}</div>
                  <textarea placeholder="Add notes…"
                    value={data[m]?.notes ?? DEFAULT_NOTES[m]}
                    onChange={e=>updateNotes(m,e.target.value)}
                    style={{width:"100%",border:"none",background:"transparent",resize:"none",fontSize:12,fontFamily:"inherit",outline:"none",color:"#374151",height:48}} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view==="summary" && (
        <div style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:15}}>Best days — next 8 weeks</div>
          <div style={{fontSize:12,color:"#6b7280",marginTop:2,marginBottom:14}}>Empty = available · Ranked by most free slots</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
            {sortedDays.map((day,rank)=>{
              const s=bestDays[day]||{}
              const total=(s.free||0)+(s.busy||0)
              const pct=total?Math.round((s.free||0)/total*100):0
              const isTop=rank===0
              return (
                <div key={day} style={{background:isTop?"#eef2ff":"white",border:`2px solid ${isTop?"#6366f1":"#e4e4e7"}`,borderRadius:12,padding:14,position:"relative"}}>
                  {isTop && <span style={{position:"absolute",top:8,right:8,fontSize:10,background:"#6366f1",color:"white",borderRadius:6,padding:"2px 7px",fontWeight:700}}>BEST</span>}
                  <div style={{fontWeight:800,fontSize:24,color:isTop?"#4338ca":"#374151",marginBottom:10}}>{day}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:11,color:"#6b7280"}}>✅ Available</span>
                    <span style={{fontSize:11,fontWeight:700,background:"#f3f4f6",color:"#374151",padding:"1px 9px",borderRadius:10}}>{s.free||0}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:11,color:"#6b7280"}}>❌ Busy</span>
                    <span style={{fontSize:11,fontWeight:700,background:"#fecaca",color:"#7f1d1d",padding:"1px 9px",borderRadius:10}}>{s.busy||0}</span>
                  </div>
                  <div style={{marginTop:8,fontSize:11,fontWeight:700,color:isTop?"#6366f1":"#9ca3af"}}>{pct}% available</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {toast && (
        <div style={{position:"fixed",bottom:24,right:20,background:"#18181b",color:"white",padding:"10px 18px",borderRadius:10,zIndex:9999,fontSize:13,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>
          {toast}
        </div>
      )}
    </div>
  )
}
