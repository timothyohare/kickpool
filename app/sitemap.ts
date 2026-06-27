import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kickpool.ohare.id.au';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`,            changeFrequency: 'always',  priority: 1.0 },
    { url: `${BASE}/bracket`,     changeFrequency: 'always',  priority: 0.9 },
    { url: `${BASE}/fixtures`,    changeFrequency: 'always',  priority: 0.9 },
    { url: `${BASE}/leaderboard`, changeFrequency: 'always',  priority: 0.9 },
    { url: `${BASE}/my-teams`,    changeFrequency: 'always',  priority: 0.8 },
    { url: `${BASE}/groups`,      changeFrequency: 'hourly',  priority: 0.7 },
    { url: `${BASE}/predictions`, changeFrequency: 'daily',   priority: 0.6 },
  ];
}
