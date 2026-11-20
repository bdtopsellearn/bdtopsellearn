import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

export type PanelEngine =
  | 'ints_smscdr'
  | 'ints_smsranges'
  | 'xisora'
  | 'html_scrape'
  | 'api_key'
  | 'unixsms_cdr'
  | 'iva_sms';

export type PanelConnectMode = 'web_login' | 'api_key' | 'iva_cookie';
export type V2PanelId = 'fastx' | 'stex' | 'voltex' | 'mk';

export const CONSOLE_PLATFORMS = [
  'FACEBOOK',
  'WHATSAPP',
  'INSTAGRAM',
  'TELEGRAM',
  'TWITTER',
  'TIKTOK',
  'SNAPCHAT',
  'GOOGLE',
  'BINANCE',
  'YOUTUBE',
  'LINKEDIN',
  'AMAZON',
] as const;

const DATA_DIR = path.join(process.cwd(), 'storage');
const DB_FILE = path.join(DATA_DIR, 'number_system_db.json');

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export interface NsServiceItem {
  key: string;
  label: string;
  icon: string;
  reward: number; // in BDT (or primary reward currency)
  active: boolean;
  createdAt: string;
}

export interface NsConsolePlatformConfig {
  enabled: boolean;
  ranges: string[];
}

export interface NsAssignment {
  id: string;
  uid: string;
  userName: string;
  source: 'v1' | 'v2' | 'v3';
  serviceKey: string;
  serviceName: string;
  countryName: string;
  iso2: string;
  emoji: string;
  number: string; // canonical digits
  withPlus: string;
  withoutCc: string;
  assignedAtMs: number;
  expiresAtMs: number;
  panelSource?: string;
}

export interface NsPanelItem {
  id: string;
  name: string;
  mode: PanelConnectMode;
  engine: PanelEngine;
  host: string;
  baseUrl: string;
  urlHint: string;
  dataPath: string;
  username: string;
  password: string;
  apiKey: string;
  apiKeyParam: string;
  ivaCookie: string;
  ivaAjaxUrl: string;
  cookies: Record<string, string>;
  sessionToken: string;
  active: boolean;
  scanInterval: number;
  status: 'ok' | 'error' | 'paused';
  fetchCount: number;
  errors: number;
  lastError: string | null;
  lastScannedAt: string | null;
  lastSmsSample: { number: string; otp: string; service: string; message: string; ts: string } | null;
  addedAt: string;
}

export interface NsWaLinkEntry {
  id: string;
  number: string;
  url: string;
  addedAt: string;
}

export interface NsPaidWaOrder {
  orderId: string;
  uid: string;
  userName: string;
  number: string;
  url: string;
  priceUsdt: number;
  chargedBdt: number;
  status: 'pending' | 'completed' | 'refunded';
  purchasedAtMs: number;
  deadlineMs: number;
  otp: string;
  completedAtMs: number | null;
  refundedAtMs: number | null;
  walletRefundPending: boolean;
  walletRefundAcked: boolean;
  batchId: string | null;
}

export interface NsPaidWaRefundBatch {
  batchId: string;
  dayKey: string;
  orderIds: string[];
  totalOrders: number;
  totalUsdt: number;
  totalBdt: number;
  status: 'pending' | 'approved';
  createdAt: string;
  approvedAt: string | null;
}

export interface NsVpnProduct {
  id: string;
  name: string;
  icon: string;
  duration: string;
  price: number; // BDT
  category: 'vpn' | 'proxy';
}

export interface NsBuyOrder {
  orderId: string;
  uid: string;
  userName: string;
  orderType: 'vpn' | 'proxy' | 'premium';
  serviceId: string;
  serviceName: string;
  duration: string;
  priceBdt: number;
  priceUsdt: number;
  txRef: string;
  deliveryNote: string;
  status: 'pending' | 'completed' | 'rejected';
  walletRefundPending: boolean;
  walletRefundAcked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NsOtpDelivery {
  id: string;
  uid: string;
  referrerUid: string | null;
  panelId: string;
  panelName: string;
  serviceKey: string;
  serviceName: string;
  countryName: string;
  iso2: string;
  emoji: string;
  number: string;
  sender: string;
  message: string;
  otpCode: string;
  otpDash: string;
  rewardBdt: number;
  rewardUsdt: number;
  referrerCommissionBdt: number;
  createdAt: string;
  acknowledged: boolean;
}

export interface NsTrafficHit {
  key: string;
  numberRaw: string;
  numberMasked: string;
  otpCode: string;
  otpDash: string;
  serviceKey: string;
  countryName: string;
  iso2: string;
  emoji: string;
  hitCount: number;
  tsMs: number;
  panelName: string;
}

export interface NsDemoConfig {
  id: string;
  name: string;
  services: string[];
  digits: number;
  interval: number;
  numbers: string[];
  active: boolean;
}

export interface NsUserMeta {
  uid: string;
  name: string;
  email: string;
  numericId: string;
  referredByUid: string | null;
  otpCount: number;
  totalEarnedBdt: number;
  totalEarnedUsdt: number;
  qualifiedReferrals: number;
  referralEarningsBdt: number;
  joinedAt: string;
  lastActiveAt: string;
}

export interface NsSettings {
  rewardPerOtp: number; // Default BDT per OTP
  currency: string;
  dollarRate: number;
  minWithdraw: number;
  referCommissionPct: number; // % of OTP reward for referrer
  numbersPerBatch: number;
  numberValidTimeMinutes: number;
  paidWaPriceUsdt: number;
  paidWaTimeoutSeconds: number;
  v2ActivePanel: V2PanelId;
  v2UserMode: boolean;
  v3Enabled: boolean;
  puranoOtpEnabled: boolean;
  liveTrafficUserEnabled: boolean;
  leaderboardEnabled: boolean;
  panelKeys: {
    fastxBase: string;
    fastxKey: string;
    stexBase: string;
    stexKey: string;
    voltexBase: string;
    voltexKey: string;
    mkBase: string;
    mkKey: string;
    augestelBase: string;
    augestelKey: string;
  };
}

export interface NsDatabase {
  settings: NsSettings;
  services: NsServiceItem[];
  stock: Record<string, Record<string, string[]>>;
  usedNumbers: string[];
  assignments: NsAssignment[];
  consoleConfig: Record<string, NsConsolePlatformConfig>;
  panels: NsPanelItem[];
  waOtpLinks: NsWaLinkEntry[];
  paidWaOrders: NsPaidWaOrder[];
  paidWaRefundBatches: NsPaidWaRefundBatch[];
  buyService: {
    premiumPrices: { '3M': number; '6M': number; '1Y': number };
    vpnServices: NsVpnProduct[];
    orders: NsBuyOrder[];
  };
  deliveries: NsOtpDelivery[];
  seenKeys: string[];
  recentTraffic: NsTrafficHit[];
  demoConfigs: NsDemoConfig[];
  users: Record<string, NsUserMeta>;
}

// ── Country Prefix Lookup Table (Comprehensive Global Dial Codes) ─────────────
const COUNTRY_PREFIX_TABLE: Array<[string, string, string, string]> = [
  ['880', 'Bangladesh', 'BD', '🇧🇩'],
  ['1', 'USA / Canada', 'US', '🇺🇸'],
  ['44', 'United Kingdom', 'GB', '🇬🇧'],
  ['91', 'India', 'IN', '🇮🇳'],
  ['92', 'Pakistan', 'PK', '🇵🇰'],
  ['62', 'Indonesia', 'ID', '🇮🇩'],
  ['7', 'Russia', 'RU', '🇷🇺'],
  ['234', 'Nigeria', 'NG', '🇳🇬'],
  ['63', 'Philippines', 'PH', '🇵🇭'],
  ['84', 'Vietnam', 'VN', '🇻🇳'],
  ['60', 'Malaysia', 'MY', '🇲🇾'],
  ['20', 'Egypt', 'EG', '🇪🇬'],
  ['55', 'Brazil', 'BR', '🇧🇷'],
  ['254', 'Kenya', 'KE', '🇰🇪'],
  ['27', 'South Africa', 'ZA', '🇿🇦'],
  ['49', 'Germany', 'DE', '🇩🇪'],
  ['33', 'France', 'FR', '🇫🇷'],
  ['90', 'Turkey', 'TR', '🇹🇷'],
  ['966', 'Saudi Arabia', 'SA', '🇸🇦'],
  ['971', 'UAE', 'AE', '🇦🇪'],
  ['996', 'Kyrgyzstan', 'KG', '🇰🇬'],
  ['225', 'Ivory Coast', 'CI', '🇨🇮'],
  ['212', 'Morocco', 'MA', '🇲🇦'],
  ['213', 'Algeria', 'DZ', '🇩🇿'],
  ['216', 'Tunisia', 'TN', '🇹🇳'],
  ['218', 'Libya', 'LY', '🇱🇾'],
  ['221', 'Senegal', 'SN', '🇸🇳'],
  ['223', 'Mali', 'ML', '🇲🇱'],
  ['226', 'Burkina Faso', 'BF', '🇧🇫'],
  ['227', 'Niger', 'NE', '🇳🇪'],
  ['228', 'Togo', 'TG', '🇹🇬'],
  ['229', 'Benin', 'BJ', '🇧🇯'],
  ['233', 'Ghana', 'GH', '🇬🇭'],
  ['237', 'Cameroon', 'CM', '🇨🇲'],
  ['243', 'DR Congo', 'CD', '🇨🇩'],
  ['244', 'Angola', 'AO', '🇦🇴'],
  ['249', 'Sudan', 'SD', '🇸🇩'],
  ['251', 'Ethiopia', 'ET', '🇪🇹'],
  ['255', 'Tanzania', 'TZ', '🇹🇿'],
  ['256', 'Uganda', 'UG', '🇺🇬'],
  ['258', 'Mozambique', 'MZ', '🇲🇿'],
  ['260', 'Zambia', 'ZM', '🇿🇲'],
  ['263', 'Zimbabwe', 'ZW', '🇿🇼'],
  ['31', 'Netherlands', 'NL', '🇳🇱'],
  ['32', 'Belgium', 'BE', '🇧🇪'],
  ['34', 'Spain', 'ES', '🇪🇸'],
  ['39', 'Italy', 'IT', '🇮🇹'],
  ['40', 'Romania', 'RO', '🇷🇴'],
  ['41', 'Switzerland', 'CH', '🇨🇭'],
  ['43', 'Austria', 'AT', '🇦🇹'],
  ['45', 'Denmark', 'DK', '🇩🇰'],
  ['46', 'Sweden', 'SE', '🇸🇪'],
  ['47', 'Norway', 'NO', '🇳🇴'],
  ['48', 'Poland', 'PL', '🇵🇱'],
  ['51', 'Peru', 'PE', '🇵🇪'],
  ['52', 'Mexico', 'MX', '🇲🇽'],
  ['53', 'Cuba', 'CU', '🇨🇺'],
  ['54', 'Argentina', 'AR', '🇦🇷'],
  ['56', 'Chile', 'CL', '🇨🇱'],
  ['57', 'Colombia', 'CO', '🇨🇴'],
  ['58', 'Venezuela', 'VE', '🇻🇪'],
  ['61', 'Australia', 'AU', '🇦🇺'],
  ['64', 'New Zealand', 'NZ', '🇳🇿'],
  ['65', 'Singapore', 'SG', '🇸🇬'],
  ['66', 'Thailand', 'TH', '🇹🇭'],
  ['81', 'Japan', 'JP', '🇯🇵'],
  ['82', 'South Korea', 'KR', '🇰🇷'],
  ['86', 'China', 'CN', '🇨🇳'],
  ['93', 'Afghanistan', 'AF', '🇦🇫'],
  ['94', 'Sri Lanka', 'LK', '🇱🇰'],
  ['95', 'Myanmar', 'MM', '🇲🇲'],
  ['98', 'Iran', 'IR', '🇮🇷'],
  ['351', 'Portugal', 'PT', '🇵🇹'],
  ['353', 'Ireland', 'IE', '🇮🇪'],
  ['358', 'Finland', 'FI', '🇫🇮'],
  ['370', 'Lithuania', 'LT', '🇱🇹'],
  ['371', 'Latvia', 'LV', '🇱🇻'],
  ['372', 'Estonia', 'EE', '🇪🇪'],
  ['373', 'Moldova', 'MD', '🇲🇩'],
  ['374', 'Armenia', 'AM', '🇦🇲'],
  ['375', 'Belarus', 'BY', '🇧🇾'],
  ['380', 'Ukraine', 'UA', '🇺🇦'],
  ['381', 'Serbia', 'RS', '🇷🇸'],
  ['420', 'Czechia', 'CZ', '🇨🇿'],
  ['421', 'Slovakia', 'SK', '🇸🇰'],
  ['502', 'Guatemala', 'GT', '🇬🇹'],
  ['503', 'El Salvador', 'SV', '🇸🇻'],
  ['504', 'Honduras', 'HN', '🇭🇳'],
  ['505', 'Nicaragua', 'NI', '🇳🇮'],
  ['506', 'Costa Rica', 'CR', '🇨🇷'],
  ['507', 'Panama', 'PA', '🇵🇦'],
  ['591', 'Bolivia', 'BO', '🇧🇴'],
  ['593', 'Ecuador', 'EC', '🇪🇨'],
  ['595', 'Paraguay', 'PY', '🇵🇾'],
  ['598', 'Uruguay', 'UY', '🇺🇾'],
  ['852', 'Hong Kong', 'HK', '🇭🇰'],
  ['855', 'Cambodia', 'KH', '🇰🇭'],
  ['856', 'Laos', 'LA', '🇱🇦'],
  ['886', 'Taiwan', 'TW', '🇹🇼'],
  ['961', 'Lebanon', 'LB', '🇱🇧'],
  ['962', 'Jordan', 'JO', '🇯🇴'],
  ['963', 'Syria', 'SY', '🇸🇾'],
  ['964', 'Iraq', 'IQ', '🇮🇶'],
  ['965', 'Kuwait', 'KW', '🇰🇼'],
  ['967', 'Yemen', 'YE', '🇾🇪'],
  ['968', 'Oman', 'OM', '🇴🇲'],
  ['972', 'Israel', 'IL', '🇮🇱'],
  ['973', 'Bahrain', 'BH', '🇧🇭'],
  ['974', 'Qatar', 'QA', '🇶🇦'],
  ['977', 'Nepal', 'NP', '🇳🇵'],
  ['992', 'Tajikistan', 'TJ', '🇹🇯'],
  ['993', 'Turkmenistan', 'TM', '🇹🇲'],
  ['994', 'Azerbaijan', 'AZ', '🇦🇿'],
  ['995', 'Georgia', 'GE', '🇬🇪'],
  ['998', 'Uzbekistan', 'UZ', '🇺🇿'],
];

const SORTED_PREFIXES = [...COUNTRY_PREFIX_TABLE].sort((a, b) => b[0].length - a[0].length);

export function getCountryDetails(numOrPrefix: string): {
  dialCode: string;
  countryName: string;
  iso2: string;
  emoji: string;
} {
  const digits = String(numOrPrefix || '').replace(/\D/g, '');
  for (const [dial, name, iso2, emoji] of SORTED_PREFIXES) {
    if (digits.startsWith(dial)) {
      return { dialCode: dial, countryName: name, iso2, emoji };
    }
  }
  return { dialCode: '', countryName: 'International', iso2: 'GL', emoji: '🌍' };
}

export function stripDialCode(num: string): { withPlus: string; withoutCc: string } {
  const digits = String(num || '').replace(/\D/g, '');
  const { dialCode } = getCountryDetails(digits);
  const withoutCc = dialCode && digits.length > dialCode.length + 4 ? digits.slice(dialCode.length) : digits;
  return {
    withPlus: '+' + digits,
    withoutCc,
  };
}

export function normalizeDigits(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

export function maskPhoneNumber(num: string): string {
  const digits = normalizeDigits(num);
  if (digits.length < 7) return '+' + digits;
  return `+${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

export function formatOtpDash(otp: string): string {
  const clean = String(otp || '').replace(/\D/g, '');
  if (clean.length === 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  return clean;
}

export function extractOtpFromSms(smsText: string): string | null {
  if (!smsText) return null;
  const text = String(smsText).trim();
  if (text.length < 4) return null;
  if (/^\d{4,8}$/.test(text)) return text;
  const waMatch = text.match(/^(\d{3})[- ](\d{3})$/);
  if (waMatch) return waMatch[1] + waMatch[2];
  const hasLatin = /[a-zA-Z]/.test(text);
  const hasNonAscii = /[^\x00-\x7F]/.test(text);
  if (!hasLatin && !hasNonAscii) return null;
  let cleaned = text.replace(/(?<=\d) (?=\d)/g, '');
  cleaned = cleaned.replace(/(\d)-(\d)/g, '$1$2');
  cleaned = cleaned.replace(/(\d)\.(\d)/g, '$1$2');
  const m = cleaned.match(/\b(\d{4,8})\b/);
  return m ? m[1] : null;
}

export function detectServiceFromSms(smsText: string): string {
  const t = String(smsText || '').toLowerCase();
  if (!t) return 'Other';
  if (/whatsapp|w\.a\.|whatapp/.test(t)) return 'WHATSAPP';
  if (/facebook|fb-|meta\b/.test(t)) return 'FACEBOOK';
  if (/instagram|\big\b/.test(t)) return 'INSTAGRAM';
  if (/telegram|\btg\b/.test(t)) return 'TELEGRAM';
  if (/tiktok|bytedance/.test(t)) return 'TIKTOK';
  if (/twitter|x\.com/.test(t)) return 'TWITTER';
  if (/snapchat/.test(t)) return 'SNAPCHAT';
  if (/google|gmail|g-\d/.test(t)) return 'GOOGLE';
  if (/binance/.test(t)) return 'BINANCE';
  if (/amazon/.test(t)) return 'AMAZON';
  if (/youtube/.test(t)) return 'YOUTUBE';
  if (/linkedin/.test(t)) return 'LINKEDIN';
  return 'Other';
}

export function canonicalServiceKey(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function defaultConsoleConfig(): Record<string, NsConsolePlatformConfig> {
  const obj: Record<string, NsConsolePlatformConfig> = {};
  for (const plat of CONSOLE_PLATFORMS) {
    obj[plat] = {
      enabled: ['FACEBOOK', 'WHATSAPP', 'INSTAGRAM', 'TELEGRAM'].includes(plat),
      ranges: [],
    };
  }
  return obj;
}

function defaultDb(): NsDatabase {
  return {
    settings: {
      rewardPerOtp: 0.5,
      currency: '৳',
      dollarRate: 129.5,
      minWithdraw: 50,
      referCommissionPct: 5,
      numbersPerBatch: 3,
      numberValidTimeMinutes: 10,
      paidWaPriceUsdt: 0.125,
      paidWaTimeoutSeconds: 240,
      v2ActivePanel: 'fastx',
      v2UserMode: true,
      v3Enabled: true,
      puranoOtpEnabled: false,
      liveTrafficUserEnabled: true,
      leaderboardEnabled: true,
      panelKeys: {
        fastxBase: 'https://2eee7.com/@Access/@Bot/2eee7/@public',
        fastxKey: '',
        stexBase: 'https://api.2oo9.cloud/MXS47FLFX0U/tness/@public/api',
        stexKey: '',
        voltexBase: 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api',
        voltexKey: '',
        mkBase: 'https://mkonlinesms.com/@Telegram/@Bot/3oo10/@public/api',
        mkKey: '',
        augestelBase: 'https://augestelsms.com/api/v1',
        augestelKey: '',
      },
    },
    services: [
      { key: 'facebook', label: 'Facebook', icon: '📘', reward: 0.5, active: true, createdAt: new Date().toISOString() },
      { key: 'whatsapp', label: 'WhatsApp', icon: '💬', reward: 0.5, active: true, createdAt: new Date().toISOString() },
      { key: 'telegram', label: 'Telegram', icon: '✈️', reward: 0.5, active: true, createdAt: new Date().toISOString() },
      { key: 'instagram', label: 'Instagram', icon: '📸', reward: 0.5, active: true, createdAt: new Date().toISOString() },
      { key: 'binance', label: 'Binance', icon: '🪙', reward: 0.5, active: true, createdAt: new Date().toISOString() },
      { key: 'pcclone', label: 'Pc Clone', icon: '💻', reward: 0.5, active: true, createdAt: new Date().toISOString() },
      { key: 'fib', label: 'Fib', icon: '⚡', reward: 0.5, active: true, createdAt: new Date().toISOString() },
    ],
    stock: {},
    usedNumbers: [],
    assignments: [],
    consoleConfig: defaultConsoleConfig(),
    panels: [],
    waOtpLinks: [],
    paidWaOrders: [],
    paidWaRefundBatches: [],
    buyService: {
      premiumPrices: { '3M': 650, '6M': 1200, '1Y': 2000 },
      vpnServices: [
        { id: 'nord_7d', name: 'NORD', icon: '🛡️', duration: '7D', price: 25, category: 'vpn' },
        { id: 'express_7d', name: 'EXPRESS', icon: '⚡', duration: '7D', price: 20, category: 'vpn' },
        { id: 'ipvanish_7d', name: 'IP VANISH', icon: '🔐', duration: '7D', price: 20, category: 'vpn' },
        { id: 'surfshark_7d', name: 'SURFSHARK', icon: '🦈', duration: '7D', price: 20, category: 'vpn' },
        { id: 'hma_7d', name: 'HMA', icon: '🦁', duration: '7D', price: 20, category: 'vpn' },
        { id: 'pia_7d', name: 'PIA', icon: '🔒', duration: 7 + 'D', price: 20, category: 'vpn' },
        { id: 'proton_14d', name: 'PROTON', icon: '⚛️', duration: '14D', price: 30, category: 'vpn' },
        { id: 'express_30d', name: 'EXPRESS 30D', icon: '⚡', duration: '30D', price: 45, category: 'vpn' },
        { id: 'hma_30d', name: 'HMA 30D', icon: '🦁', duration: '30D', price: 45, category: 'vpn' },
        { id: '9proxy_1gb', name: '9 PROXY', icon: '🌐', duration: '1GB', price: 100, category: 'proxy' },
        { id: 'owlproxy_200mb', name: 'OWL PROXY', icon: '🦉', duration: '200MB', price: 10, category: 'proxy' },
      ],
      orders: [],
    },
    deliveries: [],
    seenKeys: [],
    recentTraffic: [],
    demoConfigs: [],
    users: {},
  };
}

let dbCache: NsDatabase | null = null;
let lastPanelScanMs: Record<string, number> = {};
let lastDemoFireMs: Record<string, number> = {};
let scannerRunning = false;
let scannerStarted = false;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadDb(): NsDatabase {
  if (dbCache) return dbCache;
  ensureDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      const def = defaultDb();
      // Only adopt parsed DB if it follows the hot-otp-bot schema cleanly
      if (parsed && parsed.stock && Array.isArray(parsed.services) && parsed.consoleConfig) {
        dbCache = {
          ...def,
          ...parsed,
          settings: {
            ...def.settings,
            ...(parsed.settings || {}),
            panelKeys: { ...def.settings.panelKeys, ...(parsed.settings?.panelKeys || {}) },
          },
          buyService: {
            ...def.buyService,
            ...(parsed.buyService || {}),
            premiumPrices: { ...def.buyService.premiumPrices, ...(parsed.buyService?.premiumPrices || {}) },
            vpnServices: Array.isArray(parsed.buyService?.vpnServices)
              ? parsed.buyService.vpnServices
              : def.buyService.vpnServices,
            orders: Array.isArray(parsed.buyService?.orders) ? parsed.buyService.orders : [],
          },
        };
        return dbCache!;
      }
    } catch (_) {}
  }
  dbCache = defaultDb();
  saveDb();
  return dbCache;
}

export function saveDb() {
  if (!dbCache) return;
  ensureDir();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(dbCache, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

function getServiceReward(db: NsDatabase, serviceKeyOrName: string): number {
  const cKey = canonicalServiceKey(serviceKeyOrName);
  const found = db.services.find((s) => canonicalServiceKey(s.key) === cKey || canonicalServiceKey(s.label) === cKey);
  if (found && Number.isFinite(found.reward)) return Number(found.reward);
  return Number(db.settings.rewardPerOtp || 0);
}

// ── File Parsers (.txt / .csv / .xlsx via AdmZip) ────────────────────────────
function extractCellsFromXlsx(buffer: Buffer): string[][] {
  try {
    const zip = new AdmZip(buffer);
    const sstEntry = zip.getEntry('xl/sharedStrings.xml');
    const sst: string[] = [];
    if (sstEntry) {
      const xml = sstEntry.getData().toString('utf8');
      const siMatches = xml.match(/<si[\s\S]*?<\/si>/g) || [];
      for (const si of siMatches) {
        const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
        const joined = tMatches
          .map((t) =>
            t
              .replace(/<[^>]+>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
          )
          .join('');
        sst.push(joined.trim());
      }
    }
    const sheetEntry =
      zip.getEntry('xl/worksheets/sheet1.xml') ||
      zip.getEntries().find((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.entryName));
    if (!sheetEntry) return [];
    const sheetXml = sheetEntry.getData().toString('utf8');
    const rowMatches = sheetXml.match(/<row[\s\S]*?<\/row>/g) || [];
    const rows: string[][] = [];
    for (const rowXml of rowMatches) {
      const cells: string[] = [];
      const cMatches = rowXml.match(/<c[\s\S]*?(?:<\/c>|\/>)/g) || [];
      for (const cXml of cMatches) {
        const typeMatch = cXml.match(/\bt=["']([^"']+)["']/);
        const cellType = typeMatch ? typeMatch[1] : '';
        let val = '';
        if (cellType === 'inlineStr') {
          const tM = cXml.match(/<t[^>]*>([\s\S]*?)<\/t>/);
          val = tM ? tM[1] : '';
        } else {
          const vM = cXml.match(/<v>([\s\S]*?)<\/v>/);
          const rawV = vM ? vM[1] : '';
          if (cellType === 's') {
            const idx = parseInt(rawV, 10);
            val = sst[idx] ?? rawV;
          } else {
            val = rawV;
          }
        }
        cells.push(String(val || '').replace(/<[^>]+>/g, '').trim());
      }
      if (cells.some(Boolean)) rows.push(cells);
    }
    return rows;
  } catch (_) {
    return [];
  }
}

function parseRowsFromUpload(fileName: string, fileDataB64?: string, textInput?: string): string[][] {
  if (fileDataB64) {
    const clean = fileDataB64.replace(/^data:[^;]+;base64,/, '');
    const buf = Buffer.from(clean, 'base64');
    if (/\.xlsx$/i.test(fileName)) {
      return extractCellsFromXlsx(buf);
    }
    const str = buf.toString('utf8');
    return str
      .split(/\r?\n/)
      .map((line) => line.split(/[,;\t|]/).map((c) => c.trim().replace(/^["']|["']$/g, '')))
      .filter((r) => r.some(Boolean));
  }
  const str = String(textInput || '');
  return str
    .split(/\r?\n/)
    .map((line) => line.split(/[,;\t|]/).map((c) => c.trim().replace(/^["']|["']$/g, '')))
    .filter((r) => r.some(Boolean));
}

function extractNumbersFromUpload(fileName: string, fileDataB64?: string, textInput?: string): string[] {
  const rows = parseRowsFromUpload(fileName, fileDataB64, textInput);
  const out: string[] = [];
  for (const row of rows) {
    for (const cell of row) {
      for (const token of cell.split(/[\s,]+/)) {
        const digits = token.replace(/\D/g, '');
        if (digits.length >= 7 && digits.length <= 15) {
          out.push(digits);
        }
      }
    }
  }
  return out;
}

function extractWaLinksFromUpload(
  fileName: string,
  fileDataB64?: string,
  textInput?: string
): Array<{ number: string; url: string }> {
  const rows = parseRowsFromUpload(fileName, fileDataB64, textInput);
  const entries: Array<{ number: string; url: string }> = [];
  for (const row of rows) {
    let number = '';
    let url = '';
    for (const cell of row) {
      if (!url && /^https?:\/\//i.test(cell)) {
        url = cell.trim();
      } else if (!number) {
        const digits = cell.replace(/\D/g, '');
        if (digits.length >= 7 && digits.length <= 15) {
          number = '+' + digits;
        }
      }
    }
    // Also support single cell "number url" separated by whitespace
    if ((!number || !url) && row.length === 1) {
      const parts = row[0].split(/\s+/);
      for (const part of parts) {
        if (!url && /^https?:\/\//i.test(part)) url = part.trim();
        else if (!number) {
          const digits = part.replace(/\D/g, '');
          if (digits.length >= 7 && digits.length <= 15) number = '+' + digits;
        }
      }
    }
    if (number && url) entries.push({ number, url });
  }
  return entries;
}

// ── Panel HTTP Utilities (Cookie Jar + Auto-Detect) ──────────────────────────
function mergeCookies(jar: Record<string, string>, headers: Headers): Record<string, string> {
  const next = { ...jar };
  const setCookieHeader =
    typeof (headers as any).getSetCookie === 'function'
      ? (headers as any).getSetCookie()
      : headers.get('set-cookie')
      ? [headers.get('set-cookie') as string]
      : [];
  for (const line of setCookieHeader) {
    const first = String(line || '').split(';')[0];
    const eq = first.indexOf('=');
    if (eq > 0) {
      const k = first.slice(0, eq).trim();
      const v = first.slice(eq + 1).trim();
      if (k) next[k] = v;
    }
  }
  return next;
}

function cookieHeader(jar: Record<string, string>): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function stripHtmlTags(s: string): string {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPanelBaseUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    const segs = u.pathname.split('/').filter(Boolean);
    const panelPrefixes = ['ints', 'konekta', 'panel', 'sms', 'v2', 'agent'];
    if (segs.length > 0 && panelPrefixes.includes(segs[0].toLowerCase()) && segs[0].toLowerCase() !== 'agent') {
      return `${u.protocol}//${u.host}/${segs[0]}`;
    }
    if (segs.length >= 2 && segs[1].toLowerCase() === 'agent') {
      return `${u.protocol}//${u.host}/${segs[0]}`;
    }
    return `${u.protocol}//${u.host}`;
  } catch (_) {
    return rawUrl.trim().replace(/\/+$/, '');
  }
}

async function httpFetchWithJar(
  url: string,
  jar: Record<string, string>,
  opts: RequestInit & { timeoutMs?: number } = {}
): Promise<{ status: number; finalUrl: string; text: string; jar: Record<string, string>; headers: Headers }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 12000);
  let curJar = { ...jar };
  let curUrl = url;
  let method = (opts.method || 'GET').toUpperCase();
  let body = opts.body;
  try {
    for (let hop = 0; hop < 5; hop++) {
      const hdrs: Record<string, string> = {
        'User-Agent': DEFAULT_UA,
        ...(opts.headers as Record<string, string> | undefined),
      };
      const ck = cookieHeader(curJar);
      if (ck) hdrs['Cookie'] = ck;

      const resp = await fetch(curUrl, {
        method,
        headers: hdrs,
        body: method === 'POST' ? body : undefined,
        redirect: 'manual',
        signal: controller.signal,
      });
      curJar = mergeCookies(curJar, resp.headers);
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get('location');
        if (loc) {
          curUrl = new URL(loc, curUrl).toString();
          method = 'GET';
          body = undefined;
          continue;
        }
      }
      const text = await resp.text();
      return { status: resp.status, finalUrl: curUrl, text, jar: curJar, headers: resp.headers };
    }
    return { status: 310, finalUrl: curUrl, text: '', jar: curJar, headers: new Headers() };
  } finally {
    clearTimeout(timer);
  }
}

function isLoginPage(url: string, html: string): boolean {
  const u = String(url || '').toLowerCase();
  if (/\/login\b|\/signin\b|\/auth\b/.test(u)) return true;
  const h = String(html || '').toLowerCase();
  if (h.includes('type="password"') || h.includes("type='password'")) return true;
  return false;
}

function extractFormFields(html: string): { action: string; hidden: Record<string, string>; userField: string; passField: string; captchaQuestion: string } {
  const actionM = html.match(/<form[^>]*action=["']([^"']*)["']/i);
  const action = actionM ? actionM[1] : '';
  const hidden: Record<string, string> = {};
  let userField = 'username';
  let passField = 'password';
  const inputs = html.match(/<input[^>]+>/gi) || [];
  for (const inp of inputs) {
    const typeM = inp.match(/type=["']([^"']+)["']/i);
    const nameM = inp.match(/name=["']([^"']+)["']/i);
    const valM = inp.match(/value=["']([^"']*)["']/i);
    const name = nameM ? nameM[1] : '';
    const typ = (typeM ? typeM[1] : 'text').toLowerCase();
    const val = valM ? valM[1] : '';
    if (!name) continue;
    if (typ === 'hidden') hidden[name] = val;
    else if (typ === 'password') passField = name;
    else if (typ === 'text' || typ === 'email') {
      if (/user|email|login|account|name/i.test(name)) userField = name;
    }
  }
  const captchaM = html.match(/(\d{1,3}\s*[+\-*x]\s*\d{1,3})/);
  const captchaQuestion = captchaM ? captchaM[1] : '';
  return { action, hidden, userField, passField, captchaQuestion };
}

function solveSimpleMathCaptcha(expr: string): string | null {
  const m = expr.match(/(\d+)\s*([+\-*x])\s*(\d+)/i);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[3], 10);
  const op = m[2].toLowerCase();
  if (op === '+') return String(a + b);
  if (op === '-') return String(a - b);
  if (op === '*' || op === 'x') return String(a * b);
  return null;
}

function extractSessionToken(html: string): string {
  const pats = [
    /["']_token["']\s*:\s*["']([^"']+)["']/i,
    /<meta[^>]+name=["']csrf-token["'][^>]*content=["']([^"']+)["']/i,
    /<input[^>]+name=["']_token["'][^>]*value=["']([^"']+)["']/i,
    /token["']?\s*[:=]\s*["']([a-zA-Z0-9_-]{12,})["']/i,
  ];
  for (const p of pats) {
    const m = html.match(p);
    if (m && m[1]) return m[1];
  }
  return '';
}

function buildIntsDataUrl(fullEp: string, token: string, today: string, style: string): string {
  const sep = fullEp.includes('?') ? '&' : '?';
  if (style === 'xisora') {
    return `${fullEp}${sep}sEcho=1&iDisplayStart=0&iDisplayLength=100`;
  }
  return `${fullEp}${sep}fdate1=${today}+00:00:00&fdate2=${today}+23:59:59&frange=&fclient=&fnum=&fcli=&fgdate=&fgmonth=&fgrange=&fgclient=&fgnumber=&fgcli=&fg=0&sEcho=1&iColumns=9&sColumns=,,,,,,,,&iDisplayStart=0&iDisplayLength=100&_=${Date.now()}`;
}

function parseHtmlTableRows(html: string): Array<{ number: string; otp: string; service: string; sms: string }> {
  const results: Array<{ number: string; otp: string; service: string; sms: string }> = [];
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const cells = (row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []).map((c) => stripHtmlTags(c));
    if (cells.length < 3) continue;
    let num = '';
    let sms = '';
    let svc = '';
    for (const c of cells) {
      const d = c.replace(/\D/g, '');
      if (!num && /^\d{7,15}$/.test(d)) num = c.trim();
      else if (!sms && extractOtpFromSms(c)) sms = c.trim();
      else if (!svc && c.length >= 2 && c.length <= 28 && /[a-zA-Z]/.test(c) && !/\d{4}-\d{2}/.test(c)) {
        svc = c.trim();
      }
    }
    const otp = extractOtpFromSms(sms);
    if (num && otp) results.push({ number: num, otp, service: svc || detectServiceFromSms(sms), sms });
  }
  return results;
}

// ── Engine 1: Universal Web Login (INTS / Xisora / HTML Scrape) ───────────────
async function universalLogin(panel: NsPanelItem): Promise<{
  ok: boolean;
  engine: PanelEngine;
  dataPath: string;
  jar: Record<string, string>;
  token: string;
  baseUrl: string;
  error?: string;
}> {
  const base = extractPanelBaseUrl(panel.urlHint || panel.baseUrl);
  const urlHint = panel.urlHint || base;
  let jar: Record<string, string> = {};
  let loginRespText = '';

  const loginCandidates = [
    `${base}/login`,
    `${base}/index.php`,
    `${base}/`,
    urlHint,
  ];

  let loggedIn = false;
  for (const lUrl of loginCandidates) {
    try {
      const page = await httpFetchWithJar(lUrl, jar);
      jar = page.jar;
      loginRespText = page.text;
      if (page.status === 200 && !isLoginPage(page.finalUrl, page.text)) {
        loggedIn = true;
        break;
      }
      if (page.status === 200 && isLoginPage(page.finalUrl, page.text)) {
        const form = extractFormFields(page.text);
        const postUrl = form.action ? new URL(form.action, page.finalUrl).toString() : page.finalUrl;
        const payload = new URLSearchParams();
        for (const [k, v] of Object.entries(form.hidden)) payload.set(k, v);
        payload.set(form.userField, panel.username);
        payload.set(form.passField, panel.password);
        if (form.captchaQuestion) {
          const ans = solveSimpleMathCaptcha(form.captchaQuestion);
          if (ans) payload.set('capt', ans);
        }
        const postRes = await httpFetchWithJar(postUrl, jar, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: page.finalUrl },
          body: payload.toString(),
        });
        jar = postRes.jar;
        loginRespText = postRes.text;
        if (postRes.status === 200 && !isLoginPage(postRes.finalUrl, postRes.text)) {
          loggedIn = true;
          break;
        }
      }
    } catch (_) {
      continue;
    }
  }

  if (!loggedIn) {
    return {
      ok: false,
      engine: panel.engine || 'ints_smscdr',
      dataPath: panel.dataPath || '/agent/res/data_smscdr.php',
      jar,
      token: '',
      baseUrl: base,
      error: 'Login failed — verify URL, username, and password',
    };
  }

  let token = extractSessionToken(loginRespText);
  const dashCandidates = [urlHint, `${base}/agent/SMSCDRStats`, `${base}/agent/SMSCDRReports`, `${base}/agent/dashboard`];
  const scrapedEndpoints: Array<{ abs: string; rel: string; engine: PanelEngine }> = [];

  for (const dUrl of dashCandidates) {
    try {
      const rp = await httpFetchWithJar(dUrl, jar);
      jar = rp.jar;
      if (rp.status !== 200 || isLoginPage(rp.finalUrl, rp.text)) continue;
      if (!token) token = extractSessionToken(rp.text);
      const ajaxMatches = rp.text.matchAll(/["']([^"']*(?:data_sms|dt_reports|dt_sms|cdr|reports)[^"']*\.php)['"]/gi);
      for (const m of ajaxMatches) {
        const raw = m[1];
        const abs = raw.startsWith('http') ? raw : new URL(raw, rp.finalUrl).toString();
        const rel = raw.startsWith('/') ? raw : '/' + raw;
        const eng: PanelEngine = /dt_reports|dt_sms/i.test(raw)
          ? 'xisora'
          : /smsranges/i.test(raw)
          ? 'ints_smsranges'
          : 'ints_smscdr';
        scrapedEndpoints.push({ abs, rel, engine: eng });
      }
    } catch (_) {}
  }

  const knownPaths: Array<[string, PanelEngine]> = [
    ['/agent/res/data_smscdr.php', 'ints_smscdr'],
    ['/agent/res/data_smsranges.php', 'ints_smsranges'],
    ['/res/data_smscdr.php', 'ints_smscdr'],
    ['/agent/res/dt_reports.php', 'xisora'],
    ['/res/dt_sms.php', 'xisora'],
  ];
  for (const [rel, eng] of knownPaths) {
    scrapedEndpoints.push({ abs: base + rel, rel, engine: eng });
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const ep of scrapedEndpoints) {
    try {
      const style = ep.engine === 'xisora' ? 'xisora' : 'ints';
      const epUrl = buildIntsDataUrl(ep.abs, token, today, style);
      const r = await httpFetchWithJar(epUrl, jar, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      jar = r.jar;
      const body = r.text.trim();
      if (r.status === 200 && body && !body.startsWith('<')) {
        const parsed = JSON.parse(body);
        if (Array.isArray(parsed.aaData)) {
          return { ok: true, engine: ep.engine, dataPath: ep.rel, jar, token, baseUrl: base };
        }
      }
    } catch (_) {}
  }

  // Fallback to HTML scrape if table present
  for (const dUrl of dashCandidates) {
    try {
      const rp = await httpFetchWithJar(dUrl, jar);
      if (rp.status === 200 && /<table/i.test(rp.text) && !isLoginPage(rp.finalUrl, rp.text)) {
        return { ok: true, engine: 'html_scrape', dataPath: dUrl, jar, token, baseUrl: base };
      }
    } catch (_) {}
  }

  return {
    ok: true,
    engine: 'ints_smscdr',
    dataPath: '/agent/res/data_smscdr.php',
    jar,
    token,
    baseUrl: base,
  };
}

async function fetchUniversalPanel(panel: NsPanelItem): Promise<Array<{ number: string; otp: string; sms: string; service: string }>> {
  const results: Array<{ number: string; otp: string; sms: string; service: string }> = [];
  const today = new Date().toISOString().slice(0, 10);

  if (panel.engine === 'html_scrape') {
    const targetUrl = panel.dataPath.startsWith('http') ? panel.dataPath : panel.baseUrl + panel.dataPath;
    let r = await httpFetchWithJar(targetUrl, panel.cookies || {});
    if (r.status !== 200 || isLoginPage(r.finalUrl, r.text)) {
      const login = await universalLogin(panel);
      if (!login.ok) throw new Error(login.error || 'Session expired');
      panel.cookies = login.jar;
      panel.sessionToken = login.token;
      r = await httpFetchWithJar(targetUrl, panel.cookies);
    }
    panel.cookies = r.jar;
    return parseHtmlTableRows(r.text);
  }

  const fullEp = panel.dataPath.startsWith('http') ? panel.dataPath : panel.baseUrl.replace(/\/+$/, '') + panel.dataPath;
  const style = panel.engine === 'xisora' ? 'xisora' : 'ints';
  let r = await httpFetchWithJar(buildIntsDataUrl(fullEp, panel.sessionToken || '', today, style), panel.cookies || {}, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  let body = r.text.trim();

  if (r.status !== 200 || !body || body.startsWith('<') || body.includes('Direct Script')) {
    const login = await universalLogin(panel);
    if (!login.ok) throw new Error(login.error || 'Re-login failed');
    panel.cookies = login.jar;
    panel.sessionToken = login.token;
    panel.engine = login.engine;
    panel.dataPath = login.dataPath;
    panel.baseUrl = login.baseUrl;
    const ep2 = panel.baseUrl.replace(/\/+$/, '') + panel.dataPath;
    r = await httpFetchWithJar(buildIntsDataUrl(ep2, panel.sessionToken, today, panel.engine === 'xisora' ? 'xisora' : 'ints'), panel.cookies, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    body = r.text.trim();
  }
  panel.cookies = r.jar;

  const data = JSON.parse(body);
  const rows: any[] = Array.isArray(data?.aaData) ? data.aaData : [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const cells = row.map((c) => stripHtmlTags(String(c ?? '')));
    if (cells.length > 5) {
      const num = cells[2];
      const svc = cells[3];
      const sms = cells[5];
      const otp = extractOtpFromSms(sms);
      if (num && otp) {
        results.push({ number: num, otp, sms, service: svc || detectServiceFromSms(sms) });
        continue;
      }
    }
    if (cells.length > 4) {
      const num = cells[2];
      const svc = cells[3];
      const sms = cells[4];
      const otp = extractOtpFromSms(sms);
      if (num && otp) {
        results.push({ number: num, otp, sms, service: svc || detectServiceFromSms(sms) });
      }
    }
  }
  return results;
}

// ── Engine 2: API Key Panel Auto-Probe & Fetch ────────────────────────────────
const API_KEY_ENDPOINTS = [
  '/api/sms',
  '/api/messages',
  '/api/received',
  '/api/sms/received',
  '/api/v1/sms',
  '/api/v1/messages',
  '/api/inbox',
  '/api/sms/list',
  '/api/data',
  '/sms',
  '/api/otp',
  '/api/success-otp-info',
];
const API_KEY_PARAMS = ['api_key', 'token', 'key', 'apikey', 'access_token'];

async function testApiKeyPanel(baseUrl: string, apiKey: string): Promise<{ dataPath: string; apiKeyParam: string; engine: PanelEngine } | null> {
  const base = baseUrl.replace(/\/+$/, '');
  const hdrs: Record<string, string> = { Accept: 'application/json', 'User-Agent': DEFAULT_UA };

  // Also test unixsms CDR query pattern if URL hints viewapi
  if (/viewapi/i.test(base)) {
    return { dataPath: '', apiKeyParam: 'unixsms', engine: 'unixsms_cdr' };
  }

  for (const ep of API_KEY_ENDPOINTS) {
    for (const param of API_KEY_PARAMS) {
      try {
        const res = await fetch(`${base}${ep}?${param}=${encodeURIComponent(apiKey)}`, {
          headers: hdrs,
          signal: AbortSignal.timeout(8000),
        });
        if (res.status === 200) {
          const data: any = await res.json();
          if (Array.isArray(data)) return { dataPath: ep, apiKeyParam: param, engine: 'api_key' };
          if (data && typeof data === 'object') {
            for (const dk of ['data', 'sms', 'messages', 'records', 'result', 'items', 'list', 'otps']) {
              if (Array.isArray(data[dk])) return { dataPath: ep, apiKeyParam: `${param}|resp=${dk}`, engine: 'api_key' };
            }
            if ('status' in data || 'success' in data || 'ok' in data) {
              return { dataPath: ep, apiKeyParam: param, engine: 'api_key' };
            }
          }
        }
      } catch (_) {}
    }
    try {
      const res = await fetch(`${base}${ep}`, {
        headers: { ...hdrs, Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 200) {
        const data: any = await res.json();
        if (data && (Array.isArray(data) || typeof data === 'object')) {
          return { dataPath: ep, apiKeyParam: 'bearer', engine: 'api_key' };
        }
      }
    } catch (_) {}
  }
  return null;
}

function extractRowsFromAnyJson(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  for (const k of ['data', 'otps', 'sms', 'messages', 'records', 'result', 'items', 'list']) {
    const val = raw[k];
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') {
      for (const ik of ['otps', 'data', 'sms', 'messages', 'records', 'result', 'items']) {
        if (Array.isArray(val[ik])) return val[ik];
      }
    }
  }
  return [];
}

async function fetchApiKeyPanel(panel: NsPanelItem): Promise<Array<{ number: string; otp: string; sms: string; service: string }>> {
  const base = panel.baseUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': DEFAULT_UA };
  let url = '';

  if (panel.engine === 'unixsms_cdr') {
    const today = new Date().toISOString().slice(0, 10);
    url = `${base}${panel.dataPath || ''}?token=${encodeURIComponent(panel.apiKey)}&dt1=${today}+00:00:00&dt2=${today}+23:59:59&records=50`;
  } else if (panel.apiKeyParam === 'bearer') {
    url = `${base}${panel.dataPath}`;
    headers['Authorization'] = `Bearer ${panel.apiKey}`;
  } else if (panel.apiKeyParam === 'mauthapi') {
    url = `${base}${panel.dataPath}`;
    headers['mauthapi'] = panel.apiKey;
  } else {
    const pName = panel.apiKeyParam.split('|resp=')[0] || 'api_key';
    url = `${base}${panel.dataPath}?${pName}=${encodeURIComponent(panel.apiKey)}`;
  }

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw: any = await res.json();
  const rows = extractRowsFromAnyJson(raw);
  const results: Array<{ number: string; otp: string; sms: string; service: string }> = [];

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const number = String(row.number || row.phone || row.msisdn || row.to || row.from || row.num || '').trim();
    const sms = String(row.message || row.sms || row.text || row.body || row.content || '').trim();
    const svc = String(row.service || row.app || row.sender || row.source || row.cli || '').trim();
    const otp = extractOtpFromSms(sms);
    if (number && otp) {
      results.push({ number, otp, sms, service: svc || detectServiceFromSms(sms) });
    }
  }
  return results;
}

// ── Engine 3: IVA SMS Cookie Panel ────────────────────────────────────────────
async function fetchIvaPanel(panel: NsPanelItem): Promise<Array<{ number: string; otp: string; sms: string; service: string }>> {
  const base = extractPanelBaseUrl(panel.baseUrl);
  const today = new Date().toISOString().slice(0, 10);
  const jar: Record<string, string> = {};
  for (const part of String(panel.ivaCookie || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      jar[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
  }

  const res = await httpFetchWithJar(`${base}/portal/sms/received?start_date=${today}&end_date=${today}`, jar, {
    timeoutMs: 18000,
  });
  if (res.status !== 200 || isLoginPage(res.finalUrl, res.text)) {
    throw new Error('IVA cookie expired or invalid — update cookie in Panels tab');
  }

  const html = res.text;
  const csrf = extractSessionToken(html);
  const ajaxCandidates = [panel.ivaAjaxUrl].filter(Boolean);
  for (const pat of [/ajax\s*:\s*['"](\/portal\/sms\/[^'"]+)['"]/gi, /url\s*:\s*['"](\/portal\/sms\/[^'"]+)['"]/gi]) {
    for (const m of html.matchAll(pat)) {
      if (!ajaxCandidates.includes(m[1])) ajaxCandidates.push(m[1]);
    }
  }
  for (const fb of ['/portal/sms/received/data', '/portal/sms/received-data', '/portal/sms/ajax', '/portal/sms/received']) {
    if (!ajaxCandidates.includes(fb)) ajaxCandidates.push(fb);
  }

  for (const ep of ajaxCandidates) {
    try {
      const epUrl = ep.startsWith('http') ? ep : `${base}${ep}`;
      const body = new URLSearchParams({ draw: '1', start: '0', length: '100' });
      const hdrs: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `${base}/portal/sms/received`,
      };
      if (csrf) hdrs['X-CSRF-TOKEN'] = csrf;
      const dt = await httpFetchWithJar(epUrl, res.jar, { method: 'POST', headers: hdrs, body: body.toString(), timeoutMs: 12000 });
      if (dt.status === 200 && dt.text.trim() && !dt.text.trim().startsWith('<')) {
        const js = JSON.parse(dt.text);
        const rows = js.data || js.records || js.rows || js.sms || (Array.isArray(js) ? js : []);
        if (Array.isArray(rows) && rows.length > 0) {
          panel.ivaAjaxUrl = epUrl;
          const out: Array<{ number: string; otp: string; sms: string; service: string }> = [];
          for (const row of rows) {
            if (Array.isArray(row) && row.length >= 3) {
              const num = stripHtmlTags(String(row[1] || ''));
              const txt = stripHtmlTags(String(row[2] || ''));
              const svc = stripHtmlTags(String(row[3] || 'IVA'));
              const otp = extractOtpFromSms(txt);
              if (num && otp) out.push({ number: num, otp, sms: txt, service: svc });
            } else if (row && typeof row === 'object') {
              const num = stripHtmlTags(String(row.number || row.phone || row.msisdn || row.to || ''));
              const txt = stripHtmlTags(String(row.message || row.sms || row.text || row.body || ''));
              const svc = stripHtmlTags(String(row.service || row.sender || row.cli || 'IVA'));
              const otp = extractOtpFromSms(txt);
              if (num && otp) out.push({ number: num, otp, sms: txt, service: svc });
            }
          }
          if (out.length > 0) return out;
        }
      }
    } catch (_) {}
  }

  return parseHtmlTableRows(html);
}

// ── V2 Active Panel & V3 Panel Live Helpers ──────────────────────────────────
function getV2Creds(db: NsDatabase, pid?: V2PanelId) {
  const active = pid || db.settings.v2ActivePanel || 'fastx';
  const k = db.settings.panelKeys;
  if (active === 'fastx') return { id: 'fastx', name: 'FastX SMS', baseUrl: k.fastxBase.replace(/\/+$/, ''), apiKey: k.fastxKey };
  if (active === 'stex') return { id: 'stex', name: 'Stex SMS', baseUrl: k.stexBase.replace(/\/+$/, ''), apiKey: k.stexKey };
  if (active === 'voltex') return { id: 'voltex', name: 'Voltex SMS', baseUrl: k.voltexBase.replace(/\/+$/, ''), apiKey: k.voltexKey };
  return { id: 'mk', name: 'MK Panel', baseUrl: k.mkBase.replace(/\/+$/, ''), apiKey: k.mkKey };
}

function enrichFastxServices(baseServices: any[], recentOtps: any[]): any[] {
  const existing = new Set(baseServices.map((s) => String(s.sid || '').toUpperCase()));
  const parents: Record<string, string[]> = {
    INSTAGRAM: ['FACEBOOK', 'FB'],
    TIKTOK: ['FACEBOOK', 'TWILIO'],
    SNAPCHAT: ['TWILIO'],
  };
  const enriched = [...baseServices];
  for (const [sid, parentList] of Object.entries(parents)) {
    if (existing.has(sid)) continue;
    const rangeSet = new Set<string>();
    let lastAt = 0;
    for (const s of baseServices) {
      if (parentList.includes(String(s.sid || '').toUpperCase())) {
        for (const r of s.ranges || []) rangeSet.add(r);
        if ((s.last_at || 0) > lastAt) lastAt = s.last_at;
      }
    }
    if (rangeSet.size > 0) {
      enriched.push({ sid, ranges: Array.from(rangeSet).sort(), last_at: lastAt || Date.now() });
    }
  }
  return enriched;
}

async function v2FetchLiveAccess(db: NsDatabase): Promise<{ panelName: string; configured: boolean; services: any[] }> {
  const { id, name, baseUrl, apiKey } = getV2Creds(db);
  if (!baseUrl || !apiKey) return { panelName: name, configured: false, services: [] };
  try {
    if (id === 'fastx') {
      const r = await fetch(`${baseUrl}/api/liveaccess?api_key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(12000) });
      if (r.ok) {
        const d: any = await r.json();
        let base = d.services || d.data || d.result || [];
        if (base && !Array.isArray(base)) base = base.services || base.data || [];
        if (Array.isArray(base)) return { panelName: name, configured: true, services: enrichFastxServices(base, []) };
      }
    } else if (id === 'mk') {
      const r = await fetch(`${baseUrl}/liveaccess`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const svcs = d.services || d.data?.services || d.data?.data || [];
        return { panelName: name, configured: true, services: Array.isArray(svcs) ? svcs : [] };
      }
    } else {
      const r = await fetch(`${baseUrl}/liveaccess`, {
        headers: { mauthapi: apiKey },
        signal: AbortSignal.timeout(12000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const svcs = d.data?.services || d.data?.data || d.services || [];
        return { panelName: name, configured: true, services: Array.isArray(svcs) ? svcs : [] };
      }
    }
  } catch (_) {}
  return { panelName: name, configured: true, services: [] };
}

async function v2AllocateNumber(db: NsDatabase, prefix: string, sid?: string): Promise<string | null> {
  const { id, baseUrl, apiKey } = getV2Creds(db);
  if (!baseUrl || !apiKey) return null;
  const rid = String(prefix || '').replace(/X+$/i, '').replace(/\D/g, '');
  if (!rid) return null;

  try {
    if (id === 'fastx') {
      const form = new URLSearchParams({ prefix: prefix.trim() });
      const r = await fetch(`${baseUrl}/api/getnum?api_key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        signal: AbortSignal.timeout(15000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const num = d.data?.full_number || d.data?.no_plus_number || d.number;
        if (num) return String(num).startsWith('+') ? String(num) : '+' + String(num);
      }
      return null;
    }

    const candidates = [sid, 'Facebook', 'WhatsApp', 'Google', 'Telegram', 'Instagram'].filter(Boolean) as string[];
    const headers: Record<string, string> =
      id === 'mk'
        ? { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
        : { mauthapi: apiKey, 'Content-Type': 'application/json' };

    for (const sTry of candidates) {
      const r = await fetch(`${baseUrl}/getnum`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rid, sid: sTry }),
        signal: AbortSignal.timeout(12000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const data = d.data || d;
        const num = data.full_number || data.no_plus_number || data.number || data.phone;
        if (num) return String(num).startsWith('+') ? String(num) : '+' + String(num);
      }
    }
  } catch (_) {}
  return null;
}

async function v2FetchRecentOtps(db: NsDatabase, pid?: V2PanelId): Promise<Array<{ number: string; otp: string; sms: string; service: string }>> {
  const { id, baseUrl, apiKey } = getV2Creds(db, pid);
  if (!baseUrl || !apiKey) return [];
  const results: Array<{ number: string; otp: string; sms: string; service: string }> = [];
  try {
    let url = '';
    const hdrs: Record<string, string> = { Accept: 'application/json', 'User-Agent': DEFAULT_UA };
    if (id === 'fastx') {
      url = `${baseUrl}/api/success-otp-info?api_key=${encodeURIComponent(apiKey)}`;
    } else if (id === 'mk') {
      url = `${baseUrl}/success-otp-info`;
      hdrs['Authorization'] = `Bearer ${apiKey}`;
    } else {
      url = `${baseUrl}/success-otp-info`;
      hdrs['mauthapi'] = apiKey;
    }
    const r = await fetch(url, { headers: hdrs, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    const raw: any = await r.json();
    for (const row of extractRowsFromAnyJson(raw)) {
      const number = String(row.number || row.phone || row.msisdn || row.to || row.from || '').trim();
      const sms = String(row.message || row.sms || row.text || row.body || row.content || '').trim();
      const svc = String(row.service || row.app || row.sender || row.source || '').trim();
      const otp = extractOtpFromSms(sms);
      if (number && otp) results.push({ number, otp, sms, service: svc || detectServiceFromSms(sms) });
    }
  } catch (_) {}
  return results;
}

async function v3FetchServices(db: NsDatabase): Promise<{ configured: boolean; services: any[] }> {
  const base = db.settings.panelKeys.voltexBase.replace(/\/+$/, '');
  const key = db.settings.panelKeys.voltexKey;
  if (!base || !key) return { configured: false, services: [] };
  for (const ep of ['/services', '/numbers', '/']) {
    try {
      const r = await fetch(`${base}${ep}?apikey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const d: any = await r.json();
        const svcs = d.services || d.data || d.numbers || d.list;
        if (Array.isArray(svcs) && svcs.length > 0) return { configured: true, services: svcs };
        if (svcs && typeof svcs === 'object' && !Array.isArray(svcs)) {
          return { configured: true, services: Object.entries(svcs).map(([k, v]) => ({ sid: k, count: v })) };
        }
      }
    } catch (_) {}
  }
  return { configured: true, services: [] };
}

async function v3AllocateNumber(db: NsDatabase, serviceId: string): Promise<string | null> {
  const base = db.settings.panelKeys.voltexBase.replace(/\/+$/, '');
  const key = db.settings.panelKeys.voltexKey;
  if (!base || !key) return null;
  for (const [method, ep] of [
    ['POST', '/getnum'],
    ['GET', '/getnum'],
    ['POST', '/allocate'],
  ] as const) {
    try {
      const url =
        method === 'GET'
          ? `${base}${ep}?apikey=${encodeURIComponent(key)}&service=${encodeURIComponent(serviceId)}`
          : `${base}${ep}?apikey=${encodeURIComponent(key)}`;
      const r = await fetch(url, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
        body: method === 'POST' ? new URLSearchParams({ service: serviceId }).toString() : undefined,
        signal: AbortSignal.timeout(12000),
      });
      if (r.ok) {
        const d: any = await r.json();
        const num = d.number || d.full_number || d.phone || d.data?.number || d.data?.full_number;
        if (num) return String(num).startsWith('+') ? String(num) : '+' + String(num);
      }
    } catch (_) {}
  }
  return null;
}

async function fetchAugestelOtps(db: NsDatabase): Promise<Array<{ number: string; otp: string; sms: string; service: string }>> {
  const base = (db.settings.panelKeys.augestelBase || 'https://augestelsms.com/api/v1').replace(/\/+$/, '');
  const key = db.settings.panelKeys.augestelKey;
  if (!key) return [];
  const today = new Date().toISOString().slice(0, 10);
  try {
    const r = await fetch(`${base}/messages?start_date=${today}&end_date=${today}&per_page=50&page=1&_ts=${Date.now()}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return [];
    const js: any = await r.json();
    const rows: any[] = Array.isArray(js.data) ? js.data : [];
    const out: Array<{ number: string; otp: string; sms: string; service: string }> = [];
    for (const row of rows) {
      const num = String(row.number || row.phone || row.msisdn || row.from || row.to || '').trim();
      const sms = String(row.message || row.sms || row.text || row.body || row.content || '').trim();
      const svc = String(row.service || row.app || row.source || row.sender || '').trim();
      const otp = extractOtpFromSms(sms);
      if (num && otp) out.push({ number: num, otp, sms, service: svc || detectServiceFromSms(sms) });
    }
    return out;
  } catch (_) {
    return [];
  }
}

// ── Paid WhatsApp OTP URL Extractor ───────────────────────────────────────────
function extractPaidWaSourceCode(raw: string): string {
  const text = String(raw || '').trim();
  if (/^\d{3,10}$/.test(text)) return text;
  if (/^(WAITING|EXPIRED|PENDING|NO_CODE|NONE)$/i.test(text)) return '';
  try {
    const js = JSON.parse(text);
    if (js && typeof js === 'object') {
      for (const k of ['otp', 'code', 'otp_code', 'verification_code', 'verificationCode']) {
        const v = js[k];
        if (v != null && /^\d{3,10}$/.test(String(v).trim())) return String(v).trim();
      }
    }
  } catch (_) {}
  return '';
}

async function fetchPaidWaOtpFromUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    const direct = extractPaidWaSourceCode(html);
    if (direct) return direct;
    const apiMatch = html.match(/apiUrl\s*=\s*["']([^"']+)["']/i) || html.match(/["'](\/api\/sms\/[^"']+)["']/i);
    if (apiMatch && apiMatch[1]) {
      const apiUrl = new URL(apiMatch[1], res.url || url).toString();
      const r2 = await fetch(apiUrl, { headers: { 'User-Agent': DEFAULT_UA }, signal: AbortSignal.timeout(10000) });
      if (r2.ok) {
        return extractPaidWaSourceCode(await r2.text());
      }
    }
  } catch (_) {}
  return '';
}

// ── Core Dispatch: Process OTPs -> Active Assignment + Traffic Feed ──────────
function ingestIncomingOtps(
  db: NsDatabase,
  panelId: string,
  panelName: string,
  rows: Array<{ number: string; otp: string; sms: string; service: string }>
): { delivered: number } {
  let delivered = 0;
  const seenSet = new Set(db.seenKeys);
  const now = Date.now();
  const rate = Math.max(1, Number(db.settings.dollarRate || 129.5));

  for (const row of rows) {
    const numDigits = normalizeDigits(row.number);
    if (!numDigits || !row.otp) continue;
    const dedupKey = `${numDigits}:${row.sms}`;
    if (seenSet.has(dedupKey)) continue;
    seenSet.add(dedupKey);

    const svcRaw = row.service || detectServiceFromSms(row.sms);
    const country = getCountryDetails(numDigits);
    const otpDash = formatOtpDash(row.otp);

    // Update live traffic hit board
    const trafficKey = `${numDigits}:${row.otp}:${canonicalServiceKey(svcRaw)}`;
    const existingHit = db.recentTraffic.find((t) => t.key === trafficKey);
    if (existingHit) {
      existingHit.hitCount += 1;
      existingHit.tsMs = now;
    } else {
      db.recentTraffic.unshift({
        key: trafficKey,
        numberRaw: '+' + numDigits,
        numberMasked: maskPhoneNumber(numDigits),
        otpCode: row.otp,
        otpDash,
        serviceKey: canonicalServiceKey(svcRaw).toUpperCase() || 'OTHER',
        countryName: country.countryName,
        iso2: country.iso2,
        emoji: country.emoji,
        hitCount: 1,
        tsMs: now,
        panelName,
      });
    }

    // Match against active user assignment (allow matching trailing digits cleanly)
    const matchAssign = db.assignments.find(
      (a) =>
        (a.number === numDigits || numDigits.endsWith(a.number) || a.number.endsWith(numDigits)) &&
        (db.settings.puranoOtpEnabled || a.expiresAtMs > now - 120_000)
    );

    if (matchAssign) {
      const uMeta = db.users[matchAssign.uid];
      const rewardBdt = getServiceReward(db, matchAssign.serviceKey || svcRaw);
      const rewardUsdt = Number((rewardBdt / rate).toFixed(6));
      const refPct = Math.max(0, Number(db.settings.referCommissionPct || 0));
      const refCommBdt = uMeta?.referredByUid ? Number(((rewardBdt * refPct) / 100).toFixed(2)) : 0;

      db.deliveries.unshift({
        id: `otp_${now}_${crypto.randomBytes(3).toString('hex')}`,
        uid: matchAssign.uid,
        referrerUid: uMeta?.referredByUid || null,
        panelId,
        panelName,
        serviceKey: matchAssign.serviceKey,
        serviceName: matchAssign.serviceName,
        countryName: country.countryName,
        iso2: country.iso2,
        emoji: country.emoji,
        number: matchAssign.withPlus,
        sender: svcRaw,
        message: row.sms,
        otpCode: row.otp,
        otpDash,
        rewardBdt,
        rewardUsdt,
        referrerCommissionBdt: refCommBdt,
        createdAt: new Date(now).toISOString(),
        acknowledged: false,
      });

      if (uMeta) {
        uMeta.otpCount = (uMeta.otpCount || 0) + 1;
        uMeta.totalEarnedBdt = Number(((uMeta.totalEarnedBdt || 0) + rewardBdt).toFixed(2));
        uMeta.totalEarnedUsdt = Number(((uMeta.totalEarnedUsdt || 0) + rewardUsdt).toFixed(6));
        uMeta.lastActiveAt = new Date(now).toISOString();
      }
      if (uMeta?.referredByUid && db.users[uMeta.referredByUid] && refCommBdt > 0) {
        const refU = db.users[uMeta.referredByUid];
        refU.referralEarningsBdt = Number(((refU.referralEarningsBdt || 0) + refCommBdt).toFixed(2));
      }
      delivered++;
    }
  }

  db.seenKeys = Array.from(seenSet).slice(-1500);
  db.recentTraffic = db.recentTraffic.slice(0, 120);
  db.deliveries = db.deliveries.slice(0, 500);
  return { delivered };
}

// ── Background Scanner Tick (Panels + V2 + V3 + Augestel + Demo + Paid WA) ────
async function runBackgroundScannerTick() {
  if (scannerRunning) return;
  scannerRunning = true;
  try {
    const db = loadDb();
    const now = Date.now();
    let changed = false;

    // 1. Clean expired assignments & refund timed-out Paid WA orders
    const beforeAssignCount = db.assignments.length;
    db.assignments = db.assignments.filter((a) => a.expiresAtMs > now);
    if (db.assignments.length !== beforeAssignCount) changed = true;

    const timedOutOrders = db.paidWaOrders.filter((o) => o.status === 'pending' && o.deadlineMs <= now);
    if (timedOutOrders.length > 0) {
      const batchId = `ref_${now}_${crypto.randomBytes(2).toString('hex')}`;
      const dayKey = new Date(now).toISOString().slice(0, 10);
      let totUsdt = 0;
      let totBdt = 0;
      const orderIds: string[] = [];
      for (const ord of timedOutOrders) {
        ord.status = 'refunded';
        ord.refundedAtMs = now;
        ord.walletRefundPending = true;
        ord.batchId = batchId;
        totUsdt += ord.priceUsdt;
        totBdt += ord.chargedBdt;
        orderIds.push(ord.orderId);
        // Restore stock if unique
        const cleanKey = normalizeDigits(ord.number);
        if (!db.waOtpLinks.some((w) => normalizeDigits(w.number) === cleanKey)) {
          db.waOtpLinks.push({
            id: `wa_rest_${now}_${crypto.randomBytes(2).toString('hex')}`,
            number: ord.number,
            url: ord.url,
            addedAt: new Date(now).toISOString(),
          });
        }
      }
      db.paidWaRefundBatches.unshift({
        batchId,
        dayKey,
        orderIds,
        totalOrders: orderIds.length,
        totalUsdt: Number(totUsdt.toFixed(6)),
        totalBdt: Number(totBdt.toFixed(2)),
        status: 'pending',
        createdAt: new Date(now).toISOString(),
        approvedAt: null,
      });
      changed = true;
    }

    // 2. Poll dynamic panels
    for (const p of db.panels) {
      if (!p.active) continue;
      const last = lastPanelScanMs[p.id] || 0;
      if (now - last < Math.max(3, p.scanInterval || 6) * 1000) continue;
      lastPanelScanMs[p.id] = now;
      try {
        let rows: Array<{ number: string; otp: string; sms: string; service: string }> = [];
        if (p.engine === 'iva_sms') rows = await fetchIvaPanel(p);
        else if (p.engine === 'api_key' || p.engine === 'unixsms_cdr') rows = await fetchApiKeyPanel(p);
        else rows = await fetchUniversalPanel(p);

        p.status = 'ok';
        p.lastError = null;
        p.lastScannedAt = new Date().toISOString();
        p.fetchCount = (p.fetchCount || 0) + rows.length;
        if (rows[0]) {
          p.lastSmsSample = { number: rows[0].number, otp: rows[0].otp, service: rows[0].service, message: rows[0].sms, ts: new Date().toISOString() };
        }
        if (rows.length > 0) ingestIncomingOtps(db, p.id, p.name, rows);
        changed = true;
      } catch (err: any) {
        p.status = 'error';
        p.errors = (p.errors || 0) + 1;
        p.lastError = err?.message || 'Scan error';
        p.lastScannedAt = new Date().toISOString();
        changed = true;
      }
    }

    // 3. Poll active V2 & Augestel when users have active assignments or every 15s
    const hasActiveUsers = db.assignments.length > 0;
    const v2Last = lastPanelScanMs['__v2__'] || 0;
    if (now - v2Last >= (hasActiveUsers ? 4000 : 20000)) {
      lastPanelScanMs['__v2__'] = now;
      const v2Rows = await v2FetchRecentOtps(db);
      if (v2Rows.length > 0) {
        ingestIncomingOtps(db, 'v2', getV2Creds(db).name, v2Rows);
        changed = true;
      }
      const augRows = await fetchAugestelOtps(db);
      if (augRows.length > 0) {
        ingestIncomingOtps(db, 'augestel', 'Augestel SMS', augRows);
        changed = true;
      }
    }

    // 4. Auto-poll pending Paid WA orders every 5s
    const waLast = lastPanelScanMs['__paid_wa__'] || 0;
    const activeWaOrders = db.paidWaOrders.filter((o) => o.status === 'pending' && o.deadlineMs > now);
    if (activeWaOrders.length > 0 && now - waLast >= 5000) {
      lastPanelScanMs['__paid_wa__'] = now;
      for (const ord of activeWaOrders.slice(0, 6)) {
        const otp = await fetchPaidWaOtpFromUrl(ord.url);
        if (otp) {
          ord.status = 'completed';
          ord.otp = otp;
          ord.completedAtMs = Date.now();
          ingestIncomingOtps(db, 'paid_wa', 'Paid WA OTP', [
            { number: ord.number, otp, sms: `WhatsApp code: ${otp}`, service: 'WHATSAPP' },
          ]);
          changed = true;
        }
      }
    }

    // 5. Run Demo OTP configs
    for (const cfg of db.demoConfigs) {
      if (!cfg.active || !cfg.numbers.length) continue;
      const last = lastDemoFireMs[cfg.id] || 0;
      if (now - last >= Math.max(3, cfg.interval || 15) * 1000) {
        lastDemoFireMs[cfg.id] = now;
        const rows = cfg.services.map((svc) => {
          let code = '';
          for (let i = 0; i < (cfg.digits || 6); i++) code += String(Math.floor(Math.random() * 10));
          const num = cfg.numbers[Math.floor(Math.random() * cfg.numbers.length)];
          return {
            number: num,
            otp: code,
            sms: `${svc} verification code: ${code}.`,
            service: svc,
          };
        });
        ingestIncomingOtps(db, `demo_${cfg.id}`, `Demo: ${cfg.name}`, rows);
        changed = true;
      }
    }

    if (changed) saveDb();
  } catch (_) {
  } finally {
    scannerRunning = false;
  }
}

export function ensureScannerStarted() {
  if (scannerStarted) return;
  scannerStarted = true;
  loadDb();
  setInterval(() => {
    runBackgroundScannerTick();
  }, 3000);
}

// ── State Snapshot Builder ───────────────────────────────────────────────────
function buildStateSnapshot(db: NsDatabase, uid: string, isAdmin: boolean) {
  const rate = Math.max(1, Number(db.settings.dollarRate || 129.5));
  const stockSummary: Array<{
    serviceKey: string;
    serviceLabel: string;
    serviceIcon: string;
    rewardBdt: number;
    countries: Array<{ countryName: string; iso2: string; emoji: string; available: number }>;
    totalAvailable: number;
  }> = [];

  let totalV1Available = 0;
  for (const svc of db.services) {
    const cMap = db.stock[svc.key] || {};
    const countries: Array<{ countryName: string; iso2: string; emoji: string; available: number }> = [];
    let svcTotal = 0;
    for (const [cName, nums] of Object.entries(cMap)) {
      if (!Array.isArray(nums) || nums.length === 0) continue;
      const info = getCountryDetails(nums[0]);
      countries.push({ countryName: cName, iso2: info.iso2, emoji: info.emoji, available: nums.length });
      svcTotal += nums.length;
    }
    countries.sort((a, b) => b.available - a.available);
    totalV1Available += svcTotal;
    stockSummary.push({
      serviceKey: svc.key,
      serviceLabel: svc.label,
      serviceIcon: svc.icon,
      rewardBdt: Number(svc.reward ?? db.settings.rewardPerOtp),
      countries,
      totalAvailable: svcTotal,
    });
  }

  // Mask panel secrets on non-admin view
  const safePanels = isAdmin
    ? db.panels.map((p) => ({
        ...p,
        password: p.password ? '••••••' : '',
        hasPassword: Boolean(p.password),
        apiKeyMasked: p.apiKey ? `${p.apiKey.slice(0, 6)}...` : '',
        cookieConfigured: Boolean(p.ivaCookie),
      }))
    : [];

  const safeSettings = isAdmin
    ? db.settings
    : {
        rewardPerOtp: db.settings.rewardPerOtp,
        currency: db.settings.currency,
        dollarRate: db.settings.dollarRate,
        minWithdraw: db.settings.minWithdraw,
        referCommissionPct: db.settings.referCommissionPct,
        numbersPerBatch: db.settings.numbersPerBatch,
        numberValidTimeMinutes: db.settings.numberValidTimeMinutes,
        paidWaPriceUsdt: db.settings.paidWaPriceUsdt,
        paidWaTimeoutSeconds: db.settings.paidWaTimeoutSeconds,
        v2ActivePanel: db.settings.v2ActivePanel,
        v2UserMode: db.settings.v2UserMode,
        v3Enabled: db.settings.v3Enabled,
        puranoOtpEnabled: db.settings.puranoOtpEnabled,
        liveTrafficUserEnabled: db.settings.liveTrafficUserEnabled,
        leaderboardEnabled: db.settings.leaderboardEnabled,
      };

  const userOrders = uid
    ? db.buyService.orders.filter((o) => o.uid === uid).slice(0, 30)
    : [];

  const userPaidWa = uid
    ? db.paidWaOrders.filter((o) => o.uid === uid).slice(0, 30)
    : [];

  return {
    success: true,
    settings: safeSettings,
    services: db.services,
    stockSummary,
    consoleConfig: db.consoleConfig,
    paidWaStockCount: db.waOtpLinks.length,
    buyService: {
      premiumPrices: db.buyService.premiumPrices,
      vpnServices: db.buyService.vpnServices,
      myOrders: userOrders,
      allOrders: isAdmin ? db.buyService.orders.slice(0, 100) : undefined,
    },
    userPaidWaOrders: userPaidWa,
    userMeta: uid ? db.users[uid] || null : null,
    stats: {
      totalV1Available,
      totalServices: db.services.length,
      paidWaStock: db.waOtpLinks.length,
      activePanels: db.panels.filter((p) => p.active).length,
      totalPanels: db.panels.length,
      totalUsers: Object.keys(db.users).length,
      totalDeliveries: db.deliveries.length,
      pendingRefundBatches: db.paidWaRefundBatches.filter((b) => b.status === 'pending').length,
      pendingBuyOrders: db.buyService.orders.filter((o) => o.status === 'pending').length,
    },
    panels: safePanels,
    paidWaAllOrders: isAdmin ? db.paidWaOrders.slice(0, 80) : undefined,
    paidWaRefundBatches: isAdmin ? db.paidWaRefundBatches.slice(0, 40) : undefined,
    demoConfigs: isAdmin ? db.demoConfigs : undefined,
    usersList: isAdmin ? Object.values(db.users).sort((a, b) => b.otpCount - a.otpCount).slice(0, 100) : undefined,
    dollarRate: rate,
  };
}

// ── Main HTTP Request Router ─────────────────────────────────────────────────
export async function handleNumberSystemApiRequest(
  subPath: string,
  method: string,
  searchParams: URLSearchParams,
  body: any
): Promise<{ status: number; json?: any; buffer?: Buffer; contentType?: string; filename?: string }> {
  ensureScannerStarted();
  const db = loadDb();

  // 1. State
  if (subPath === '/state' && method === 'GET') {
    const uid = String(searchParams.get('uid') || '');
    const isAdmin = searchParams.get('admin') === '1';
    return { status: 200, json: buildStateSnapshot(db, uid, isAdmin) };
  }

  // 2. Sync logged-in user
  if (subPath === '/user/sync' && method === 'POST') {
    const uid = String(body.uid || '').trim();
    if (!uid) return { status: 400, json: { success: false, error: 'Missing uid' } };
    const nowIso = new Date().toISOString();
    const cur = db.users[uid];
    if (cur) {
      cur.name = String(body.name || cur.name || 'User');
      cur.email = String(body.email || cur.email || '');
      cur.numericId = String(body.numericId || cur.numericId || '');
      if (body.referredByUid && body.referredByUid !== uid && !cur.referredByUid) {
        cur.referredByUid = String(body.referredByUid);
      }
      cur.lastActiveAt = nowIso;
    } else {
      db.users[uid] = {
        uid,
        name: String(body.name || 'User'),
        email: String(body.email || ''),
        numericId: String(body.numericId || ''),
        referredByUid: body.referredByUid && body.referredByUid !== uid ? String(body.referredByUid) : null,
        otpCount: 0,
        totalEarnedBdt: 0,
        totalEarnedUsdt: 0,
        qualifiedReferrals: 0,
        referralEarningsBdt: 0,
        joinedAt: nowIso,
        lastActiveAt: nowIso,
      };
    }
    saveDb();
    return { status: 200, json: { success: true, user: db.users[uid] } };
  }

  // 3. Services CRUD & Per-Service Reward
  if (subPath === '/service' && method === 'POST') {
    const action = String(body.action || '');
    if (action === 'add') {
      const label = String(body.name || '').trim();
      if (!label) return { status: 400, json: { success: false, error: 'Service name required' } };
      const key = canonicalServiceKey(label);
      if (db.services.some((s) => s.key === key)) {
        return { status: 400, json: { success: false, error: 'Service already exists' } };
      }
      const reward = Number.isFinite(Number(body.reward)) ? Number(body.reward) : db.settings.rewardPerOtp;
      const svc: NsServiceItem = {
        key,
        label,
        icon: String(body.icon || '🔔').trim() || '🔔',
        reward,
        active: true,
        createdAt: new Date().toISOString(),
      };
      db.services.push(svc);
      if (!db.stock[key]) db.stock[key] = {};
      saveDb();
      return { status: 200, json: { success: true, service: svc } };
    }
    if (action === 'delete') {
      const key = canonicalServiceKey(body.key || body.name || '');
      db.services = db.services.filter((s) => s.key !== key);
      delete db.stock[key];
      saveDb();
      return { status: 200, json: { success: true } };
    }
    if (action === 'updateReward') {
      const key = canonicalServiceKey(body.key || '');
      const svc = db.services.find((s) => s.key === key);
      if (!svc) return { status: 404, json: { success: false, error: 'Service not found' } };
      svc.reward = Math.max(0, Number(body.reward || 0));
      saveDb();
      return { status: 200, json: { success: true, service: svc } };
    }
    return { status: 400, json: { success: false, error: 'Unknown action' } };
  }

  // 4. Bulk Upload V1 Numbers (auto-grouped by Country from phone dial code!)
  if (subPath === '/numbers/upload' && method === 'POST') {
    const serviceKey = canonicalServiceKey(body.serviceKey || '');
    const svc = db.services.find((s) => s.key === serviceKey);
    if (!svc) return { status: 400, json: { success: false, error: 'Select a valid service first' } };

    const rawNums = extractNumbersFromUpload(String(body.fileName || 'paste.txt'), body.fileData, body.text);
    if (rawNums.length === 0) {
      return { status: 400, json: { success: false, error: 'No valid phone numbers (7–15 digits) found' } };
    }

    const usedSet = new Set(db.usedNumbers);
    if (!db.stock[svc.key]) db.stock[svc.key] = {};
    const svcStock = db.stock[svc.key];

    const existingForSvc = new Set<string>();
    for (const arr of Object.values(svcStock)) {
      for (const n of arr) existingForSvc.add(n);
    }

    const manualCountry = String(body.countryName || '').trim();
    let inserted = 0;
    let duplicates = 0;
    const perCountry: Record<string, number> = {};

    for (const digits of rawNums) {
      if (existingForSvc.has(digits) || usedSet.has(digits)) {
        duplicates++;
        continue;
      }
      const cName = manualCountry || getCountryDetails(digits).countryName;
      if (!svcStock[cName]) svcStock[cName] = [];
      svcStock[cName].push(digits);
      existingForSvc.add(digits);
      inserted++;
      perCountry[cName] = (perCountry[cName] || 0) + 1;
    }

    saveDb();
    return { status: 200, json: { success: true, serviceName: svc.label, inserted, duplicates, perCountry } };
  }

  // 5. Clear V1 Stock (Sob Clear: by country / by service / all)
  if (subPath === '/numbers/clear' && method === 'POST') {
    const scope = String(body.scope || 'all');
    const svcKey = canonicalServiceKey(body.serviceKey || '');
    const countryName = String(body.countryName || '').trim();
    let removed = 0;

    if (scope === 'country' && svcKey && countryName && db.stock[svcKey]?.[countryName]) {
      removed = db.stock[svcKey][countryName].length;
      delete db.stock[svcKey][countryName];
    } else if (scope === 'service' && svcKey && db.stock[svcKey]) {
      for (const arr of Object.values(db.stock[svcKey])) removed += arr.length;
      db.stock[svcKey] = {};
    } else if (scope === 'all') {
      for (const cMap of Object.values(db.stock)) {
        for (const arr of Object.values(cMap)) removed += arr.length;
      }
      db.stock = {};
      db.usedNumbers = [];
      db.assignments = [];
    }
    saveDb();
    return { status: 200, json: { success: true, removed } };
  }

  // 6. Claim V1 Numbers
  if (subPath === '/numbers/claim' && method === 'POST') {
    const uid = String(body.uid || '').trim();
    const userName = String(body.name || 'User');
    const svcKey = canonicalServiceKey(body.serviceKey || '');
    const countryName = String(body.countryName || '').trim();
    const isChange = Boolean(body.change);
    if (!uid) return { status: 401, json: { success: false, error: 'Login required' } };
    const svc = db.services.find((s) => s.key === svcKey);
    if (!svc) return { status: 400, json: { success: false, error: 'Invalid service' } };

    const pool = db.stock[svc.key]?.[countryName];
    if (!Array.isArray(pool) || pool.length === 0) {
      return { status: 400, json: { success: false, error: 'Selected country is out of stock' } };
    }

    // If changing number, release user's previous active V1 assignment for this service/country
    if (isChange) {
      db.assignments = db.assignments.filter(
        (a) => !(a.uid === uid && a.source === 'v1' && a.serviceKey === svc.key && a.countryName === countryName)
      );
    }

    const batchSize = Math.max(1, Math.min(10, Number(db.settings.numbersPerBatch || 3)));
    const taken = pool.splice(0, batchSize);
    if (pool.length === 0) delete db.stock[svc.key][countryName];

    const now = Date.now();
    const validMs = Math.max(1, Number(db.settings.numberValidTimeMinutes || 10)) * 60_000;
    const assigned: NsAssignment[] = [];

    for (const digits of taken) {
      db.usedNumbers.push(digits);
      const cInfo = getCountryDetails(digits);
      const { withPlus, withoutCc } = stripDialCode(digits);
      const item: NsAssignment = {
        id: `asg_${now}_${crypto.randomBytes(3).toString('hex')}`,
        uid,
        userName,
        source: 'v1',
        serviceKey: svc.key,
        serviceName: svc.label,
        countryName,
        iso2: cInfo.iso2,
        emoji: cInfo.emoji,
        number: digits,
        withPlus,
        withoutCc,
        assignedAtMs: now,
        expiresAtMs: now + validMs,
      };
      db.assignments.unshift(item);
      assigned.push(item);
    }
    db.usedNumbers = db.usedNumbers.slice(-50_000);
    saveDb();
    return { status: 200, json: { success: true, assigned } };
  }

  // 7. Get Active Numbers + Inbox OTPs + Pending Paid WA Refunds
  if (subPath === '/numbers/active' && method === 'GET') {
    const uid = String(searchParams.get('uid') || '').trim();
    if (!uid) return { status: 200, json: { success: true, activeNumbers: [], deliveries: [], paidWaOrders: [], pendingWalletRefunds: [] } };
    const now = Date.now();
    const activeNumbers = db.assignments.filter((a) => a.uid === uid && a.expiresAtMs > now);
    const deliveries = db.deliveries.filter((d) => d.uid === uid).slice(0, 60);
    const paidWaOrders = db.paidWaOrders.filter((o) => o.uid === uid).slice(0, 30);
    const pendingWalletRefunds = [
      ...db.paidWaOrders
        .filter((o) => o.uid === uid && o.status === 'refunded' && o.walletRefundPending && !o.walletRefundAcked)
        .map((o) => ({ kind: 'paid_wa' as const, id: o.orderId, amountBdt: o.chargedBdt, amountUsdt: o.priceUsdt })),
      ...db.buyService.orders
        .filter((o) => o.uid === uid && o.status === 'rejected' && o.walletRefundPending && !o.walletRefundAcked)
        .map((o) => ({ kind: 'buy_service' as const, id: o.orderId, amountBdt: o.priceBdt, amountUsdt: o.priceUsdt })),
    ];
    return { status: 200, json: { success: true, activeNumbers, deliveries, paidWaOrders, pendingWalletRefunds } };
  }

  // 8. Ack OTP Credits (prevents double credit on frontend Firebase wallet)
  if (subPath === '/numbers/ack-otp' && method === 'POST') {
    const uid = String(body.uid || '').trim();
    const ids = Array.isArray(body.deliveryIds) ? body.deliveryIds.map(String) : [];
    const credited: any[] = [];
    for (const id of ids) {
      const d = db.deliveries.find((x) => x.id === id && x.uid === uid && !x.acknowledged);
      if (d) {
        d.acknowledged = true;
        credited.push({
          id: d.id,
          rewardBdt: d.rewardBdt,
          rewardUsdt: d.rewardUsdt,
          referrerUid: d.referrerUid,
          referrerCommissionBdt: d.referrerCommissionBdt,
        });
      }
    }
    if (credited.length > 0) saveDb();
    return { status: 200, json: { success: true, credited } };
  }

  // 9. Ack Wallet Refund Sync
  if (subPath === '/paid-wa/ack-refund' && method === 'POST') {
    const uid = String(body.uid || '').trim();
    const items = Array.isArray(body.items) ? body.items : [];
    const acked: Array<{ kind: string; id: string; amountBdt: number }> = [];
    for (const it of items) {
      if (it.kind === 'paid_wa') {
        const ord = db.paidWaOrders.find((o) => o.orderId === it.id && o.uid === uid && !o.walletRefundAcked);
        if (ord) {
          ord.walletRefundAcked = true;
          ord.walletRefundPending = false;
          acked.push({ kind: 'paid_wa', id: ord.orderId, amountBdt: ord.chargedBdt });
        }
      } else if (it.kind === 'buy_service') {
        const ord = db.buyService.orders.find((o) => o.orderId === it.id && o.uid === uid && !o.walletRefundAcked);
        if (ord) {
          ord.walletRefundAcked = true;
          ord.walletRefundPending = false;
          acked.push({ kind: 'buy_service', id: ord.orderId, amountBdt: ord.priceBdt });
        }
      }
    }
    if (acked.length > 0) saveDb();
    return { status: 200, json: { success: true, acked } };
  }

  // 10. V2 Live Console: Live Ranges + Custom Range Allocation
  if (subPath === '/v2/liveaccess' && method === 'GET') {
    const live = await v2FetchLiveAccess(db);
    // Merge console config ranges with live services
    const merged: Record<string, { sid: string; enabled: boolean; ranges: Array<{ prefix: string; countryName: string; iso2: string; emoji: string; source: 'live' | 'custom' }> }> = {};
    for (const plat of CONSOLE_PLATFORMS) {
      const cfg = db.consoleConfig[plat] || { enabled: false, ranges: [] };
      merged[plat] = {
        sid: plat,
        enabled: cfg.enabled,
        ranges: cfg.ranges.map((prefix) => {
          const c = getCountryDetails(prefix);
          return { prefix, countryName: c.countryName, iso2: c.iso2, emoji: c.emoji, source: 'custom' };
        }),
      };
    }
    for (const s of live.services) {
      const sid = String(s.sid || s.service || '').toUpperCase();
      if (!sid) continue;
      if (!merged[sid]) merged[sid] = { sid, enabled: true, ranges: [] };
      const existing = new Set(merged[sid].ranges.map((r) => r.prefix));
      for (const rng of s.ranges || []) {
        const clean = String(rng).replace(/X+$/i, '');
        if (!clean || existing.has(clean)) continue;
        existing.add(clean);
        const c = getCountryDetails(clean);
        merged[sid].ranges.push({ prefix: clean, countryName: c.countryName, iso2: c.iso2, emoji: c.emoji, source: 'live' });
      }
    }
    return {
      status: 200,
      json: {
        success: true,
        panelName: live.panelName,
        panelConfigured: live.configured,
        platforms: Object.values(merged),
      },
    };
  }

  if (subPath === '/v2/getnum' && method === 'POST') {
    const uid = String(body.uid || '').trim();
    const userName = String(body.name || 'User');
    const prefix = String(body.prefix || '').replace(/X+$/i, '').replace(/\D/g, '');
    const sid = String(body.sid || 'Facebook').trim();
    if (!uid) return { status: 401, json: { success: false, error: 'Login required' } };
    if (!prefix || prefix.length < 1) return { status: 400, json: { success: false, error: 'Enter valid numeric dial prefix (e.g. 8801, 91)' } };

    const num = await v2AllocateNumber(db, prefix, sid);
    if (!num) {
      return {
        status: 400,
        json: {
          success: false,
          error: `No live number allocated from ${getV2Creds(db).name} for prefix ${prefix}. Check API key or try another range.`,
        },
      };
    }
    const digits = normalizeDigits(num);
    const c = getCountryDetails(digits);
    const { withPlus, withoutCc } = stripDialCode(digits);
    const now = Date.now();
    const item: NsAssignment = {
      id: `v2_${now}_${crypto.randomBytes(3).toString('hex')}`,
      uid,
      userName,
      source: 'v2',
      serviceKey: canonicalServiceKey(sid),
      serviceName: sid,
      countryName: c.countryName,
      iso2: c.iso2,
      emoji: c.emoji,
      number: digits,
      withPlus,
      withoutCc,
      assignedAtMs: now,
      expiresAtMs: now + Math.max(1, Number(db.settings.numberValidTimeMinutes || 10)) * 60_000,
      panelSource: getV2Creds(db).name,
    };
    db.assignments.unshift(item);
    saveDb();
    return { status: 200, json: { success: true, assigned: item } };
  }

  // 11. V3 Panel Live Endpoints
  if (subPath === '/v3/services' && method === 'GET') {
    if (!db.settings.v3Enabled) {
      return { status: 200, json: { success: true, enabled: false, configured: false, services: [] } };
    }
    const res = await v3FetchServices(db);
    return { status: 200, json: { success: true, enabled: true, configured: res.configured, services: res.services } };
  }

  if (subPath === '/v3/getnum' && method === 'POST') {
    if (!db.settings.v3Enabled) return { status: 400, json: { success: false, error: 'V3 Panel is disabled by Admin' } };
    const uid = String(body.uid || '').trim();
    const userName = String(body.name || 'User');
    const sid = String(body.serviceId || '').trim();
    if (!uid || !sid) return { status: 400, json: { success: false, error: 'Service ID and login required' } };
    const num = await v3AllocateNumber(db, sid);
    if (!num) return { status: 400, json: { success: false, error: `Could not allocate V3 number for ${sid}` } };

    const digits = normalizeDigits(num);
    const c = getCountryDetails(digits);
    const { withPlus, withoutCc } = stripDialCode(digits);
    const now = Date.now();
    const item: NsAssignment = {
      id: `v3_${now}_${crypto.randomBytes(3).toString('hex')}`,
      uid,
      userName,
      source: 'v3',
      serviceKey: canonicalServiceKey(sid),
      serviceName: sid,
      countryName: c.countryName,
      iso2: c.iso2,
      emoji: c.emoji,
      number: digits,
      withPlus,
      withoutCc,
      assignedAtMs: now,
      expiresAtMs: now + Math.max(1, Number(db.settings.numberValidTimeMinutes || 10)) * 60_000,
      panelSource: 'V3 Panel',
    };
    db.assignments.unshift(item);
    saveDb();
    return { status: 200, json: { success: true, assigned: item } };
  }

  // 12. V2 Console Admin Config (toggle platform, add/remove custom range, switch V2 panel)
  if (subPath === '/v2/console-config' && method === 'POST') {
    const action = String(body.action || '');
    const sid = String(body.sid || '').toUpperCase();
    if (action === 'togglePlatform' && sid) {
      if (!db.consoleConfig[sid]) db.consoleConfig[sid] = { enabled: false, ranges: [] };
      db.consoleConfig[sid].enabled = !db.consoleConfig[sid].enabled;
    } else if (action === 'addRange' && sid) {
      const prefix = String(body.prefix || '').replace(/\D/g, '');
      if (!prefix) return { status: 400, json: { success: false, error: 'Numeric range prefix required (e.g. 880, 91)' } };
      if (!db.consoleConfig[sid]) db.consoleConfig[sid] = { enabled: true, ranges: [] };
      if (!db.consoleConfig[sid].ranges.includes(prefix)) {
        db.consoleConfig[sid].ranges.push(prefix);
      }
      db.consoleConfig[sid].enabled = true;
    } else if (action === 'removeRange' && sid) {
      const prefix = String(body.prefix || '');
      if (db.consoleConfig[sid]) {
        db.consoleConfig[sid].ranges = db.consoleConfig[sid].ranges.filter((r) => r !== prefix);
      }
    } else if (action === 'setV2Panel') {
      const pid = String(body.panelId || 'fastx') as V2PanelId;
      if (['fastx', 'stex', 'voltex', 'mk'].includes(pid)) {
        db.settings.v2ActivePanel = pid;
      }
    } else if (action === 'toggleModes') {
      if (typeof body.v2UserMode === 'boolean') db.settings.v2UserMode = body.v2UserMode;
      if (typeof body.v3Enabled === 'boolean') db.settings.v3Enabled = body.v3Enabled;
    }
    saveDb();
    return { status: 200, json: { success: true, consoleConfig: db.consoleConfig, settings: db.settings } };
  }

  // 13. Paid WA & File WA Stock Upload / Clear
  if (subPath === '/wa/upload' && method === 'POST') {
    const entries = extractWaLinksFromUpload(String(body.fileName || 'wa.txt'), body.fileData, body.text);
    if (entries.length === 0) {
      return { status: 400, json: { success: false, error: 'No valid "number | otp_url" rows found' } };
    }
    const existing = new Set(db.waOtpLinks.map((x) => normalizeDigits(x.number)));
    let inserted = 0;
    let duplicates = 0;
    for (const e of entries) {
      const key = normalizeDigits(e.number);
      if (existing.has(key)) {
        duplicates++;
        continue;
      }
      existing.add(key);
      db.waOtpLinks.push({
        id: `wa_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        number: e.number,
        url: e.url,
        addedAt: new Date().toISOString(),
      });
      inserted++;
    }
    saveDb();
    return { status: 200, json: { success: true, inserted, duplicates, totalStock: db.waOtpLinks.length } };
  }

  if (subPath === '/wa/clear' && method === 'POST') {
    const removed = db.waOtpLinks.length;
    db.waOtpLinks = [];
    saveDb();
    return { status: 200, json: { success: true, removed } };
  }

  // 14. Paid WA Buy / Bulk Buy + On-demand Get OTP + Admin Approve Refund
  if (subPath === '/paid-wa/buy' && method === 'POST') {
    const uid = String(body.uid || '').trim();
    const userName = String(body.name || 'User');
    const qty = Math.max(1, Math.min(25, Number(body.quantity || 1)));
    if (!uid) return { status: 401, json: { success: false, error: 'Login required' } };
    if (db.waOtpLinks.length < qty) {
      return { status: 400, json: { success: false, error: `Only ${db.waOtpLinks.length} WA numbers available in stock` } };
    }

    const priceUsdt = Number(db.settings.paidWaPriceUsdt || 0);
    const rate = Math.max(1, Number(db.settings.dollarRate || 129.5));
    const unitBdt = Number((priceUsdt * rate).toFixed(2));
    const items = db.waOtpLinks.splice(0, qty);
    const now = Date.now();
    const timeoutMs = Math.max(60, Number(db.settings.paidWaTimeoutSeconds || 240)) * 1000;
    const created: NsPaidWaOrder[] = [];

    for (const entry of items) {
      const ord: NsPaidWaOrder = {
        orderId: `wa_${now}_${crypto.randomBytes(3).toString('hex')}`,
        uid,
        userName,
        number: entry.number,
        url: entry.url,
        priceUsdt,
        chargedBdt: unitBdt,
        status: 'pending',
        purchasedAtMs: now,
        deadlineMs: now + timeoutMs,
        otp: '',
        completedAtMs: null,
        refundedAtMs: null,
        walletRefundPending: false,
        walletRefundAcked: false,
        batchId: null,
      };
      db.paidWaOrders.unshift(ord);
      created.push(ord);
    }
    db.paidWaOrders = db.paidWaOrders.slice(0, 500);
    saveDb();
    return {
      status: 200,
      json: {
        success: true,
        orders: created,
        totalChargedBdt: Number((unitBdt * qty).toFixed(2)),
        totalChargedUsdt: Number((priceUsdt * qty).toFixed(6)),
      },
    };
  }

  if (subPath === '/paid-wa/get-otp' && method === 'POST') {
    const uid = String(body.uid || '').trim();
    const orderId = String(body.orderId || '').trim();
    const ord = db.paidWaOrders.find((o) => o.orderId === orderId && o.uid === uid);
    if (!ord) return { status: 404, json: { success: false, error: 'Order not found' } };
    if (ord.status === 'completed') return { status: 200, json: { success: true, otp: ord.otp, order: ord } };
    if (ord.status !== 'pending') return { status: 400, json: { success: false, error: 'Order has expired and been refunded' } };

    const otp = await fetchPaidWaOtpFromUrl(ord.url);
    if (!otp) {
      return { status: 200, json: { success: true, otp: '', message: 'OTP not received yet. Polling remains active.', order: ord } };
    }
    ord.status = 'completed';
    ord.otp = otp;
    ord.completedAtMs = Date.now();
    ingestIncomingOtps(db, 'paid_wa', 'Paid WA OTP', [
      { number: ord.number, otp, sms: `WhatsApp verification code: ${otp}`, service: 'WHATSAPP' },
    ]);
    saveDb();
    return { status: 200, json: { success: true, otp, order: ord } };
  }

  if (subPath === '/paid-wa/refund-approve' && method === 'POST') {
    const batchId = String(body.batchId || '').trim();
    const batch = db.paidWaRefundBatches.find((b) => b.batchId === batchId);
    if (!batch) return { status: 404, json: { success: false, error: 'Batch not found' } };
    batch.status = 'approved';
    batch.approvedAt = new Date().toISOString();
    saveDb();
    return { status: 200, json: { success: true, batch } };
  }

  // 15. Panel Manager (Simple 3-Mode Add + Test + Scan + Toggle + Cookie Update + Keys)
  if (subPath === '/panel/add' && method === 'POST') {
    const name = String(body.name || '').trim();
    const mode = (String(body.mode || 'web_login') as PanelConnectMode);
    const rawUrl = String(body.url || '').trim();
    if (!name || !rawUrl) {
      return { status: 400, json: { success: false, error: 'Panel Name and URL are required' } };
    }

    const baseUrl = extractPanelBaseUrl(rawUrl);
    let host = baseUrl;
    try {
      host = new URL(baseUrl).host;
    } catch (_) {}

    const panel: NsPanelItem = {
      id: `pnl_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`,
      name,
      mode,
      engine: mode === 'iva_cookie' ? 'iva_sms' : mode === 'api_key' ? 'api_key' : 'ints_smscdr',
      host,
      baseUrl,
      urlHint: rawUrl,
      dataPath: '',
      username: String(body.username || '').trim(),
      password: String(body.password || ''),
      apiKey: String(body.apiKey || '').trim(),
      apiKeyParam: 'api_key',
      ivaCookie: String(body.ivaCookie || '').trim(),
      ivaAjaxUrl: '',
      cookies: {},
      sessionToken: '',
      active: true,
      scanInterval: Math.max(3, Number(body.scanInterval || 8)),
      status: 'ok',
      fetchCount: 0,
      errors: 0,
      lastError: null,
      lastScannedAt: null,
      lastSmsSample: null,
      addedAt: new Date().toISOString(),
    };

    if (mode === 'web_login') {
      if (!panel.username || !panel.password) {
        return { status: 400, json: { success: false, error: 'Username & Password required for Web Login Panel' } };
      }
      const res = await universalLogin(panel);
      if (!res.ok) return { status: 400, json: { success: false, error: res.error || 'Could not log into panel' } };
      panel.engine = res.engine;
      panel.dataPath = res.dataPath;
      panel.cookies = res.jar;
      panel.sessionToken = res.token;
      panel.baseUrl = res.baseUrl;
    } else if (mode === 'api_key') {
      if (!panel.apiKey) return { status: 400, json: { success: false, error: 'API Key is required' } };
      const probe = await testApiKeyPanel(baseUrl, panel.apiKey);
      if (!probe) {
        return { status: 400, json: { success: false, error: 'API Key probe could not find a working JSON SMS endpoint' } };
      }
      panel.engine = probe.engine;
      panel.dataPath = probe.dataPath;
      panel.apiKeyParam = probe.apiKeyParam;
    } else if (mode === 'iva_cookie') {
      if (!panel.ivaCookie) return { status: 400, json: { success: false, error: 'IVA SMS browser cookie is required' } };
      await fetchIvaPanel(panel);
    }

    db.panels.push(panel);
    saveDb();
    return { status: 200, json: { success: true, panel: { ...panel, password: '••••••' } } };
  }

  if (subPath === '/panel/action' && method === 'POST') {
    const pid = String(body.panelId || '');
    const action = String(body.action || '');
    const idx = db.panels.findIndex((p) => p.id === pid);
    if (idx === -1) return { status: 404, json: { success: false, error: 'Panel not found' } };
    const panel = db.panels[idx];

    if (action === 'delete') {
      db.panels.splice(idx, 1);
      saveDb();
      return { status: 200, json: { success: true } };
    }
    if (action === 'toggle') {
      panel.active = !panel.active;
      panel.status = panel.active ? 'ok' : 'paused';
      saveDb();
      return { status: 200, json: { success: true, active: panel.active } };
    }
    if (action === 'updateCookie') {
      panel.ivaCookie = String(body.ivaCookie || '').trim();
      panel.status = 'ok';
      panel.lastError = null;
      saveDb();
      return { status: 200, json: { success: true } };
    }
    if (action === 'test' || action === 'scannow') {
      try {
        let rows: Array<{ number: string; otp: string; sms: string; service: string }> = [];
        if (panel.engine === 'iva_sms') rows = await fetchIvaPanel(panel);
        else if (panel.engine === 'api_key' || panel.engine === 'unixsms_cdr') rows = await fetchApiKeyPanel(panel);
        else rows = await fetchUniversalPanel(panel);

        panel.status = 'ok';
        panel.lastError = null;
        panel.lastScannedAt = new Date().toISOString();
        panel.fetchCount = (panel.fetchCount || 0) + rows.length;
        if (rows[0]) panel.lastSmsSample = { number: rows[0].number, otp: rows[0].otp, service: rows[0].service, message: rows[0].sms, ts: new Date().toISOString() };
        const res = action === 'scannow' ? ingestIncomingOtps(db, panel.id, panel.name, rows) : { delivered: 0 };
        saveDb();
        return {
          status: 200,
          json: {
            success: true,
            panelName: panel.name,
            engine: panel.engine,
            fetched: rows.length,
            delivered: res.delivered,
            samples: rows.slice(0, 5),
          },
        };
      } catch (err: any) {
        panel.status = 'error';
        panel.lastError = err?.message || 'Test failed';
        panel.errors = (panel.errors || 0) + 1;
        saveDb();
        return { status: 400, json: { success: false, error: panel.lastError } };
      }
    }
    return { status: 400, json: { success: false, error: 'Unknown panel action' } };
  }

  if (subPath === '/panel/keys' && method === 'POST') {
    const k = db.settings.panelKeys;
    if (typeof body.fastxBase === 'string' && body.fastxBase.trim()) k.fastxBase = body.fastxBase.trim();
    if (typeof body.fastxKey === 'string') k.fastxKey = body.fastxKey.trim();
    if (typeof body.stexBase === 'string' && body.stexBase.trim()) k.stexBase = body.stexBase.trim();
    if (typeof body.stexKey === 'string') k.stexKey = body.stexKey.trim();
    if (typeof body.voltexBase === 'string' && body.voltexBase.trim()) k.voltexBase = body.voltexBase.trim();
    if (typeof body.voltexKey === 'string') k.voltexKey = body.voltexKey.trim();
    if (typeof body.mkBase === 'string' && body.mkBase.trim()) k.mkBase = body.mkBase.trim();
    if (typeof body.mkKey === 'string') k.mkKey = body.mkKey.trim();
    if (typeof body.augestelBase === 'string' && body.augestelBase.trim()) k.augestelBase = body.augestelBase.trim();
    if (typeof body.augestelKey === 'string') k.augestelKey = body.augestelKey.trim();
    saveDb();
    return { status: 200, json: { success: true, panelKeys: k } };
  }

  // 16. Settings (Rewards, Rates, Rules)
  if (subPath === '/settings' && method === 'POST') {
    const s = db.settings;
    if (body.rewardPerOtp != null) s.rewardPerOtp = Math.max(0, Number(body.rewardPerOtp));
    if (typeof body.currency === 'string' && body.currency.trim()) s.currency = body.currency.trim();
    if (body.dollarRate != null) s.dollarRate = Math.max(1, Number(body.dollarRate));
    if (body.minWithdraw != null) s.minWithdraw = Math.max(0, Number(body.minWithdraw));
    if (body.referCommissionPct != null) s.referCommissionPct = Math.max(0, Math.min(100, Number(body.referCommissionPct)));
    if (body.numbersPerBatch != null) s.numbersPerBatch = Math.max(1, Math.min(10, Number(body.numbersPerBatch)));
    if (body.numberValidTimeMinutes != null) s.numberValidTimeMinutes = Math.max(1, Number(body.numberValidTimeMinutes));
    if (body.paidWaPriceUsdt != null) s.paidWaPriceUsdt = Math.max(0, Number(body.paidWaPriceUsdt));
    if (body.paidWaTimeoutSeconds != null) s.paidWaTimeoutSeconds = Math.max(60, Number(body.paidWaTimeoutSeconds));
    if (typeof body.puranoOtpEnabled === 'boolean') s.puranoOtpEnabled = body.puranoOtpEnabled;
    if (typeof body.liveTrafficUserEnabled === 'boolean') s.liveTrafficUserEnabled = body.liveTrafficUserEnabled;
    if (typeof body.leaderboardEnabled === 'boolean') s.leaderboardEnabled = body.leaderboardEnabled;
    if (typeof body.v2UserMode === 'boolean') s.v2UserMode = body.v2UserMode;
    if (typeof body.v3Enabled === 'boolean') s.v3Enabled = body.v3Enabled;
    saveDb();
    return { status: 200, json: { success: true, settings: s } };
  }

  // 17. Buy Service Store (VPN / Proxy / Telegram Premium)
  if (subPath === '/buy-service/catalog' && method === 'POST') {
    const action = String(body.action || '');
    if (action === 'updatePremium') {
      db.buyService.premiumPrices = {
        '3M': Math.max(0, Number(body.p3m || 0)),
        '6M': Math.max(0, Number(body.p6m || 0)),
        '1Y': Math.max(0, Number(body.p1y || 0)),
      };
    } else if (action === 'addVpn') {
      const name = String(body.name || '').trim();
      const duration = String(body.duration || '7D').trim();
      const price = Math.max(0, Number(body.price || 0));
      const category = body.category === 'proxy' ? 'proxy' : 'vpn';
      const icon = String(body.icon || (category === 'proxy' ? '🌐' : '🛡️')).trim();
      if (!name) return { status: 400, json: { success: false, error: 'Product name required' } };
      db.buyService.vpnServices.push({
        id: `prod_${Date.now().toString(36)}`,
        name,
        icon,
        duration,
        price,
        category,
      });
    } else if (action === 'updatePrice') {
      const item = db.buyService.vpnServices.find((v) => v.id === body.id);
      if (!item) return { status: 404, json: { success: false, error: 'Product not found' } };
      item.price = Math.max(0, Number(body.price || 0));
    } else if (action === 'deleteVpn') {
      db.buyService.vpnServices = db.buyService.vpnServices.filter((v) => v.id !== body.id);
    }
    saveDb();
    return { status: 200, json: { success: true, buyService: db.buyService } };
  }

  if (subPath === '/buy-service/order' && method === 'POST') {
    const uid = String(body.uid || '').trim();
    const userName = String(body.userName || 'User');
    if (!uid) return { status: 401, json: { success: false, error: 'Login required' } };
    const rate = Math.max(1, Number(db.settings.dollarRate || 129.5));
    const priceBdt = Math.max(0, Number(body.priceBdt || 0));
    const order: NsBuyOrder = {
      orderId: `ord_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      uid,
      userName,
      orderType: body.orderType === 'proxy' ? 'proxy' : body.orderType === 'premium' ? 'premium' : 'vpn',
      serviceId: String(body.serviceId || ''),
      serviceName: String(body.serviceName || ''),
      duration: String(body.duration || ''),
      priceBdt,
      priceUsdt: Number((priceBdt / rate).toFixed(4)),
      txRef: String(body.txRef || 'Wallet').trim(),
      deliveryNote: '',
      status: 'pending',
      walletRefundPending: false,
      walletRefundAcked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.buyService.orders.unshift(order);
    db.buyService.orders = db.buyService.orders.slice(0, 400);
    saveDb();
    return { status: 200, json: { success: true, order } };
  }

  if (subPath === '/buy-service/order-action' && method === 'POST') {
    const orderId = String(body.orderId || '');
    const status = body.status === 'completed' ? 'completed' : body.status === 'rejected' ? 'rejected' : 'pending';
    const ord = db.buyService.orders.find((o) => o.orderId === orderId);
    if (!ord) return { status: 404, json: { success: false, error: 'Order not found' } };
    ord.status = status;
    if (typeof body.deliveryNote === 'string') ord.deliveryNote = body.deliveryNote.trim();
    if (status === 'rejected') ord.walletRefundPending = true;
    ord.updatedAt = new Date().toISOString();
    saveDb();
    return { status: 200, json: { success: true, order: ord } };
  }

  // 18. Live Traffic Monitor (grouped by WA, FB, IG, TG + ranges)
  if (subPath === '/traffic' && method === 'GET') {
    const isAdmin = searchParams.get('admin') === '1';
    const v2Live = await v2FetchLiveAccess(db);
    const groups: Record<string, { label: string; ranges: string[]; hits: any[] }> = {
      WHATSAPP: { label: 'WhatsApp', ranges: [], hits: [] },
      FACEBOOK: { label: 'Facebook', ranges: [], hits: [] },
      INSTAGRAM: { label: 'Instagram', ranges: [], hits: [] },
      TELEGRAM: { label: 'Telegram', ranges: [], hits: [] },
    };

    for (const s of v2Live.services) {
      const k = String(s.sid || '').toUpperCase();
      if (groups[k] && Array.isArray(s.ranges)) {
        groups[k].ranges = s.ranges.slice(0, 12);
      }
    }

    const now = Date.now();
    for (const hit of db.recentTraffic) {
      const targetKey = groups[hit.serviceKey] ? hit.serviceKey : null;
      if (!targetKey) continue;
      const secAgo = Math.max(1, Math.floor((now - hit.tsMs) / 1000));
      const timeAgo = secAgo < 60 ? `${secAgo}s ago` : `${Math.floor(secAgo / 60)}m ago`;
      groups[targetKey].hits.push({
        number: isAdmin ? hit.numberRaw : hit.numberMasked,
        otpDash: hit.otpDash,
        countryName: hit.countryName,
        emoji: hit.emoji,
        hitCount: hit.hitCount,
        timeAgo,
        panelName: hit.panelName,
      });
    }

    return {
      status: 200,
      json: {
        success: true,
        panelName: v2Live.panelName,
        totalHits: db.recentTraffic.length,
        groups,
        recentAll: db.recentTraffic.slice(0, 30).map((h) => ({
          ...h,
          number: isAdmin ? h.numberRaw : h.numberMasked,
        })),
      },
    };
  }

  // 19. Leaderboard / OTP Stats
  if (subPath === '/leaderboard' && method === 'GET') {
    const uid = String(searchParams.get('uid') || '');
    const isAdmin = searchParams.get('admin') === '1';
    const allUsers = Object.values(db.users);

    const topOtpUsers = [...allUsers]
      .sort((a, b) => b.otpCount - a.otpCount)
      .slice(0, 15)
      .map((u, idx) => ({
        rank: idx + 1,
        uid: u.uid,
        displayName: isAdmin || u.uid === uid ? u.name : `${u.name.slice(0, 2)}***${u.name.slice(-1)}`,
        otpCount: u.otpCount,
        totalEarnedBdt: u.totalEarnedBdt,
      }));

    const inviteCounts: Record<string, number> = {};
    for (const u of allUsers) {
      if (u.referredByUid) inviteCounts[u.referredByUid] = (inviteCounts[u.referredByUid] || 0) + 1;
    }

    const topReferrers = [...allUsers]
      .map((u) => ({
        uid: u.uid,
        name: u.name,
        invited: inviteCounts[u.uid] || 0,
        referralEarningsBdt: u.referralEarningsBdt || 0,
      }))
      .filter((x) => x.invited > 0 || x.referralEarningsBdt > 0)
      .sort((a, b) => b.invited - a.invited)
      .slice(0, 15)
      .map((u, idx) => ({
        rank: idx + 1,
        displayName: isAdmin || u.uid === uid ? u.name : `${u.name.slice(0, 2)}***`,
        invited: u.invited,
        referralEarningsBdt: u.referralEarningsBdt,
      }));

    return { status: 200, json: { success: true, topOtpUsers, topReferrers } };
  }

  // 20. Demo OTP Simulator (Config CRUD + One-shot Fire)
  if (subPath === '/demo-otp' && method === 'POST') {
    const action = String(body.action || 'fire');
    if (action === 'addConfig') {
      const nums = String(body.numbers || '')
        .split(/[\n,\s]+/)
        .map((n) => n.replace(/\D/g, ''))
        .filter((d) => d.length >= 7);
      if (nums.length === 0) return { status: 400, json: { success: false, error: 'Enter at least one valid number' } };
      const cfg: NsDemoConfig = {
        id: `demo_${Date.now().toString(36)}`,
        name: String(body.name || 'Demo Feed').trim(),
        services: Array.isArray(body.services) && body.services.length ? body.services : ['Facebook', 'WhatsApp'],
        digits: Math.max(4, Math.min(8, Number(body.digits || 6))),
        interval: Math.max(3, Number(body.interval || 15)),
        numbers: nums,
        active: true,
      };
      db.demoConfigs.push(cfg);
      saveDb();
      return { status: 200, json: { success: true, config: cfg } };
    }
    if (action === 'toggleConfig') {
      const cfg = db.demoConfigs.find((c) => c.id === body.id);
      if (cfg) {
        cfg.active = !cfg.active;
        saveDb();
      }
      return { status: 200, json: { success: true } };
    }
    if (action === 'deleteConfig') {
      db.demoConfigs = db.demoConfigs.filter((c) => c.id !== body.id);
      saveDb();
      return { status: 200, json: { success: true } };
    }
    // Instant one-shot test fire
    const num = normalizeDigits(body.number || '8801712345678');
    const svc = String(body.sender || 'WhatsApp').trim();
    const otp = String(body.otpCode || '842915').replace(/\D/g, '') || '842915';
    const sms = `${svc} verification code: ${otp}.`;
    const res = ingestIncomingOtps(db, 'demo', 'Demo Simulator', [{ number: num, otp, sms, service: svc }]);
    saveDb();
    return { status: 200, json: { success: true, number: '+' + num, otp, sender: svc, delivered: res.delivered } };
  }

  // 21. Backup ZIP Download
  if (subPath === '/backup' && method === 'GET') {
    saveDb();
    const zip = new AdmZip();
    if (fs.existsSync(DB_FILE)) {
      zip.addLocalFile(DB_FILE);
    } else {
      zip.addFile('number_system_db.json', Buffer.from(JSON.stringify(db, null, 2), 'utf8'));
    }
    const buf = zip.toBuffer();
    return {
      status: 200,
      buffer: buf,
      contentType: 'application/zip',
      filename: `number-system-backup-${new Date().toISOString().slice(0, 10)}.zip`,
    };
  }

  return { status: 404, json: { success: false, error: 'Unknown endpoint' } };
}
