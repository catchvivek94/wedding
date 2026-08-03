# ShaadiDesk

A static wedding-planning portal built for GitHub Pages. No build step, no dependencies, no server.

**Wedding date: 27 January 2027.**

## Deploy

From inside your local clone of `catchvivek94/wedding`:

```bash
cp -r /path/to/downloaded/files/* .
git add -A
git commit -m "Add ShaadiDesk wedding portal"
git push
```

Then in the repo on GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `root` → Save.**

Live within a minute or two at:

```
https://catchvivek94.github.io/wedding/
```

## What's in it

| Page | Does |
|---|---|
| `index.html` | Dashboard — countdown, progress stats, next eight deadlines, backup/restore |
| `planners.html` | 39 vendors scraped from your saved Instagram reels, with embedded video, contact info, and per-vendor status/quote/notes |
| `checklist.html` | 30 pre-loaded tasks dated backwards from the wedding |
| `venues.html` | Venue comparison and site visits |
| `attire.html` | Outfits per person per function, with fitting dates |
| `invites.html` | Stationery pipeline with send-by dates |
| `guests.html` | Guest list, RSVPs, dietary needs, room requirements, table plan |
| `catering.html` | Meal services, per-plate × pax cost projection |
| `budget.html` | Estimated vs actual, with category breakdown |

## The planner data

Scraped 2 August 2026 from the 42 Instagram links you supplied, by loading each page in your own
logged-in browser session — not via automated API scraping, which Instagram prohibits.

Of the 42 links: 39 yielded vendors, 3 did not (one profile removed, one age-restricted, one couple
post with no vendors credited — all three are listed at the bottom of the Planners page). Many of the
reels were posted by *couples* rather than planners, so each vendor card carries a **Found via**
line explaining how it surfaced. The `role` field distinguishes actual planners from decor studios,
photographers and choreographers — they were all mixed together in the source list.

Data lives in `assets/js/data-planners.js`. Edit that file to add vendors or correct details.

**Verify before you commit money.** Follower counts, bios and contact details are as-published on
2 Aug 2026 and go stale. Confirm everything directly with the vendor.

## Storage — and why it's localStorage for now

GitHub Pages serves static files only. There is no server, so there is no database.

Right now everything you type is saved to **`localStorage`** in whichever browser you're using.
That means:

- ✅ Works instantly, zero setup, completely private
- ❌ Data does not sync between your laptop and your phone
- ❌ Your fiancée editing on her device sees a separate, empty copy
- ❌ Guests cannot submit their own RSVPs

Use **Download backup** on the dashboard regularly. To move data to another device, export the
JSON there and use **Restore from file**.

### Upgrading to Supabase

All storage goes through the `Store` object at the top of `assets/js/app.js` — nothing else in the
codebase touches `localStorage` directly. That's deliberate: swapping in a real database means
rewriting that one object, not the eight pages.

When you're ready:

1. Create a free project at supabase.com
2. Create tables matching the board keys: `checklist`, `venues`, `attire`, `invites`, `guests`,
   `catering`, `budget`, plus `vendors`
3. Send me the project URL and the **anon** public key — both are designed to be public and safe to
   commit; do not send the service-role key
4. I rewrite `Store` to call the Supabase REST client, and add row-level security policies so guests
   can insert their own RSVP rows but can't read anyone else's

After that: real multi-device sync, and `guests.html` gains a public form you can link from the
invitation.

## Notes

- Instagram embeds are lazy-loaded `<iframe>`s using Instagram's official embed endpoint. They need
  a network connection and may be blocked by aggressive tracker-blockers — the rest of the card
  still works if they don't load.
- Budget placeholder figures are arithmetic scaffolding, not financial advice. Replace them.
- No analytics, no cookies, no third-party scripts beyond Google Fonts and the Instagram embeds.
