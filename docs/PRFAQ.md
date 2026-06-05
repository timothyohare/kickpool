# Working Backwards: Press Release / FAQ
## World Cup 2026 Betting Pool Tracker

---

## PRESS RELEASE

**FOR IMMEDIATE RELEASE**

### Introducing KickPool: The World Cup Betting Pool Tracker That Makes Every Game Personal

*Sydney, Australia — June 2026*

Today we are thrilled to announce **KickPool**, a real-time World Cup 2026 tracking website that transforms an international football tournament into a deeply personal competition between friends. KickPool shows you not just which countries are playing, but which of your friends are riding along with each team — turning obscure group-stage matches between nations you've barely heard of into nail-biting, friendship-defining moments.

With the 2026 FIFA World Cup expanding to 48 teams across the United States, Canada, and Mexico, keeping track of group stages, standings, match times, and predictions has never been harder — or more important when money is on the line. KickPool solves this by presenting a clean, real-time dashboard that overlays your friend group's bets directly onto every fixture, standing, and bracket update.

KickPool converts all match times to AEST so Australian fans never have to work out time zones. It pulls live scores, group standings, country flags, coach details, and key player information automatically. And it uses Claude AI to generate match predictions, tournament outcome forecasts, and personalised commentary — telling you exactly why Dan's Brazil pick is about to break his heart or why Tim's dark-horse Argentina might just go all the way.

Three agentic AI systems run continuously in the background: a **Match Pulse Agent** that crafts real-time narrative commentary for every goal and red card; a **Friend Rivalry Intelligence Agent** that tracks head-to-head dynamics and generates trash-talk-ready banter reports; and a **Tournament Oracle Agent** that recalculates every friend's winning probability after each match using Monte Carlo simulation.

"I've always wanted to build something that makes you care about games you'd normally ignore," said the creator. "When you know Boris has Senegal and Ben has Morocco in the same group, that match suddenly matters enormously. KickPool makes that connection explicit and fun."

KickPool is available now for private friend groups and is deployed on AWS Amplify for fast, reliable access from any device.

---

## FREQUENTLY ASKED QUESTIONS

### Customer FAQs

**Q: What is KickPool and who is it for?**
A: KickPool is a private World Cup tracker built specifically for friend groups that run betting pools during the tournament. It is for groups of friends (typically 6-12 people) who have each been allocated countries and want to follow the tournament with their bets front-of-mind at all times.

**Q: How does the friend-country allocation work?**
A: Before the tournament, each country in the 48-team field is assigned to a friend. KickPool reads that mapping and overlays it everywhere — on fixtures, group tables, and the knockout bracket. When you see a match, you immediately see both the countries playing and whose money is riding on each one.

**Q: What time zone are match times shown in?**
A: All match times are converted to and displayed in AEST (Australian Eastern Standard Time, UTC+10). The World Cup runs June–July 2026, which is Australian winter, so no daylight saving adjustment applies. You'll always know exactly when to tune in from Sydney, Melbourne, or Brisbane.

**Q: How current are the scores and standings?**
A: Scores and standings are updated near real-time via polling of live football data APIs (refreshing every 60 seconds during active matches, every 5 minutes otherwise). This is not a true push/streaming setup but is close enough to follow a live game.

**Q: Where does the country information come from?**
A: Flags, national colours, coach names, and key players are pulled from a combination of the REST Countries API, football-data.org, and Wikipedia's API. Country data is cached and refreshed daily.

**Q: What does the AI prediction feature do?**
A: Before each match, Claude AI analyses both teams' recent form, head-to-head history, squad quality, and tournament context to produce a structured prediction: likely scoreline, win probability, and a short narrative explaining its reasoning. Predictions are stored and tracked so you can see how well the AI has performed over the tournament.

**Q: Can I see who in my friend group is winning the pool?**
A: Yes. The leaderboard shows each friend's current score based on how many of their allocated countries are still in the tournament, adjusted for round reached (group stage = 1pt, Round of 32 = 2pts, QF = 4pts, SF = 8pts, Final = 16pts, Winner = 32pts — configurable). You see the rankings update after every elimination.

**Q: Does it cover the entire tournament — group stage through to the final?**
A: Yes. KickPool displays every stage: all 12 groups, the Round of 32, Round of 16, Quarter-finals, Semi-finals, Third-place play-off, and the Final. The bracket view updates automatically as results come in.

**Q: What devices does it work on?**
A: KickPool is a responsive web application. It works on desktop, tablet, and mobile browsers. No app install required.

---

### Internal / Business FAQs

**Q: Why build this rather than use an existing app like Google's World Cup tracker or ESPN?**
A: Existing apps track the World Cup as a sporting event. They have no concept of your friend group, who owns which country, or who is currently winning your pool. That personalisation layer — knowing Dan has Brazil and Boris has Belgium in the same group — is the entire point and cannot be added to an off-the-shelf product.

**Q: What is the architecture and how is it deployed?**
A: The application is a Next.js 14 (App Router) site with TypeScript and Tailwind CSS. It is deployed on AWS Amplify, connected to a GitHub repository. Data is stored in DynamoDB (scores cache, predictions, standing snapshots). Live data comes from football-data.org and is proxied through AWS Lambda API routes. The Claude API powers AI features.

**Q: How does the AI / agentic layer add value beyond a simple prediction widget?**
A: Three agentic systems run autonomously. The **Match Pulse Agent** monitors live scores and generates in-match narrative commentary pushed to users via notifications. The **Friend Rivalry Intelligence Agent** analyses the full fixture list to identify moments where friends' countries will directly compete and builds a tension narrative around the tournament. The **Tournament Oracle Agent** runs Monte Carlo simulations after each match result to produce updated win-probability distributions for every friend, making the leaderboard feel alive even between matches. These are not one-shot prompts — they are stateful agent loops that accumulate tournament context.

**Q: What is the risk of the data source going down or rate-limiting?**
A: Primary risk. Mitigation: cache all fetched data in DynamoDB with TTLs; display stale-with-timestamp indicators; have a fallback secondary API (API-Football) if the primary (football-data.org) fails. Score updates will degrade gracefully to a longer polling interval rather than failing entirely.

**Q: How long does the project need to run?**
A: The 2026 World Cup runs approximately mid-June to mid-July 2026 — roughly 5 weeks. The site needs to be live and reliable for that window. After the tournament, it can be archived.

**Q: What does success look like?**
A: The eight friends are checking the site daily. Group chat references KickPool rather than manually Googling scores. At least one memorable "the AI called it" or "the AI got it completely wrong" moment. The friend who wins the pool says they knew they were going to win because KickPool told them.

**Q: What is the estimated build timeline?**
A: 
- Week 1: Core scaffold, data pipeline, group tables, fixture list with friend overlay
- Week 2: Country cards, bracket view, leaderboard
- Week 3: AI predictions integration, agentic systems v1
- Week 4: Polish, mobile optimisation, notification system
- Buffer: 1 week before tournament start for production hardening

**Q: What is the estimated cost to run?**
A: AWS Amplify hosting: ~$5-15/month. DynamoDB at free tier / minimal cost. Anthropic API: ~$20-50/month depending on agentic system frequency. football-data.org free tier or ~$10/month paid. Total: under $80/month during the tournament window.
