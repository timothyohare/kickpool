# Human TODO — KickPool

Things that require human action (accounts, credentials, approvals) before or during the build.

---

## Before Build Starts

### [ ] football-data.org API key
Sign up at https://www.football-data.org/client/register
- Free tier: 10 req/min, covers WC competition
- Add key to `.env` as `FOOTBALL_DATA_API_KEY`
- Confirm the 2026 World Cup competition is active (competition code: `WC`)

### [ ] GitHub repository
Create a new GitHub repo called `kickpool` (or similar).
- Set visibility: Public or Private (your call)
- Add as remote: `git remote add origin <your-repo-url>`
- Needed before Amplify deployment

### [ ] AWS Amplify setup
- Log into AWS Console → Amplify → New App → Host Web App
- Connect to the GitHub repo above
- Set environment variables in Amplify console (copy from `.env`)
- Confirm the app URL once deployed

---

## Before Tournament Starts (~June 11, 2026)

### [ ] WhatsApp group channel details *(deferred — add later)*
When ready to set up WhatsApp notifications:
- Option A (simpler): Create a Twilio account at https://twilio.com, enable WhatsApp Sandbox
- Option B (production): Apply for Meta WhatsApp Business API (takes ~1 week approval)
- Provide: the WhatsApp group number or Twilio sandbox join code
- Add to `.env`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `WHATSAPP_GROUP_TO`

### [ ] Prize split confirmation
Proposed: 1st place = $280, 2nd place = $120 (70/30 split of $400 pool).
Confirm with the group before it's displayed on the site.

### [ ] Review and confirm points system
Points proposal in `docs/PRD.md §5.7`. Confirm the group is happy with it before the tournament starts — it's hardcoded and can't be changed mid-tournament.

---

## Nice to Have (Not Blocking)

### [ ] Custom domain
Register a domain (e.g. `kickpool.com.au`) via Route 53 or your registrar.
Connect to Amplify via custom domain settings.

### [ ] Favicon / logo
A simple football + money emoji combo works fine as a placeholder.
Any actual branding needs to be provided as an SVG/PNG.
