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

/* Which credit roles matter on which page — used to highlight the relevant
   vendor when one saved post credits a dozen different people. */
const CAT_ROLES = {
  photographers: /photo|film|video/i,
  mua:           /mua|makeup|hair|hmua/i,
  choreographers:/choreo/i,
  music:         /dj|anchor|music|singer|flaut|band/i,
  decor:         /decor|floral|furniture|bartender|cake|baker/i,
  clothes:       /outfit|couture|wear|styl/i,
  jewellery:     /jewel/i,
  mandi:         /decor|floral|mehendi|henna/i
};

function renderCategory(catKey, opts = {}) {
  const cat = CATEGORIES[catKey];
  const mount = $("#cards");
  const scraped = (typeof SCRAPED !== "undefined") ? SCRAPED : {};
  const roleRx = CAT_ROLES[catKey];
  const matchesCat = r => roleRx && roleRx.test(r);

  /* Default OFF: 174 embedded videos is an enormous amount of scrolling,
     and without them we fit four cards per row instead of two. */
  let showReels = localStorage.getItem("cat.reels") === "1";
  let q = "", statusFilter = "", onlyActive = false;

  function saveKey(l) { return catKey + ":" + l.c; }

  function card(l) {
    const key = saveKey(l);
    const mine = Store.vendor(key);
    const man = l._manual;
    const info = man ? {} : (scraped[l.c] || {});
    const cur = mine.status || "Not reviewed";
    const active = ACTIVE.includes(cur);
    const title = mine.name || man?.name || info.name || (info.handle ? "@" + info.handle : "Not identified yet");
    const embed = man ? null : igEmbed(l);

    return `<div class="pcard${active ? " is-short" : ""}${man ? " is-manual" : ""}">
      ${(showReels && embed) ? `<div class="embed">
        <div class="ph">Loading…<br><a href="${igUrl(l)}" target="_blank" rel="noopener">open on Instagram ↗</a></div>
        <iframe src="${embed}" loading="lazy" scrolling="no" title="Saved post"></iframe>
      </div>` : ""}

      <div>
        <h3>${esc(title)}</h3>
        <div class="handle">
          ${man ? `<span class="pill gold">Added by you</span>
            <button class="btn sm danger" data-del="${esc(l.c)}" style="float:right">Delete</button>` : ""}
          ${man?.handle ? `<a href="https://instagram.com/${esc(man.handle)}" target="_blank" rel="noopener">@${esc(man.handle)}</a>` : ""}
          ${man?.city ? ` · ${esc(man.city)}` : ""}
          ${info.handle ? `<a href="https://instagram.com/${esc(info.handle)}" target="_blank" rel="noopener">@${esc(info.handle)}</a>` : ""}
          ${info.followers && info.followers !== "—" ? ` · ${esc(info.followers)} followers` : ""}
          ${(!info.handle && !man) ? `<a href="${igUrl(l)}" target="_blank" rel="noopener">open saved post ↗</a>` : ""}
        </div>
      </div>
      ${man?.type ? `<div class="tags"><span class="pill hot">${esc(man.type)}</span>
        ${man.date ? `<span class="pill">${fmtDate(man.date)}</span>` : ""}</div>` : ""}
      ${man?.desc ? `<div class="bio">${esc(man.desc)}</div>` : ""}

      ${(info.role || info.city || l.n) ? `<div class="tags">
        ${info.role ? `<span class="pill hot">${esc(info.role)}</span>` : ""}
        ${info.city ? `<span class="pill">${esc(info.city)}</span>` : ""}
        ${l.n ? `<span class="pill gold">${esc(l.n)}</span>` : ""}
      </div>` : ""}

      ${(() => {
        const hits = (info.credits || []).filter(c => matchesCat(c.r));
        return hits.length ? `<div class="credits">${hits.slice(0, 2).map(c =>
          `<div class="cr hit"><span class="cr-r">${esc(c.r)}</span>
           <a href="https://instagram.com/${esc(c.h)}" target="_blank" rel="noopener">@${esc(c.h)}</a></div>`
        ).join("")}</div>` : (info.bio ? `<div class="bio">${esc(info.bio)}</div>` : "");
      })()}

      ${(mine.phone || mine.email) ? `<div class="contact">
        ${mine.phone ? `<span><b>Phone:</b> <a href="tel:${esc(mine.phone)}">${esc(mine.phone)}</a></span>` : ""}
        ${mine.email ? `<span><b>Email:</b> <a href="mailto:${esc(mine.email)}">${esc(mine.email)}</a></span>` : ""}
      </div>` : ""}

      <div class="card-foot">
        <select data-k="${key}" data-f="status">
          ${VENDOR_STATUSES.map(s => `<option${s === cur ? " selected" : ""}>${s}</option>`).join("")}
        </select>
        <button class="btn sm" data-info="${esc(l.c)}">Info</button>
      </div>
    </div>`;
  }

  /* Cards you add by hand live in Store under "custom:<category>". */
  function customLinks() {
    return Store.list("custom:" + catKey).map(c => ({ c: c.id, k: "manual", n: "", _manual: c }));
  }
  function allLinks() { return customLinks().concat(cat.links); }

  function visible() {
    return allLinks().filter(l => {
      const mine = Store.vendor(saveKey(l));
      const info = scraped[l.c] || {};
      const cur = mine.status || "Not reviewed";
      if (statusFilter && cur !== statusFilter) return false;
      if (onlyActive && !ACTIVE.includes(cur)) return false;
      if (q) {
        const hay = [mine.name, mine.notes, mine.phone, mine.email, info.name,
                     info.handle, info.bio, info.city, info.role, l.n, l.c,
                     (info.credits || []).map(c => c.r + " " + c.h).join(" ")]
                    .join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function stats() {
    const links = allLinks();
    const total = links.length;
    let identified = 0, active = 0, booked = 0;
    links.forEach(l => {
      const mine = Store.vendor(saveKey(l));
      if (mine.name || l._manual || scraped[l.c]) identified++;
      if (ACTIVE.includes(mine.status)) active++;
      if (mine.status === "Booked") booked++;
    });
    $("#stats").innerHTML = `
      <div class="stat"><div class="k">Cards</div><div class="v">${total}</div>
        <div class="small muted" style="margin-top:5px">${cat.links.length} saved · ${total - cat.links.length} yours</div></div>
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
    $$("[data-info]", mount).forEach(b => b.onclick = () => {
      const l = allLinks().find(x => String(x.c) === b.dataset.info);
      if (!l) return;
      const man = l._manual;
      const info = man ? {} : (scraped[l.c] || {});
      const mine = Store.vendor(saveKey(l));
      openDetail({
        title: mine.name || man?.name || info.name || (info.handle ? "@" + info.handle : "Not identified yet"),
        handle: man?.handle || info.handle,
        followers: info.followers,
        tags: [
          man?.type && { label: man.type, cls: "hot" },
          (man?.city || info.city) && { label: man?.city || info.city },
          man && { label: "Added by you", cls: "gold" },
          l.n && { label: l.n, cls: "gold" }
        ].filter(Boolean),
        bio: info.bio || man?.desc,
        note: info.note,
        via: info.via || (man?.referredBy ? "Referred by " + man.referredBy : ""),
        contact: info.contact || [],
        credits: info.credits || [],
        creditHit: matchesCat,
        embedUrl: man ? null : igEmbed(l),
        postUrls: man ? [] : [igUrl(l)],
        storeKey: saveKey(l),
        editable: EDITABLE,
        statuses: VENDOR_STATUSES,
        onChange: render
      });
    });

    $$("[data-del]", mount).forEach(b => b.onclick = () => {
      if (confirm("Delete this card? Your notes on it go too.")) {
        Store.remove("custom:" + catKey, b.dataset.del);
        render(); toast("Deleted");
      }
    });
    stats();
  }

  /* Add a card by hand — a vendor you found elsewhere, or an event/booking. */
  $("#addCard").onclick = () => openForm({
    title: "Add to " + cat.title,
    fields: [
      { k: "name",    label: "Name",              required: true, ph: "Vendor or event name" },
      { k: "type",    label: "Type", type: "select",
        options: ["Vendor","Event","Booking","Appointment","Shortlist idea","Other"] },
      { k: "handle",  label: "Instagram @handle",  ph: "without the @" },
      { k: "phone",   label: "Phone",  type: "tel",   ph: "+91…" },
      { k: "email",   label: "Email",  type: "email", ph: "name@…" },
      { k: "website", label: "Website / link",       ph: "https://…" },
      { k: "city",    label: "City / area" },
      { k: "quote",   label: "Quote",               ph: "₹" },
      { k: "date",    label: "Date",   type: "date" },
      { k: "status",  label: "Status", type: "select", options: VENDOR_STATUSES, default: "Shortlisted" },
      { k: "referredBy", label: "Referred by",      ph: "Who recommended them?" },
      { k: "desc",    label: "Notes",  type: "textarea", ph: "What you know so far…" }
    ],
    onSave: v => {
      const item = Store.add("custom:" + catKey, {
        name: v.name, type: v.type, date: v.date, desc: v.desc,
        handle: v.handle.replace(/^@/, ""), city: v.city, referredBy: v.referredBy
      });
      Store.setVendor(catKey + ":" + item.id, {
        name: v.name, phone: v.phone, email: v.email, website: v.website,
        quote: v.quote, status: v.status || "Shortlisted",
        notes: [v.desc, v.referredBy && ("Referred by " + v.referredBy)].filter(Boolean).join("\n")
      });
      render(); window.scrollTo({ top: 0 }); toast("Added — it's at the top of the list");
    }
  });

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
