declare const process: any;

const GRAPH = 'https://graph.facebook.com/v19.0';

const FIELDS = [
  'spend', 'impressions', 'reach', 'frequency', 'cpm', 'cpc',
  'actions', 'action_values',
  'inline_link_clicks', 'inline_link_click_ctr', 'ctr',
  'video_thruplay_watched_actions',
].join(',');

function act(arr: any[], type: string): number {
  return parseFloat(arr?.find((x: any) => x.action_type === type)?.value || '0');
}
function val(arr: any[], type: string): number {
  return parseFloat(arr?.find((x: any) => x.action_type === type)?.value || '0');
}

function parseIns(ins: any) {
  if (!ins) ins = {};
  const spend       = parseFloat(ins.spend || '0');
  const impressions = parseInt(ins.impressions || '0');
  const reach       = parseInt(ins.reach || '0');
  const frequency   = parseFloat(ins.frequency || '0');
  const cpm         = parseFloat(ins.cpm || '0');
  const ctr_all     = parseFloat(ins.ctr || '0');
  const ctr_link    = parseFloat(ins.inline_link_click_ctr || '0');
  const clicks_link = parseInt(ins.inline_link_clicks || '0');
  const acts        = ins.actions        || [];
  const vals        = ins.action_values  || [];
  const purchases   = act(acts, 'purchase');
  const atc         = act(acts, 'add_to_cart');
  const lpv         = act(acts, 'landing_page_view');
  const videoViews  = act(acts, 'video_view');
  const revenue     = val(vals, 'purchase');
  const thruplay    = parseInt(ins.video_thruplay_watched_actions?.[0]?.value || '0');
  const hookRate    = impressions > 0 ? (videoViews / impressions) * 100 : 0;
  const cpr         = purchases > 0 ? spend / purchases : 0;
  const roas        = spend > 0 ? revenue / spend : 0;
  const cpc_link    = clicks_link > 0 ? spend / clicks_link : 0;
  const costPerATC  = atc > 0 ? spend / atc : 0;
  const costPerLPV  = lpv > 0 ? spend / lpv : 0;
  return {
    spend, impressions, reach, frequency, cpm, ctr_all, ctr_link,
    clicks_link, cpc_link, purchases, atc, lpv, videoViews, revenue,
    thruplay, hookRate, cpr, roas, costPerATC, costPerLPV,
  };
}

async function gfetch(path: string): Promise<any> {
  const r = await fetch(`${GRAPH}/${path}`);
  return r.json();
}

export default async function handler(req: any, res: any) {
  const token     = req.query.access_token  || process.env.META_ACCESS_TOKEN  || '';
  const rawId     = req.query.ad_account_id || process.env.META_AD_ACCOUNT_ID || '';
  const accountId = rawId.replace(/^act_/, '');
  const preset    = req.query.date_preset   || 'last_7d';

  if (!token)
    return res.status(400).json({ error: 'Token manquant — configurez-le dans ⚙️ Paramètres.' });
  if (!accountId)
    return res.status(400).json({ error: 'Ad Account ID manquant — configurez-le dans ⚙️ Paramètres.' });

  try {
    // ─── 1. Campaigns ────────────────────────────────────────────────────────
    const campListRaw = await gfetch(
      `act_${accountId}/campaigns?fields=id,name,status,daily_budget&access_token=${token}&limit=50`
    );
    if (campListRaw.error) throw new Error(campListRaw.error.message);

    const campaigns = await Promise.all(
      (campListRaw.data || []).map(async (c: any) => {
        const insRaw = await gfetch(
          `${c.id}/insights?fields=${FIELDS}&date_preset=${preset}&access_token=${token}`
        );
        const p = parseIns(insRaw.data?.[0]);
        return {
          id: c.id, name: c.name, status: c.status,
          daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : 0,
          ...p,
        };
      })
    );

    // ─── 2. Ads ──────────────────────────────────────────────────────────────
    const adListRaw = await gfetch(
      `act_${accountId}/ads?fields=id,name,status&access_token=${token}&limit=100`
    );
    if (adListRaw.error) throw new Error(adListRaw.error.message);

    const ads = await Promise.all(
      (adListRaw.data || []).map(async (a: any) => {
        const insRaw = await gfetch(
          `${a.id}/insights?fields=${FIELDS}&date_preset=${preset}&access_token=${token}`
        );
        const p = parseIns(insRaw.data?.[0]);
        return { id: a.id, name: a.name, status: a.status || 'ACTIVE', ...p };
      })
    );

    // ─── 3. Daily breakdown — THE FIX (time_increment=1 pour Historique) ─────
    const dailyRaw = await gfetch(
      `act_${accountId}/insights` +
      `?fields=spend,impressions,actions,action_values` +
      `&date_preset=${preset}` +
      `&time_increment=1` +
      `&access_token=${token}`
    );

    const daily = (dailyRaw.data || []).map((d: any) => {
      const spend       = parseFloat(d.spend || '0');
      const acts        = d.actions       || [];
      const vals        = d.action_values || [];
      const purchases   = act(acts, 'purchase');
      const revenue     = val(vals, 'purchase');
      const impressions = parseInt(d.impressions || '0');
      const cpr         = purchases > 0 ? spend / purchases : 0;
      const roas        = spend > 0 ? revenue / spend : 0;
      return {
        date:        (d.date_start || '').slice(5),   // format "MM-DD"
        spend:       +spend.toFixed(2),
        purchases,
        impressions,
        cpr:         +cpr.toFixed(2),
        roas:        +roas.toFixed(2),
      };
    });

    // ─── 4. Totals ───────────────────────────────────────────────────────────
    const zero = {
      spend: 0, purchases: 0, revenue: 0, impressions: 0,
      reach: 0, atc: 0, lpv: 0, clicks_link: 0,
      thruplay: 0, budget_total: 0, videoViews: 0,
    };
    const sum = campaigns.reduce((acc: any, c: any) => ({
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
      frequency:  campaigns.length > 0
                    ? campaigns.reduce((a: any, c: any) => a + c.frequency, 0) / campaigns.length
                    : 0,
      hookRate:   sum.impressions > 0 ? (sum.videoViews / sum.impressions) * 100 : 0,
      costPerATC: sum.atc > 0 ? sum.spend / sum.atc : 0,
      costPerLPV: sum.lpv > 0 ? sum.spend / sum.lpv : 0,
    };

    return res.status(200).json({ totals, campaigns, ads, daily });

  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Erreur serveur inattendue.' });
  }
}
