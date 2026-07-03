"""
BD TopSell — Telegram Number & OTP Bot
Website Admin Panel থেকে সব কন্ট্রোল হবে (Firebase)
"""
import asyncio, json, logging, os, re, aiohttp
from telegram import (
    Update, InlineKeyboardButton, InlineKeyboardMarkup,
    ReplyKeyboardMarkup, KeyboardButton
)
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, ContextTypes, filters
)
from telegram.constants import ParseMode
import firebase_admin
from firebase_admin import credentials, firestore

# ── Logging ────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(message)s",
    level=logging.INFO
)
log = logging.getLogger(__name__)

# ── Bot Token ───────────────────────────────────────────────
BOT_TOKEN = os.getenv("BOT_TOKEN", "8665058261:AAGCG0ktyjhjulgfx38A5yjzTy1t12Fcck4")

# ── Firebase Init ────────────────────────────────────────────
# serviceAccountKey.json ফাইল একই ফোল্ডারে রাখুন
db = None
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    log.info("Firebase connected ✅")
except Exception as e:
    log.warning(f"Firebase not connected: {e} — local config only")

# ── Default Config ───────────────────────────────────────────
cfg = {
    "api_base":    "https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api",
    "api_key":     "MY5CBRP4MSN",
    "otp_group_id": None,
    "otp_reward":  0.0,
    "admin_ids":   [],
    "services":    [],          # [{id, name, emoji, countries:[{id,name,flag,rid}]}]
    "bot_token":   BOT_TOKEN,
    "welcome_msg": "🚀 Welcome to Number & OTP Service\n✅ Choose an option below to continue.\n💎 Premium OTP Service",
    "footer_msg":  "কোড রিসিভ ভাই",
}

def load_config():
    """Firebase থেকে settings লোড করো"""
    if not db:
        return
    try:
        doc = db.collection("settings").document("site").get()
        if doc.exists:
            data = doc.to_dict()
            cfg["api_base"]     = data.get("numberApiBaseUrl", cfg["api_base"])
            cfg["api_key"]      = data.get("numberApiKey",     cfg["api_key"])
            cfg["otp_group_id"] = data.get("tgOtpGroupId",    cfg["otp_group_id"])
            cfg["otp_reward"]   = float(data.get("otpRewardAmount", 0))
            cfg["admin_ids"]    = data.get("tgAdminIds", [])
            cfg["services"]     = data.get("numServices", [])
            cfg["welcome_msg"]  = data.get("tgWelcomeMsg", cfg["welcome_msg"])
            cfg["footer_msg"]   = data.get("tgFooterMsg",  cfg["footer_msg"])
            log.info("Config loaded from Firebase ✅")
    except Exception as e:
        log.warning(f"Config load failed: {e}")

# ── API Helper ───────────────────────────────────────────────
async def api_fetch(path: str, method="GET", body=None):
    headers = {
        "Content-Type": "application/json",
        "mauthapi":     cfg["api_key"]
    }
    url = cfg["api_base"].rstrip("/") + path
    async with aiohttp.ClientSession() as s:
        if method == "POST":
            async with s.post(url, headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=10)) as r:
                return await r.json()
        else:
            async with s.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as r:
                return await r.json()

# ── OTP Extractor ────────────────────────────────────────────
def extract_otp(msg: str) -> str:
    if not msg:
        return ""
    cleaned = msg.replace("<#>", "").strip()
    m = re.search(r"\b(\d{3})\s+(\d{3})\b", cleaned)
    if m:
        return m.group(1) + m.group(2)
    m = re.search(r"\b(\d{4,8})\b", cleaned)
    return m.group(1) if m else ""

# ── Session Store ────────────────────────────────────────────
# { user_id: {step, service, country, numbers:[{display,number}], polling_tasks:[]} }
sess = {}

def get_sess(uid):
    if uid not in sess:
        sess[uid] = {"step": "home", "service": None, "country": None,
                     "numbers": [], "polling": {}}
    return sess[uid]

# ── Keyboards ────────────────────────────────────────────────
def main_kb():
    return ReplyKeyboardMarkup([
        ["📲 GET NUMBER",   "🔍 SEARCH RANGE"],
        ["📡 TRAFFIC",      "💰 BALANCE"],
        ["⚙️ 2FA SETUP"],
    ], resize_keyboard=True)

def back_kb():
    return ReplyKeyboardMarkup([["🔙 Back"]], resize_keyboard=True)

def service_kb():
    svcs = cfg["services"]
    if not svcs:
        return None
    rows = [[f"📱 {s['emoji']} {s['name']}" for s in svcs[i:i+2]] for i in range(0, len(svcs), 2)]
    rows.append(["🔙 Back"])
    return ReplyKeyboardMarkup(rows, resize_keyboard=True)

def country_kb(svc):
    countries = svc.get("countries", [])
    if not countries:
        return None
    rows = [[f"{c['flag']} {c['name'].upper()}" for c in countries[i:i+2]] for i in range(0, len(countries), 2)]
    rows.append(["🔙 Back"])
    return ReplyKeyboardMarkup(rows, resize_keyboard=True)

def number_inline_kb(numbers):
    """নাম্বার বাটন — ক্লিক করলে কপি করার hint দেখাবে"""
    rows = []
    for n in numbers:
        rows.append([InlineKeyboardButton(f"📋 {n['display']}", callback_data=f"copy_num:{n['number']}")])
    rows.append([
        InlineKeyboardButton("🔄 Change Number", callback_data="change_number"),
        InlineKeyboardButton("📨 Otp Group ↗", callback_data="otp_group"),
    ])
    rows.append([InlineKeyboardButton("🔙 Back", callback_data="back_home")])
    return InlineKeyboardMarkup(rows)

# ── /start ───────────────────────────────────────────────────
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    load_config()
    uid = update.effective_user.id
    s   = get_sess(uid)
    s["step"] = "home"
    # Cancel active polls
    for task in s["polling"].values():
        task.cancel()
    s["polling"].clear()

    text = (
        f"╔══════════════════╗\n"
        f"║  📊 NUMBER BOT   ║\n"
        f"╚══════════════════╝\n\n"
        f"{cfg['welcome_msg']}"
    )
    await update.message.reply_text(text, reply_markup=main_kb(), parse_mode=ParseMode.HTML)

# ── Main message handler ─────────────────────────────────────
async def on_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return
    load_config()
    uid  = update.effective_user.id
    text = update.message.text.strip()
    s    = get_sess(uid)

    # ── Back ──────────────────────────────────────────────
    if text == "🔙 Back":
        s["step"] = "home"
        await update.message.reply_text("🏠 Main Menu", reply_markup=main_kb())
        return

    # ── GET NUMBER ────────────────────────────────────────
    if text == "📲 GET NUMBER":
        svcs = cfg["services"]
        if not svcs:
            await update.message.reply_text("❌ Admin এখনো কোনো Service যোগ করেননি।")
            return
        s["step"] = "select_service"
        await update.message.reply_text("📱 Select a service:", reply_markup=service_kb())
        return

    # ── Service selected ──────────────────────────────────
    if s["step"] == "select_service":
        # Match emoji+name
        svc = next((sv for sv in cfg["services"] if sv["name"].lower() in text.lower()), None)
        if not svc:
            await update.message.reply_text("❌ Service পাওয়া যায়নি। আবার চেষ্টা করুন।")
            return
        s["service"] = svc
        s["step"]    = "select_country"
        kb = country_kb(svc)
        if not kb:
            await update.message.reply_text(f"❌ {svc['name']}-এ কোনো দেশ নেই।")
            return
        await update.message.reply_text(
            f"📲 Select a country for {svc['emoji']} {svc['name'].upper()}:",
            reply_markup=kb
        )
        return

    # ── Country selected ──────────────────────────────────
    if s["step"] == "select_country" and s.get("service"):
        svc = s["service"]
        country = next(
            (c for c in svc.get("countries", []) if c["name"].upper() in text.upper()),
            None
        )
        if not country:
            await update.message.reply_text("❌ দেশ পাওয়া যায়নি।")
            return
        s["country"] = country
        s["step"]    = "showing_numbers"

        msg = await update.message.reply_text(f"⏳ Allocating number for {country['flag']} {country['name']}...")
        numbers = await allocate_numbers(svc, country, count=2)
        if not numbers:
            await msg.edit_text("❌ নাম্বার পাওয়া যায়নি (stock out)। অন্য দেশ ট্রাই করুন।")
            s["step"] = "select_country"
            return

        s["numbers"] = numbers
        txt = format_number_msg(svc, country, numbers)
        sent = await msg.edit_text(txt, reply_markup=number_inline_kb(numbers), parse_mode=ParseMode.HTML)

        # Start OTP polling for each number
        for n in numbers:
            task = asyncio.create_task(
                poll_otp(uid, n["number"], n["display"], svc, country, sent, ctx)
            )
            s["polling"][n["number"]] = task
        return

    # ── BALANCE ───────────────────────────────────────────
    if text == "💰 BALANCE":
        await update.message.reply_text("⏳ লোড হচ্ছে...")
        try:
            data = await api_fetch("/success-otp")
            otps = data.get("data", {}).get("otps", [])
            await update.message.reply_text(
                f"💰 <b>Balance Info</b>\n\n"
                f"✅ Total OTPs received: <b>{len(otps)}</b>\n"
                f"💎 API Key: <code>{cfg['api_key'][:6]}...{cfg['api_key'][-4:]}</code>",
                parse_mode=ParseMode.HTML
            )
        except Exception as e:
            await update.message.reply_text(f"❌ Error: {e}")
        return

    # ── TRAFFIC ───────────────────────────────────────────
    if text == "📡 TRAFFIC":
        await update.message.reply_text("⏳ Live traffic লোড হচ্ছে...")
        try:
            data = await api_fetch("/console")
            hits = data.get("data", {}).get("hits", [])[:10]
            if not hits:
                await update.message.reply_text("📡 কোনো recent traffic নেই।")
                return
            lines = []
            for h in hits:
                import datetime
                t = datetime.datetime.fromtimestamp(h["time"]/1000).strftime("%H:%M:%S")
                lines.append(f"⏱ {t} | <b>{h.get('sid','?')}</b> | {h.get('range','')} | {h.get('message','')[:30]}")
            await update.message.reply_text(
                "📡 <b>Live Traffic (last 10)</b>\n\n" + "\n".join(lines),
                parse_mode=ParseMode.HTML
            )
        except Exception as e:
            await update.message.reply_text(f"❌ Error: {e}")
        return

    # ── SEARCH RANGE ──────────────────────────────────────
    if text == "🔍 SEARCH RANGE":
        try:
            data = await api_fetch("/liveaccess")
            svcs = data.get("data", {}).get("services", [])[:8]
            if not svcs:
                await update.message.reply_text("🔍 কোনো active range নেই।")
                return
            lines = [f"📶 <b>{s['sid']}</b>\nRanges: {', '.join(s.get('ranges', []))}" for s in svcs]
            await update.message.reply_text(
                "🔍 <b>Active Ranges</b>\n\n" + "\n\n".join(lines),
                parse_mode=ParseMode.HTML
            )
        except Exception as e:
            await update.message.reply_text(f"❌ Error: {e}")
        return

    # ── 2FA SETUP ─────────────────────────────────────────
    if text == "⚙️ 2FA SETUP":
        await update.message.reply_text(
            "⚙️ <b>2FA Setup</b>\n\n"
            "নাম্বার নিন → Instagram/Facebook-এ দিন → OTP এখানে আসবে।\n\n"
            "📱 GET NUMBER থেকে শুরু করুন।",
            parse_mode=ParseMode.HTML
        )
        return

    # ── Admin: BROADCAST ─────────────────────────────────
    if text.startswith("/broadcast ") and uid in cfg["admin_ids"]:
        msg_text = text[11:].strip()
        if not msg_text:
            await update.message.reply_text("Usage: /broadcast <message>")
            return
        await do_broadcast(ctx, msg_text, update)
        return

    # ── Admin: RELOAD ─────────────────────────────────────
    if text == "/reload" and uid in cfg["admin_ids"]:
        load_config()
        await update.message.reply_text("✅ Config reloaded!")
        return

# ── Allocate Numbers ──────────────────────────────────────────
async def allocate_numbers(svc, country, count=2):
    rid = country.get("rid", "")
    if not rid:
        return []
    numbers = []
    tasks = [api_fetch("/getnum", "POST", {"rid": str(rid)}) for _ in range(count)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for r in results:
        if isinstance(r, dict) and r.get("meta", {}).get("code") == 200 and r.get("data"):
            d = r["data"]
            numbers.append({
                "number":  d.get("no_plus_number", ""),
                "display": d.get("full_number", "+"+d.get("no_plus_number", "")),
                "country": d.get("country", country["name"]),
                "operator": d.get("operator", ""),
            })
    return numbers

# ── Format Number Message ─────────────────────────────────────
def format_number_msg(svc, country, numbers):
    lines = [f"📲 <b>{svc['emoji']} {svc['name'].upper()}</b>\n"]
    for n in numbers:
        lines.append(f"📋 <code>{n['display']}</code>")
        if n.get("operator"):
            lines.append(f"   📶 {n['operator']}")
    return "\n".join(lines)

# ── OTP Polling ───────────────────────────────────────────────
async def poll_otp(uid, number, display, svc, country, msg_obj, ctx):
    seen_id = None
    for _ in range(150):  # 5 min
        await asyncio.sleep(2)
        try:
            data = await api_fetch("/success-otp")
            if data.get("meta", {}).get("code") != 200:
                continue
            otps = data.get("data", {}).get("otps", [])
            match = next(
                (o for o in otps if number in str(o.get("number","")).replace("+","")),
                None
            )
            if match and match.get("otp_id") != seen_id:
                seen_id = match["otp_id"]
                full_msg = match.get("message", "")
                otp_code = extract_otp(full_msg)
                if not otp_code:
                    continue

                # ── Send OTP to user ──
                otp_text = (
                    f"✅ <b>OTP পাওয়া গেছে!</b>\n\n"
                    f"📱 <b>Number:</b> <code>{display}</code>\n"
                    f"🔑 <b>OTP :</b> <code>{otp_code}</code>\n"
                    f"📝 <b>Message:</b> {full_msg}\n\n"
                    f"💚 {cfg['footer_msg']}"
                )
                inline = InlineKeyboardMarkup([[
                    InlineKeyboardButton(f"📋 {otp_code}", callback_data=f"copy_otp:{otp_code}")
                ]])
                await ctx.bot.send_message(uid, otp_text, parse_mode=ParseMode.HTML, reply_markup=inline)

                # ── Send to OTP Group ──
                if cfg.get("otp_group_id"):
                    grp_text = (
                        f"<b>Confirm SMS</b>  {cfg['footer_msg']}\n"
                        f"━━━━━━━━━━━━━━━━\n"
                        f"📱 <b>Number :</b> {country['flag']}\n"
                        f"<code>{display}</code>\n"
                        f"━━━━━━━━━━━━━━━━\n"
                        f"🔑 <b>OTP :</b> {otp_code}\n"
                        f"━━━━━━━━━━━━━━━━\n"
                        f"📝 <b>FULL MESSAGE :</b>\n# {full_msg}\n"
                        f"━━━━━━━━━━━━━━━━"
                    )
                    grp_btn = InlineKeyboardMarkup([[
                        InlineKeyboardButton(f"📋  {otp_code}", callback_data=f"copy_otp:{otp_code}")
                    ]])
                    try:
                        await ctx.bot.send_message(
                            cfg["otp_group_id"], grp_text,
                            parse_mode=ParseMode.HTML, reply_markup=grp_btn
                        )
                    except Exception as e:
                        log.warning(f"OTP group send failed: {e}")

                return  # Done
        except asyncio.CancelledError:
            return
        except Exception as e:
            log.debug(f"Poll error: {e}")

# ── Callback handler (inline buttons) ─────────────────────────
async def on_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    q    = update.callback_query
    uid  = q.from_user.id
    data = q.data
    await q.answer()

    if data.startswith("copy_num:"):
        num = data[9:]
        await q.answer(f"✅ কপি: {num}", show_alert=True)
        return

    if data.startswith("copy_otp:"):
        otp = data[9:]
        await q.answer(f"✅ OTP কপি: {otp}", show_alert=True)
        return

    if data == "change_number":
        s = get_sess(uid)
        # Cancel existing polls
        for task in s["polling"].values():
            task.cancel()
        s["polling"].clear()
        # Re-allocate
        if s.get("service") and s.get("country"):
            await q.edit_message_text("⏳ নতুন নাম্বার আনা হচ্ছে...")
            numbers = await allocate_numbers(s["service"], s["country"], count=2)
            if not numbers:
                await q.edit_message_text("❌ নাম্বার পাওয়া যায়নি।")
                return
            s["numbers"] = numbers
            txt = format_number_msg(s["service"], s["country"], numbers)
            sent = await q.edit_message_text(txt, reply_markup=number_inline_kb(numbers), parse_mode=ParseMode.HTML)
            for n in numbers:
                task = asyncio.create_task(poll_otp(uid, n["number"], n["display"], s["service"], s["country"], sent, ctx))
                s["polling"][n["number"]] = task
        return

    if data == "otp_group":
        gid = cfg.get("otp_group_id")
        if gid:
            await q.answer(f"OTP Group: {gid}", show_alert=True)
        else:
            await q.answer("OTP Group সেট করা নেই। Admin Panel থেকে সেট করুন।", show_alert=True)
        return

    if data == "back_home":
        s = get_sess(uid)
        for task in s["polling"].values():
            task.cancel()
        s["polling"].clear()
        s["step"] = "home"
        await ctx.bot.send_message(uid, "🏠 Main Menu", reply_markup=main_kb())
        return

# ── Broadcast ─────────────────────────────────────────────────
async def do_broadcast(ctx, text, update):
    if not db:
        await update.message.reply_text("❌ Firebase not connected.")
        return
    await update.message.reply_text("⏳ Broadcast শুরু হচ্ছে...")
    users = db.collection("users").stream()
    sent = 0
    failed = 0
    for u in users:
        uid = u.to_dict().get("telegramId") or u.to_dict().get("uid")
        if not uid:
            continue
        try:
            await ctx.bot.send_message(int(uid), f"📢 {text}")
            sent += 1
            await asyncio.sleep(0.05)
        except:
            failed += 1
    await update.message.reply_text(f"✅ Broadcast সম্পন্ন!\nসফল: {sent} | ব্যর্থ: {failed}")

# ── Main ──────────────────────────────────────────────────────
def main():
    load_config()
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(on_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_message))
    log.info("Bot starting...")
    app.run_polling(drop_pending_updates=True)

if __name__ == "__main__":
    main()
