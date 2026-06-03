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
  busy: { bg:"#fecaca", text:"#7f1d1d", border:"#f87171", sym:"✕" },
  null: { bg:"#f9fafb", text:"#d1d5db", border:"#e5e7eb", sym:"" },
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
    const next = cur==="busy" ? null : "busy"
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
    await fetch('/api/notes',{ method:'POS
