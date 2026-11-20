// Cloudflare Pages Edge Anti-Scraper & Source Extraction Shield
const SCRAPER_UA_PATTERN =
  /termux|curl|wget|python-requests|python-urllib|httpx|aiohttp|scrapy|httrack|webcopier|teleport|offline explorer|site-sucker|okhttp|go-http-client|node-fetch|axios|undici|postman|insomnia|libwww|lwp-|nikto|sqlmap|dirbuster|gobuster|masscan|zgrab|headlesschrome|phantomjs|puppeteer|playwright|selenium/i;

const ALLOWED_SEARCH_BOTS =
  /googlebot|adsbot-google|mediapartners-google|bingbot|duckduckbot|yandexbot|slurp|facebookexternalhit|twitterbot|telegrambot|whatsapp|linkedinbot/i;

function isHtmlPageRequest(url: URL, accept: string): boolean {
  const p = url.pathname;
  if (p.startsWith('/api/') || p.startsWith('/sites/')) return false;
  if (p === '/' || p === '/index.html') return true;
  if (p.endsWith('.html') || !p.includes('.')) {
    return accept.includes('text/html') || accept === '*/*' || !accept;
  }
  return false;
}

export const onRequest = async (context: {
  request: Request;
  next: () => Promise<Response>;
}): Promise<Response> => {
  const { request, next } = context;
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const accept = (request.headers.get('accept') || '').toLowerCase();

  if (isHtmlPageRequest(url, accept)) {
    const isSearchBot = ALLOWED_SEARCH_BOTS.test(ua);
    if (!isSearchBot) {
      const hasMozilla = /mozilla\/5\.0/i.test(ua);
      const isBadAgent = !ua.trim() || !hasMozilla || SCRAPER_UA_PATTERN.test(ua);
      const hasFetchDest = request.headers.has('sec-fetch-dest');
      const fetchDest = (request.headers.get('sec-fetch-dest') || '').toLowerCase();
      const nonDocumentFetch = hasFetchDest && fetchDest && fetchDest !== 'document' && fetchDest !== 'iframe';

      if (isBadAgent || nonDocumentFetch) {
        return new Response(
          '<!doctype html><html><head><meta charset="utf-8"><title>403 Access Restricted</title></head><body style="font-family:sans-serif;background:#090f1d;color:#94a3b8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><div style="text-align:center"><h2>403 — Access Restricted</h2><p>Automated source extraction is blocked on this domain.</p></div></body></html>',
          {
            status: 403,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-Robots-Tag': 'noindex',
            },
          }
        );
      }
    }
  }

  const response = await next();
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
