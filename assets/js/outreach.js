/* =========================================================================
   Bulk enquiry sender
   ------------------------------------------------------------------------
   Deliberately NOT an automated sender. Automated bulk DMs breach Instagram's
   terms and get accounts action-blocked — a bad risk on the account you're
   using to talk to your own wedding vendors.

   What this does instead: writes the message once, personalises it per vendor,
   routes each to their best channel, and walks you through the queue. WhatsApp
   and email links open genuinely pre-filled. Instagram opens the DM with the
   text on your clipboard, so it's one paste. You press send.
   ========================================================================= */

const DEFAULT_TEMPLATE =
`Hi {{vendor}},

We're getting married on 26–27 January 2027 at Ikshana Resort & Spa in Khandala, and we came across your work on Instagram — we love what you do.

We're looking for a full-service planner for two days of functions, roughly {{guests}} guests. We'd love to know:

• Are you available on those dates?
• What does your planning package typically cover?
• What fee range should we budget for a wedding of this size?
• Could you share a couple of recent weddings similar to ours?

Thanks so much,
{{couple}}`;

const Outreach = (() => {

  /* Which channel reaches this vendor, best first. */
  function channel(v) {
    const saved = Store.vendor(v.handle) || {};
    const pub = (v.contact || []);
    const digits = s => String(s || "").replace(/[^\d]/g, "");
    const wa = n => { const d = digits(n); return d.length >= 10 ? (d.length === 10 ? "91" + d : d) : null; };

    const myPhone = wa(saved.phone);
    if (myPhone) return { kind: "whatsapp", to: myPhone, label: "WhatsApp", prefill: true };

    const pubPhone = pub.find(c => /phone/i.test(c.t));
    if (pubPhone && wa(pubPhone.v)) return { kind: "whatsapp", to: wa(pubPhone.v), label: "WhatsApp", prefill: true };

    const email = saved.email || (pub.find(c => /email/i.test(c.t)) || {}).v;
    if (email) return { kind: "email", to: email, label: "Email", prefill: true };

    /* Published wa.me/message/XXX short links can't carry text — open + paste. */
    const waLink = pub.find(c => /whatsapp/i.test(c.t));
    if (waLink) return { kind: "walink", to: waLink.h, label: "WhatsApp", prefill: false };

    if (v.handle && !String(v.handle).startsWith("custom:") && !String(v.handle).startsWith("unknown-"))
      return { kind: "instagram", to: v.handle, label: "Instagram DM", prefill: false };

    return { kind: "none", to: null, label: "No contact route", prefill: false };
  }

  function fill(tpl, v) {
    const s = Store.get("settings") || {};
    const saved = Store.vendor(v.handle) || {};
    return tpl
      .replace(/\{\{vendor\}\}/g, saved.vname || v.name || "there")
      .replace(/\{\{couple\}\}/g, s.couple || "Vivek & Vidhi")
      .replace(/\{\{dates\}\}/g,  "26–27 January 2027")
      .replace(/\{\{venue\}\}/g,  s.venue || "Ikshana Resort & Spa, Khandala")
      .replace(/\{\{guests\}\}/g, s.guests || "250");
  }

  function link(ch, msg) {
    const t = encodeURIComponent(msg);
    switch (ch.kind) {
      case "whatsapp":  return `https://wa.me/${ch.to}?text=${t}`;
      case "email":     return `mailto:${ch.to}?subject=${encodeURIComponent("Wedding enquiry — 26–27 January 2027")}&body=${t}`;
      case "walink":    return ch.to;
      case "instagram": return `https://ig.me/m/${ch.to}`;
      default:          return null;
    }
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { return false; }
  }

  return { channel, fill, link, copy };
})();

/* ------------------------------------------------------------------- UI */
function openOutreach(vendors) {
  const s = Store.get("settings") || {};
  let tpl = Store.get("enquiryTemplate") || DEFAULT_TEMPLATE;

  /* Default selection: everyone you haven't already contacted. */
  const CONTACTED = ["Contacted", "Quote received", "Meeting booked", "Booked", "Passed"];
  const rows = vendors.map(v => ({
    v, ch: Outreach.channel(v),
    status: (Store.vendor(v.handle) || {}).status || "Not reviewed"
  })).filter(r => r.ch.kind !== "none");

  const bg = document.createElement("div");
  bg.className = "modal-bg";
  bg.innerHTML = `<div class="modal" style="max-width:820px">
    <h2>Send enquiries</h2>
    <p class="small muted" style="margin:0 0 18px">
      Write it once. Each vendor gets a personalised copy, opened in whichever
      channel reaches them. You press send — nothing goes out on its own.</p>

    <div class="field">
      <label>Guest count <span class="muted" style="text-transform:none;font-weight:400">— planners ask this first</span></label>
      <input id="oGuests" value="${esc(s.guests || "250")}" style="max-width:160px">
    </div>

    <div class="field">
      <label>Your message</label>
      <textarea id="oTpl" style="min-height:230px;font-size:13.5px">${esc(tpl)}</textarea>
      <p class="small muted" style="margin:6px 0 0">
        Merge fields: <code>{{vendor}}</code> <code>{{couple}}</code>
        <code>{{dates}}</code> <code>{{venue}}</code> <code>{{guests}}</code></p>
    </div>

    <div class="field">
      <label>Who to contact <span class="muted" id="oCount" style="text-transform:none;font-weight:400"></span></label>
      <div class="btn-row" style="margin-bottom:8px">
        <button type="button" class="btn sm" data-all>Select all</button>
        <button type="button" class="btn sm" data-none>Clear</button>
        <button type="button" class="btn sm" data-fresh>Only not-yet-contacted</button>
      </div>
      <div class="olist" id="oList"></div>
    </div>

    <div class="modal-foot">
      <button type="button" class="btn" data-cancel>Cancel</button>
      <button type="button" class="btn primary" data-start>Start →</button>
    </div>
  </div>`;

  const close = () => bg.remove();
  bg.onclick = e => { if (e.target === bg) close(); };
  bg.querySelector("[data-cancel]").onclick = close;

  const list = bg.querySelector("#oList");
  const drawList = () => {
    list.innerHTML = rows.map((r, i) => `
      <label class="orow">
        <input type="checkbox" data-i="${i}"${r.sel ? " checked" : ""}>
        <span class="oname">${esc((Store.vendor(r.v.handle) || {}).vname || r.v.name)}</span>
        <span class="pill ${r.ch.prefill ? "good" : ""}">${esc(r.ch.label)}</span>
        ${CONTACTED.includes(r.status) ? `<span class="pill warn">${esc(r.status)}</span>` : ""}
      </label>`).join("");
    list.querySelectorAll("input").forEach(cb =>
      cb.onchange = () => { rows[+cb.dataset.i].sel = cb.checked; count(); });
    count();
  };
  const count = () => {
    const n = rows.filter(r => r.sel).length;
    const pre = rows.filter(r => r.sel && r.ch.prefill).length;
    bg.querySelector("#oCount").textContent =
      `— ${n} selected, ${pre} pre-filled, ${n - pre} need a paste`;
  };

  rows.forEach(r => r.sel = !CONTACTED.includes(r.status));
  drawList();

  bg.querySelector("[data-all]").onclick  = () => { rows.forEach(r => r.sel = true);  drawList(); };
  bg.querySelector("[data-none]").onclick = () => { rows.forEach(r => r.sel = false); drawList(); };
  bg.querySelector("[data-fresh]").onclick = () => {
    rows.forEach(r => r.sel = !CONTACTED.includes(r.status)); drawList();
  };

  bg.querySelector("[data-start]").onclick = () => {
    tpl = bg.querySelector("#oTpl").value;
    Store.set("enquiryTemplate", tpl);
    Store.set("settings", { ...Store.get("settings"), guests: bg.querySelector("#oGuests").value });
    const queue = rows.filter(r => r.sel);
    if (!queue.length) { alert("Nobody selected."); return; }
    close();
    runQueue(queue, tpl);
  };

  document.body.appendChild(bg);
}

/* ------------------------------------------------------- one at a time */
function runQueue(queue, tpl, onDone) {
  let i = 0;
  const bg = document.createElement("div");
  bg.className = "modal-bg";
  document.body.appendChild(bg);

  const finish = () => {
    bg.remove();
    toast(`Done — ${i} of ${queue.length} marked as contacted`);
    onDone?.();
    location.reload();
  };

  function step() {
    if (i >= queue.length) return finish();
    const { v, ch } = queue[i];
    const name = (Store.vendor(v.handle) || {}).vname || v.name;
    const msg = Outreach.fill(tpl, v);
    const url = Outreach.link(ch, msg);

    bg.innerHTML = `<div class="modal" style="max-width:640px">
      <div class="small muted">${i + 1} of ${queue.length}</div>
      <h2 style="margin-bottom:2px">${esc(name)}</h2>
      <div class="small muted" style="margin-bottom:14px">
        via ${esc(ch.label)}${ch.prefill
          ? " — opens already filled in"
          : " — message copied to your clipboard, just paste"}</div>

      <div class="omsg">${esc(msg)}</div>

      <div class="btn-row" style="margin-top:16px">
        <button class="btn primary" data-open>Open ${esc(ch.label)} ↗</button>
        <button class="btn" data-copy>Copy message</button>
      </div>

      <div class="modal-foot" style="margin-top:22px">
        <button class="btn" data-skip>Skip</button>
        <button class="btn" data-stop>Stop here</button>
        <button class="btn primary" data-sent>Sent — next →</button>
      </div>
    </div>`;

    bg.querySelector("[data-open]").onclick = async () => {
      if (!ch.prefill) await Outreach.copy(msg);
      window.open(url, "_blank", "noopener");
    };
    bg.querySelector("[data-copy]").onclick = async e => {
      e.target.textContent = (await Outreach.copy(msg)) ? "Copied ✓" : "Press ⌘C";
      setTimeout(() => e.target.textContent = "Copy message", 1600);
    };
    bg.querySelector("[data-skip]").onclick = () => { i++; step(); };
    bg.querySelector("[data-stop]").onclick = finish;
    bg.querySelector("[data-sent]").onclick = () => {
      const prev = Store.vendor(v.handle) || {};
      const stamp = `Enquiry sent ${new Date().toLocaleDateString("en-IN",
        { day: "numeric", month: "short", year: "numeric" })} via ${ch.label}`;
      Store.setVendor(v.handle, {
        status: "Contacted",
        notes: prev.notes ? prev.notes + "\n" + stamp : stamp
      });
      i++; step();
    };
  }
  step();
}
