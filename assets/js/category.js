/* =========================================================================
   Shared renderer for every vendor category page (and the Planners page).
   Each card = one saved Instagram post. Anything you type is stored under
   Store.vendors[key], so scraped data and your own edits live side by side.
   ========================================================================= */

const VENDOR_STATUSES = ["Not reviewed","Shortlisted","Contacted","Quote received",
                         "Meeting booked","Booked","Passed"];
const ACTIVE = ["Shortlisted","Contacted","Quote received","Meeting booked","Booked"];

/* Fields you can fill in yourself — these persist per card. */
const EDITABLE = [
  { k:"name",    label:"Vendor name",  ph:"Who is this?" },
  { k:"phone",   label:"Phone",        ph:"+91…",        type:"tel" },
  { k:"email",   label:"Email",        ph:"name@…",      type:"email" },
  { k:"website", label:"Website / IG", ph:"link",        type:"url" },
  { k:"quote",   label:"Quote",        ph:"₹" }
];

function igUrl(l) {
  if (l.k === "profile") return `https://www.instagram.com/${l.c}/`;
  return `https://www.instagram.com/${l.k === "p" ? "p" : "reel"}/${l.c}/`;
}
function igEmbed(l) {
  if (l.k === "profile") return null;
  return `https://www.instagram.com/${l.k === "p" ? "p" : "reel"}/${l.c}/embed/`;
}

function renderCategory(catKey, opts = {}) {
  const cat = CATEGORIES[catKey];
  const mount = $("#cards");
  const scraped = (typeof SCRAPED !== "undefined") ? SCRAPED : {};

  let showReels = localStorage.getItem("cat.reels") !== "0";
  let q = "", statusFilter = "", onlyActive = false;

  function saveKey(l) { return catKey + ":" + l.c; }

  function card(l) {
    const key = saveKey(l);
    const mine = Store.vendor(key);
    const info = scraped[l.c] || {};
    const cur = mine.status || "Not reviewed";
    const active = ACTIVE.includes(cur);
    const title = mine.name || info.name || (info.handle ? "@" + info.handle : "Not identified yet");
    const embed = igEmbed(l);

    return `<div class="pcard${active ? " is-short" : ""}">
      ${(showReels && embed) ? `<div class="embed">
        <div class="ph">Loading…<br><a href="${igUrl(l)}" target="_blank" rel="noopener">open on Instagram ↗</a></div>
        <iframe src="${embed}" loading="lazy" scrolling="no" title="Saved post"></iframe>
      </div>` : ""}

      <div>
        <h3>${esc(title)}</h3>
        <div class="handle">
          ${info.handle ? `<a href="https://instagram.com/${esc(info.handle)}" target="_blank" rel="noopener">@${esc(info.handle)}</a>` : ""}
          ${info.followers && info.followers !== "—" ? ` · ${esc(info.followers)} followers` : ""}
          ${!info.handle ? `<a href="${igUrl(l)}" target="_blank" rel="noopener">open saved post ↗</a>` : ""}
        </div>
      </div>

      ${(info.role || info.city || l.n) ? `<div class="tags">
        ${info.role ? `<span class="pill hot">${esc(info.role)}</span>` : ""}
        ${info.city ? `<span class="pill">${esc(info.city)}</span>` : ""}
        ${l.n ? `<span class="pill gold">${esc(l.n)}</span>` : ""}
      </div>` : ""}

      ${info.bio ? `<div class="bio">${esc(info.bio)}</div>` : ""}
      ${info.note ? `<div class="small" style="background:var(--gold-soft);padding:8px 10px;border-radius:8px;color:#6a5526">${esc(info.note)}</div>` : ""}
      ${info.contact && info.contact.length ? `<div class="contact">${info.contact.map(c =>
        `<span><b>${esc(c.t)}:</b> <a href="${esc(c.h)}" target="_blank" rel="noopener">${esc(c.v)}</a></span>`).join("")}</div>` : ""}

      <details class="edit"${(mine.name || mine.phone || mine.email) ? " open" : ""}>
        <summary>Your details${(mine.name || mine.phone || mine.email) ? " ✓" : ""}</summary>
        <div class="edit-grid">
          ${EDITABLE.map(f => `<label class="ef">
            <span>${f.label}</span>
            <input type="${f.type || "text"}" data-k="${key}" data-f="${f.k}"
              placeholder="${esc(f.ph)}" value="${esc(mine[f.k] || "")}">
          </label>`).join("")}
        </div>
      </details>

      <div style="display:flex;gap:7px;align-items:center">
        <select data-k="${key}" data-f="status" style="flex:1">
          ${VENDOR_STATUSES.map(s => `<option${s === cur ? " selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      <textarea data-k="${key}" data-f="notes" placeholder="Notes — what you liked, what to ask…"
        style="min-height:52px">${esc(mine.notes || "")}</textarea>
    </div>`;
  }

  function visible() {
    return cat.links.filter(l => {
      const mine = Store.vendor(saveKey(l));
      const info = scraped[l.c] || {};
      const cur = mine.status || "Not reviewed";
      if (statusFilter && cur !== statusFilter) return false;
      if (onlyActive && !ACTIVE.includes(cur)) return false;
      if (q) {
        const hay = [mine.name, mine.notes, mine.phone, mine.email, info.name,
                     info.handle, info.bio, info.city, info.role, l.n, l.c]
                    .join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function stats() {
    const total = cat.links.length;
    let identified = 0, active = 0, booked = 0;
    cat.links.forEach(l => {
      const mine = Store.vendor(saveKey(l));
      if (mine.name || scraped[l.c]) identified++;
      if (ACTIVE.includes(mine.status)) active++;
      if (mine.status === "Booked") booked++;
    });
    $("#stats").innerHTML = `
      <div class="stat"><div class="k">Saved posts</div><div class="v">${total}</div></div>
      <div class="stat"><div class="k">Identified</div><div class="v">${identified}</div>
        <div class="small muted" style="margin-top:5px">${total - identified} still to name</div></div>
      <div class="stat"><div class="k">In play</div><div class="v">${active}</div></div>
      <div class="stat"><div class="k">Booked</div><div class="v">${booked}</div></div>`;
  }

  function render() {
    const list = visible();
    mount.className = showReels ? "pgrid" : "pgrid no-embeds";
    mount.innerHTML = list.length ? list.map(card).join("")
      : `<div class="empty">Nothing matches those filters.</div>`;

    $$("[data-k]", mount).forEach(el => {
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
        Store.setVendor(el.dataset.k, { [el.dataset.f]: el.value });
        stats();
        if (el.dataset.f === "status") render();
      });
    });
    stats();
  }

  /* toolbar wiring */
  $("#q").oninput = e => { q = e.target.value.toLowerCase(); render(); };
  $("#status").innerHTML = '<option value="">All statuses</option>' +
    VENDOR_STATUSES.map(s => `<option>${s}</option>`).join("");
  $("#status").onchange = e => { statusFilter = e.target.value; render(); };
  $("#onlyActive").onchange = e => { onlyActive = e.target.checked; render(); };

  const viewBtn = $("#view");
  const syncView = () => viewBtn.textContent = showReels ? "☰ Compact view" : "▦ Show posts";
  viewBtn.onclick = () => {
    showReels = !showReels;
    localStorage.setItem("cat.reels", showReels ? "1" : "0");
    syncView(); render(); window.scrollTo({ top: 0 });
  };
  syncView();

  $("#csv").onclick = () => {
    const head = "Post,Link,Sheet note,Scraped handle,Scraped name,Your name,Phone,Email,Website,Quote,Status,Notes";
    const body = cat.links.map(l => {
      const m = Store.vendor(saveKey(l)), i = scraped[l.c] || {};
      return [l.c, igUrl(l), l.n || "", i.handle || "", i.name || "", m.name || "", m.phone || "",
              m.email || "", m.website || "", m.quote || "", m.status || "Not reviewed", m.notes || ""]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    }).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = catKey + ".csv"; a.click();
  };

  render();
}
