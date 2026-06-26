declare const process: any;

const GRAPH = 'https://graph.facebook.com/v19.0';

const INS_FIELDS = [
  'spend','impressions','reach','frequency','cpm',
  'actions','action_values',
  'inline_link_clicks','inline_link_click_ctr','ctr',
  'video_thruplay_watched_actions',
].join(',');

function act(arr: any[], type: string): number {
  return parseFloat(arr?.find((x: any) => x.action_type === type)?.value || '0');
}
function val(arr: any[], type: string): number {
  return parseFloat(arr?.find((x: any) => x.action_type === type)?.value || '0');
}

function parseIns(d: any) {
  if (!d) d = {};
  const spend       = parseFloat(d.spend || '0');
  const impressions = parseInt(d.impressions  || '0');
  const reach       = parseInt(d.reach        || '0');
  const frequency   = parseFloat(d.frequency  || '0');
  const cpm         = parseFloat(d.cpm        || '0');
  const ctr_all     = parseFloat(d.ctr        || '0');
  const ctr_link    = parseFloat(d.inline_link_click_ctr || '0');
  const clicks_link = parseInt(d.inline_link_clicks      || '0');
  const acts        = d.actions       || [];
  const vals        = d.action_values || [];
  const purchases   = act(acts, 'purchase');
  const atc         = act(acts, 'add_to_cart');
  const lpv         = act(acts, 'landing_page_view');
  const videoViews  = act(acts, 'video_view');
  const revenue     = val(vals, 'purchase');
  const thruplay    = parseInt(d.video_thruplay_watched_actions?.[0]?.value || '0');
  const hookRate    = impressions > 0 ? (videoViews  / impressions) * 100 : 0;
  const cpr         = purchases   > 0 ? spend / purchases   : 0;
  const roas        = spend       > 0 ? revenue / spend     : 0;
  const cpc_link    = clicks_link > 0 ? spend / clicks_link : 0;
  const costPerATC  = atc > 0 ? spend / atc : 0;
  const costPerLPV  = lpv > 0 ? spend / lpv : 0;
  return {
    spend, impressions, reach, frequency, cpm, ctr_all, ctr_link,
    clicks_link, cpc_link, purchases, atc, lpv, videoViews, revenue,
    thruplay, hookRate, cpr, roas, costPerATC, costPerLPV,
  };
}

async function gfetch(url: string): Promise<any> {
  const r = await fetch(url);
  const txt = await r.text();
  try { return JSON.parse(txt); }
  catch { throw new Error(`Meta API error: ${txt.slice(0, 300)}`); }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token     = req.query.access_token  || process.env.META_ACCESS_TOKEN  || '';
  const rawId     = req.query.ad_account_id || process.env.META_AD_ACCOUNT_ID || '';
  const accountId = rawId.replace(/^act_/, '');
  const preset    = req.query.date_preset   || 'last_7d';

  if (!token)     return res.status(400).json({ error: 'Token manquant — configurez-le dans Param\u00e8tres.' });
  if (!accountId) return res.status(400).json({ error: 'Ad Account ID manquant.' });

  const base = `${GRAPH}/act_${accountId}`;
  const tk   = `access_token=${token}`;

  try {
    // 5 appels en PARALLELE
    const [campIns, campList, adIns, adList, dailyRaw] = await Promise.all([
      gfetch(`${base}/insights?level=campaign&fields=campaign_id,campaign_name,${INS_FIELDS}&date_preset=${preset}&${tk}&limit=50`),
      gfetch(`${base}/campaigns?fields=id,status,daily_budget&${tk}&limit=50`),
      gfetch(`${base}/insights?level=ad&fields=ad_id,ad_name,${INS_FIELDS}&date_preset=${preset}&${tk}&limit=100`),
      // ← thumbnail_url recupere la miniature de chaque pub
      gfetch(`${base}/ads?fields=id,status,adcreatives{thumbnail_url,object_type}&${tk}&limit=100`),
      gfetch(`${base}/insights?fields=spend,impressions,actions,action_values&date_preset=${preset}&time_increment=1&${tk}`),
    ]);

    if (campList.error) throw new Error(campList.error.message);
    if (campIns.error)  throw new Error(campIns.error.message);
    if (adList.error)   throw new Error(adList.error.message);
    if (adIns.error)    throw new Error(adIns.error.message);

    // Maps lookup
    const cMeta: Record<string, any> = {};
    for (const c of (campList.data || []))
      cMeta[c.id] = { status: c.status, daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : 0 };

    const aMeta: Record<string, any> = {};
    for (const a of (adList.data || [])) {
      // Recupere la miniature du premier creatif
      const thumbnail = a.adcreatives?.data?.[0]?.thumbnail_url || null;
      aMeta[a.id] = { status: a.status, thumbnail };
    }

    // Campaigns
    const campaigns = (campIns.data || []).map((row: any) => {
      const p = parseIns(row);
      const m = cMeta[row.campaign_id] || {};
      return { id: row.campaign_id, name: row.campaign_name || row.campaign_id, status: m.status || 'UNKNOWN', daily_budget: m.daily_budget || 0, ...p };
    });

    // Ads — avec thumbnail
    const ads = (adIns.data || []).map((row: any) => {
      const p = parseIns(row);
      const m = aMeta[row.ad_id] || {};
      return {
        id:        row.ad_id,
        name:      row.ad_name || row.ad_id,
        status:    m.status    || 'ACTIVE',
        thumbnail: m.thumbnail || null,   // URL image/video
        ...p,
      };
    });

    // Daily (courbes Historique)
    const daily = (dailyRaw.data || []).map((d: any) => {
      const spend       = parseFloat(d.spend || '0');
      const acts        = d.actions       || [];
      const vals        = d.action_values || [];
      const purchases   = act(acts, 'purchase');
      const revenue     = val(vals, 'purchase');
      const impressions = parseInt(d.impressions || '0');
      const cpr         = purchases > 0 ? spend / purchases : 0;
      const roas        = spend     > 0 ? revenue / spend   : 0;
      return { date: (d.date_start || '').slice(5), spend: +spend.toFixed(2), purchases, impressions, cpr: +cpr.toFixed(2), roas: +roas.toFixed(2) };
    });

    // Totals
    const zero = { spend:0,purchases:0,revenue:0,impressions:0,reach:0,atc:0,lpv:0,clicks_link:0,thruplay:0,budget_total:0,videoViews:0 };
    const sum  = campaigns.reduce((acc: any, c: any) => ({
      spend:        acc.spend        + c.spend,
      purchases:    acc.purchases    + c.purchases,
      revenue:      acc.revenue      + c.revenue,
      impressions:  acc.impressions  + c.impressions,
      reach:        acc.reach        + c.reach,
      atc:          acc.atc          + c.atc,
      lpv:          acc.lpv          + c.lpv,
      clicks_link:  acc.clicks_link  + c.clicks_link,
      thruplay:     acc.thruplay     + c.thruplay,
      budget_total: acc.budget_total + (c.daily_budget || 0),
      videoViews:   acc.videoViews   + c.videoViews,
    }), zero);

    const totals = {
      ...sum,
      cpr:        sum.purchases   > 0 ? sum.spend / sum.purchases   : 0,
      roas:       sum.spend       > 0 ? sum.revenue / sum.spend     : 0,
      cpm:        sum.impressions > 0 ? (sum.spend / sum.impressions) * 1000 : 0,
      ctr_link:   sum.impressions > 0 ? (sum.clicks_link / sum.impressions) * 100 : 0,
      frequency:  campaigns.length > 0 ? campaigns.reduce((a: any,c: any) => a + c.frequency, 0) / campaigns.length : 0,
      hookRate:   sum.impressions > 0 ? (sum.videoViews / sum.impressions) * 100 : 0,
      costPerATC: sum.atc > 0 ? sum.spend / sum.atc : 0,
      costPerLPV: sum.lpv > 0 ? sum.spend / sum.lpv : 0,
    };

    return res.status(200).json({ totals, campaigns, ads, daily });

  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
}
