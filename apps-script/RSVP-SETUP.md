# RSVP and Attendees

The private Google Sheet is the database for name search, household invitations, attendance, and the host's Attendees page. The website does not contain the guest list or Google credentials.

## Sheet structure

- **Households:** Household ID, Household name, Active (checkbox).
- **Guests:** Guest ID, Full name, Household ID, Day One invited (checkbox), Day Two invited (checkbox), Search aliases (comma-separated), Whose team are you on? (Team Vidhi, Team Vivek, Team Both).
- **RSVPs:** Guest ID, Day One attendance, Day Two attendance, Updated at.
- **Companions:** Companion ID, Invited by Guest ID, Full name, Day One attendance, Day Two attendance, Active, Updated at.

Keep IDs unique and stable. Use `attending`, `not_attending`, or `undecided` for attendance; `Pending` or a blank means no response. Add new invitees to Guests and Households. RSVP rows are created or updated when guests respond.

## Backend

`RSVP.gs` belongs to its **own** Apps Script project. Do not paste it into the existing kurta script (`Code.gs`); both define `doGet` and `doPost`.

1. In Script Properties, set `RSVP_SHEET_ID` to the private spreadsheet ID, or create the script from the Sheet’s Extensions menu.
2. In Script Properties, set `RSVP_ADMIN_EMAILS` to a JSON array of confirmed host account emails. Keep these values out of the public repository.
3. Run `setupRsvp` once and authorize the script. It creates a persistent signing secret in Script Properties.
4. Deploy a Web app, execute as the owner, access Anyone. This setting is needed for invited guests without Google accounts. The Sheet itself must remain private.
5. Set `WEDDING_RSVP_ENDPOINT` in `assets/js/rsvp-api.js` to the returned `/exec` URL. The endpoint URL is public and is not a secret.

Updating backend source requires a new deployment version of the existing Web app. Keep the same deployment URL. Do not delete the signing secret unless intentionally invalidating all guest sessions.

## Attendees access

Attendees uses a simple host username and password. Store the allowed username in private `RSVP_ADMIN_EMAILS` (a JSON array), a random salt in `RSVP_ADMIN_PASSWORD_SALT`, and the salted SHA-256 password hash in `RSVP_ADMIN_PASSWORD_HASH`. Never put the password, salt, hash, or host username into the public source.

The login endpoint returns a signed, expiring host session token. Guest RSVP tokens do not grant Attendees access. The interface keeps the host token in session storage and clears it on sign-out. Authentication failures are limited to ten attempts per username per minute.

Attendees refreshes every 15 seconds while visible, on focus, or on Refresh. Its CSV export includes the current filter. RSVP writes update existing guest rows and use a script lock to serialize writes. The name gate checks invitation-list membership rather than proving identity, as agreed.

## Local preview

The local server under `rsvp-local` proxies the same production API over HTTPS. Local and published RSVP interfaces therefore write the same private Sheet after the endpoint is configured. Avoid test submissions once the real guest list is loaded.

Guests choose Team Vidhi, Team Vivek, or Team Both when tapping the envelope seal, then select their invited name. The team is saved to column G for that selected guest only; it does not silently reassign the rest of their household. Existing clients that omit the team preserve the current Sheet value.

## Plus-ones

Every invited guest may add one named companion, with separate attendance for each day they are invited to. Companions are stored in their own Sheet tab, linked to an original Guest ID with the stable ID `p1-<Guest ID>`. Editing a companion updates that row; removing a companion marks it inactive and excludes it from counts. The inviter’s current household and team are used in Attendees.

Companions are not returned by invitation name search, cannot create further plus-ones, and cannot be assigned to another household through a submitted ID. The backend rejects a +1 whose normalized name is already in the original guest list or another active companion record. Existing clients that omit the companion field preserve existing companion records; the new interface sends null to remove a +1.

Keep the Companions tab’s table range large enough for one companion per invited guest. The initial table reserves 200 companion rows.
