


export interface Store {
  id: string
  name: string
  accountId: string
  disabled?: boolean
}

export interface Campaign {
  id: string; name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  daily_budget: number | null
  spend: number; impressions: number; reach: number
  frequency: number; cpm: number
  ctr_all: number; ctr_link: number
  cpc_link: number; clicks_link: number
  lpv: number; atc: number; purchases: number
  revenue: number; roas: number; cpr: number
  v3sec: number; thruplay: number
  hookRate: number; costPerATC: number
}

export interface Ad {
  id: string; name: string; campaignName: string
  hookRate: number; thruplay: number; v3sec: number
  costPerThruplay: number; ctr: number; cpr: number
  roas: number; atc: number; spend: number
  impressions: number; purchases: number; revenue: number
}

export interface DailyPoint {
  date: string; roas: number; cpr: number
  spend: number; purchases: number
}

export interface Totals {
  spend: number; impressions: number; reach: number
  frequency: number; cpm: number
  ctr_all: number; ctr_link: number; cpc_link: number
  clicks_link: number; lpv: number; atc: number
  purchases: number; revenue: number; roas: number; cpr: number
  v3sec: number; thruplay: number; hookRate: number
  costPerATC: number; costPerLPV: number
  budget_total: number
}

export interface MetaData {
  campaigns: Campaign[]
  ads: Ad[]
  totals: Totals
  daily: DailyPoint[]
}

export type DatePreset = 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'this_month'
export type Tab = 'overview' | 'campaigns' | 'creative' | 'funnel' | 'alerts' | 'history' | 'settings'
export type MetricKey = 'cpr' | 'roas' | 'ctr_link' | 'frequency' | 'hookRate' | 'cpm'
