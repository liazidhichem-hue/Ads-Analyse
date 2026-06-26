declare const process: any;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const date_preset   = req.query.date_preset   || 'last_7d'
  const AD_ACCOUNT_ID = req.query.ad_account_id || process.env.META_AD_ACCOUNT_ID || '884019833957409'
  const ACCESS_TOKEN  = req.query.access_token  || process.env.META_ACCESS_TOKEN

  if (!ACCESS_TOKEN) return res.status(401).json({ error: 'Token manquant' })

  const insightFields = [
    'spend','impressions','reach','frequency','cpm','ctr','cpc',
    'inline_link_clicks','inline_link_click_ctr',
    'outbound_clicks','actions','action_values',
    'video_thruplay_watched_actions'
  ].join(',')

  // --- CAMPAIGNS ---
  const campFields = `name,status,daily_budget,insights.date_preset(${date_preset}){${insightFields}}`
  const campUrl = `https://graph.facebook.com/v19.0/act_${AD_ACCOUNT_ID}/campaigns?fields=${encodeURIComponent(campFields)}&access_token=${ACCESS_TOKEN}&limit=50`

  // --- ADS ---
  const adFields = `name,status,creative{thumbnail_url,title},insights.date_preset(${date_preset}){${insightFields}}`
  const adUrl = `https://graph.facebook.com/v19.0/act_${AD_ACCOUNT_ID}/ads?fields=${encodeURIComponent(adFields)}&access_token=${ACCESS_TOKEN}&limit=50`

  try {
    const [campRes, adRes] = await Promise.all([fetch(campUrl), fetch(adUrl)])
    const [campJson, adJson] = await Promise.all([campRes.json(), adRes.json()])

    if (campJson.error) return res.status(400).json({ error: campJson.error.message })

    // Parse helper
    const parseInsight = (ins: any) => {
      const spend      = parseFloat(ins.spend || 0)
      const imps       = parseFloat(ins.impressions || 0)
      const reach      = parseFloat(ins.reach || 0)
      const freq       = parseFloat(ins.frequency || 0)
      const cpm        = parseFloat(ins.cpm || 0)
      const ctr_all    = parseFloat(ins.ctr || 0)
      const ctr_link   = parseFloat(ins.inline_link_click_ctr || ins.ctr || 0)
      const cpc_link   = parseFloat(ins.cpc || 0)
      const clicks_link= parseFloat(ins.inline_link_clicks?.[0]?.value || ins.outbound_clicks?.[0]?.value || 0)
      const lpv        = getAction(ins.actions || [], ['landing_page_view'])
      const atc        = getAction(ins.actions || [], ['add_to_cart'])
      const purchases  = getAction(ins.actions || [], ['purchase'])
      const revenue    = getActionVal(ins.action_values || [], ['purchase'])
      const v3sec      = getAction(ins.actions || [], ['video_view'])
      const thruplay   = parseFloat(ins.video_thruplay_watched_actions?.[0]?.value || 0)
      const roas       = spend > 0     ? revenue  / spend     : 0
      const cpr        = purchases > 0 ? spend    / purchases : 0
      const costPerATC = atc > 0       ? spend    / atc       : 0
      const hookRate   = imps > 0      ? (v3sec   / imps) * 100 : 0
      return { spend, impressions: imps, reach, frequency: freq, cpm,
               ctr_all, ctr_link, cpc_link, clicks_link, lpv, atc,
               purchases, revenue, roas, cpr, v3sec, thruplay, hookRate, costPerATC }
    }

    const campaigns = (campJson.data || []).map((c: any) => {
      const ins = c.insights?.data?.[0] || {}
      return {
        id: c.id, name: c.name, status: c.status,
        daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
        ...parseInsight(ins)
      }
    })

    const ads = (adJson.data || []).map((a: any) => {
      const ins = a.insights?.data?.[0] || {}
      return {
        id: a.id, name: a.name, status: a.status,
        thumbnail: a.creative?.thumbnail_url || '',
        title: a.creative?.title || a.name,
        ...parseInsight(ins)
      }
    })

    const sum = (arr: any[], k: string) => arr.reduce((acc: number, c: any) => acc + (c[k] || 0), 0)
    const T: any = {
      spend: sum(campaigns,'spend'), impressions: sum(campaigns,'impressions'),
      reach: sum(campaigns,'reach'), clicks_link: sum(campaigns,'clicks_link'),
      lpv: sum(campaigns,'lpv'), atc: sum(campaigns,'atc'),
      purchases: sum(campaigns,'purchases'), revenue: sum(campaigns,'revenue'),
      thruplay: sum(campaigns,'thruplay'), v3sec: sum(campaigns,'v3sec'),
      budget_total: campaigns.reduce((a: number, c: any) => a + (c.daily_budget || 0), 0)
    }
    T.roas       = T.spend > 0       ? T.revenue     / T.spend       : 0
    T.cpr        = T.purchases > 0   ? T.spend       / T.purchases   : 0
    T.cpm        = T.impressions > 0 ? (T.spend      / T.impressions) * 1000 : 0
    T.ctr_all    = T.impressions > 0 ? (T.clicks_link/ T.impressions) * 100  : 0
    T.ctr_link   = T.ctr_all
    T.cpc_link   = T.clicks_link > 0 ? T.spend       / T.clicks_link : 0
    T.frequency  = T.reach > 0       ? T.impressions / T.reach       : 0
    T.hookRate   = T.impressions > 0 ? (T.v3sec      / T.impressions) * 100 : 0
    T.costPerATC = T.atc > 0         ? T.spend       / T.atc         : 0
    T.costPerLPV = T.lpv > 0         ? T.spend       / T.lpv         : 0

    return res.json({ campaigns, totals: T, ads, daily: [] })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

function getAction(actions: any[], types: string[]): number {
  for (const t of types) {
    const f = actions.find((a: any) => a.action_type === t || a.action_type === `offsite_conversion.fb_pixel_${t}`)
    if (f) return parseFloat(f.value || 0)
  }
  return 0
}

function getActionVal(vals: any[], types: string[]): number {
  for (const t of types) {
    const f = vals.find((a: any) => a.action_type === t || a.action_type === `offsite_conversion.fb_pixel_${t}`)
    if (f) return parseFloat(f.value || 0)
  }
  return 0
}
