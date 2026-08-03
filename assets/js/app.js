/* =========================================================================
   Wedding Portal — shared app layer
   Storage is abstracted behind `Store` so it can be swapped for Supabase
   later without touching any page code. See README for the migration path.
   ========================================================================= */

const WEDDING = {
  date: "2027-01-26T00:00:00",
  couple: "Vivek & Vidhi",
  hashtag: "#OurForever"
};

/* ---------------------------------------------------------------- Store */
const Store = (() => {
  const KEY = "weddingPortal.v1";
  let cache = null;

  const blank = () => ({
    settings: { couple: WEDDING.couple, date: WEDDING.date, city: "", venue: "" },
    vendors: {},          // handle -> {status, rating, quote, notes, contacted}
    checklist: [], venues: [], attire: [], invites: [],
    guests: [], catering: [], budget: [], vendorsBoard: [],
    _seeded: false
  });

  function load() {
    if (cache) return cache;
    try { cache = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch { cache = blank(); }
    return cache;
  }
  /* Write to localStorage only. Used when applying remote state, so that
     pulling from the cloud doesn't immediately push the same data back up. */
  function persist() {
    localStorage.setItem(KEY, JSON.stringify(load()));
    document.dispatchEvent(new CustomEvent("store:changed"));
  }

  /* Normal save: persist locally, then queue a debounced push to the cloud
     if sync is configured and signed in. Local always succeeds first, so a
     network failure can never cost you an edit. */
  function save() {
    persist();
    if (typeof Sync !== "undefined") Sync.schedulePush();
  }

  return {
    all: load,
    persist,
    get(k) { return load()[k]; },
    set(k, v) { load()[k] = v; save(); },

    list(k) { const d = load(); if (!Array.isArray(d[k])) d[k] = []; return d[k]; },
    add(k, item) {
      item.id = item.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
      this.list(k).push(item); save(); return item;
    },
    update(k, id, patch) {
      const it = this.list(k).find(x => x.id === id);
      if (it) { Object.assign(it, patch); save(); } return it;
    },
    remove(k, id) { const l = this.list(k); const i = l.findIndex(x => x.id === id);
      if (i > -1) { l.splice(i, 1); save(); } },

    vendor(handle) { const d = load(); return d.vendors[handle] || {}; },
    setVendor(handle, patch) {
      const d = load(); d.vendors[handle] = Object.assign({}, d.vendors[handle], patch); save();
    },

    export() { return JSON.stringify(load(), null, 2); },
    import(json) {
      const parsed = JSON.parse(json);
      cache = Object.assign(blank(), parsed); save();
    },
    reset() { cache = blank(); save(); }
  };
})();

/* --------------------------------------------------------------- Helpers */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function daysToWedding() {
  return Math.ceil((new Date(WEDDING.date) - new Date()) / 864e5);
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-IN",
    { day: "numeric", month: "short", year: "numeric" });
}
function inr(n) {
  const v = Number(n) || 0;
  if (!v) return "—";
  return "₹" + v.toLocaleString("en-IN");
}
function toast(msg) {
  $$(".toast").forEach(t => t.remove());
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ------------------------------------------------------------------- Nav */
/* Seventeen flat links wrapped onto three rows and looked awful.
   Grouped into five top-level items with dropdowns instead. */
const NAV = [
  { href: "index.html", label: "Dashboard" },
  { href: "checklist.html", label: "Checklist" },
  { href: "venues.html", label: "Venue" },
  { label: "Vendors", items: [
    ["planners.html", "💐", "Planners"],
    ["photographers.html", "📷", "Photo & Film"],
    ["mua.html", "💄", "MUA & Hair"],
    ["choreographers.html", "💃", "Choreographers"],
    ["music.html", "🎤", "Music, DJ & Anchors"],
    ["decor.html", "🎪", "Decor & Ideas"],
    ["mandi.html", "🌿", "Mandi & Mehendi"]
  ]},
  { label: "Style", items: [
    ["clothes.html", "👗", "Clothes"],
    ["jewellery.html", "💍", "Jewellery"],
    ["attire.html", "🧵", "Attire tracker"]
  ]},
  { label: "Guests & Day", items: [
    ["guests.html", "🎟", "Guests & RSVP"],
    ["invites.html", "✉️", "Invites"],
    ["catering.html", "🍽", "Food & Drink"],
    ["budget.html", "💰", "Budget"]
  ]}
];

function renderNav(active) {
  const link = (h, l, cls = "") =>
    `<a href="${h}" class="${cls}${h === active ? " active" : ""}">${l}</a>`;

  const groups = NAV.map(g => {
    if (!g.items) return link(g.href, g.label);
    const open = g.items.some(([h]) => h === active);
    return `<div class="nav-group${open ? " has-active" : ""}">
      <button type="button" class="nav-btn${open ? " active" : ""}">${g.label}<span class="caret">▾</span></button>
      <div class="nav-menu">
        ${g.items.map(([h, ic, l]) =>
          `<a href="${h}"${h === active ? ' class="active"' : ""}><span>${ic}</span>${l}</a>`).join("")}
      </div>
    </div>`;
  }).join("");

  const el = document.createElement("div");
  el.className = "nav";
  el.innerHTML = `<div class="nav-inner">
    <a class="brand" href="index.html">Vivek <span>&amp;</span> Vidhi</a>
    <button class="nav-toggle" type="button" aria-label="Menu">☰</button>
    <nav class="nav-links">${groups}</nav>
    <div class="nav-cd">26–27 Jan 2027</div>
  </div>`;
  document.body.prepend(el);

  /* dropdowns: click to open, click outside or Escape to close */
  const closeAll = except => $$(".nav-group", el).forEach(g => { if (g !== except) g.classList.remove("open"); });
  $$(".nav-group", el).forEach(g => {
    g.querySelector(".nav-btn").onclick = e => {
      e.stopPropagation(); closeAll(g); g.classList.toggle("open");
    };
  });
  document.addEventListener("click", () => closeAll());
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeAll(); });
  el.querySelector(".nav-toggle").onclick = e => {
    e.stopPropagation(); el.classList.toggle("open");
  };
}

/* ------------------------------------------------------------- Modal form */
function openForm({ title, fields, values = {}, onSave }) {
  const bg = document.createElement("div");
  bg.className = "modal-bg";
  const body = fields.map(f => {
    const v = values[f.k] ?? f.default ?? "";
    let input;
    if (f.type === "select") {
      input = `<select name="${f.k}">${f.options.map(o =>
        `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    } else if (f.type === "textarea") {
      input = `<textarea name="${f.k}">${esc(v)}</textarea>`;
    } else {
      input = `<input type="${f.type || "text"}" name="${f.k}" value="${esc(v)}"` +
              `${f.ph ? ` placeholder="${esc(f.ph)}"` : ""}${f.required ? " required" : ""}>`;
    }
    return `<div class="field${f.wide ? " wide" : ""}"><label>${esc(f.label)}</label>${input}</div>`;
  }).join("");

  bg.innerHTML = `<form class="modal">
    <h2>${esc(title)}</h2>
    <div class="fields-2">${body}</div>
    <div class="modal-foot">
      <button type="button" class="btn" data-cancel>Cancel</button>
      <button type="submit" class="btn primary">Save</button>
    </div>
  </form>`;

  bg.addEventListener("click", e => { if (e.target === bg) bg.remove(); });
  bg.querySelector("[data-cancel]").onclick = () => bg.remove();
  bg.querySelector("form").onsubmit = e => {
    e.preventDefault();
    const out = {};
    new FormData(e.target).forEach((v, k) => out[k] = v);
    onSave(out); bg.remove();
  };
  document.body.appendChild(bg);
  bg.querySelector("input,select,textarea")?.focus();
}

/* ---------------------------------------------------------- Detail modal */
/* Two panes: the Instagram post on the left, everything you know and
   everything you can edit on the right. Used by Planners and every
   category page, so it only exists once. */
function openDetail(cfg) {
  const {
    title, handle, followers, tags = [], bio, note, via,
    contact = [], credits = [], creditHit = () => false,
    embedUrl, postUrls = [], storeKey, editable = [], statuses = [], onChange
  } = cfg;

  const mine = Store.vendor(storeKey);
  const bg = document.createElement("div");
  bg.className = "detail-bg";

  bg.innerHTML = `<div class="detail" role="dialog" aria-modal="true">
    <button class="detail-x" aria-label="Close">×</button>

    <div class="detail-media">
      ${embedUrl
        ? `<iframe src="${esc(embedUrl)}" loading="lazy" scrolling="no" title="Instagram post"></iframe>`
        : `<div class="detail-noembed">
             <div>No Instagram post for this one${postUrls.length ? "" : " — added by you"}.</div>
           </div>`}
      ${postUrls.length > 1 ? `<div class="detail-posts">Also saved:
        ${postUrls.slice(1).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">post ${i + 2} ↗</a>`).join(" · ")}
      </div>` : ""}
    </div>

    <div class="detail-info">
      <h2>${esc(title)}</h2>
      <div class="detail-sub">
        ${handle ? `<a href="https://instagram.com/${esc(handle)}" target="_blank" rel="noopener">@${esc(handle)}</a>` : ""}
        ${followers && followers !== "—" ? ` · ${esc(followers)} followers` : ""}
      </div>
      ${tags.length ? `<div class="tags">${tags.map(t =>
        `<span class="pill ${esc(t.cls || "")}">${esc(t.label)}</span>`).join("")}</div>` : ""}
      ${bio ? `<p class="detail-bio">${esc(bio)}</p>` : ""}
      ${note ? `<div class="note" style="margin:0 0 14px">${esc(note)}</div>` : ""}

      ${contact.length ? `<section>
        <h4>Published contact</h4>
        ${contact.map(c => `<div class="kvrow"><span>${esc(c.t)}</span>
          <a href="${esc(c.h)}" target="_blank" rel="noopener">${esc(c.v)}</a></div>`).join("")}
      </section>` : ""}

      ${credits.length ? `<section>
        <h4>Tagged in this post</h4>
        ${credits.map(c => `<div class="kvrow${creditHit(c.r) ? " hit" : ""}"><span>${esc(c.r)}</span>
          <a href="https://instagram.com/${esc(c.h)}" target="_blank" rel="noopener">@${esc(c.h)}</a></div>`).join("")}
      </section>` : ""}

      <section>
        <h4>Your record</h4>
        ${statuses.length ? `<div class="field"><label>Status</label>
          <select data-d="status">${statuses.map(s =>
            `<option${s === (mine.status || statuses[0]) ? " selected" : ""}>${esc(s)}</option>`).join("")}</select>
        </div>` : ""}
        <div class="fields-2">
          ${editable.map(f => `<div class="field"><label>${esc(f.label)}</label>
            <input type="${f.type || "text"}" data-d="${esc(f.k)}"
              placeholder="${esc(f.ph || "")}" value="${esc(mine[f.k] || "")}"></div>`).join("")}
        </div>
        <div class="field"><label>Notes</label>
          <textarea data-d="notes" placeholder="What you liked, what to ask, what they quoted…">${esc(mine.notes || "")}</textarea>
        </div>
        <div class="small muted">Saves as you type.</div>
      </section>

      ${via ? `<p class="small muted" style="margin-top:16px"><b>Found via:</b> ${esc(via)}</p>` : ""}
    </div>
  </div>`;

  const close = () => { bg.remove(); document.removeEventListener("keydown", onKey); onChange?.(); };
  const onKey = e => { if (e.key === "Escape") close(); };
  bg.onclick = e => { if (e.target === bg) close(); };
  bg.querySelector(".detail-x").onclick = close;
  document.addEventListener("keydown", onKey);

  $$("[data-d]", bg).forEach(el => {
    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
      Store.setVendor(storeKey, { [el.dataset.d]: el.value });
    });
  });

  document.body.appendChild(bg);
}

/* ----------------------------------------------------------------- Board */
/* Generic table-backed module used by most pages. */
function Board(cfg) {
  const mount = $(cfg.mount);
  const statusOpts = (cfg.fields.find(f => f.k === cfg.statusField) || {}).options || [];
  let filter = "", statusFilter = "";

  function pillClass(v) {
    const s = String(v).toLowerCase();
    if (/(done|booked|confirmed|paid|attending|sent|delivered|yes)/.test(s)) return "good";
    if (/(shortlist|in progress|ordered|contacted|maybe|pending)/.test(s)) return "warn";
    if (/(rejected|declined|cancel|no)/.test(s)) return "dead";
    if (/(urgent|overdue)/.test(s)) return "hot";
    return "";
  }

  function rows() {
    let items = Store.list(cfg.key);
    if (statusFilter) items = items.filter(i => i[cfg.statusField] === statusFilter);
    if (filter) {
      const q = filter.toLowerCase();
      items = items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(q)));
    }
    return items;
  }

  function render() {
    const items = rows();
    const cols = cfg.fields.filter(f => !f.hideInTable);

    const summary = cfg.summary ? cfg.summary(Store.list(cfg.key)) : "";

    mount.innerHTML = `
      ${summary}
      <div class="toolbar">
        <input type="search" placeholder="Search…" value="${esc(filter)}" data-q>
        ${statusOpts.length ? `<select data-status>
          <option value="">All statuses</option>
          ${statusOpts.map(o => `<option${o === statusFilter ? " selected" : ""}>${esc(o)}</option>`).join("")}
        </select>` : ""}
        <span class="spacer"></span>
        <button class="btn" data-csv>Export CSV</button>
        <button class="btn primary" data-add>+ ${esc(cfg.addLabel || "Add")}</button>
      </div>
      ${items.length ? `<div class="tbl-wrap"><table>
        <thead><tr>
          ${cols.map(f => `<th class="${f.type === "number" ? "num" : ""}">${esc(f.label)}</th>`).join("")}
          <th></th>
        </tr></thead>
        <tbody>${items.map(it => `<tr data-id="${it.id}" class="clickable-row" tabindex="0">
          ${cols.map(f => {
            let v = it[f.k];
            if (f.k === cfg.statusField) v = `<span class="pill ${pillClass(v)}">${esc(v || "—")}</span>`;
            else if (f.type === "number" && f.money) v = inr(v);
            else if (f.type === "date") v = fmtDate(v);
            else if (f.type === "url" && v) v = `<a href="${esc(v)}" target="_blank" rel="noopener">link ↗</a>`;
            else v = esc(v || "—");
            return `<td class="${f.type === "number" ? "num" : ""}">${v}</td>`;
          }).join("")}
          <td><div class="row-actions">
            <span class="card-open">Open ↗</span>
            <button class="btn sm danger" data-del title="Delete">×</button>
          </div></td>
        </tr>`).join("")}</tbody>
      </table></div>`
      : `<div class="tbl-wrap"><div class="empty">Nothing here yet. Hit <b>+ ${esc(cfg.addLabel || "Add")}</b> to start.</div></div>`}
    `;

    mount.querySelector("[data-q]").oninput = e => { filter = e.target.value; render();
      mount.querySelector("[data-q]").focus(); };
    const sf = mount.querySelector("[data-status]");
    if (sf) sf.onchange = e => { statusFilter = e.target.value; render(); };

    mount.querySelector("[data-add]").onclick = () =>
      openForm({ title: "Add " + (cfg.addLabel || "item"), fields: cfg.fields,
        onSave: v => { Store.add(cfg.key, v); render(); toast("Added"); } });

    mount.querySelector("[data-csv]").onclick = () => {
      const head = cols.map(f => f.label).join(",");
      const body = rows().map(i => cols.map(f =>
        `"${String(i[f.k] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([head + "\n" + body], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = cfg.key + ".csv"; a.click();
    };

    /* The whole row opens a detail popup — the Edit button was too small a target. */
    const openRow = id => {
      const it = Store.list(cfg.key).find(x => x.id === id);
      if (!it) return;
      openForm({
        title: it[cfg.fields[0].k] || "Edit",
        fields: cfg.fields, values: it,
        onSave: v => { Store.update(cfg.key, id, v); render(); toast("Saved"); }
      });
    };

    $$("tr[data-id]", mount).forEach(tr => {
      const id = tr.dataset.id;
      tr.addEventListener("click", e => {
        if (e.target.closest("a,button,input,select,textarea")) return;
        openRow(id);
      });
      tr.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(id); }
      });
      tr.querySelector("[data-del]").onclick = e => {
        e.stopPropagation();
        if (confirm("Delete this row?")) { Store.remove(cfg.key, id); render(); }
      };
    });
  }

  render();
  return { render };
}

/* --------------------------------------------------- Backup / restore bar */
function backupBar(mount) {
  const el = $(mount);
  el.innerHTML = `<div class="card">
    <h3>Backup &amp; sync</h3>
    <p class="small muted">Your data lives in this browser only. Export a JSON backup regularly —
    and import it on another device to move everything across.</p>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn primary" data-exp>Download backup</button>
      <button class="btn" data-imp>Restore from file</button>
      <button class="btn danger" data-reset>Reset everything</button>
    </div>
    <input type="file" accept="application/json" hidden data-file>
  </div>`;
  el.querySelector("[data-exp]").onclick = () => {
    const blob = new Blob([Store.export()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wedding-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); toast("Backup downloaded");
  };
  const file = el.querySelector("[data-file]");
  el.querySelector("[data-imp]").onclick = () => file.click();
  file.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { Store.import(r.result); toast("Restored"); location.reload(); }
      catch { alert("That file could not be read."); } };
    r.readAsText(f);
  };
  el.querySelector("[data-reset]").onclick = () => {
    if (confirm("Erase ALL wedding data in this browser? This cannot be undone.")) {
      Store.reset(); location.reload();
    }
  };
}

/* --------------------------------------------------------------- Seeding */
/* First visit: pre-load a realistic Indian-wedding checklist keyed to 27 Jan 2027. */
function seedOnce() {
  const d = Store.all();
  if (d._seeded) return;

  const T = [
    ["Lock the guest-count range (this drives every other number)", "Planning", "2026-08-15", "High"],
    ["Set the overall budget & who's contributing what", "Planning", "2026-08-20", "High"],
    ["Shortlist 5 wedding planners from the Planners page", "Vendors", "2026-08-25", "High"],
    ["Take intro calls with top 3 planners", "Vendors", "2026-09-05", "High"],
    ["Sign the planner + pay retainer", "Vendors", "2026-09-15", "High"],
    ["Finalise city & venue; block dates", "Venue", "2026-09-20", "High"],
    ["Book hotel room blocks for outstation guests", "Venue", "2026-09-30", "Medium"],
    ["Book photographer & videographer", "Vendors", "2026-10-05", "High"],
    ["Book caterer; schedule tasting", "Food", "2026-10-10", "High"],
    ["Book decor team / finalise design concept", "Vendors", "2026-10-15", "High"],
    ["Send save-the-dates", "Invites", "2026-10-20", "High"],
    ["Start bridal & groom outfit commissions (long lead time)", "Attire", "2026-10-25", "High"],
    ["Book choreographer for sangeet", "Entertainment", "2026-11-01", "Medium"],
    ["Book makeup artist & hair stylist", "Vendors", "2026-11-05", "High"],
    ["Finalise invitation design & print", "Invites", "2026-11-10", "High"],
    ["Book DJ / live band", "Entertainment", "2026-11-15", "Medium"],
    ["Send formal invitations", "Invites", "2026-11-25", "High"],
    ["Book mehendi artist", "Vendors", "2026-11-30", "Medium"],
    ["Arrange guest transport & airport pickups", "Logistics", "2026-12-05", "Medium"],
    ["Order return gifts / favours", "Logistics", "2026-12-10", "Low"],
    ["Menu tasting & final menu sign-off", "Food", "2026-12-15", "High"],
    ["First-round RSVP follow-up calls", "Guests", "2026-12-20", "High"],
    ["Final outfit fittings (all functions)", "Attire", "2026-12-28", "High"],
    ["Confirm pandit & finalise muhurat timings", "Ceremony", "2027-01-02", "High"],
    ["Build the minute-by-minute run sheet with planner", "Planning", "2027-01-08", "High"],
    ["Final headcount to caterer & venue", "Food", "2027-01-12", "High"],
    ["Seating chart & table plan", "Guests", "2027-01-15", "Medium"],
    ["Settle vendor balance payments", "Budget", "2027-01-20", "High"],
    ["Pack emergency kit (safety pins, meds, chargers, cash)", "Logistics", "2027-01-24", "Medium"],
    ["Hand over final timeline to both families", "Planning", "2027-01-25", "High"]
  ];
  d.checklist = T.map(([task, cat, due, pri], i) => ({
    id: "seed" + i, task, category: cat, due, priority: pri, owner: "", status: "Not started", notes: ""
  }));

  d.budget = [
    { id: "b1", item: "Wedding planner fee", category: "Planning", estimated: 500000, actual: "", status: "Not paid", notes: "WeCurate publishes ₹5L as their floor — useful benchmark" },
    { id: "b2", item: "Venue & room blocks", category: "Venue", estimated: 1500000, actual: "", status: "Not paid", notes: "" },
    { id: "b3", item: "Catering", category: "Food", estimated: 1200000, actual: "", status: "Not paid", notes: "Usually per-plate × final headcount" },
    { id: "b4", item: "Decor & florals", category: "Decor", estimated: 800000, actual: "", status: "Not paid", notes: "" },
    { id: "b5", item: "Photography & video", category: "Media", estimated: 400000, actual: "", status: "Not paid", notes: "" },
    { id: "b6", item: "Bride & groom outfits", category: "Attire", estimated: 600000, actual: "", status: "Not paid", notes: "" },
    { id: "b7", item: "Jewellery", category: "Attire", estimated: 500000, actual: "", status: "Not paid", notes: "" },
    { id: "b8", item: "Entertainment (DJ, choreo, artists)", category: "Entertainment", estimated: 300000, actual: "", status: "Not paid", notes: "" },
    { id: "b9", item: "Invitations & stationery", category: "Invites", estimated: 150000, actual: "", status: "Not paid", notes: "" },
    { id: "b10", item: "Hair & makeup", category: "Beauty", estimated: 200000, actual: "", status: "Not paid", notes: "" },
    { id: "b11", item: "Guest transport & logistics", category: "Logistics", estimated: 250000, actual: "", status: "Not paid", notes: "" },
    { id: "b12", item: "Contingency buffer (10%)", category: "Buffer", estimated: 640000, actual: "", status: "Not paid", notes: "Do not skip this line" }
  ];

  /* Venue is booked (Ikshana, Khandala) — these are the operational
     answers still outstanding, not a shortlist. */
  d.venues = [
    { id: "v1", name: "Confirm noise curfew and hard stop for the sangeet", type: "Function space", status: "To do", notes: "Khandala is a hill station — assume there is one until told otherwise" },
    { id: "v2", name: "Allocate spaces: mandap, sangeet, reception + seated capacity of each", type: "Function space", status: "To do", notes: "" },
    { id: "v3", name: "Agree room block size and the release date for unsold rooms", type: "Room block", status: "To do", notes: "" },
    { id: "v4", name: "Confirm decor load-in the day before, and any preferred-vendor list", type: "Logistics", status: "To do", notes: "" },
    { id: "v5", name: "Settle catering: in-house vs outside, corkage and liquor licence", type: "Catering", status: "To do", notes: "" },
    { id: "v6", name: "Get the wet-weather plan in writing for every outdoor function", type: "Logistics", status: "To do", notes: "Who makes the call, and by when on the day" },
    { id: "v7", name: "Check backup power covers the sound and lighting rig", type: "Logistics", status: "To do", notes: "" },
    { id: "v8", name: "Payment schedule — instalment dates and triggers", type: "Contract", status: "To do", notes: "" },
    { id: "v9", name: "Get name + mobile of the on-site coordinator for 26–27 Jan", type: "Contract", status: "To do", notes: "" },
    { id: "v10", name: "Site visit with the planner once one is booked", type: "Site visit", status: "To do", visit: "", notes: "" }
  ];

  d.attire = [
    { id: "a1", item: "Bride — wedding lehenga", who: "Bride", function: "Wedding", designer: "", cost: "", status: "Not started", fitting: "", notes: "Longest lead time — start first" },
    { id: "a2", item: "Groom — sherwani", who: "Groom", function: "Wedding", designer: "", cost: "", status: "Not started", fitting: "", notes: "" },
    { id: "a3", item: "Bride — sangeet outfit", who: "Bride", function: "Sangeet", designer: "", cost: "", status: "Not started", fitting: "", notes: "Must be danceable" },
    { id: "a4", item: "Groom — sangeet outfit", who: "Groom", function: "Sangeet", designer: "", cost: "", status: "Not started", fitting: "", notes: "" },
    { id: "a5", item: "Bride — mehendi outfit", who: "Bride", function: "Mehendi", designer: "", cost: "", status: "Not started", fitting: "", notes: "" },
    { id: "a6", item: "Bride — haldi outfit", who: "Bride", function: "Haldi", designer: "", cost: "", status: "Not started", fitting: "", notes: "Something you don't mind staining" },
    { id: "a7", item: "Bridal jewellery set", who: "Bride", function: "Wedding", designer: "", cost: "", status: "Not started", fitting: "", notes: "" },
    { id: "a8", item: "Reception outfits", who: "Both", function: "Reception", designer: "", cost: "", status: "Not started", fitting: "", notes: "" }
  ];

  d.catering = [
    { id: "c1", item: "Sangeet dinner", function: "Sangeet", cuisine: "", vendor: "", perPlate: "", pax: "", status: "Not planned", notes: "" },
    { id: "c2", item: "Mehendi lunch", function: "Mehendi", cuisine: "", vendor: "", perPlate: "", pax: "", status: "Not planned", notes: "" },
    { id: "c3", item: "Wedding dinner", function: "Wedding", cuisine: "", vendor: "", perPlate: "", pax: "", status: "Not planned", notes: "Main spend" },
    { id: "c4", item: "Reception dinner", function: "Reception", cuisine: "", vendor: "", perPlate: "", pax: "", status: "Not planned", notes: "" },
    { id: "c5", item: "Bar / beverages", function: "All", cuisine: "Bar", vendor: "", perPlate: "", pax: "", status: "Not planned", notes: "Check venue corkage policy" },
    { id: "c6", item: "Jain / vegan / allergy counter", function: "All", cuisine: "Special", vendor: "", perPlate: "", pax: "", status: "Not planned", notes: "Pull requirements from RSVP data" }
  ];

  d.invites = [
    { id: "i1", item: "Save the date (digital)", format: "Digital", vendor: "", qty: "", cost: "", status: "Not started", sendBy: "2026-10-20", notes: "" },
    { id: "i2", item: "Main invitation card", format: "Print", vendor: "", qty: "", cost: "", status: "Not started", sendBy: "2026-11-25", notes: "" },
    { id: "i3", item: "Wedding website / RSVP link", format: "Digital", vendor: "", qty: "", cost: "", status: "Not started", sendBy: "2026-11-01", notes: "This portal can become it" },
    { id: "i4", item: "WhatsApp invite video", format: "Digital", vendor: "", qty: "", cost: "", status: "Not started", sendBy: "2026-11-25", notes: "" },
    { id: "i5", item: "Welcome / itinerary cards for hotel rooms", format: "Print", vendor: "", qty: "", cost: "", status: "Not started", sendBy: "2027-01-15", notes: "" }
  ];

  d._seeded = true;
  Store.set("_seeded", true);
}

/* ------------------------------------------------------------ Migrations */
/* seedOnce only runs on a first visit, so anyone who already has data needs
   these applied separately. Each step is idempotent and never touches rows
   the user has edited. */
function migrate() {
  const d = Store.all();
  const done = d._migrations || (d._migrations = {});

  // Venue is booked — drop the leftover shortlist row and load the real to-dos.
  if (!done.venueBooked) {
    const rows = Store.list("venues");
    const untouched = r => r.id === "v1" && /Zorba/i.test(r.name || "") &&
                           !r.cost && !r.contact && !r.visit;
    const i = rows.findIndex(untouched);
    if (i > -1) rows.splice(i, 1);
    if (rows.length === 0) {
      [["Confirm noise curfew and hard stop for the sangeet","Function space","Khandala is a hill station — assume there is one until told otherwise"],
       ["Allocate spaces: mandap, sangeet, reception + seated capacity of each","Function space",""],
       ["Agree room block size and the release date for unsold rooms","Room block",""],
       ["Confirm decor load-in the day before, and any preferred-vendor list","Logistics",""],
       ["Settle catering: in-house vs outside, corkage and liquor licence","Catering",""],
       ["Get the wet-weather plan in writing for every outdoor function","Logistics","Who makes the call, and by when on the day"],
       ["Check backup power covers the sound and lighting rig","Logistics",""],
       ["Payment schedule — instalment dates and triggers","Contract",""],
       ["Get name + mobile of the on-site coordinator for 26–27 Jan","Contract",""],
       ["Site visit with the planner once one is booked","Site visit",""]
      ].forEach(([name, type, notes]) =>
        rows.push({ id: "vm" + rows.length, name, type, status: "To do", notes }));
    }
    done.venueBooked = true;
    Store.set("_migrations", done);
  }
}

/* ------------------------------------------------------------------ Boot */
function boot(activePage) {
  seedOnce();
  migrate();
  renderNav(activePage);
  if (typeof Sync !== "undefined") {
    syncBadge();
    /* Only reload when a pull genuinely brought different data — never after
       one of our own pushes, or you'd get a reload mid-keystroke. */
    document.addEventListener("sync:pulled", e => {
      if (e.detail?.changed) location.reload();
    });
    Sync.init();
  }
}
