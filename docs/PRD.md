# Product Requirements Document
## KickPool — World Cup 2026 Betting Pool Tracker

**Version:** 1.0  
**Date:** June 2026  
**Status:** Draft — awaiting review  

---

## 1. Product Vision

KickPool makes every World Cup 2026 match personally meaningful for a friend group running a betting pool. It combines real-time tournament data with a friend-country ownership layer, AI-powered predictions, and agentic narrative intelligence — turning a 48-team global tournament into an intimate, personalised competition tracker.

---

## 2. Goals & Success Metrics

### Goals
1. Every friend checks the site rather than Googling scores during the tournament.
2. The site correctly shows which friend "owns" every country in every context (fixtures, standings, bracket).
3. AI predictions are visible before every match and tracked for accuracy.
4. The leaderboard updates automatically after every result.

### Success Metrics
| Metric | Target |
|--------|--------|
| Daily active users (8 friends) | 6+ per match day |
| Score staleness | < 90 seconds behind live during active matches |
| AI prediction uptime | 100% of matches have pre-match prediction |
| Leaderboard accuracy | Correct within 5 minutes of final whistle |
| Mobile usability | Full functionality on 375px viewport |

---

## 3. Users

### Primary User
**The Pool Participant** — one of 8 friends (Dan, Boris, Tim, Boomer, Rob, Ben, Hamish, Jake) who has been allocated 6 countries across the tournament. They want to know:
- Is my country playing now / soon?
- What's the score?
- Am I winning the pool?
- Who does the AI think will win?

### Secondary User
**The Creator/Admin** — sets up the friend-country allocation before the tournament and can override data if an API fails.

---

## 4. Friend-Country Allocation

The fixed allocation from the betting pool PDF:

| Group | Country | Friend |
|-------|---------|--------|
| A | Mexico | Dan |
| A | South Africa | Boris |
| A | South Korea | Tim |
| A | Czechia | Tim |
| B | Canada | Boomer |
| B | Bosnia and Herzegovina | Dan |
| B | Qatar | Boomer |
| B | Switzerland | Rob |
| C | Brazil | Dan |
| C | Morocco | Ben |
| C | Haiti | Hamish |
| C | Scotland | Tim |
| D | USA | Hamish |
| D | Paraguay | Ben |
| D | Australia | Ben |
| D | Turkey | Jake |
| E | Germany | Jake |
| E | Curacao | Jake |
| E | Ivory Coast | Jake |
| E | Ecuador | Rob |
| F | Netherlands | Rob |
| F | Japan | Hamish |
| F | Sweden | Hamish |
| F | Tunisia | Hamish |
| G | Belgium | Boris |
| G | Egypt | Dan |
| G | Iran | Dan |
| G | New Zealand | Boris |
| H | Spain | Hamish |
| H | Cape Verde | Dan |
| H | Saudi Arabia | Jake |
| H | Uruguay | Boomer |
| I | France | Tim |
| I | Senegal | Ben |
| I | Iraq | Boomer |
| I | Norway | Boris |
| J | Argentina | Tim |
| J | Algeria | Tim |
| J | Austria | Boomer |
| J | Jordan | Ben |
| K | Portugal | Boomer |
| K | DR Congo | Ben |
| K | Uzbekistan | Rob |
| K | Colombia | Boris |
| L | England | Jake |
| L | Croatia | Rob |
| L | Ghana | Rob |
| L | Panama | Boris |

**Friend country counts:**
- Dan: 7 countries (Mexico, Bosnia & Herz, Brazil, Egypt, Iran, Cape Verde + 1)
- Boris: 6 countries (South Africa, Belgium, New Zealand, Norway, Colombia, Panama)
- Tim: 7 countries (South Korea, Czechia, Scotland, France, Argentina, Algeria + 1)
- Boomer: 6 countries (Canada, Qatar, Iraq, Austria, Portugal, Uruguay)
- Rob: 6 countries (Switzerland, Ecuador, Netherlands, Uzbekistan, Croatia, Ghana)
- Ben: 7 countries (Morocco, Paraguay, Australia, Senegal, Jordan, DR Congo + 1)
- Hamish: 7 countries (Haiti, USA, Japan, Sweden, Tunisia, Spain + 1)
- Jake: 7 countries (Turkey, Germany, Curacao, Ivory Coast, Saudi Arabia, England + 1)

---

## 5. Features

### 5.1 Home / Dashboard
**Priority: P0**

- Tournament status banner (current phase: group stage / knockouts)
- Today's matches with:
  - Kick-off time in AEST
  - Country flags and names
  - Owning friends' names/avatars below each country
  - Live score (if in progress) or result (if finished) or "upcoming"
  - Match venue and city
- Friend leaderboard summary (top 3 with points)
- Quick-access group links

### 5.2 Group Stage View
**Priority: P0**

For each of the 12 groups (A–L):
- Group table: Country flag | Country | Friend | P | W | D | L | GF | GA | GD | Pts
- Group fixtures list with AEST times, scores, friend overlay
- Top 2 qualify indicator (and 8 best third-place teams)
- Visual highlighting of which countries are owned by the same friend (intra-group rivalry)

### 5.3 Country Card / Detail Page
**Priority: P1**

For each of the 48 countries:
- Flag (large, high-resolution)
- National colours (used as card accent/gradient)
- FIFA ranking
- Group and current standing
- Coach name and photo
- Key players (top 5): name, club, position, photo
- Upcoming and past fixtures with results
- Owning friend (name + avatar/colour)
- AI form assessment (2-3 sentence summary)

### 5.4 Fixture List
**Priority: P0**

- Full tournament schedule, filterable by:
  - Group
  - Friend (show only matches involving my countries)
  - Date
  - Stage
- Each fixture card:
  - Date + AEST time
  - Both teams with flags
  - Both owners' names
  - Score / status
  - Venue
  - Link to match detail

### 5.5 Match Detail Page
**Priority: P1**

- Live score with minute-by-minute status
- Scorers (goal times, player names)
- Yellow/red cards
- Pre-match AI prediction (generated before kick-off, persisted)
- Post-match AI analysis (generated within 15 min of final whistle)
- Head-to-head stats
- Friend commentary from Match Pulse Agent (see agentic systems)

### 5.6 Knockout Bracket
**Priority: P1**

- Visual bracket from Round of 32 → Round of 16 → QF → SF → Final
- Each slot shows: country flag, country name, owning friend
- Results filled in as they happen
- Unfilled slots show TBD or seeding rules
- Highlighting: tap a friend's name to highlight all their remaining countries

### 5.7 Friend Leaderboard
**Priority: P0**

- Ranked list of all 8 friends
- Current points (points per surviving country by stage)
- Countries still in tournament (green flags) vs eliminated (greyed flags)
- Points breakdown by country
- Projected final score from Tournament Oracle Agent
- "Countries remaining" count
- **Prize pool banner**: $400 total (8 × $50 buy-in) — 1st and 2nd place win prizes
- Proposed prize split: 1st = $280 (70%), 2nd = $120 (30%) — confirm with group

**Points system** — designed to rank friends 1st and 2nd clearly. Exponential weighting ensures deep runs matter far more than group-stage participation:

| Stage reached | Points per country |
|---|---|
| Group stage (any match played) | 1 |
| Advance from group (Round of 32) | 4 |
| Round of 16 | 8 |
| Quarter-final | 15 |
| Semi-final | 25 |
| Runner-up (Final) | 40 |
| **World Cup Winner** | **70** |

**Why exponential:** With 6 countries each, most friends will be close during the group stage. The big separation happens in the knockouts — a friend with two QF countries will visibly pull ahead. The World Cup winner alone is worth more than advancing all 6 countries from groups combined, which makes the final genuinely dramatic.

**Tiebreaker:** If two friends finish level on points, the friend whose highest-ranked country reached the furthest stage wins. Second tiebreaker: most countries surviving past the group stage.

### 5.8 AI Predictions Hub
**Priority: P1**

- List of all upcoming matches with Claude predictions
- Prediction accuracy tracker (correct outcome %, average error on scoreline)
- Tournament winner prediction (updated after each match day)
- "Claude's picks" leaderboard comparison vs actual results

### 5.9 WhatsApp Notifications (P1)
**DECIDED: WhatsApp group channel. User to provide the WhatsApp group invite link / number.**

Implementation via WhatsApp Business API (Meta Cloud API) or Twilio WhatsApp sender.

Messages sent to the group for:
- **Goal**: "⚽ GOAL — [Scorer] puts [Country] ([Friend]) ahead! [Score] vs [Country] ([Friend]) — [Minute]'"
- **Kick-off reminder**: "🏟️ [Country] ([Friend]) vs [Country] ([Friend]) kicks off in 30 minutes — [Time] AEST"
- **Full-time result**: "🏁 FT: [Country] [Score] [Country] — [Friend] earns X pts. [Friend] pool standings: 1st Dan (42pts) 2nd Tim (38pts)..."
- **Elimination**: "💀 [Country] eliminated. [Friend]'s hopes now rest on [remaining countries]."
- **Match Pulse highlight**: Best 1-2 Claude-generated banter lines per match (from Match Pulse Agent)
- **Oracle shift alert**: When any friend's win probability moves by more than 10% in a single result

**Technical note:** WhatsApp Cloud API requires a Meta Business account and phone number. Twilio is the simpler integration path. Messages are sent from the Next.js API route triggered by the Match Pulse Agent.

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Page load < 2 seconds on 4G mobile (LCP target < 2.5s)
- Live score refresh: 60-second poll during active matches
- Static group table cache: 5-minute TTL

### 6.2 Availability
- 99.5% uptime target during tournament match windows
- Graceful degradation: if live API fails, show last-known data with timestamp

### 6.3 Accessibility
- WCAG 2.1 AA compliance
- All country flags have text alternatives
- Sufficient colour contrast for national colour accents

### 6.4 Internationalisation
- Site in English only
- All times in AEST with UTC offset shown

### 6.5 Security
- API keys in environment variables, never in client-side code
- No user accounts / authentication — site is fully public
- Rate limiting on AI prediction endpoints to prevent abuse

---

## 7. Out of Scope (v1)

- User authentication / individual logins
- Mobile native app
- Real-money payment integration
- Configurable points systems via UI (hardcoded initially)
- Historical World Cup data
- Chat / messaging between friends within the app
- Fantasy team features beyond country allocation

---

## 8. Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|-----------|
| football-data.org API | Rate limits, outages | Cache all data; secondary API fallback |
| FIFA website data | Terms of service; structure changes | Use official APIs where available; screen-scrape only as last resort |
| Anthropic Claude API | Cost overrun from agentic loops | Per-match cost caps; daily budget alerts |
| AWS Amplify | Deployment failures | CI preview environments; rollback on Amplify |
| Country data APIs | Incomplete player/coach data | Graceful empty states; manual override capability |

---

## 9. Timeline

| Milestone | Target Date | Description |
|-----------|-------------|-------------|
| Documents approved | June 2026 | PRD, SPEC, PRFAQ signed off |
| Scaffold + CI/CD | Week 1 | Next.js app deployed on Amplify from GitHub |
| Data pipeline | Week 1-2 | Live scores, groups, fixtures flowing |
| Core UI | Week 2 | Groups, fixtures, leaderboard working |
| Country cards | Week 2-3 | Flags, players, coaches |
| AI predictions | Week 3 | Claude predictions before each match |
| Agentic systems | Week 3-4 | Match Pulse, Rivalry, Oracle agents live |
| Production hardening | Week 4 | Load testing, error handling, monitoring |
| Tournament start | ~June 11, 2026 | Site live for opening match |

---

## 10. Open Questions

1. ~~Should there be a public URL or password-protected access?~~ **DECIDED: Public URL, no auth.**
2. ~~What is the exact points system the group uses?~~ **DECIDED: Exponential system in §5.7. $400 pool (8 × $50), prizes for 1st and 2nd only. Prize split TBC — proposed 70/30 ($280/$120).**
3. ~~Should the site send WhatsApp/Slack notifications or browser-only?~~ **DECIDED: WhatsApp. User to provide group channel webhook/number. See §5.9.**
4. ~~Is there a pool entry fee / prize structure to display?~~ **DECIDED: $50 buy-in, $400 pool, 1st and 2nd place win. Display prize pool banner on leaderboard.**
5. ~~Do we want to support a "tipping" feature where friends predict each match result?~~ **DECIDED: No. Out of scope.**
