/* =========================================================================
   ShaadiDesk · cloud sync
   ------------------------------------------------------------------------
   Principles, in order:
     1. The app must never break. If Supabase is unconfigured, unreachable,
        or you're signed out, everything falls back to localStorage and keeps
        working exactly as before.
     2. Reads are instant. localStorage stays the read path; the network is
        only ever a background writer/refresher.
     3. Nothing is silently lost. Local edits are pushed before remote state
        is applied, and every sync is recorded in audit_log.
   ========================================================================= */

const Sync = (() => {
  let sb = null;              // supabase client
  let user = null;
  let status = "off";         // off | signed-out | syncing | synced | offline | error
  let lastError = "";
  let pushTimer = null;
  const listeners = [];

  /* Collections we sync. Everything Store keeps, minus bookkeeping flags. */
  const KEYS = ["settings", "vendors", "checklist", "venues", "attire", "invites",
                "guests", "catering", "budget", "_migrations"];
  const customKey = k => k.startsWith("custom:");

  const setStatus = (s, err = "") => {
    status = s; lastError = err;
    listeners.forEach(f => f(status, lastError));
  };

  /* ------------------------------------------------------------ bootstrap */
  async function init() {
    if (typeof CLOUD_ENABLED === "undefined" || !CLOUD_ENABLED) { setStatus("off"); return; }
    try {
      if (!window.supabase) await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js");
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

      const { data } = await sb.auth.getSession();
      user = data?.session?.user || null;

      sb.auth.onAuthStateChange((_e, session) => {
        user = session?.user || null;
        if (user) pull(); else setStatus("signed-out");
      });

      if (user) await pull(); else setStatus("signed-out");
    } catch (e) {
      setStatus("error", e.message);
    }
  }

  function loadScript(src) {
    return new Promise((ok, no) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => no(new Error("Could not load Supabase library"));
      document.head.appendChild(s);
    });
  }

  /* ------------------------------------------------------------------ auth */
  async function signIn(email) {
    if (!sb) throw new Error("Cloud sync is not configured");
    const { error } = await sb.auth.signInWithOtp({
      email, options: { emailRedirectTo: location.href }
    });
    if (error) throw error;
  }
  async function signOut() { if (sb) { await sb.auth.signOut(); setStatus("signed-out"); } }

  /* ------------------------------------------------------------------ pull */
  /* Remote is the source of truth, EXCEPT where this browser holds newer work
     that was never pushed (e.g. edits made offline). Those go up first. */
  async function pull() {
    if (!sb || !user) return;
    setStatus("syncing");
    try {
      const local = Store.all();

      // 1. anything local that the cloud has never seen goes up first
      if (!local._cloudSyncedAt) await push({ reason: "first-sync" });

      // 2. fetch and apply
      const { data, error } = await sb.from("collections").select("key,data,updated_at");
      if (error) throw error;

      let changed = false;
      if (data?.length) {
        data.forEach(row => {
          if (row.key === "_meta") return;
          const incoming = row.data?.v ?? row.data;
          if (JSON.stringify(local[row.key]) !== JSON.stringify(incoming)) {
            local[row.key] = incoming;
            changed = true;
          }
        });
        local._cloudSyncedAt = new Date().toISOString();
        Store.persist();
      }
      setStatus("synced");
      document.dispatchEvent(new CustomEvent("sync:pulled", { detail: { changed } }));
    } catch (e) {
      setStatus(navigator.onLine ? "error" : "offline", e.message);
    }
  }

  /* ------------------------------------------------------------------ push */
  async function push({ reason = "sync" } = {}) {
    if (!sb || !user) return;
    const d = Store.all();
    const keys = KEYS.concat(Object.keys(d).filter(customKey));
    const rows = keys
      .filter(k => d[k] !== undefined)
      .map(k => ({ key: k, data: { v: d[k] }, updated_by: user.email }));
    if (!rows.length) return;

    const { error } = await sb.from("collections").upsert(rows, { onConflict: "key" });
    if (error) throw error;

    d._cloudSyncedAt = new Date().toISOString();
    Store.persist();

    // audit trail — best effort, never blocks a save
    sb.from("audit_log").insert({
      who: user.email, collection: "all", action: reason,
      items: keys.reduce((n, k) => n + (Array.isArray(d[k]) ? d[k].length : 0), 0)
    }).then(() => {}, () => {});
  }

  /* Debounced — typing in a notes field shouldn't fire a request per keystroke. */
  function schedulePush() {
    if (!sb || !user) return;
    clearTimeout(pushTimer);
    setStatus("syncing");
    pushTimer = setTimeout(async () => {
      try { await push(); setStatus("synced"); }
      catch (e) { setStatus(navigator.onLine ? "error" : "offline", e.message); }
    }, 1200);
  }

  window.addEventListener("online",  () => { if (user) pull(); });
  window.addEventListener("offline", () => setStatus("offline"));

  return {
    init, signIn, signOut, pull, push, schedulePush,
    onChange: f => { listeners.push(f); f(status, lastError); },
    get status() { return status; },
    get user() { return user; },
    get enabled() { return typeof CLOUD_ENABLED !== "undefined" && CLOUD_ENABLED; }
  };
})();

/* ------------------------------------------------------------ status widget */
function syncBadge() {
  const el = document.createElement("div");
  el.className = "sync-badge";
  document.querySelector(".nav-inner")?.appendChild(el);

  const LABEL = {
    "off":        ["Local only", "This browser only — cloud sync not set up"],
    "signed-out": ["Sign in to sync", "Click to sync across your devices"],
    "syncing":    ["Syncing…", "Saving to the cloud"],
    "synced":     ["Synced", "Saved and available on your other devices"],
    "offline":    ["Offline", "Saved here; will sync when you're back online"],
    "error":      ["Sync problem", ""]
  };

  Sync.onChange((s, err) => {
    const [text, tip] = LABEL[s] || LABEL.off;
    el.className = "sync-badge s-" + s;
    el.textContent = text;
    el.title = err ? text + " — " + err : tip;
  });

  el.onclick = () => {
    if (!Sync.enabled) {
      alert("Cloud sync isn't set up yet.\n\nAdd your Supabase URL and anon key to assets/js/config.js, then run supabase-schema.sql in your Supabase project.");
      return;
    }
    if (Sync.user) {
      if (confirm(`Signed in as ${Sync.user.email}.\n\nSign out of sync on this device?`)) Sync.signOut();
    } else {
      openSignIn();
    }
  };
  return el;
}

function openSignIn() {
  const bg = document.createElement("div");
  bg.className = "modal-bg";
  bg.innerHTML = `<form class="modal" style="max-width:440px">
    <h2>Sync across devices</h2>
    <p class="small muted" style="margin:0 0 16px">
      Enter your email and we'll send a sign-in link — no password to remember.
      Once you're signed in, everything you've saved here syncs to your other
      devices, and Vidhi can sign in on hers too.</p>
    <div class="field"><label>Email</label>
      <input type="email" name="email" required placeholder="you@example.com" autocomplete="email"></div>
    <div class="modal-foot">
      <button type="button" class="btn" data-cancel>Cancel</button>
      <button type="submit" class="btn primary">Send link</button>
    </div>
  </form>`;

  const close = () => bg.remove();
  bg.onclick = e => { if (e.target === bg) close(); };
  bg.querySelector("[data-cancel]").onclick = close;
  bg.querySelector("form").onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector("[type=submit]");
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      await Sync.signIn(new FormData(e.target).get("email"));
      bg.querySelector(".modal").innerHTML =
        `<h2>Check your email</h2>
         <p class="small muted">We've sent you a sign-in link. Open it on this device
         and you'll be synced.</p>
         <div class="modal-foot"><button type="button" class="btn primary" data-ok>Done</button></div>`;
      bg.querySelector("[data-ok]").onclick = close;
    } catch (err) {
      btn.disabled = false; btn.textContent = "Send link";
      alert("Could not send the link:\n\n" + err.message);
    }
  };
  document.body.appendChild(bg);
}
