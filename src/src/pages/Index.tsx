import React, { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { MetaData, DatePreset, Tab, MetricKey, Campaign, Ad, DailyPoint } from '../../types'

// ─── Helpers ─────────────────────────────────────────────
const fmt  = (n: number, d = 2) => Number(n || 0).toFixed(d)
const fmtN = (n: number) => Math.round(n || 0).toLocaleString('fr-FR')
const fmtD = (d: Date) => d.toISOString().split('T')[0]
const todayStr      = () => fmtD(new Date())
const daysAgoStr    = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmtD(d) }
const yesterdayStr  = () => daysAgoStr(1)
const thisMonthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }
const lastMonthStart = () => { const d = new Date(); d.setMonth(d.getMonth()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }
const lastMonthEnd   = () => { const d = new Date(); d.setDate(0); return fmtD(d) }
const thisWeekStart  = () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - day + (day===0?-6:1)); return fmtD(d) }
const lastWeekStart  = () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - day - 6); return fmtD(d) }
const lastWeekEnd    = () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - day); return fmtD(d) }

// ─── Date Range Presets ─────────────────────────────────
const PRESETS = [
  { label: "Aujourd'hui",         key: 'today',          since: () => todayStr(),       until: () => todayStr()       },
  { label: 'Hier',                key: 'yesterday',      since: () => yesterdayStr(),   until: () => yesterdayStr()   },
  { label: "Aujourd'hui et hier", key: 'today_yesterday', since: () => yesterdayStr(),  until: () => todayStr()       },
  { label: '7 derniers jours',    key: 'last_7d',        since: () => daysAgoStr(7),    until: () => todayStr()       },
  { label: '14 derniers jours',   key: 'last_14d',       since: () => daysAgoStr(14),   until: () => todayStr()       },
  { label: '28 derniers jours',   key: 'last_28d',       since: () => daysAgoStr(28),   until: () => todayStr()       },
  { label: '30 derniers jours',   key: 'last_30d',       since: () => daysAgoStr(30),   until: () => todayStr()       },
  { label: 'Cette semaine',       key: 'this_week',      since: () => thisWeekStart(),  until: () => todayStr()       },
  { label: 'Dernière semaine',    key: 'last_week',      since: () => lastWeekStart(),  until: () => lastWeekEnd()    },
  { label: 'Ce mois-ci',          key: 'this_month',     since: () => thisMonthStart(), until: () => todayStr()       },
  { label: 'Dernier mois',        key: 'last_month',     since: () => lastMonthStart(), until: () => lastMonthEnd()   },
  { label: 'Maximum',             key: 'maximum',        since: () => '2020-01-01',     until: () => todayStr()       },
]

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_FR   = ['Lu','Ma','Me','Je','Ve','Sa','Di']

// ─── Calendar Month ───────────────────────────────────
function CalendarMonth({ year, month, since, until, hovered, onSelect, onHover, dark }: {
  year:number; month:number; since:string; until:string; hovered:string
  onSelect:(d:string)=>void; onHover:(d:string)=>void; dark:boolean
}) {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDow = (firstDay.getDay() + 6) % 7
  const cells: (number|null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  const ds = (day: number) => `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`

  return (
    <div className="w-56">
      <p className={`text-center text-xs font-bold mb-2 ${dark?'text-white':'text-gray-800'}`}>
        {MONTHS_FR[month]} {year}
      </p>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_FR.map(d=><div key={d} className={`text-center text-[9px] font-medium ${dark?'text-gray-500':'text-gray-400'}`}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day,i) => {
          if(!day) return <div key={i}/>
          const d = ds(day)
          const isStart = d === since
          const isEnd   = d === until
          const endCmp  = until || hovered
          const inRange = since && endCmp && d > Math.min(since,endCmp) && d < Math.max(since,endCmp)
          const isToday = d === todayStr()
          return (
            <div
              key={i}
              onClick={()=>onSelect(d)}
              onMouseEnter={()=>onHover(d)}
              className={`
                text-center text-[11px] py-1 cursor-pointer rounded transition-all select-none
                ${isStart||isEnd ? 'bg-blue-600 text-white font-bold rounded-full' : ''}
                ${inRange ? (dark?'bg-blue-900/50 text-blue-300':'bg-blue-100 text-blue-700') : ''}
                ${!isStart&&!isEnd&&!inRange ? (dark?'text-gray-300 hover:bg-gray-700 rounded-full':'text-gray-700 hover:bg-gray-100 rounded-full') : ''}
                ${isToday&&!isStart&&!isEnd ? 'font-bold' : ''}
              `}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Date Range Picker (style Meta) ─────────────────────
interface DRValue { since:string; until:string; key:string }

function DateRangePicker({ value, onChange, dark }: { value:DRValue; onChange:(v:DRValue)=>void; dark:boolean }) {
  const [open,    setOpen]    = useState(false)
  const [tmpS,    setTmpS]    = useState(value.since)
  const [tmpU,    setTmpU]    = useState(value.until)
  const [phase,   setPhase]   = useState<'since'|'until'>('since')
  const [hovered, setHovered] = useState('')
  const [view,    setView]    = useState(() => { const d = new Date(); d.setDate(1); return d })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if(ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const next = new Date(view.getFullYear(), view.getMonth()+1, 1)

  const handleDay = (d: string) => {
    if(phase==='since') { setTmpS(d); setTmpU(''); setPhase('until') }
    else {
      if(d < tmpS) { setTmpU(tmpS); setTmpS(d) }
      else setTmpU(d)
      setPhase('since')
    }
  }

  const handlePreset = (p: typeof PRESETS[0]) => {
    const s = p.since(), u = p.until()
    onChange({ since:s, until:u, key:p.key })
    setTmpS(s); setTmpU(u)
    setOpen(false)
  }

  const handleApply = () => {
    if(tmpS && tmpU) { onChange({ since:tmpS, until:tmpU, key:'custom' }); setOpen(false) }
  }

  const label = () => {
    if(value.key==='custom') return `${value.since} → ${value.until}`
    return PRESETS.find(p=>p.key===value.key)?.label || '30 derniers jours'
  }

  const btn = `text-xs rounded-lg border px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap ${
    dark?'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700':'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
  } transition-colors`

  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(o=>!o)} className={btn}>
        📅 {label()}
      </button>

      {open && (
        <div className={`absolute top-10 right-0 z-50 rounded-xl shadow-2xl border flex overflow-hidden ${
          dark?'bg-[#1e293b] border-gray-700':'bg-white border-gray-200'
        }`} style={{minWidth:560}}>

          {/* Presets */}
          <div className={`w-44 border-r flex flex-col p-2 gap-0.5 overflow-y-auto ${
            dark?'border-gray-700 bg-[#162032]':'border-gray-100 bg-gray-50'
          }`}>
            {PRESETS.map(p => (
              <button key={p.key} onClick={()=>handlePreset(p)}
                className={`text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                  value.key===p.key
                    ? 'bg-blue-600 text-white'
                    : dark?'text-gray-300 hover:bg-gray-700':'text-gray-700 hover:bg-blue-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="flex flex-col p-4">
            {/* Selected range display */}
            <div className={`flex items-center gap-3 mb-4 text-xs ${
              dark?'text-gray-300':'text-gray-600'
            }`}>
              <div className={`px-3 py-1.5 rounded-lg border font-medium ${
                phase==='since'
                  ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                  : dark?'border-gray-600':'border-gray-200'
              }`}>
                {tmpS || 'Date début'}
              </div>
              <span className={dark?'text-gray-500':'text-gray-400'}>→</span>
              <div className={`px-3 py-1.5 rounded-lg border font-medium ${
                phase==='until'
                  ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                  : dark?'border-gray-600':'border-gray-200'
              }`}>
                {tmpU || 'Date fin'}
              </div>
            </div>

            {/* Month navigation */}
            <div className="flex items-start gap-6">
              <div className="relative">
                <button
                  onClick={()=>setView(v=>new Date(v.getFullYear(),v.getMonth()-1,1))}
                  className={`absolute -top-6 left-0 text-sm px-1 ${
                    dark?'text-gray-400 hover:text-white':'text-gray-400 hover:text-gray-700'
                  }`}
                >‹</button>
                <CalendarMonth
                  year={view.getFullYear()} month={view.getMonth()}
                  since={tmpS} until={tmpU} hovered={hovered}
                  onSelect={handleDay} onHover={setHovered} dark={dark}
                />
              </div>
              <div className="relative">
                <button
                  onClick={()=>setView(v=>new Date(v.getFullYear(),v.getMonth()+1,1))}
                  className={`absolute -top-6 right-0 text-sm px-1 ${
                    dark?'text-gray-400 hover:text-white':'text-gray-400 hover:text-gray-700'
                  }`}
                >›</button>
                <CalendarMonth
                  year={next.getFullYear()} month={next.getMonth()}
                  since={tmpS} until={tmpU} hovered={hovered}
                  onSelect={handleDay} onHover={setHovered} dark={dark}
                />
              </div>
            </div>

            {/* Timezone + Buttons */}
            <div className={`flex items-center justify-between mt-4 pt-3 border-t ${
              dark?'border-gray-700':'border-gray-100'
            }`}>
              <span className={`text-[10px] ${dark?'text-gray-500':'text-gray-400'}`}>
                🌍 Africa/Algiers
              </span>
              <div className="flex gap-2">
                <button
                  onClick={()=>setOpen(false)}
                  className={`text-xs px-4 py-1.5 rounded-lg border ${
                    dark?'border-gray-600 text-gray-300 hover:bg-gray-700':'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleApply}
                  disabled={!tmpS||!tmpU}
                  className="text-xs px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-40 transition-colors"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Metric Colors ─────────────────────────────────────────
function metricColor(k: MetricKey, v: number): 'green'|'orange'|'red'|'blue' {
  switch(k) {
    case 'cpr':       return v<1.5?'green':v<3?'orange':'red'
    case 'roas':      return v>10?'green':v>5?'orange':'red'
    case 'ctr_link':  return v>3?'green':v>2?'orange':'red'
    case 'frequency': return v<2?'green':v<3?'orange':'red'
    case 'hookRate':  return v>25?'green':v>20?'orange':'red'
    case 'cpm':       return v<1?'green':v<2?'orange':'red'
    default:          return 'blue'
  }
}

const CLS = {
  green:  { text:'text-emerald-400', bg:'bg-emerald-500/10', border:'border-emerald-500', pill:'bg-emerald-500/15 text-emerald-400' },
  orange: { text:'text-orange-400',  bg:'bg-orange-500/10',  border:'border-orange-500',  pill:'bg-orange-500/15 text-orange-400'  },
  red:    { text:'text-red-400',      bg:'bg-red-500/10',     border:'border-red-500',     pill:'bg-red-500/15 text-red-400'        },
  blue:   { text:'text-blue-400',     bg:'bg-blue-500/10',    border:'border-blue-500',    pill:'bg-blue-500/15 text-blue-400'      },
}

// ─── KPI Card ────────────────────────────────────────────────
interface KPICardProps {
  label:string; value:string|React.ReactNode; icon:string; dark:boolean
  trend?:number; sparklineData?:any[]; sparklineKey?:string; sparklineColor?:string
}
function KPICard({ label,value,icon,dark,trend,sparklineData,sparklineKey,sparklineColor }: KPICardProps) {
  const isPos = trend!==undefined && trend>=0
  return (
    <div className={`rounded-xl p-5 ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} border shadow-sm flex flex-col justify-between h-36 relative overflow-hidden`}>
      <div className="flex justify-between items-center mb-2 z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-50">{icon}</span>
          <p className={`text-xs font-semibold ${dark?'text-gray-400':'text-gray-500'}`}>{label}</p>
        </div>
        {trend!==undefined&&(
          <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isPos?'text-emerald-600 bg-emerald-500/10':'text-red-600 bg-red-500/10'}`}>
            {isPos?'↑':'↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className={`text-3xl font-bold tracking-tight z-10 ${dark?'text-white':'text-gray-900'}`}>{value}</div>
      {sparklineData&&sparklineKey&&(
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line type="monotone" dataKey={sparklineKey} stroke={sparklineColor||'#3b82f6'} strokeWidth={2} dot={false} isAnimationActive={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status:string }) {
  if(status==='ACTIVE') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">Active</span>
  if(status==='PAUSED') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-600">Paused</span>
  return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/10 text-gray-600">Off</span>
}

function MetricCell({ metric,value,display }: { metric:MetricKey; value:number; display:string }) {
  return <td className={`px-4 py-3.5 text-sm font-bold ${CLS[metricColor(metric,value)].text}`}>{display}</td>
}

function AdPerformanceChart({ a,dark }: { a:Ad; dark:boolean }) {
  const hr=a.hookRate||0
  const hookColor=hr>25?'#10b981':hr>15?'#f59e0b':'#ef4444'
  const roasColor=(a.roas||0)>10?'#10b981':(a.roas||0)>5?'#f59e0b':'#ef4444'
  const cprColor=(a.cpr||0)<1.5?'#10b981':(a.cpr||0)<3?'#f59e0b':'#ef4444'
  const N=18
  const roasCurve=Array.from({length:N},(_,i)=>{ const t=(i+1)/N; return {i,v:+((a.roas||0)*1.4*t/(t+0.3)).toFixed(2)} })
  const cprCurve=Array.from({length:N},(_,i)=>{ const t=(i+1)/N; return {i,v:+((a.cpr||0)*(0.5+Math.exp(-t*2.5)*1.5)).toFixed(2)} })
  const thruCurve=Array.from({length:N},(_,i)=>{ const t=(i+1)/N; return {i,v:Math.round((a.thruplay||0)*t)} })
  const r=34; const circ=2*Math.PI*r; const hookDash=Math.min(hr/60,1)*circ
  const bg=dark?'#0f172a':'#f8fafc'; const track=dark?'#1e293b':'#e2e8f0'
  const mini=(data:any[],color:string)=>(
    <div className="h-12"><ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{top:2,right:2,left:2,bottom:2}}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2.5} dot={false} isAnimationActive={false}/>
      </LineChart>
    </ResponsiveContainer></div>
  )
  return (
    <div className="p-4" style={{background:bg}}>
      <div className="flex items-center gap-3 mb-4">
        <svg width="72" height="72" viewBox="0 0 100 100" className="shrink-0">
          <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth="8"/>
          <circle cx="50" cy="50" r={r} fill="none" stroke={hookColor} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={`${hookDash} ${circ}`} transform="rotate(-90 50 50)"/>
          <text x="50" y="46" textAnchor="middle" fill={hookColor} fontSize="13" fontWeight="800">{hr.toFixed(1)}%</text>
          <text x="50" y="60" textAnchor="middle" fill={dark?'#64748b':'#94a3b8'} fontSize="7.5" fontWeight="600">HOOK RATE</text>
        </svg>
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${dark?'text-slate-400':'text-slate-500'}`}>Hook Rate</p>
          <p className="text-xl font-bold" style={{color:hookColor}}>{hr.toFixed(1)}%</p>
        </div>
      </div>
      <div className="mb-3"><div className="flex justify-between mb-0.5"><span className={`text-[10px] font-bold uppercase ${dark?'text-slate-400':'text-slate-500'}`}>ROAS</span><span className="text-[11px] font-bold" style={{color:roasColor}}>{(a.roas||0).toFixed(1)}x</span></div>{mini(roasCurve,roasColor)}</div>
      <div className="mb-3"><div className="flex justify-between mb-0.5"><span className={`text-[10px] font-bold uppercase ${dark?'text-slate-400':'text-slate-500'}`}>CPR</span><span className="text-[11px] font-bold" style={{color:cprColor}}>${(a.cpr||0).toFixed(2)}</span></div>{mini(cprCurve,cprColor)}</div>
      <div><div className="flex justify-between mb-0.5"><span className={`text-[10px] font-bold uppercase ${dark?'text-slate-400':'text-slate-500'}`}>ThruPlay</span><span className={`text-[11px] font-bold ${dark?'text-blue-400':'text-blue-500'}`}>{fmtN(a.thruplay||0)}</span></div>{mini(thruCurve,'#60a5fa')}</div>
    </div>
  )
}

// ─── Tabs ──────────────────────────────────────────────────
function OverviewTab({ data,dark }: { data:MetaData; dark:boolean }) {
  const t=data.totals; const daily=data.daily||[]
  const kpis: KPICardProps[] = [
    {label:'Spend',     value:`$${fmt(t.spend)}`,       icon:'💸',dark,trend:12.5,sparklineData:daily,sparklineKey:'spend',    sparklineColor:'#3b82f6'},
    {label:'Purchases', value:fmtN(t.purchases),        icon:'🛒',dark,trend:8.2, sparklineData:daily,sparklineKey:'purchases',sparklineColor:'#8b5cf6'},
    {label:'CPR',       value:`$${fmt(t.cpr)}`,         icon:'🎯',dark,trend:-4.3,sparklineData:daily,sparklineKey:'cpr',      sparklineColor:'#ef4444'},
    {label:'ROAS',      value:`${fmt(t.roas)}x`,        icon:'📈',dark,trend:15.4,sparklineData:daily,sparklineKey:'roas',     sparklineColor:'#10b981'},
    {label:'Budget/j',  value:`$${fmt(t.budget_total)}`,icon:'💰',dark},
  ]
  const best=[...data.campaigns].filter(c=>c.status==='ACTIVE').sort((a,b)=>b.roas-a.roas)[0]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{kpis.map((k,i)=><KPICard key={i} {...k}/>)}</div>
      {best&&(
        <div className={`rounded-xl p-6 ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} border shadow-sm`}>
          <p className={`text-sm font-semibold mb-4 ${dark?'text-gray-300':'text-gray-700'}`}>🏆 Top Campaign</p>
          <div className="flex flex-wrap gap-x-12 gap-y-4">
            {[['Nom',best.name,'','text'],['ROAS',`${fmt(best.roas)}x`,'roas','metric'],['CPR',`$${fmt(best.cpr)}`,'cpr','metric']].map(([l,v,mk,type])=>(
              <div key={l as string}><p className={`text-xs mb-1 ${dark?'text-gray-500':'text-gray-400'}`}>{l}</p>
                {type==='metric'&&mk
                  ?<p className={`text-2xl font-bold ${CLS[metricColor(mk as MetricKey,parseFloat(v as string))].text}`}>{v}</p>
                  :<p className={`text-xl font-semibold truncate max-w-[300px] ${dark?'text-white':'text-gray-900'}`}>{v}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CampaignsTab({ data,dark }: { data:MetaData; dark:boolean }) {
  const headers=['Nom','Statut','Budget/j','Dépensé','Impressions','Couverture','Fréquence','CPM','CPC lien','CTR lien%','CTR tous%','Vues page','Coût/LPV','ATC','Coût/ATC','Abandon','Achats','Taux Conv.%','CPR','ROAS','Valeur ($)','ThruPlay','Hook Rate%']
  return (
    <div className={`rounded-xl overflow-hidden border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className={`border-b ${dark?'border-gray-800 bg-[#0f172a]':'border-gray-100 bg-gray-50/50'}`}>
          {headers.map(h=><th key={h} className={`px-4 py-3 text-left text-xs font-medium whitespace-nowrap ${dark?'text-gray-400':'text-gray-500'}`}>{h}</th>)}
        </tr></thead>
        <tbody className={`divide-y ${dark?'divide-gray-700/50':'divide-gray-100'}`}>
          {data.campaigns.map((c:Campaign)=>(
            <tr key={c.id} className={`transition-colors ${dark?'hover:bg-gray-700/40':'hover:bg-gray-50'}`}>
              <td className={`px-4 py-3.5 font-semibold ${dark?'text-white':'text-gray-900'}`}><span className="block max-w-[160px] truncate">{c.name}</span></td>
              <td className="px-4 py-3.5"><StatusBadge status={c.status}/></td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{c.daily_budget?`$${fmt(c.daily_budget,0)}`:'—'}</td>
              <td className={`px-4 py-3.5 text-sm font-semibold ${dark?'text-white':'text-gray-900'}`}>${fmt(c.spend)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(c.impressions)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(c.reach)}</td>
              <MetricCell metric="frequency" value={c.frequency} display={fmt(c.frequency,1)}/>
              <MetricCell metric="cpm"       value={c.cpm}       display={`$${fmt(c.cpm)}`}/>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(c.cpc_link)}</td>
              <MetricCell metric="ctr_link" value={c.ctr_link} display={`${fmt(c.ctr_link)}%`}/>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmt(c.ctr_all)}%</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(c.lpv)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(c.costPerLPV)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(c.atc)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(c.costPerATC)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(c.initiated_checkout)}</td>
              <td className={`px-4 py-3.5 text-sm font-bold ${dark?'text-white':'text-gray-900'}`}>{c.purchases}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmt((c.purchases/Math.max(c.lpv,1))*100)}%</td>
              <MetricCell metric="cpr"      value={c.cpr}      display={`$${fmt(c.cpr)}`}/>
              <MetricCell metric="roas"     value={c.roas}     display={`${fmt(c.roas)}x`}/>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(c.revenue)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(c.thruplay)}</td>
              <MetricCell metric="hookRate" value={c.hookRate} display={`${fmt(c.hookRate)}%`}/>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  )
}

function PublicitesTab({ data,dark }: { data:MetaData; dark:boolean }) {
  const sortedAds=[...(data.ads||[])].sort((a,b)=>b.roas-a.roas)
  const headers=['Publicité','Campagne','Statut','Dépensé','Impressions','Couverture','Fréquence','CPM','CPC lien','CTR lien%','CTR tous%','Vues page','Coût/LPV','ATC','Coût/ATC','Abandon','Taux Conv%','Achats','CPR','ROAS','Valeur ($)','ThruPlay','Hook Rate%']
  if(!sortedAds.length) return (
    <div className={`rounded-xl p-12 text-center border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
      <div className="text-4xl mb-4">📭</div>
      <h3 className={`text-xl font-bold ${dark?'text-white':'text-gray-900'}`}>Aucune publicité</h3>
    </div>
  )
  return (
    <div className={`rounded-xl overflow-hidden border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className={`border-b ${dark?'border-gray-800 bg-[#0f172a]':'border-gray-100 bg-gray-50/50'}`}>
          {headers.map(h=><th key={h} className={`px-4 py-3 text-left text-xs font-medium whitespace-nowrap ${dark?'text-gray-400':'text-gray-500'}`}>{h}</th>)}
        </tr></thead>
        <tbody className={`divide-y ${dark?'divide-gray-700/50':'divide-gray-100'}`}>
          {sortedAds.map((a:Ad)=>(
            <tr key={a.id} className={`transition-colors ${dark?'hover:bg-gray-700/40':'hover:bg-gray-50'}`}>
              <td className={`px-4 py-3.5 font-semibold ${dark?'text-white':'text-gray-900'}`}>
                <div className="flex items-center gap-2">
                  {a.thumbnail&&<img src={a.thumbnail} alt="" className="w-8 h-8 rounded object-cover shrink-0" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                  <span className="block max-w-[180px] truncate">{a.name}</span>
                </div>
              </td>
              <td className={`px-4 py-3.5 text-xs ${dark?'text-gray-400':'text-gray-500'}`}><span className="block max-w-[120px] truncate">{a.campaign_name}</span></td>
              <td className="px-4 py-3.5"><StatusBadge status={a.status}/></td>
              <td className={`px-4 py-3.5 text-sm font-semibold ${dark?'text-white':'text-gray-900'}`}>${fmt(a.spend)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(a.impressions)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(a.reach)}</td>
              <MetricCell metric="frequency" value={a.frequency} display={fmt(a.frequency,1)}/>
              <MetricCell metric="cpm"       value={a.cpm}       display={`$${fmt(a.cpm)}`}/>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(a.cpc_link)}</td>
              <MetricCell metric="ctr_link" value={a.ctr_link} display={`${fmt(a.ctr_link)}%`}/>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmt(a.ctr_all)}%</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(a.lpv)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(a.costPerLPV)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(a.atc)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(a.costPerATC)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(a.initiated_checkout)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmt((a.purchases/Math.max(a.lpv,1))*100)}%</td>
              <td className={`px-4 py-3.5 text-sm font-bold ${dark?'text-white':'text-gray-900'}`}>{a.purchases}</td>
              <MetricCell metric="cpr"      value={a.cpr}      display={`$${fmt(a.cpr)}`}/>
              <MetricCell metric="roas"     value={a.roas}     display={`${fmt(a.roas)}x`}/>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(a.revenue)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(a.thruplay)}</td>
              <MetricCell metric="hookRate" value={a.hookRate} display={`${fmt(a.hookRate)}%`}/>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  )
}

function CreativeTab({ data,dark }: { data:MetaData; dark:boolean }) {
  const ads=[...(data.ads||[])].sort((a,b)=>b.roas-a.roas)
  if(!ads.length) return <div className={`rounded-xl p-12 text-center border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}><div className="text-4xl mb-4">🎬</div><h3 className={`text-xl font-bold ${dark?'text-white':'text-gray-900'}`}>Aucun créatif</h3></div>
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {ads.map((a:Ad)=>(
        <div key={a.id} className={`rounded-xl overflow-hidden border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
          <div className="relative h-40 bg-gray-900 flex items-center justify-center overflow-hidden">
            {a.thumbnail?<img src={a.thumbnail} alt="" className="w-full h-full object-cover opacity-90" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>:<span className="text-5xl opacity-20">🎬</span>}
            <div className="absolute top-2 right-2"><StatusBadge status={a.status}/></div>
          </div>
          <div className={`px-4 py-3 border-b ${dark?'border-gray-700':'border-gray-100'}`}>
            <p className={`text-xs font-semibold truncate ${dark?'text-white':'text-gray-900'}`} title={a.name}>{a.name}</p>
            <p className={`text-[10px] truncate mt-0.5 ${dark?'text-gray-400':'text-gray-500'}`}>{a.campaign_name}</p>
          </div>
          <AdPerformanceChart a={a} dark={dark}/>
        </div>
      ))}
    </div>
  )
}

function FunnelTab({ data,dark }: { data:MetaData; dark:boolean }) {
  const t=data.totals
  const steps=[
    {label:'Impressions',  value:t.impressions,        color:'#3b82f6'},
    {label:'Vues page',    value:t.lpv,                color:'#8b5cf6'},
    {label:'ATC',          value:t.atc,                color:'#f59e0b'},
    {label:'Abandon',      value:t.initiated_checkout, color:'#ef4444'},
    {label:'Achats',       value:t.purchases,          color:'#10b981'},
  ]
  const maxVal=steps[0].value||1
  return (
    <div className={`rounded-xl border p-6 ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
      <p className={`text-sm font-semibold mb-6 ${dark?'text-gray-300':'text-gray-700'}`}>🔽 Funnel de conversion</p>
      <div className="space-y-4">
        {steps.map((s,i)=>(
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${dark?'text-gray-300':'text-gray-600'}`}>{s.label}</span>
              <span className={`text-sm font-bold ${dark?'text-white':'text-gray-900'}`}>{fmtN(s.value)}</span>
            </div>
            <div className={`h-7 rounded-lg overflow-hidden ${dark?'bg-gray-800':'bg-gray-100'}`}>
              <div className="h-full rounded-lg flex items-center pl-3 transition-all" style={{width:`${Math.max((s.value/maxVal)*100,s.value>0?1:0)}%`,background:s.color}}>
                {s.value>0&&<span className="text-white text-[10px] font-bold">{fmtN(s.value)}</span>}
              </div>
            </div>
            {i<steps.length-1&&<p className={`text-[10px] mt-1 text-center ${dark?'text-gray-500':'text-gray-400'}`}>↓ {steps[i].value>0?((steps[i+1].value/steps[i].value)*100).toFixed(1):0}%</p>}
          </div>
        ))}
      </div>
      <div className={`mt-6 pt-4 border-t ${dark?'border-gray-700':'border-gray-100'} grid grid-cols-2 gap-4`}>
        <div className={`rounded-lg p-3 ${dark?'bg-gray-800':'bg-gray-50'}`}>
          <p className={`text-xs ${dark?'text-gray-400':'text-gray-500'}`}>Conv. globale</p>
          <p className={`text-xl font-bold ${dark?'text-white':'text-gray-900'}`}>{t.impressions>0?((t.purchases/t.impressions)*100).toFixed(3):0}%</p>
        </div>
        <div className={`rounded-lg p-3 ${dark?'bg-gray-800':'bg-gray-50'}`}>
          <p className={`text-xs ${dark?'text-gray-400':'text-gray-500'}`}>Conv. LPV → Achat</p>
          <p className={`text-xl font-bold ${dark?'text-white':'text-gray-900'}`}>{t.lpv>0?((t.purchases/t.lpv)*100).toFixed(2):0}%</p>
        </div>
      </div>
    </div>
  )
}

function AlertsTab({ data,dark }: { data:MetaData; dark:boolean }) {
  type A={type:'danger'|'warning'|'info';label:string;name:string;value:string}
  const alerts:A[]=[]
  data.campaigns.forEach((c:Campaign)=>{
    if(c.roas<1&&c.spend>5)          alerts.push({type:'danger',  label:'ROAS faible',       name:c.name,value:`${fmt(c.roas)}x`})
    if(c.frequency>3)                 alerts.push({type:'warning', label:'Fréquence élevée',  name:c.name,value:`${fmt(c.frequency,1)}x`})
    if(c.ctr_link<0.5&&c.impressions>1000) alerts.push({type:'warning',label:'CTR faible',   name:c.name,value:`${fmt(c.ctr_link)}%`})
  })
  data.ads.forEach((a:Ad)=>{
    if(a.roas<1&&a.spend>3)           alerts.push({type:'danger',  label:'Ad ROAS faible',    name:a.name,value:`${fmt(a.roas)}x`})
    if(a.hookRate<5&&a.impressions>500)alerts.push({type:'info',   label:'Hook Rate faible',  name:a.name,value:`${fmt(a.hookRate)}%`})
  })
  const CLR={danger:{bg:dark?'bg-red-900/30':'bg-red-50',border:'border-red-500/30',icon:'🔴',text:dark?'text-red-400':'text-red-700'},warning:{bg:dark?'bg-orange-900/30':'bg-orange-50',border:'border-orange-500/30',icon:'⚠️',text:dark?'text-orange-400':'text-orange-700'},info:{bg:dark?'bg-blue-900/30':'bg-blue-50',border:'border-blue-500/30',icon:'ℹ️',text:dark?'text-blue-400':'text-blue-700'}}
  if(!alerts.length) return <div className={`rounded-xl p-12 text-center border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}><div className="text-4xl mb-4">✅</div><h3 className={`text-xl font-bold ${dark?'text-white':'text-gray-900'}`}>Aucune alerte</h3><p className={`text-sm mt-2 ${dark?'text-gray-400':'text-gray-500'}`}>Toutes vos campagnes sont en bonne santé</p></div>
  return (
    <div className="space-y-3">
      {alerts.map((a,i)=>{ const c=CLR[a.type]; return (
        <div key={i} className={`flex items-center justify-between rounded-xl border p-4 ${c.bg} ${c.border}`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{c.icon}</span>
            <div><p className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>{a.label}</p><p className={`text-sm font-medium truncate max-w-[300px] ${dark?'text-gray-200':'text-gray-800'}`}>{a.name}</p></div>
          </div>
          <span className={`text-lg font-bold ${c.text}`}>{a.value}</span>
        </div>
      )})}
    </div>
  )
}

function HistoryTab({ data,dark }: { data:MetaData; dark:boolean }) {
  const daily=data.daily||[]
  const grid=dark?'#374151':'#f3f4f6'
  const tip={background:dark?'#1e293b':'#fff',border:`1px solid ${dark?'#374151':'#e5e7eb'}`,borderRadius:8,fontSize:12}
  const tick={fontSize:11,fill:dark?'#6b7280':'#9ca3af'}
  if(!daily.length) return <div className={`rounded-xl p-12 text-center border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}><div className="text-4xl mb-4">📅</div><h3 className={`text-xl font-bold ${dark?'text-white':'text-gray-900'}`}>Aucune donnée historique</h3></div>
  const card=(title:string,children:React.ReactNode)=>(
    <div className={`rounded-xl border p-4 ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
      <p className={`text-sm font-semibold mb-4 ${dark?'text-gray-300':'text-gray-700'}`}>{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={daily} margin={{top:5,right:10,left:0,bottom:5}}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid}/>
          <XAxis dataKey="date" tick={tick}/>
          <YAxis tick={tick}/>
          <Tooltip contentStyle={tip}/>
          {children}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
  return (
    <div className="space-y-6">
      {card('📊 Spend & ROAS',<>
        <Line type="monotone" dataKey="spend"     stroke="#3b82f6" strokeWidth={2} dot={false} name="Spend ($)"/>
        <Line type="monotone" dataKey="roas"      stroke="#10b981" strokeWidth={2} dot={false} name="ROAS"/>
      </>)}
      {card('🛒 Achats & CPR',<>
        <Line type="monotone" dataKey="purchases" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Achats"/>
        <Line type="monotone" dataKey="cpr"       stroke="#ef4444" strokeWidth={2} dot={false} name="CPR ($)"/>
      </>)}
    </div>
  )
}

function SettingsTab({ token,accountId,onSave,dark }: { token:string; accountId:string; onSave:(t:string,a:string)=>void; dark:boolean }) {
  const [t,setT]=useState(token)
  const [a,setA]=useState(accountId)
  const inp=`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${dark?'bg-gray-800 border-gray-700 text-white placeholder-gray-500':'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`
  return (
    <div className={`max-w-lg rounded-xl border p-6 ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
      <h2 className={`text-lg font-bold mb-6 ${dark?'text-white':'text-gray-900'}`}>⚙️ Paramètres API</h2>
      <div className="space-y-4">
        <div><label className={`block text-xs font-semibold mb-1.5 ${dark?'text-gray-400':'text-gray-600'}`}>Access Token Meta *</label><input type="password" value={t} onChange={e=>setT(e.target.value)} placeholder="EAAxxxxxxx..." className={inp}/></div>
        <div><label className={`block text-xs font-semibold mb-1.5 ${dark?'text-gray-400':'text-gray-600'}`}>Ad Account ID (optionnel)</label><input type="text" value={a} onChange={e=>setA(e.target.value)} placeholder="act_XXXXXXXXXX" className={inp}/><p className={`text-[10px] mt-1 ${dark?'text-gray-500':'text-gray-400'}`}>Laissez vide pour tous les comptes</p></div>
        <button onClick={()=>onSave(t,a)} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
          💾 Sauvegarder & Rafraîchir
        </button>
      </div>
    </div>
  )
}

// ─── Main App ──────────────────────────────────────────────
export default function App() {
  const [tab,       setTab]       = useState<Tab>('overview')
  const [dark,      setDark]      = useState(true)
  const [data,      setData]      = useState<MetaData|null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string|null>(null)
  const [token,     setToken]     = useState(()=>localStorage.getItem('meta_token')||'')
  const [accountId, setAccountId] = useState(()=>localStorage.getItem('meta_account_id')||'')
  const [dateRange, setDateRange] = useState<DRValue>({
    since: daysAgoStr(30),
    until: todayStr(),
    key:   'last_30d',
  })

  const fetchData = async (tk:string, acc:string, dr:DRValue) => {
    if(!tk){setError('Token manquant — allez dans ⚙️ Paramètres');return}
    setLoading(true);setError(null)
    try {
      const dateQ = dr.key==='custom'
        ? `since=${dr.since}&until=${dr.until}`
        : `date_preset=${dr.key}`
      const res = await fetch(`/api/meta?access_token=${encodeURIComponent(tk)}&ad_account_id=${encodeURIComponent(acc)}&${dateQ}`)
      const d   = await res.json()
      if(d.error) throw new Error(d.error)
      setData(d)
    } catch(e:any){
      setError(e.message||'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{fetchData(token,accountId,dateRange)},[]) // eslint-disable-line

  const handleSave = (t:string,a:string) => {
    localStorage.setItem('meta_token',t)
    localStorage.setItem('meta_account_id',a)
    setToken(t);setAccountId(a)
    fetchData(t,a,dateRange)
    setTab('overview')
  }

  const handleDateChange = (dr:DRValue) => {
    setDateRange(dr)
    fetchData(token,accountId,dr)
  }

  const TABS: {id:Tab;label:string;icon:string}[] = [
    {id:'overview',  label:'Vue Générale',icon:'🏠'},
    {id:'campaigns', label:'Campagnes',   icon:'📊'},
    {id:'publicites',label:'Publicités',  icon:'📋'},
    {id:'creative',  label:'Créatifs',    icon:'🎬'},
    {id:'funnel',    label:'Funnel',      icon:'🔽'},
    {id:'alerts',    label:'Alertes',     icon:'🔔'},
    {id:'history',   label:'Historique',  icon:'📅'},
    {id:'settings',  label:'Paramètres', icon:'⚙️'},
  ]

  const bg  = dark?'bg-[#0f172a]':'bg-gray-50'
  const nav = dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'

  return (
    <div className={`min-h-screen ${bg} font-sans`}>
      <nav className={`sticky top-0 z-50 border-b ${nav} px-4`}>
        <div className="flex items-center justify-between h-14 max-w-screen-2xl mx-auto gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl">📈</span>
            <span className={`text-sm font-bold hidden sm:block ${dark?'text-white':'text-gray-900'}`}>Ads Analyse</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tab===t.id?'bg-blue-600 text-white':
                  dark?'text-gray-400 hover:text-white hover:bg-gray-700':'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}>
                <span>{t.icon}</span>
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* ⭐ Date Range Picker style Meta */}
            <DateRangePicker value={dateRange} onChange={handleDateChange} dark={dark}/>
            <button onClick={()=>fetchData(token,accountId,dateRange)} disabled={loading}
              className={`px-2.5 py-1.5 rounded-lg text-xs ${dark?'bg-gray-700 hover:bg-gray-600 text-gray-200':'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              {loading?'⏳':'🔄'}
            </button>
            <button onClick={()=>setDark(d=>!d)}
              className={`px-2.5 py-1.5 rounded-lg text-xs ${dark?'bg-gray-700 hover:bg-gray-600 text-gray-200':'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              {dark?'☀️':'🌙'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        {tab==='settings'&&<SettingsTab token={token} accountId={accountId} onSave={handleSave} dark={dark}/>}
        {tab!=='settings'&&error&&(
          <div className={`rounded-xl border p-4 mb-6 ${dark?'bg-red-900/20 border-red-500/30':'bg-red-50 border-red-200'}`}>
            <p className={`text-sm font-semibold ${dark?'text-red-400':'text-red-700'}`}>❌ {error}</p>
            <button onClick={()=>setTab('settings')} className="mt-2 text-xs underline opacity-70">⚙️ Paramètres</button>
          </div>
        )}
        {tab!=='settings'&&loading&&(
          <div className="flex items-center justify-center py-24">
            <div className="text-center"><div className="text-4xl mb-4 animate-pulse">📡</div><p className={`text-sm ${dark?'text-gray-400':'text-gray-500'}`}>Chargement Meta...</p></div>
          </div>
        )}
        {tab!=='settings'&&!loading&&!data&&!error&&(
          <div className="flex items-center justify-center py-24">
            <div className="text-center"><div className="text-4xl mb-4">🔑</div><p className={`text-lg font-semibold mb-2 ${dark?'text-white':'text-gray-900'}`}>Token manquant</p><button onClick={()=>setTab('settings')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">⚙️ Paramètres</button></div>
          </div>
        )}
        {tab!=='settings'&&!loading&&data&&(
          <>
            {tab==='overview'   &&<OverviewTab   data={data} dark={dark}/>}
            {tab==='campaigns'  &&<CampaignsTab  data={data} dark={dark}/>}
            {tab==='publicites' &&<PublicitesTab data={data} dark={dark}/>}
            {tab==='creative'   &&<CreativeTab   data={data} dark={dark}/>}
            {tab==='funnel'     &&<FunnelTab     data={data} dark={dark}/>}
            {tab==='alerts'     &&<AlertsTab     data={data} dark={dark}/>}
            {tab==='history'    &&<HistoryTab    data={data} dark={dark}/>}
          </>
        )}
      </main>
    </div>
  )
}
