import fs from 'fs';
import path from 'path';

const SEO_CONFIG_FILE = path.join(process.cwd(), 'storage', 'seo_config.json');

export interface SeoConfig {
  siteName: string;
  baseUrl: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  yandexVerification?: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage: string;
  twitterHandle: string;
  lastUpdated: string;
}

const DEFAULT_SEO_CONFIG: SeoConfig = {
  siteName: 'BD Topsell',
  baseUrl: 'https://bdtopsell.pages.dev',
  googleSiteVerification: 'google-site-verification-token',
  bingSiteVerification: '',
  yandexVerification: '',
  metaTitle: 'BD Topsell – Free Fire Diamond & PUBG UC Top Up & Micro Jobs',
  metaDescription: 'BD Topsell – বাংলাদেশের বিশ্বস্ত গেমিং টপ-আপ ও অনলাইন ইনকাম প্ল্যাটফর্ম। Free Fire Diamond, PUBG UC, Facebook/Instagram/Gmail অ্যাকাউন্ট সেল করে ইনকাম ও সোশ্যাল মিডিয়া ফলোয়ার সেবা।',
  keywords: [
    'bd topsell', 'bdtopsell.pages.dev', 'free fire diamond top up bd', 'free fire diamond buy bkash',
    'ff 100 diamond top up bd', 'ff weekly membership buy bd', 'pubg uc buy bangladesh',
    'pubg mobile uc top up bkash nagad', 'facebook account sell kore income', 'fb id sell bd',
    'instagram account sell kore income', 'insta id sell bd', 'gmail account sell kore income',
    'gmail sell bd', 'online income bd', 'daily earn bd', 'buy facebook followers bd',
    'bd bot hosting', 'vps hosting bd'
  ],
  ogImage: 'https://cdn.iconscout.com/icon/free/png-512/free-garena-free-fire-3628795-3030018.png',
  twitterHandle: '@bdtopsell',
  lastUpdated: new Date().toISOString()
};

function ensureStorageDir() {
  const dir = path.dirname(SEO_CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getSeoConfig(): SeoConfig {
  ensureStorageDir();
  if (!fs.existsSync(SEO_CONFIG_FILE)) {
    fs.writeFileSync(SEO_CONFIG_FILE, JSON.stringify(DEFAULT_SEO_CONFIG, null, 2), 'utf-8');
    return DEFAULT_SEO_CONFIG;
  }
  try {
    const raw = fs.readFileSync(SEO_CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_SEO_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SEO_CONFIG;
  }
}

export function updateSeoConfig(newConfig: Partial<SeoConfig>): SeoConfig {
  ensureStorageDir();
  const current = getSeoConfig();
  const updated: SeoConfig = {
    ...current,
    ...newConfig,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(SEO_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export function generateSitemapXml(reqHost?: string, reqProto = 'https'): string {
  const cfg = getSeoConfig();
  const base = (reqHost ? `${reqProto}://${reqHost}` : cfg.baseUrl).replace(/\/+$/, '');
  const today = new Date().toISOString().split('T')[0];

  const routes = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/#home', priority: '0.9', changefreq: 'daily' },
    { path: '/#gaming', priority: '0.95', changefreq: 'always' },
    { path: '/#gaming/ff', priority: '0.95', changefreq: 'always' },
    { path: '/#gaming/pubg', priority: '0.95', changefreq: 'always' },
    { path: '/#tempmail', priority: '0.85', changefreq: 'daily' },
    { path: '/#getnumber', priority: '0.9', changefreq: 'daily' },
    { path: '/#hosting', priority: '0.9', changefreq: 'daily' },
    { path: '/#jobs', priority: '0.85', changefreq: 'daily' },
    { path: '/#job-facebook', priority: '0.85', changefreq: 'weekly' },
    { path: '/#job-gmail', priority: '0.85', changefreq: 'weekly' },
    { path: '/#job-instagram', priority: '0.85', changefreq: 'weekly' },
    { path: '/#subscriptions', priority: '0.85', changefreq: 'weekly' },
    { path: '/#deposit', priority: '0.8', changefreq: 'weekly' },
    { path: '/#withdraw', priority: '0.8', changefreq: 'weekly' },
    { path: '/#team', priority: '0.75', changefreq: 'weekly' },
    { path: '/#help', priority: '0.7', changefreq: 'monthly' },
    { path: '/#notifications', priority: '0.7', changefreq: 'daily' }
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
  xml += `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`;
  xml += `        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n\n`;

  for (const r of routes) {
    xml += `  <url>\n`;
    xml += `    <loc>${base}${r.path}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${r.changefreq}</changefreq>\n`;
    xml += `    <priority>${r.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

export function generateRobotsTxt(reqHost?: string, reqProto = 'https'): string {
  const cfg = getSeoConfig();
  const base = (reqHost ? `${reqProto}://${reqHost}` : cfg.baseUrl).replace(/\/+$/, '');

  return `# Robots.txt for BD Topsell
# Auto-generated by Google Search Console Suite
User-agent: *
Allow: /
Allow: /#*
Allow: /sitemap.xml
Allow: /robots.txt
Allow: /sites/

# Restrict sensitive admin or private panels
Disallow: /admin
Disallow: /#admin

Sitemap: ${base}/sitemap.xml
`;
}
