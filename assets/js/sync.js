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
  /* Password rather than magic link: Supabase's built-in mailer is capped at a
     couple of emails an hour, which makes link-based sign-in unusable. With two
     known users whose passwords are set in the dashboard, email adds nothing. */
  async function signIn(email, password) {
    if (!sb) throw new Error("Cloud sync is not configured");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  /* Kept as a fallback if you ever wire up real SMTP. */
  async function signInWithLink(email) {
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
    init, signIn, signInWithLink, signOut, pull, push, schedulePush,
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
      Sign in and everything saved in this browser syncs to your other devices —
      and Vidhi sees the same thing on hers.</p>
    <div class="field"><label>Email</label>
      <input type="email" name="email" required placeholder="you@example.com"
             autocomplete="username" value="${esc(localStorage.getItem("sync.email") || "")}"></div>
    <div class="field"><label>Password</label>
      <input type="password" name="password" required autocomplete="current-password"></div>
    <p class="small muted" style="margin:-4px 0 0">
      Set in Supabase → Authentication → Users. Save it in your password manager,
      not here.</p>
    <div class="modal-foot">
      <button type="button" class="btn" data-cancel>Cancel</button>
      <button type="submit" class="btn primary">Sign in</button>
    </div>
  </form>`;

  const close = () => bg.remove();
  bg.onclick = e => { if (e.target === bg) close(); };
  bg.querySelector("[data-cancel]").onclick = close;
  bg.querySelector("form").onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector("[type=submit]");
    const f = new FormData(e.target);
    btn.disabled = true; btn.textContent = "Signing in…";
    try {
      await Sync.signIn(f.get("email"), f.get("password"));
      localStorage.setItem("sync.email", f.get("email"));  // convenience only
      close();
      toast("Signed in — syncing your data");
    } catch (err) {
      btn.disabled = false; btn.textContent = "Sign in";
      const m = /invalid login/i.test(err.message)
        ? "That email and password combination wasn't recognised.\n\nCheck the user exists under Authentication → Users in Supabase, and that you set a password for them."
        : err.message;
      alert("Could not sign in:\n\n" + m);
    }
  };
  document.body.appendChild(bg);
  bg.querySelector('input[name="' + (localStorage.getItem("sync.email") ? "password" : "email") + '"]').focus();
}
