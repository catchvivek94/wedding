# Turning on cloud sync

Right now everything you type is saved in **one browser on one device**. Clear
site data or lose the laptop and it's gone. This turns on a real database so
your data survives, and so you and Vidhi both see the same thing.

Cost: **free**. Supabase's free tier is far more than this needs.

Takes about five minutes.

---

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) and sign up
2. **New project** — name it anything, pick the region closest to you
   (Mumbai / `ap-south-1` if it's offered)
3. It'll ask for a database password. Save it in your password manager; you
   won't need it for this, but you don't want to lose it.
4. Wait ~2 minutes while it provisions

## 2. Create the tables

1. In your project: **SQL Editor** → **New query**
2. Open `supabase-schema.sql` from this repo, copy all of it, paste it in
3. Click **Run**

You should see "Success. No rows returned."

## 3. Create your two accounts, and lock out everyone else

Sign-in uses a **password**, not an email link. Supabase's built-in mailer is
capped at about two emails an hour — fine for testing, useless in practice —
so with only two known users, email is skipped entirely.

1. **Authentication → Providers → Email** — turn **off** "Enable email signups", Save
   *(stops strangers creating accounts on your database)*
2. **Authentication → Users → Add user → Create new user**
   - your email, and a password you generate in your password manager
   - tick **Auto Confirm User**
3. Repeat for Vidhi's email

Store those passwords in your password manager. Not in this repo, not in a chat.

## 4. Point the site at it

1. **Project Settings → API**
2. Copy the **Project URL** and the **anon / public** key
   - ⚠️ The **`service_role`** key is on that page too. Never use it here and
     never commit it — it bypasses all security.
3. Open `assets/js/config.js` and paste them in:

```js
const SUPABASE_URL  = "https://yourproject.supabase.co";
const SUPABASE_ANON = "eyJhbGci...";
```

4. Deploy:

```bash
cd ~/Projects/wedding
./deploy.sh "Turn on cloud sync"
```

## 5. Sign in

Open the site. Top right of the nav shows **"Sign in to sync"** — click it and
enter the email and password you set in step 3. Everything already in your
browser gets pushed up on first sign-in.

Then do the same on your phone and on Vidhi's devices.

---

## What you'll see

The badge in the nav tells you where your data is:

| Badge | Meaning |
|---|---|
| **Local only** | Sync isn't configured — this browser only |
| **Sign in to sync** | Configured, but you're signed out on this device |
| **Syncing…** | Saving to the cloud |
| **Synced** | Saved, and available on your other devices |
| **Offline** | Saved here, will go up when you're back online |
| **Sync problem** | Hover for the reason |

## How it behaves

- **Reads are always local**, so the app never feels slow and never blocks on
  the network.
- **Writes save locally first**, then push in the background about a second
  after you stop typing. A network failure can't cost you an edit.
- **Offline works.** Keep editing on a flight; it syncs when you reconnect.
- **If Supabase is down or you're signed out, nothing breaks** — the site falls
  back to exactly how it works today.
- **Every sync is logged** in the `audit_log` table with who did it and when.

## Is the anon key safe to commit?

Yes — that's what it's designed for. It only grants what your security policies
allow, and the schema requires a signed-in user for every read and write. Someone
with just the key and no account gets nothing.

The `service_role` key is the dangerous one. It's not used anywhere in this
project and should never be.

## Two caveats

- **Sign-in is by password, not email link.** If you'd rather have magic links,
  you'd need to connect a real SMTP provider (Resend and Brevo both have free
  tiers) under Project Settings → Auth → SMTP. `Sync.signInWithLink()` is already
  in the code for that day.
- **Free projects pause after 7 days of no activity.** One click in the Supabase
  dashboard wakes it. If you go quiet for a fortnight, expect to do that.
- **Simultaneous edits to the same section** are last-write-wins. Different
  sections never conflict. With two of you this is very unlikely to bite, but
  it's the honest limitation of the simple approach.

## Backups still matter

Keep using **Download backup** on the dashboard now and then. Cloud sync
protects against a lost laptop; a JSON file on disk protects against everything
else, including me or you deleting something by mistake.
