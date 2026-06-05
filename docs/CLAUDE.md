# World Cup 2026 Betting Pool Site

## Project Overview
A real-time World Cup 2026 tracking website for a friend group betting pool. Shows live scores, group standings, match times in AEST, country details, and AI-powered predictions. Built with React/Next.js, deployed on AWS Amplify.

## Friend Group & Country Allocations

### Group A
| Country | Friend |
|---------|--------|
| Mexico | Dan |
| South Africa | Boris |
| South Korea | Tim |
| Czechia | Tim |

### Group B
| Country | Friend |
|---------|--------|
| Canada | Boomer |
| Bosnia and Herzegovina | Dan |
| Qatar | Boomer |
| Switzerland | Rob |

### Group C
| Country | Friend |
|---------|--------|
| Brazil | Dan |
| Morocco | Ben |
| Haiti | Hamish |
| Scotland | Tim |

### Group D
| Country | Friend |
|---------|--------|
| USA | Hamish |
| Paraguay | Ben |
| Australia | Ben |
| Turkey | Jake |

### Group E
| Country | Friend |
|---------|--------|
| Germany | Jake |
| Curacao | Jake |
| Ivory Coast | Jake |
| Ecuador | Rob |

### Group F
| Country | Friend |
|---------|--------|
| Netherlands | Rob |
| Japan | Hamish |
| Sweden | Hamish |
| Tunisia | Hamish |

### Group G
| Country | Friend |
|---------|--------|
| Belgium | Boris |
| Egypt | Dan |
| Iran | Dan |
| New Zealand | Boris |

### Group H
| Country | Friend |
|---------|--------|
| Spain | Hamish |
| Cape Verde | Dan |
| Saudi Arabia | Jake |
| Uruguay | Boomer |

### Group I
| Country | Friend |
|---------|--------|
| France | Tim |
| Senegal | Ben |
| Iraq | Boomer |
| Norway | Boris |

### Group J
| Country | Friend |
|---------|--------|
| Argentina | Tim |
| Algeria | Tim |
| Austria | Boomer |
| Jordan | Ben |

### Group K
| Country | Friend |
|---------|--------|
| Portugal | Boomer |
| DR Congo | Ben |
| Uzbekistan | Rob |
| Colombia | Boris |

### Group L
| Country | Friend |
|---------|--------|
| England | Jake |
| Croatia | Rob |
| Ghana | Rob |
| Panama | Boris |

## Friends
Dan, Boris, Tim, Boomer, Rob, Ben, Hamish, Jake (8 friends)

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: AWS Lambda (API routes via Next.js or separate Lambda functions)
- **Deployment**: AWS Amplify (same pattern as user's other sites)
- **Database**: DynamoDB (scores, standings, predictions cache)
- **AI**: Claude API (Anthropic) for predictions and agentic features
- **Data Sources**: FIFA website scraping / official FIFA API, football-data.org

## Architecture
- `/app` — Next.js App Router pages
- `/components` — Reusable UI components
- `/lib` — Data fetching, API clients, Claude integration
- `/agents` — Agentic system implementations
- `/types` — TypeScript types

## Key Features
1. Live scores updated near real-time (polling or websockets)
2. Match times displayed in AEST (UTC+10 / UTC+11 DST)
3. Group standings with W/D/L/GD/Pts
4. Knockout bracket visualisation
5. Country cards: flag, colours, coach, key players
6. Friend leaderboard (points per country advancing)
7. Claude AI match predictions
8. Three agentic systems (see AGENTIC_SYSTEMS.md)

## Data Sources
- **Live scores**: football-data.org API (free tier available), API-Football, or ESPN unofficial API
- **Country details**: REST Countries API for flags/colours
- **Players/coaches**: Wikipedia API or football-data.org
- **Predictions**: Claude claude-sonnet-4-6 via Anthropic SDK

## Time Zone
All match times displayed in **AEST** (Australia/Sydney, UTC+10 standard / UTC+11 daylight saving).
World Cup runs June–July 2026 — AEST applies (no DST in winter).

## Development Commands
```bash
npm run dev          # local development
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

## AWS Amplify Deployment
- Connect GitHub repo to Amplify
- Set environment variables in Amplify console
- Build settings: `amplify.yml` in repo root
- Branch: `main` deploys to production

## Environment Variables
```
ANTHROPIC_API_KEY=
FOOTBALL_DATA_API_KEY=
FIFA_API_KEY=          # if available
NEXT_PUBLIC_SITE_URL=
TWILIO_ACCOUNT_SID=    # WhatsApp notifications via Twilio
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=  # e.g. whatsapp:+14155238886
WHATSAPP_GROUP_TO=     # target WhatsApp group number
```

## Document Index
- `PRFAQ.md` — Working Backwards PR/FAQ
- `PRD.md` — Product Requirements Document
- `SPEC.md` — Technical Specification
- `AGENTIC_SYSTEMS.md` — AI agentic system designs
