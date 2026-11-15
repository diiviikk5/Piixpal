/* Sponsor form alert: POST { product, link, desc, email } and it emails the owner through Resend.
   Needs RESEND_API_KEY and SPONSOR_TO (where alerts go). SPONSOR_FROM is optional. */
const body = req => new Promise((ok, no) => {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 8 * 1024) { no(new Error('too big')); req.destroy(); } });
  req.on('end', () => ok(s));
  req.on('error', no);
});
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cut = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('{"error":"POST the form"}'); }
  const key = process.env.RESEND_API_KEY, to = process.env.SPONSOR_TO;
  if (!key || !to) { res.statusCode = 501; return res.end('{"error":"alerts not set up"}'); }
  try {
    let d = req.body;
    if (!d || typeof d !== 'object') d = JSON.parse((typeof d === 'string' ? d : await body(req)) || '{}');
    const v = { product: cut(d.product, 40), link: cut(d.link, 300), desc: cut(d.desc, 200), email: cut(d.email, 200) };
    if (!v.product || !v.link || !v.desc || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) throw new Error('missing fields');
    const href = /^https?:\/\//i.test(v.link) ? v.link : 'https://' + v.link;
    const row = (k, x) => `<tr><td style="padding:6px 14px 6px 0;color:#7a7186">${k}</td><td style="padding:6px 0"><b>${x}</b></td></tr>`;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.SPONSOR_FROM || 'Piixpal <piixpal@dvkk.dev>',
        to: [to],
        reply_to: v.email,
        subject: `New sponsor: ${v.product}`,
        text: `Someone filled the sponsor form and was sent to checkout.\n\nProduct: ${v.product}\nLink: ${href}\nDescription: ${v.desc}\nEmail: ${v.email}\n\nCheck Dodo Payments to see if they paid. Reply to this email to reach them.`,
        html: `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#17121f">
<p>Someone filled the sponsor form and was sent to checkout.</p>
<table style="border-collapse:collapse">${row('Product', esc(v.product))}${row('Link', `<a href="${esc(href)}">${esc(href)}</a>`)}${row('Description', esc(v.desc))}${row('Email', esc(v.email))}</table>
<p style="color:#7a7186">Check Dodo Payments to see if they paid. Reply to this email to reach them.</p></div>`
      })
    });
    if (!r.ok) { res.statusCode = 502; return res.end(JSON.stringify({ error: 'mail failed', status: r.status, detail: (await r.text()).slice(0, 300) })); }
    res.end('{"ok":true}');
  } catch (e) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
};
