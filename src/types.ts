export type DatePreset = 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'this_month'
export type Tab        = 'overview' | 'campaigns' | 'creative' | 'funnel' | 'alerts' | 'history' | 'settings'
export type MetricKey  = 'cpr' | 'roas' | 'ctr_link' | 'frequency' | 'hookRate' | 'cpm'

export interface Campaign {
  id: string; name: string; status: string; daily_budget: number
  spend: number; impressions: number; reach: number; frequency: number; cpm: number
  cpc_link: number; ctr_link: number; ctr_all: number; clicks_link: number
  lpv: number; atc: number; costPerATC: number; costPerLPV: number
  purchases: number; cpr: number; roas: number; revenue: number
  thruplay: number; hookRate: number; videoViews: number
}

export interface Ad {
  id: string; name: string; status: string
  thumbnail: string | null        // URL miniature depuis Meta API
  spend: number; impressions: number; reach: number; frequency: number; cpm: number
  ctr_link: number; ctr_all: number; clicks_link: number; cpc_link: number
  purchases: number; atc: number; lpv: number; videoViews: number; revenue: number
  thruplay: number; hookRate: number; cpr: number; roas: number
  costPerATC: number; costPerLPV: number
}

export interface DailyPoint {
  date: string; spend: number; purchases: number
  impressions: number; cpr: number; roas: number
}

export interface Totals {
  spend: number; purchases: number; revenue: number; impressions: number
  reach: number; atc: number; lpv: number; clicks_link: number
  thruplay: number; budget_total: number; videoViews: number
  cpr: number; roas: number; cpm: number; ctr_link: number
  frequency: number; hookRate: number; costPerATC: number; costPerLPV: number
}

export interface MetaData {
  totals: Totals; campaigns: Campaign[]; ads: Ad[]; daily: DailyPoint[]
}
