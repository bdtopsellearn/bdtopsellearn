"""
BD TopSell — Telegram Number & OTP Bot
Website Admin Panel থেকে সব কন্ট্রোল হবে (Firebase)
"""
import asyncio, logging, os, re, time, aiohttp
from telegram import (
    Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
)
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, ContextTypes, filters
)
from telegram.constants import ParseMode
import firebase_admin
from firebase_admin import credentials, firestore

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(message)s",
    level=logging.INFO
)
log = logging.getLogger(__name__)

# ── Bot Token ─────────────────────────────────────────────────
BOT_TOKEN = os.getenv("BOT_TOKEN", "8665058261:AAGCG0ktyjhjulgfx38A5yjzTy1t12Fcck4")

# ── Firebase Init ─────────────────────────────────────────────
db = None
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    log.info("Firebase connected ✅")
except Exception as e:
    log.warning(f"Firebase not connected: {e}")

# ── Config (cached — Firebase থেকে প্রতি ৬০ সেকেন্ডে একবার লোড) ──
cfg = {
    "api_base":    "https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api",
    "api_key":     "MY5CBRP4MSN",
    "otp_group_id": None,   # int বা None
    "otp_reward":  0.0,
    "admin_ids":   [],
    "services":    [],
    "welcome_msg": "🚀 Welcome to Number & OTP Service\n✅ Choose an option below to continue.\n💎 Premium OTP Service",
    "footer_msg":  "কোড রিসিভ ভাই",
}
_cfg_loaded_at = 0  # timestamp

def load_config(force=False):
    """Firebase থেকে settings লোড — ৬০ সেকেন্ড cache"""
    global _cfg_loaded_at
    if not db:
        return
    if not force and (time.time() - _cfg_loaded_at) < 60:
        return  # cache hit
    try:
        doc = db.collection("settings").document("site").get()
        if doc.exists:
            d = doc.to_dict()
            cfg["api_base"]     = d.get("numberApiBaseUrl", cfg["api_base"])
            cfg["api_key"]      = d.get("numberApiKey",     cfg["api_key"])
            # FIX: otp_group_id must be int
            raw_gid = d.get("tgOtpGroupId")
            cfg["otp_group_id"] = int(raw_gid) if raw_gid else None
            cfg["otp_reward"]   = float(d.get("otpRewardAmount", 0))
            cfg["admin_ids"]    = [int(x) for x in d.get("tgAdminIds", []) if x]
            cfg["services"]     = d.get("numServices", [])
            cfg["welcome_msg"]  = d.get("tgWelcomeMsg", cfg["welcome_msg"])
            cfg["footer_msg"]   = d.get("tgFooterMsg",  cfg["footer_msg"])
        _cfg_loaded_at = time.time()
        log.info("Config loaded from Firebase ✅")
    except Exception as e:
        log.warning(f"Config load failed: {e}")

# ── API Helper ────────────────────────────────────────────────
async def api_fetch(path: str, method="GET", body=None):
    headers = {
        "Content-Type": "application/json",
        "mauthapi":     cfg["api_key"]
    }
    url = cfg["api_base"].rstrip("/") + path
    async with aiohttp.ClientSession() as s:
        if method == "POST":
            async with s.post(url, headers=headers, json=body,
                              timeout=aiohttp.ClientTimeout(total=12)) as r:
                return await r.json()
        else:
            async with s.get(url, headers=headers,
                             timeout=aiohttp.ClientTimeout(total=12)) as r:
                return await r.json()

# ── OTP Extractor ─────────────────────────────────────────────
def extract_otp(msg: str) -> str:
    if not msg:
        return ""
    cleaned = msg.replace("<#>", "").replace("#", "").strip()
    # "460 938" → "460938"
    m = re.search(r"\b(\d{3})\s+(\d{3})\b", cleaned)
    if m:
        return m.group(1) + m.group(2)
    # direct 4-8 digit
    m = re.search(r"\b(\d{4,8})\b", cleaned)
    return m.group(1) if m else ""

# ── Session Store ─────────────────────────────────────────────
sess = {}

def get_sess(uid):
    if uid not in sess:
        sess[uid] = {
            "step":    "home",
            "service": None,
            "country": None,
            "numbers": [],
            "polling": {}   # number → asyncio.Task
        }
    return sess[uid]

# ── Keyboards ─────────────────────────────────────────────────
def main_kb():
    return ReplyKeyboardMarkup([
        ["📲 GET NUMBER",  "🔍 SEARCH RANGE"],
        ["📡 TRAFFIC",     "💰 BALANCE"],
        ["⚙️ 2FA SETUP"],
    ], resize_keyboard=True)

def service_kb():
    svcs = cfg["services"]
    if not svcs:
        return None
    rows = [[f"{s['emoji']} {s['name']}" for s in svcs[i:i+2]]
            for i in range(0, len(svcs), 2)]
    rows.append(["🔙 Back"])
    return ReplyKeyboardMarkup(rows, resize_keyboard=True)

def country_kb(svc):
    countries = svc.get("countries", [])
    if not countries:
        return None
    rows = [[f"{c['flag']} {c['name'].upper()}" for c in countries[i:i+2]]
            for i in range(0, len(countries), 2)]
    rows.append(["🔙 Back"])
    return ReplyKeyboardMarkup(rows, resize_keyboard=True)

def number_inline_kb(numbers):
    rows = []
    for n in numbers:
        # callback_data max 64 chars — শুধু last 15 digits রাখি
        safe_num = n["number"][-15:]
        rows.append([InlineKeyboardButton(
            f"📋  {n['display']}",
            callback_data=f"cpn:{safe_num}"
        )])
    rows.append([
        InlineKeyboardButton("🔄 Change Number", callback_data="change_num"),
        InlineKeyboardButton("📨 OTP Group ↗",  callback_data="otp_grp"),
    ])
    rows.append([InlineKeyboardButton("🔙 Back", callback_data="go_home")])
    return InlineKeyboardMarkup(rows)

# ── /start ────────────────────────────────────────────────────
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    load_config()
    uid = update.effective_user.id
    s   = get_sess(uid)
    s["step"] = "home"
    for task in list(s["polling"].values()):
        task.cancel()
    s["polling"].clear()

    text = (
        "╔══════════════════╗\n"
        "║  📊 NUMBER BOT   ║\n"
        "╚══════════════════╝\n\n"
        + cfg["welcome_msg"]
    )
    await update.message.reply_text(text, reply_markup=main_kb())

# ── /reload ───────────────────────────────────────────────────
async def cmd_reload(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id
    if uid not in cfg["admin_ids"]:
        return
    load_config(force=True)
    await update.message.reply_text("✅ Config reloaded from Firebase!")

# ── /broadcast ────────────────────────────────────────────────
async def cmd_broadcast(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id
    if uid not in cfg["admin_ids"]:
        return
    text = update.message.text[11:].strip() if len(update.message.text) > 11 else ""
    if not text:
        await update.message.reply_text("Usage: /broadcast <message>")
        return
    await do_broadcast(ctx, text, update)

# ── Main message handler ──────────────────────────────────────
async def on_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return
    load_config()
    uid  = update.effective_user.id
    text = update.message.text.strip()
    s    = get_sess(uid)

    # Back
    if text == "🔙 Back":
        s["step"] = "home"
        await update.message.reply_text("🏠 Main Menu", reply_markup=main_kb())
        return

    # GET NUMBER
    if text == "📲 GET NUMBER":
        svcs = cfg["services"]
        if not svcs:
            await update.message.reply_text("❌ Admin এখনো কোনো Service যোগ করেননি।")
            return
        s["step"] = "select_service"
        await update.message.reply_text(
            "📱 <b>Select a service:</b>",
            reply_markup=service_kb(),
            parse_mode=ParseMode.HTML
        )
        return

    # Service select
    if s["step"] == "select_service":
        svc = next(
            (sv for sv in cfg["services"] if sv["name"].lower() in text.lower()),
            None
        )
        if not svc:
            await update.message.reply_text("❌ Service পাওয়া যায়নি।")
            return
        s["service"] = svc
        s["step"]    = "select_country"
        kb = country_kb(svc)
        if not kb:
            await update.message.reply_text(f"❌ {svc['name']}-এ কোনো দেশ নেই।")
            return
        await update.message.reply_text(
            f"📲 <b>Select a country for {svc['emoji']} {svc['name'].upper()}:</b>",
            reply_markup=kb,
            parse_mode=ParseMode.HTML
        )
        return

    # Country select
    if s["step"] == "select_country" and s.get("service"):
        country = next(
            (c for c in s["service"].get("countries", [])
             if c["name"].upper() in text.upper()),
            None
        )
        if not country:
            await update.message.reply_text("❌ দেশ পাওয়া যায়নি।")
            return
        s["country"] = country
        s["step"]    = "showing_numbers"

        msg = await update.message.reply_text(
            f"⏳ {country['flag']} {country['name']} থেকে নাম্বার আনা হচ্ছে..."
        )
        numbers = await allocate_numbers(s["service"], country, count=2)
        if not numbers:
            await msg.edit_text("❌ নাম্বার পাওয়া যায়নি (stock out)। অন্য দেশ ট্রাই করুন।")
            s["step"] = "select_country"
            return

        s["numbers"] = numbers
        txt  = format_number_msg(s["service"], country, numbers)
        sent = await msg.edit_text(
            txt, reply_markup=number_inline_kb(numbers), parse_mode=ParseMode.HTML
        )
        # Start OTP poll for each number
        for n in numbers:
            task = asyncio.create_task(
                poll_otp(uid, n["number"], n["display"], s["service"], country, ctx)
            )
            s["polling"][n["number"]] = task
        return

    # BALANCE
    if text == "💰 BALANCE":
        await update.message.reply_text("⏳ লোড হচ্ছে...")
        try:
            data = await api_fetch("/success-otp")
            otps = data.get("data", {}).get("otps", [])
            await update.message.reply_text(
                f"💰 <b>Balance Info</b>\n\n"
                f"✅ Total OTPs received: <b>{len(otps)}</b>\n"
                f"🔑 API: <code>{cfg['api_key'][:6]}...{cfg['api_key'][-4:]}</code>",
                parse_mode=ParseMode.HTML
            )
        except Exception as e:
            await update.message.reply_text(f"❌ Error: {e}")
        return

    # TRAFFIC
    if text == "📡 TRAFFIC":
        await update.message.reply_text("⏳ Live traffic লোড হচ্ছে...")
        try:
            import datetime
            data = await api_fetch("/console")
            hits = (data.get("data", {}).get("hits", []) or [])[:10]
            if not hits:
                await update.message.reply_text("📡 কোনো recent traffic নেই।")
                return
            lines = []
            for h in hits:
                t = datetime.datetime.fromtimestamp(
                    h.get("time", 0) / 1000
                ).strftime("%H:%M:%S")
                lines.append(
                    f"⏱ {t} | <b>{h.get('sid','?')}</b> | "
                    f"{h.get('range','')} | {str(h.get('message',''))[:30]}"
                )
            await update.message.reply_text(
                "📡 <b>Live Traffic (last 10)</b>\n\n" + "\n".join(lines),
                parse_mode=ParseMode.HTML
            )
        except Exception as e:
            await update.message.reply_text(f"❌ Error: {e}")
        return

    # SEARCH RANGE
    if text == "🔍 SEARCH RANGE":
        await update.message.reply_text("⏳ লোড হচ্ছে...")
        try:
            data = await api_fetch("/liveaccess")
            svcs = (data.get("data", {}).get("services", []) or [])[:8]
            if not svcs:
                await update.message.reply_text("🔍 কোনো active range নেই।")
                return
            lines = [
                f"📶 <b>{s['sid']}</b>\n"
                f"Ranges: {', '.join(s.get('ranges', []))}"
                for s in svcs
            ]
            await update.message.reply_text(
                "🔍 <b>Active Ranges</b>\n\n" + "\n\n".join(lines),
                parse_mode=ParseMode.HTML
            )
        except Exception as e:
            await update.message.reply_text(f"❌ Error: {e}")
        return

    # 2FA SETUP
    if text == "⚙️ 2FA SETUP":
        await update.message.reply_text(
            "⚙️ <b>2FA Setup</b>\n\n"
            "নাম্বার নিন → Instagram/Facebook-এ দিন → OTP এখানে আসবে।\n\n"
            "📲 GET NUMBER থেকে শুরু করুন।",
            parse_mode=ParseMode.HTML
        )
        return

# ── Allocate Numbers ──────────────────────────────────────────
async def allocate_numbers(svc, country, count=2):
    rid = str(country.get("rid", "")).strip()
    if not rid:
        return []
    tasks = [api_fetch("/getnum", "POST", {"rid": rid}) for _ in range(count)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    numbers = []
    for r in results:
        if isinstance(r, Exception):
            log.warning(f"getnum error: {r}")
            continue
        if (isinstance(r, dict)
                and r.get("meta", {}).get("code") == 200
                and r.get("data")):
            d = r["data"]
            numbers.append({
                "number":   d.get("no_plus_number", ""),
                "display":  d.get("full_number", "+" + d.get("no_plus_number", "")),
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

# ── OTP Polling — প্রতি ২ সেকেন্ডে চেক ──────────────────────
async def poll_otp(uid, number, display, svc, country, ctx):
    seen_id = None
    try:
        for _ in range(150):   # max 5 minutes
            await asyncio.sleep(2)
            try:
                data = await api_fetch("/success-otp")
                if data.get("meta", {}).get("code") != 200:
                    continue
                otps = data.get("data", {}).get("otps", []) or []
                clean_num = number.lstrip("+")
                match = next(
                    (o for o in otps
                     if clean_num in str(o.get("number", "")).replace("+", "")),
                    None
                )
                if not match:
                    continue
                if match.get("otp_id") == seen_id:
                    continue

                seen_id   = match["otp_id"]
                full_msg  = match.get("message", "")
                otp_code  = extract_otp(full_msg)
                if not otp_code:
                    continue

                # ── User কে পাঠাও ──
                otp_text = (
                    f"✅ <b>OTP পাওয়া গেছে!</b>\n\n"
                    f"━━━━━━━━━━━━━━━━\n"
                    f"📱 <b>Number :</b> <code>{display}</code>\n"
                    f"━━━━━━━━━━━━━━━━\n"
                    f"🔑 <b>OTP :</b> <code>{otp_code}</code>\n"
                    f"━━━━━━━━━━━━━━━━\n"
                    f"📝 <b>Message :</b>\n{full_msg}\n"
                    f"━━━━━━━━━━━━━━━━\n"
                    f"💚 {cfg['footer_msg']}"
                )
                safe_otp = otp_code[:20]
                inline = InlineKeyboardMarkup([[
                    InlineKeyboardButton(
                        f"📋  {otp_code}",
                        callback_data=f"cpo:{safe_otp}"
                    )
                ]])
                await ctx.bot.send_message(
                    uid, otp_text,
                    parse_mode=ParseMode.HTML,
                    reply_markup=inline
                )

                # ── OTP Group এ পাঠাও ──
                gid = cfg.get("otp_group_id")
                if gid:
                    grp_text = (
                        f"<b>Confirm SMS</b>  {cfg['footer_msg']}\n"
                        f"━━━━━━━━━━━━━━━━\n"
                        f"📱 <b>Number :</b> {country.get('flag','')} "
                        f"<code>{display}</code>\n"
                        f"━━━━━━━━━━━━━━━━\n"
                        f"🔑 <b>OTP :</b> {otp_code}\n"
                        f"━━━━━━━━━━━━━━━━\n"
                        f"📝 <b>FULL MESSAGE :</b>\n# {full_msg}\n"
                        f"━━━━━━━━━━━━━━━━"
                    )
                    grp_btn = InlineKeyboardMarkup([[
                        InlineKeyboardButton(
                            f"📋  {otp_code}",
                            callback_data=f"cpo:{safe_otp}"
                        )
                    ]])
                    try:
                        await ctx.bot.send_message(
                            int(gid), grp_text,
                            parse_mode=ParseMode.HTML,
                            reply_markup=grp_btn
                        )
                    except Exception as e:
                        log.warning(f"OTP group send failed: {e}")
                return  # Done — stop polling

            except asyncio.CancelledError:
                return
            except Exception as e:
                log.debug(f"Poll error: {e}")
    except asyncio.CancelledError:
        pass

# ── Callback handler ──────────────────────────────────────────
async def on_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    q    = update.callback_query
    uid  = q.from_user.id
    data = q.data

    if data.startswith("cpn:"):
        num = data[4:]
        await q.answer(f"✅ নাম্বার: {num}", show_alert=True)
        return

    if data.startswith("cpo:"):
        otp = data[4:]
        await q.answer(f"✅ OTP কপি: {otp}", show_alert=True)
        return

    if data == "change_num":
        await q.answer()
        s = get_sess(uid)
        for task in list(s["polling"].values()):
            task.cancel()
        s["polling"].clear()
        if s.get("service") and s.get("country"):
            await q.edit_message_text("⏳ নতুন নাম্বার আনা হচ্ছে...")
            numbers = await allocate_numbers(s["service"], s["country"], count=2)
            if not numbers:
                await q.edit_message_text("❌ নাম্বার পাওয়া যায়নি।")
                return
            s["numbers"] = numbers
            txt  = format_number_msg(s["service"], s["country"], numbers)
            sent = await q.edit_message_text(
                txt, reply_markup=number_inline_kb(numbers), parse_mode=ParseMode.HTML
            )
            for n in numbers:
                task = asyncio.create_task(
                    poll_otp(uid, n["number"], n["display"],
                             s["service"], s["country"], ctx)
                )
                s["polling"][n["number"]] = task
        return

    if data == "otp_grp":
        gid = cfg.get("otp_group_id")
        if gid:
            await q.answer(f"OTP Group ID: {gid}", show_alert=True)
        else:
            await q.answer("OTP Group সেট নেই। Admin Panel থেকে সেট করুন।", show_alert=True)
        return

    if data == "go_home":
        await q.answer()
        s = get_sess(uid)
        for task in list(s["polling"].values()):
            task.cancel()
        s["polling"].clear()
        s["step"] = "home"
        await ctx.bot.send_message(uid, "🏠 Main Menu", reply_markup=main_kb())
        return

    await q.answer()

# ── Broadcast ─────────────────────────────────────────────────
async def do_broadcast(ctx, text, update):
    if not db:
        await update.message.reply_text("❌ Firebase not connected.")
        return
    msg = await update.message.reply_text("⏳ Broadcast শুরু হচ্ছে...")
    users = db.collection("users").stream()
    sent = failed = 0
    for u in users:
        data = u.to_dict()
        tg_id = data.get("telegramId") or data.get("tgId")
        if not tg_id:
            continue
        try:
            await ctx.bot.send_message(int(tg_id), f"📢 {text}")
            sent += 1
            await asyncio.sleep(0.05)   # Telegram rate limit
        except Exception:
            failed += 1
    await msg.edit_text(
        f"✅ Broadcast সম্পন্ন!\n✅ সফল: {sent}\n❌ ব্যর্থ: {failed}"
    )

# ── Main ──────────────────────────────────────────────────────
def main():
    load_config(force=True)
    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .concurrent_updates(True)   # একসাথে অনেক user handle করবে
        .build()
    )
    app.add_handler(CommandHandler("start",     cmd_start))
    app.add_handler(CommandHandler("reload",    cmd_reload))
    app.add_handler(CommandHandler("broadcast", cmd_broadcast))
    app.add_handler(CallbackQueryHandler(on_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_message))
    log.info("✅ Bot starting...")
    app.run_polling(drop_pending_updates=True, allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
