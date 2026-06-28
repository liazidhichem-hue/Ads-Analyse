import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { MetaData, DatePreset, Tab, MetricKey, Campaign, Ad, DailyPoint } from '../../types'

const fmt  = (n: number, d = 2) => Number(n || 0).toFixed(d)
const fmtN = (n: number) => Math.round(n || 0).toLocaleString('fr-FR')

function metricColor(k: MetricKey, v: number): 'green' | 'orange' | 'red' | 'blue' {
  switch (k) {
    case 'cpr':       return v < 1.5 ? 'green' : v < 3   ? 'orange' : 'red'
    case 'roas':      return v > 10  ? 'green' : v > 5   ? 'orange' : 'red'
    case 'ctr_link':  return v > 3   ? 'green' : v > 2   ? 'orange' : 'red'
    case 'frequency': return v < 2   ? 'green' : v < 3   ? 'orange' : 'red'
    case 'hookRate':  return v > 25  ? 'green' : v > 20  ? 'orange' : 'red'
    case 'cpm':       return v < 1   ? 'green' : v < 2   ? 'orange' : 'red'
    default:          return 'blue'
  }
}

const CLS = {
  green:  { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500', pill: 'bg-emerald-500/15 text-emerald-400' },
  orange: { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500',  pill: 'bg-orange-500/15 text-orange-400'  },
  red:    { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500',     pill: 'bg-red-500/15 text-red-400'        },
  blue:   { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500',    pill: 'bg-blue-500/15 text-blue-400'      },
}

interface KPICardProps {
  label: string; value: string | React.ReactNode; icon: string; dark: boolean
  trend?: number; sparklineData?: any[]; sparklineKey?: string; sparklineColor?: string
}
function KPICard({ label, value, icon, dark, trend, sparklineData, sparklineKey, sparklineColor }: KPICardProps) {
  const isPos = trend !== undefined && trend >= 0
  return (
    <div className={`rounded-xl p-5 ${dark ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-gray-200'} border shadow-sm flex flex-col justify-between h-36 relative overflow-hidden`}>
      <div className="flex justify-between items-center mb-2 z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-50">{icon}</span>
          <p className={`text-xs font-semibold ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
        </div>
        {trend !== undefined && (
          <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isPos ? 'text-emerald-600 bg-emerald-500/10' : 'text-red-600 bg-red-500/10'}`}>
            {isPos ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className={`text-3xl font-bold tracking-tight z-10 ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</div>
      {sparklineData && sparklineKey && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line type="monotone" dataKey={sparklineKey} stroke={sparklineColor || '#3b82f6'} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">Active</span>
  if (status === 'PAUSED') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-600">Paused</span>
  return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/10 text-gray-600">Off</span>
}

function MetricCell({ metric, value, display }: { metric: MetricKey; value: number; display: string }) {
  return <td className={`px-4 py-3.5 text-sm font-bold ${CLS[metricColor(metric, value)].text}`}>{display}</td>
}

function AdPerformanceChart({ a, dark }: { a: Ad; dark: boolean }) {
  const hr        = a.hookRate || 0
  const hookColor = hr > 25 ? '#10b981' : hr > 15 ? '#f59e0b' : '#ef4444'
  const roasColor = (a.roas||0) > 10 ? '#10b981' : (a.roas||0) > 5 ? '#f59e0b' : '#ef4444'
  const cprColor  = (a.cpr||0) < 1.5 ? '#10b981' : (a.cpr||0) < 3 ? '#f59e0b' : '#ef4444'
  const N = 18
  const roasCurve = Array.from({length:N},(_,i)=>{ const t=(i+1)/N; return {i,v:+((a.roas||0)*1.4*t/(t+0.3)).toFixed(2)} })
  const cprCurve  = Array.from({length:N},(_,i)=>{ const t=(i+1)/N; return {i,v:+((a.cpr||0)*(0.5+Math.exp(-t*2.5)*1.5)).toFixed(2)} })
  const thruCurve = Array.from({length:N},(_,i)=>{ const t=(i+1)/N; return {i,v:Math.round((a.thruplay||0)*t)} })
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

function OverviewTab({ data, dark }: { data: MetaData; dark: boolean }) {
  const t=data.totals; const daily=data.daily||[]
  const kpis: KPICardProps[] = [
    {label:'Spend',    value:`$${fmt(t.spend)}`,       icon:'💸',dark,trend:12.5,sparklineData:daily,sparklineKey:'spend',    sparklineColor:'#3b82f6'},
    {label:'Purchases',value:fmtN(t.purchases),        icon:'🛒',dark,trend:8.2, sparklineData:daily,sparklineKey:'purchases',sparklineColor:'#8b5cf6'},
    {label:'CPR',      value:`$${fmt(t.cpr)}`,         icon:'🎯',dark,trend:-4.3,sparklineData:daily,sparklineKey:'cpr',      sparklineColor:'#ef4444'},
    {label:'ROAS',     value:`${fmt(t.roas)}x`,        icon:'📈',dark,trend:15.4,sparklineData:daily,sparklineKey:'roas',     sparklineColor:'#10b981'},
    {label:'Budget/j', value:`$${fmt(t.budget_total)}`,icon:'💰',dark},
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

function CampaignsTab({ data, dark }: { data: MetaData; dark: boolean }) {
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
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(c.spend/Math.max(c.lpv,1))}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(c.atc)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(c.costPerATC)}</td>
              <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{c.atc-c.purchases}</td>
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

function PublicitesTab({ data, dark }: { data: MetaData; dark: boolean }) {
  const sortedAds = [...(data.ads||[])].sort((a,b)=>b.roas-a.roas)
  const headers = [
    'Publicité','Campagne','Statut',
    'Dépensé','Impressions','Couverture','Fréquence','CPM',
    'CPC lien','CTR lien%','CTR tous%',
    'Vues page','Coût/LPV',
    'ATC','Coût/ATC','Abandon','Taux Conv%',
    'Achats','CPR','ROAS','Valeur ($)',
    'ThruPlay','Hook Rate%'
  ]
  if(sortedAds.length===0) return (
    <div className={`rounded-xl p-12 text-center border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
      <div className="text-4xl mb-4">📰</div>
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
          {sortedAds.map((a:Ad)=>{
            const abandon    = a.atc - a.purchases
            const tauxConv   = fmt((a.purchases/Math.max(a.lpv,1))*100)
            const coutLPV    = fmt(a.spend/Math.max(a.lpv,1))
            return (
              <tr key={a.id} className={`transition-colors ${dark?'hover:bg-gray-700/40':'hover:bg-gray-50'}`}>
                {/* Publicité */}
                <td className={`px-4 py-3.5 font-semibold ${dark?'text-white':'text-gray-900'}`}>
                  <div className="flex items-center gap-2">
                    {a.thumbnail&&<img src={a.thumbnail} alt="" className="w-8 h-8 rounded object-cover shrink-0" onError={e=>{e.currentTarget.style.display='none'}}/>}
                    <span className="block max-w-[180px] truncate">{a.name}</span>
                  </div>
                </td>
                {/* Campagne */}
                <td className={`px-4 py-3.5 text-xs ${dark?'text-gray-400':'text-gray-500'}`}><span className="block max-w-[120px] truncate">{a.campaign_name}</span></td>
                {/* Statut */}
                <td className="px-4 py-3.5"><StatusBadge status={a.status}/></td>
                {/* Dépensé */}
                <td className={`px-4 py-3.5 text-sm font-semibold ${dark?'text-white':'text-gray-900'}`}>${fmt(a.spend)}</td>
                {/* Impressions */}
                <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(a.impressions)}</td>
                {/* Couverture */}
                <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(a.reach)}</td>
                {/* Fréquence */}
                <MetricCell metric="frequency" value={a.frequency} display={fmt(a.frequency,1)}/>
                {/* CPM */}
                <MetricCell metric="cpm" value={a.cpm} display={`$${fmt(a.cpm)}`}/>
                {/* CPC lien */}
                <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(a.cpc_link)}</td>
                {/* CTR lien% */}
                <MetricCell metric="ctr_link" value={a.ctr_link} display={`${fmt(a.ctr_link)}%`}/>
                {/* CTR tous% */}
                <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmt(a.ctr_all)}%</td>
                {/* Vues page */}
                <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(a.lpv)}</td>
                {/* Coût/LPV */}
                <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${coutLPV}</td>
                {/* ATC */}
                <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(a.atc)}</td>
                {/* Coût/ATC */}
                <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(a.costPerATC)}</td>
                {/* Abandon */}
                <td className={`px-4 py-3.5 text-sm font-bold ${abandon>0?(dark?'text-red-400':'text-red-500'):(dark?'text-gray-300':'text-gray-600')}`}>{abandon}</td>
                {/* Taux Conv% */}
                <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{tauxConv}%</td>
                {/* Achats */}
                <td className={`px-4 py-3.5 text-sm font-bold ${dark?'text-white':'text-gray-900'}`}>{a.purchases}</td>
                {/* CPR */}
                <MetricCell metric="cpr" value={a.cpr} display={`$${fmt(a.cpr)}`}/>
                {/* ROAS */}
                <MetricCell metric="roas" value={a.roas} display={`${fmt(a.roas)}x`}/>
                {/* Valeur */}
                <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>${fmt(a.revenue)}</td>
                {/* ThruPlay */}
                <td className={`px-4 py-3.5 text-sm ${dark?'text-gray-300':'text-gray-600'}`}>{fmtN(a.thruplay)}</td>
                {/* Hook Rate% */}
                <MetricCell metric="hookRate" value={a.hookRate} display={`${fmt(a.hookRate)}%`}/>
              </tr>
            )
          })}
        </tbody>
      </table></div>
    </div>
  )
}

function CreativeTab({ data, dark }: { data: MetaData; dark: boolean }) {
  const sortedAds=[...(data.ads||[])].sort((a,b)=>b.roas-a.roas)
  if(sortedAds.length===0) return (
    <div className={`rounded-xl p-12 text-center border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
      <div className="text-4xl mb-4">🎨</div>
      <h3 className={`text-xl font-bold ${dark?'text-white':'text-gray-900'}`}>Aucun créatif actif</h3>
    </div>
  )
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sortedAds.map((a:Ad)=>(
        <div key={a.id} className={`rounded-xl overflow-hidden border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm flex flex-col`}>
          <div className="relative w-full h-44 overflow-hidden">
            {a.thumbnail?<img src={a.thumbnail} alt={a.name} className="w-full h-full object-cover"
              onError={e=>{e.currentTarget.style.display='none';(e.currentTarget.nextSibling as HTMLElement)?.classList?.remove('hidden')}}/>:null}
            <div className={`${a.thumbnail?'hidden':''} absolute inset-0 flex items-center justify-center ${dark?'bg-[#0f172a]':'bg-gray-100'}`}><span className="text-5xl opacity-30">🎬</span></div>
            <div className="absolute top-2 left-2 flex gap-1.5">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-black/70 text-white">▶ Video</span>
              {a.status==='ACTIVE'&&<span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/90 text-white">Live</span>}
            </div>
            {a.roas>10&&<div className="absolute top-2 right-2"><span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-yellow-400/90 text-gray-900">⭐ Top</span></div>}
          </div>
          <div className={`border-t border-b ${dark?'border-gray-800':'border-gray-100'}`}><AdPerformanceChart a={a} dark={dark}/></div>
          <div className="px-4 pb-4 flex-1 flex flex-col">
            <h4 className={`font-bold text-sm my-3 line-clamp-2 ${dark?'text-white':'text-gray-900'}`}>{a.name}</h4>
            <p className={`text-[10px] mb-3 truncate ${dark?'text-gray-500':'text-gray-400'}`}>{a.campaign_name}</p>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-auto text-sm">
              {[['Spend',`$${fmt(a.spend)}`],['Impressions',fmtN(a.impressions)],['ATC',fmtN(a.atc)],['Coût/ATC',`$${fmt(a.spend/Math.max(a.atc,1))}`],['Achats',fmtN(a.purchases)],['CTR',`${fmt(a.ctr_link)}%`]].map(([l,v])=>(
                <div key={l} className="flex flex-col">
                  <span className={`text-[10px] uppercase ${dark?'text-gray-500':'text-gray-400'}`}>{l}</span>
                  <span className={`font-semibold ${dark?'text-gray-200':'text-gray-700'}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function FunnelTab({ data, dark }: { data: MetaData; dark: boolean }) {
  const t=data.totals
  const steps=[
    {label:'Clics lien',   value:t.clicks_link,bg:'bg-[#fbcfe8]',wTop:100,wBottom:85},
    {label:'Vues page',    value:t.lpv,        bg:'bg-[#f9a8d4]',wTop:82, wBottom:67},
    {label:'Ajouts Panier',value:t.atc,        bg:'bg-[#f472b6]',wTop:64, wBottom:49},
    {label:'Achats',       value:t.purchases,  bg:'bg-[#ec4899]',wTop:46, wBottom:31},
  ]
  const metrics=[
    {label:'Taux ATC',            value:`${fmt((t.atc/Math.max(t.lpv,1))*100)}%`},
    {label:'Abandon (ATC-Achats)',value:t.atc-t.purchases},
    {label:'Taux Conversion',      value:`${fmt((t.purchases/Math.max(t.lpv,1))*100)}%`},
    {label:'Coût/ATC',            value:`$${fmt(t.costPerATC)}`},
    {label:'Coût/LPV',            value:`$${fmt(t.costPerLPV)}`},
  ]
  return (
    <div className={`rounded-xl p-8 border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
      <div className="flex justify-center mb-16 mt-8">
        <div className="flex flex-col w-full max-w-4xl mx-auto gap-2 py-4">
          {steps.map((s,i)=>{
            const prev=i>0?steps[i-1].value:null; const conv=prev?((s.value/Math.max(prev,1))*100):null
            return (<div key={i} className="w-full flex h-16 sm:h-20 relative">
              <div className="w-[35%] flex items-center justify-end pr-4"><span className={`text-xs sm:text-base font-medium text-right ${dark?'text-gray-200':'text-gray-900'}`}>{s.label}</span></div>
              <div className="w-[30%] relative flex items-center justify-center">
                <div className={`absolute inset-0 ${s.bg}`} style={{clipPath:`polygon(${(100-s.wTop)/2}% 0,${100-(100-s.wTop)/2}% 0,${100-(100-s.wBottom)/2}% 100%,${(100-s.wBottom)/2}% 100%)`}}/>
                <span className="relative z-10 text-gray-900 font-bold text-lg drop-shadow-sm">{fmtN(s.value)}</span>
              </div>
              <div className="w-[35%] flex items-start pl-6 relative">
                {i>0&&<div className="absolute -top-9 left-4"><div className={`text-[10px] font-bold px-2 py-1 rounded-full border ${dark?'bg-gray-800 border-gray-700 text-gray-400':'bg-gray-50 border-gray-200 text-gray-500'}`}>{fmt(conv)}%</div></div>}
              </div>
            </div>)
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-8 border-t border-gray-200 dark:border-gray-700">
        {metrics.map((m,i)=>(<div key={i} className="text-center">
          <div className={`text-xs uppercase tracking-wider mb-2 ${dark?'text-gray-400':'text-gray-500'}`}>{m.label}</div>
          <div className={`text-xl sm:text-2xl font-bold ${dark?'text-white':'text-gray-900'}`}>{m.value}</div>
        </div>))}
      </div>
    </div>
  )
}

function AlertsTab({ data, dark }: { data: MetaData; dark: boolean }) {
  const t=data.totals; const alerts:any[]=[]
  if(t.cpr>3)       alerts.push({title:'CPR Critique',      desc:`CPR à $${fmt(t.cpr)}`,        type:'red',   icon:'🚨'})
  else if(t.cpr<1.5)alerts.push({title:'CPR Excellent',      desc:`CPR à $${fmt(t.cpr)} !`,      type:'green', icon:'🟢'})
  if(t.frequency>3) alerts.push({title:'Saturation Audience',desc:`Fréquence ${fmt(t.frequency)}`,type:'orange',icon:'⚠️'})
  if(t.hookRate<20) alerts.push({title:'Hook Rate Faible',   desc:`${fmt(t.hookRate)}%`,          type:'orange',icon:'📊'})
  if(t.ctr_link<2)  alerts.push({title:'CTR Faible',         desc:`${fmt(t.ctr_link)}%`,          type:'orange',icon:'📌'})
  if(t.roas>10)     alerts.push({title:'ROAS Exceptionnel',  desc:`${fmt(t.roas)}x !`,            type:'green', icon:'🏆'})
  if(alerts.length===0) return (
    <div className={`rounded-xl p-12 text-center border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
      <div className="text-4xl mb-4">✅</div><h3 className={`text-xl font-bold ${dark?'text-white':'text-gray-900'}`}>Tout est au vert !</h3>
    </div>
  )
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {alerts.map((a,i)=>{ const c=CLS[a.type as keyof typeof CLS]; return (
        <div key={i} className={`rounded-xl p-6 border ${c.border} ${c.bg} shadow-sm flex items-start gap-4`}>
          <div className="text-3xl">{a.icon}</div>
          <div><h4 className={`text-lg font-bold ${c.text}`}>{a.title}</h4><p className={`mt-1 text-sm ${dark?'text-gray-300':'text-gray-700'}`}>{a.desc}</p></div>
        </div>
      )})}
    </div>
  )
}

function HistoryTab({ data, dark }: { data: MetaData; dark: boolean }) {
  const daily=data.daily||[]; const gridColor=dark?'#374151':'#e5e7eb'; const textColor=dark?'#9ca3af':'#6b7280'
  const charts=[
    {title:'ROAS',    dataKey:'roas',     color:'#10b981',prefix:'', suffix:'x'},
    {title:'CPR',     dataKey:'cpr',      color:'#ef4444',prefix:'$',suffix:'' },
    {title:'Dépenses', dataKey:'spend',    color:'#3b82f6',prefix:'$',suffix:'' },
    {title:'Achats',  dataKey:'purchases',color:'#8b5cf6',prefix:'', suffix:'' },
  ]
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {charts.map((c,i)=>(
        <div key={i} className={`rounded-xl p-6 border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm`}>
          <h3 className={`text-sm font-bold uppercase tracking-widest mb-6 ${dark?'text-gray-400':'text-gray-500'}`}>{c.title} par jour</h3>
          <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{top:5,right:10,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
              <XAxis dataKey="date" stroke={textColor} fontSize={12} tickLine={false} axisLine={false}/>
              <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={v=>`${c.prefix}${v}${c.suffix}`}/>
              <Tooltip contentStyle={{backgroundColor:dark?'#1f2937':'#fff',borderColor:dark?'#374151':'#e5e7eb',borderRadius:'8px'}}
                formatter={(v:number)=>[`${c.prefix}${fmt(v)}${c.suffix}`,c.title]}/>
              <Line type="monotone" dataKey={c.dataKey} stroke={c.color} strokeWidth={3} dot={{r:4,fill:c.color}} activeDot={{r:6}}/>
            </LineChart>
          </ResponsiveContainer></div>
        </div>
      ))}
    </div>
  )
}

function SettingsTab({ dark, metaToken, setMetaToken, metaAdAccountId, setMetaAdAccountId }: {
  dark: boolean
  metaToken: string;       setMetaToken:       (v: string) => void
  metaAdAccountId: string; setMetaAdAccountId: (v: string) => void
}) {
  const [tempToken, setTempToken] = useState(metaToken)
  const [tempId,    setTempId]    = useState(metaAdAccountId)
  const [saved,     setSaved]     = useState(false)
  const save = () => {
    localStorage.setItem('metaToken',       tempToken)
    localStorage.setItem('metaAdAccountId', tempId)
    setMetaToken(tempToken); setMetaAdAccountId(tempId)
    setSaved(true); setTimeout(()=>setSaved(false),3000)
  }
  return (
    <div className={`rounded-xl p-8 border ${dark?'bg-[#1e293b] border-gray-800':'bg-white border-gray-200'} shadow-sm max-w-2xl mx-auto`}>
      <h2 className={`text-2xl font-bold mb-6 ${dark?'text-white':'text-gray-900'}`}>⚙️ Paramètres API</h2>
      <div className="space-y-6">
        <div>
          <label className={`block text-sm font-semibold mb-2 ${dark?'text-gray-300':'text-gray-700'}`}>Meta Access Token</label>
          <input type="password" value={tempToken} onChange={e=>setTempToken(e.target.value)} placeholder="EAAB..."
            className={`w-full border rounded-lg px-4 py-2 text-sm outline-none ${dark?'bg-gray-800 border-gray-700 text-gray-200':'bg-white border-gray-300 text-gray-900'}`}/>
        </div>
        <div>
          <label className={`block text-sm font-semibold mb-2 ${dark?'text-gray-300':'text-gray-700'}`}>Ad Account ID</label>
          <input type="text" value={tempId} onChange={e=>setTempId(e.target.value)} placeholder="Ex: 884019833957409"
            className={`w-full border rounded-lg px-4 py-2 text-sm outline-none ${dark?'bg-gray-800 border-gray-700 text-gray-200':'bg-white border-gray-300 text-gray-900'}`}/>
          <p className={`text-xs mt-1 ${dark?'text-gray-500':'text-gray-400'}`}>Laissez vide pour afficher tous les comptes du token.</p>
        </div>
        <button onClick={save} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">Sauvegarder</button>
        {saved&&<div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600 text-sm text-center font-semibold">✅ Sauvegardé !</div>}
      </div>
    </div>
  )
}

const TABS = [
  {id:'overview'   as Tab, label:'📊 Vue Générale'},
  {id:'campaigns'  as Tab, label:'🎯 Campagnes'   },
  {id:'publicites' as Tab, label:'📰 Publicités'  },
  {id:'creative'   as Tab, label:'🎨 Créatifs'    },
  {id:'funnel'     as Tab, label:'📉 Funnel'      },
  {id:'alerts'     as Tab, label:'🚨 Alertes'     },
  {id:'history'    as Tab, label:'📈 Historique'  },
]
const DATES = [
  {value:'today'      as DatePreset, label:"Aujourd'hui"      },
  {value:'yesterday'  as DatePreset, label:'Hier'             },
  {value:'last_7d'    as DatePreset, label:'7 derniers jours' },
  {value:'last_30d'   as DatePreset, label:'30 derniers jours'},
  {value:'this_month' as DatePreset, label:'Ce mois'          },
]

export default function Index() {
  const [dark,    setDark]    = useState(()=>localStorage.getItem('theme')!=='light')
  const [tab,     setTab]     = useState<Tab>('overview')
  const [preset,  setPreset]  = useState<DatePreset>('last_7d')
  const [loading, setLoading] = useState(true)
  const [data,    setData]    = useState<MetaData|null>(null)
  const [error,   setError]   = useState<string|null>(null)
  const [metaToken,       setMetaToken]       = useState(()=>localStorage.getItem('metaToken')       ||'')
  const [metaAdAccountId, setMetaAdAccountId] = useState(()=>localStorage.getItem('metaAdAccountId')||'')

  useEffect(()=>{
    document.documentElement.classList.toggle('dark',dark)
    localStorage.setItem('theme',dark?'dark':'light')
  },[dark])

  const fetchData = async () => {
    if(tab==='settings') return
    setLoading(true); setError(null)
    try {
      const url = new URL('/api/meta', window.location.origin)
      url.searchParams.set('date_preset', preset)
      if(metaToken)       url.searchParams.set('access_token',  metaToken)
      if(metaAdAccountId) url.searchParams.set('ad_account_id', metaAdAccountId)
      const r = await fetch(url.toString())
      const text = await r.text()
      let j: any
      try { j=JSON.parse(text) } catch { throw new Error('Réponse API invalide.') }
      if(j.error) throw new Error(j.error)
      setData(j)
    } catch(e:any) {
      setError(e.message||'Erreur inattendue'); setData(null)
    } finally { setLoading(false) }
  }

  useEffect(()=>{ fetchData() },[preset])

  const d   = dark
  const hdr = `${d?'bg-gray-900/95 border-gray-800':'bg-white/95 border-gray-200'} backdrop-blur-md`
  const inp = `${d?'bg-gray-800 border-gray-700 text-gray-200':'bg-white border-gray-200 text-gray-700'} border rounded-lg px-3 py-2 text-sm outline-none`
  const btn = `${d?'bg-gray-800 text-gray-300 hover:bg-gray-700':'bg-gray-100 text-gray-600 hover:bg-gray-200'} p-2 rounded-lg transition-colors text-sm`

  return (
    <div className={`min-h-screen font-sans ${d?'bg-[#0f172a] text-gray-100':'bg-[#f8fafc] text-gray-900'}`}>
      <header className={`border-b ${hdr} sticky top-0 z-50`}>
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-blue-500">⚡</span>
              <span className="font-extrabold tracking-tight">Ads</span>
              <span className={`font-light text-sm ${d?'text-gray-500':'text-gray-400'}`}>Analyse</span>
            </div>
            <button onClick={()=>setTab('settings')} className={`${btn} ${tab==='settings'?(d?'bg-gray-700':'bg-gray-200'):''}`}>⚙️ Paramètres</button>
            <nav className={`hidden lg:flex p-1 rounded-xl ${d?'bg-[#1e293b]':'bg-gray-100/80'} shadow-inner`}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    tab===t.id?(d?'bg-[#0f172a] text-white shadow border border-gray-800':'bg-white text-gray-900 shadow-sm border border-gray-200/50')
                    :`border border-transparent ${d?'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50':'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`
                  }`}>{t.label}</button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <select value={preset} onChange={e=>setPreset(e.target.value as DatePreset)} className={inp}>
              {DATES.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={fetchData} className={btn}>🔄</button>
            <button onClick={()=>setDark(!d)} className={btn}>{d?'☀️':'🌙'}</button>
          </div>
        </div>
        <div className={`lg:hidden flex overflow-x-auto px-6 py-3 gap-2 border-t ${d?'border-gray-800 bg-[#0f172a]':'border-gray-200 bg-white'} no-scrollbar`}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab===t.id?(d?'bg-[#1e293b] text-white border border-gray-700':'bg-gray-100 text-gray-900 border border-gray-200')
                :`border border-transparent ${d?'text-gray-400':'text-gray-500'}`
              }`}>{t.label}</button>
          ))}
        </div>
      </header>
      <main className="max-w-screen-2xl mx-auto px-6 py-8">
        {tab==='settings'?(
          <SettingsTab dark={d} metaToken={metaToken} setMetaToken={setMetaToken}
            metaAdAccountId={metaAdAccountId} setMetaAdAccountId={setMetaAdAccountId}/>
        ):(
          <>
            {loading&&(
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"/>
                <p className="text-gray-400 text-sm">Chargement...</p>
              </div>
            )}
            {!loading&&error&&(
              <div className={`rounded-2xl p-10 text-center ${d?'bg-gray-800':'bg-white'} shadow-sm max-w-lg mx-auto mt-12`}>
                <div className="text-5xl mb-4">❌</div>
                <h3 className="text-xl font-bold text-red-400 mb-2">Erreur</h3>
                <p className={`text-sm ${d?'text-gray-400':'text-gray-500'}`}>{error}</p>
              </div>
            )}
            {!loading&&!error&&data&&(
              <div className="animate-in fade-in duration-500">
                {tab==='overview'   &&<OverviewTab   data={data} dark={d}/>}
                {tab==='campaigns'  &&<CampaignsTab  data={data} dark={d}/>}
                {tab==='publicites' &&<PublicitesTab data={data} dark={d}/>}
                {tab==='creative'   &&<CreativeTab   data={data} dark={d}/>}
                {tab==='funnel'     &&<FunnelTab     data={data} dark={d}/>}
                {tab==='alerts'     &&<AlertsTab     data={data} dark={d}/>}
                {tab==='history'    &&<HistoryTab    data={data} dark={d}/>}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
