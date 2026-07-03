"""
BD TopSell — Telegram Number & OTP Bot
Firebase ছাড়া — সরাসরি config থেকে চলে
"""
import asyncio, logging, os, re, time, aiohttp
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
from telegram.constants import ParseMode

logging.basicConfig(format="%(asctime)s | %(levelname)s | %(message)s", level=logging.INFO)
log = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN", "8665058261:AAGCG0ktyjhjulgfx38A5yjzTy1t12Fcck4")

# ── Config — Railway Variables থেকে অথবা নিচে সরাসরি লিখুন ──
cfg = {
    "api_base":     os.getenv("API_BASE",    "https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api"),
    "api_key":      os.getenv("API_KEY",     "MY5CBRP4MSN"),
    "otp_group_id": int(os.getenv("OTP_GROUP_ID", "0")) or None,
    "admin_ids":    [int(x) for x in os.getenv("ADMIN_IDS", "7831629041").split(",") if x.strip()],
    "welcome_msg":  os.getenv("WELCOME_MSG", "🚀 Welcome to Number & OTP Service\n✅ Choose an option below.\n💎 Premium OTP Service"),
    "footer_msg":   os.getenv("FOOTER_MSG",  "কোড রিসিভ ভাই"),
    # Services — Admin Panel থেকে সেট করা যাবে এখানে hardcode করতে পারেন
    "services": [
        # উদাহরণ — আপনার Website Admin Panel এ যা আছে সেটা দিন
        # {"id": "ig", "name": "Instagram", "emoji": "📸", "countries": [
        #     {"id": "gn", "name": "Guinea", "flag": "🇬🇳", "rid": "23467"},
        # ]},
    ],
}

# ── Session ───────────────────────────────────────────────────
sess = {}
def get_sess(uid):
    if uid not in sess:
        sess[uid] = {"step":"home","service":None,"country":None,"numbers":[],"polling":{}}
    return sess[uid]

# ── API ───────────────────────────────────────────────────────
async def api(path, method="GET", body=None):
    headers = {"Content-Type":"application/json","mauthapi":cfg["api_key"]}
    url = cfg["api_base"].rstrip("/") + path
    async with aiohttp.ClientSession() as s:
        fn = s.post if method=="POST" else s.get
        async with fn(url, headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=12)) as r:
            return await r.json()

def extract_otp(msg):
    if not msg: return ""
    c = msg.replace("<#>","").replace("#","").strip()
    m = re.search(r"\b(\d{3})\s+(\d{3})\b", c)
    if m: return m.group(1)+m.group(2)
    m = re.search(r"\b(\d{4,8})\b", c)
    return m.group(1) if m else ""

# ── Keyboards ─────────────────────────────────────────────────
def main_kb():
    return ReplyKeyboardMarkup([
        ["📲 GET NUMBER", "🔍 SEARCH RANGE"],
        ["📡 TRAFFIC",    "💰 BALANCE"],
        ["⚙️ 2FA SETUP"],
    ], resize_keyboard=True)

def service_kb():
    svcs = cfg["services"]
    if not svcs: return None
    rows = [[f"{s['emoji']} {s['name']}" for s in svcs[i:i+2]] for i in range(0,len(svcs),2)]
    rows.append(["🔙 Back"])
    return ReplyKeyboardMarkup(rows, resize_keyboard=True)

def country_kb(svc):
    cs = svc.get("countries",[])
    if not cs: return None
    rows = [[f"{c['flag']} {c['name'].upper()}" for c in cs[i:i+2]] for i in range(0,len(cs),2)]
    rows.append(["🔙 Back"])
    return ReplyKeyboardMarkup(rows, resize_keyboard=True)

def number_inline_kb(numbers):
    rows = []
    for n in numbers:
        rows.append([InlineKeyboardButton(f"📋  {n['display']}", callback_data=f"cpn:{n['number'][-15:]}")])
    rows.append([
        InlineKeyboardButton("🔄 Change Number", callback_data="change_num"),
        InlineKeyboardButton("📨 OTP Group ↗",  callback_data="otp_grp"),
    ])
    rows.append([InlineKeyboardButton("🔙 Back", callback_data="go_home")])
    return InlineKeyboardMarkup(rows)

# ── /start ────────────────────────────────────────────────────
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id
    s = get_sess(uid)
    s["step"] = "home"
    for t in list(s["polling"].values()): t.cancel()
    s["polling"].clear()
    await update.message.reply_text(
        "╔══════════════════╗\n║  📊 NUMBER BOT   ║\n╚══════════════════╝\n\n" + cfg["welcome_msg"],
        reply_markup=main_kb()
    )

async def cmd_reload(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in cfg["admin_ids"]: return
    await update.message.reply_text("✅ Bot running! Services: " + str(len(cfg["services"])))

async def cmd_addservice(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Admin: /addservice Instagram 📸"""
    if update.effective_user.id not in cfg["admin_ids"]: return
    parts = update.message.text.split(maxsplit=2)
    if len(parts) < 3:
        await update.message.reply_text("Usage: /addservice <name> <emoji>")
        return
    name, emoji = parts[1], parts[2]
    cfg["services"].append({"id":f"svc_{int(time.time())}","name":name,"emoji":emoji,"countries":[]})
    await update.message.reply_text(f"✅ Service '{name}' যোগ হয়েছে!")

async def cmd_addcountry(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Admin: /addcountry Instagram Guinea 🇬🇳 23467"""
    if update.effective_user.id not in cfg["admin_ids"]: return
    parts = update.message.text.split(maxsplit=4)
    if len(parts) < 5:
        await update.message.reply_text("Usage: /addcountry <service> <country> <flag> <rid>")
        return
    _, svc_name, country_name, flag, rid = parts
    svc = next((s for s in cfg["services"] if s["name"].lower()==svc_name.lower()), None)
    if not svc:
        await update.message.reply_text(f"❌ Service '{svc_name}' পাওয়া যায়নি।")
        return
    svc["countries"].append({"id":f"cnt_{int(time.time())}","name":country_name,"flag":flag,"rid":rid})
    await update.message.reply_text(f"✅ {flag} {country_name} (RID:{rid}) যোগ হয়েছে!")

async def cmd_services(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in cfg["admin_ids"]: return
    if not cfg["services"]:
        await update.message.reply_text("কোনো service নেই। /addservice দিয়ে যোগ করুন।")
        return
    lines = []
    for s in cfg["services"]:
        lines.append(f"{s['emoji']} <b>{s['name']}</b>")
        for c in s.get("countries",[]):
            lines.append(f"  {c['flag']} {c['name']} — RID: {c['rid']}")
    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.HTML)

async def cmd_broadcast(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in cfg["admin_ids"]: return
    text = " ".join(update.message.text.split()[1:])
    if not text:
        await update.message.reply_text("Usage: /broadcast <message>")
        return
    await update.message.reply_text(f"📢 Broadcast: {text}\n\n(Firebase ছাড়া broadcast সব user-কে যাবে না — শুধু active session এ যাবে)")

# ── Message handler ───────────────────────────────────────────
async def on_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text: return
    uid  = update.effective_user.id
    text = update.message.text.strip()
    s    = get_sess(uid)

    if text == "🔙 Back":
        s["step"] = "home"
        await update.message.reply_text("🏠 Main Menu", reply_markup=main_kb())
        return

    if text == "📲 GET NUMBER":
        if not cfg["services"]:
            await update.message.reply_text("❌ কোনো Service নেই।\nAdmin: /addservice Instagram 📸")
            return
        s["step"] = "select_service"
        await update.message.reply_text("📱 <b>Select a service:</b>", reply_markup=service_kb(), parse_mode=ParseMode.HTML)
        return

    if s["step"] == "select_service":
        svc = next((sv for sv in cfg["services"] if sv["name"].lower() in text.lower()), None)
        if not svc:
            await update.message.reply_text("❌ Service পাওয়া যায়নি।")
            return
        s["service"] = svc
        s["step"] = "select_country"
        kb = country_kb(svc)
        if not kb:
            await update.message.reply_text(f"❌ {svc['name']}-এ দেশ নেই।\nAdmin: /addcountry {svc['name']} Guinea 🇬🇳 23467")
            return
        await update.message.reply_text(
            f"📲 <b>{svc['emoji']} {svc['name'].upper()} — দেশ সিলেক্ট করুন:</b>",
            reply_markup=kb, parse_mode=ParseMode.HTML
        )
        return

    if s["step"] == "select_country" and s.get("service"):
        country = next((c for c in s["service"].get("countries",[]) if c["name"].upper() in text.upper()), None)
        if not country:
            await update.message.reply_text("❌ দেশ পাওয়া যায়নি।")
            return
        s["country"] = country
        s["step"] = "showing_numbers"
        msg = await update.message.reply_text(f"⏳ {country['flag']} {country['name']} থেকে নাম্বার আনা হচ্ছে...")
        numbers = await allocate_numbers(s["service"], country)
        if not numbers:
            await msg.edit_text("❌ নাম্বার পাওয়া যায়নি (stock out)।")
            s["step"] = "select_country"
            return
        s["numbers"] = numbers
        txt  = format_number_msg(s["service"], country, numbers)
        sent = await msg.edit_text(txt, reply_markup=number_inline_kb(numbers), parse_mode=ParseMode.HTML)
        for n in numbers:
            task = asyncio.create_task(poll_otp(uid, n["number"], n["display"], s["service"], country, ctx))
            s["polling"][n["number"]] = task
        return

    if text == "💰 BALANCE":
        try:
            data = await api("/success-otp")
            otps = data.get("data",{}).get("otps",[]) or []
            await update.message.reply_text(
                f"💰 <b>Balance Info</b>\n\n✅ Total OTPs received: <b>{len(otps)}</b>\n"
                f"🔑 API: <code>{cfg['api_key'][:6]}...{cfg['api_key'][-4:]}</code>",
                parse_mode=ParseMode.HTML
            )
        except Exception as e:
            await update.message.reply_text(f"❌ Error: {e}")
        return

    if text == "📡 TRAFFIC":
        try:
            import datetime
            data = await api("/console")
            hits = (data.get("data",{}).get("hits",[]) or [])[:10]
            if not hits:
                await update.message.reply_text("📡 কোনো recent traffic নেই।")
                return
            lines = []
            for h in hits:
                t = datetime.datetime.fromtimestamp(h.get("time",0)/1000).strftime("%H:%M:%S")
                lines.append(f"⏱ {t} | <b>{h.get('sid','?')}</b> | {str(h.get('message',''))[:30]}")
            await update.message.reply_text("📡 <b>Live Traffic</b>\n\n"+"\n".join(lines), parse_mode=ParseMode.HTML)
        except Exception as e:
            await update.message.reply_text(f"❌ Error: {e}")
        return

    if text == "🔍 SEARCH RANGE":
        try:
            data = await api("/liveaccess")
            svcs = (data.get("data",{}).get("services",[]) or [])[:8]
            if not svcs:
                await update.message.reply_text("🔍 কোনো active range নেই।")
                return
            lines = [f"📶 <b>{s['sid']}</b>\nRanges: {', '.join(s.get('ranges',[]))}" for s in svcs]
            await update.message.reply_text("🔍 <b>Active Ranges</b>\n\n"+"\n\n".join(lines), parse_mode=ParseMode.HTML)
        except Exception as e:
            await update.message.reply_text(f"❌ Error: {e}")
        return

    if text == "⚙️ 2FA SETUP":
        await update.message.reply_text(
            "⚙️ <b>2FA Setup</b>\n\n📲 GET NUMBER → নাম্বার নিন → Instagram/Facebook এ দিন → OTP এখানে আসবে।",
            parse_mode=ParseMode.HTML
        )
        return

# ── Allocate numbers ──────────────────────────────────────────
async def allocate_numbers(svc, country, count=2):
    rid = str(country.get("rid","")).strip()
    if not rid: return []
    tasks = [api("/getnum","POST",{"rid":rid}) for _ in range(count)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    numbers = []
    for r in results:
        if isinstance(r, Exception): continue
        if isinstance(r,dict) and r.get("meta",{}).get("code")==200 and r.get("data"):
            d = r["data"]
            numbers.append({"number":d.get("no_plus_number",""),"display":d.get("full_number","+"+d.get("no_plus_number","")),"operator":d.get("operator","")})
    return numbers

def format_number_msg(svc, country, numbers):
    lines = [f"📲 <b>{svc['emoji']} {svc['name'].upper()}</b>\n"]
    for n in numbers:
        lines.append(f"📋 <code>{n['display']}</code>")
        if n.get("operator"): lines.append(f"   📶 {n['operator']}")
    return "\n".join(lines)

# ── OTP Polling ───────────────────────────────────────────────
async def poll_otp(uid, number, display, svc, country, ctx):
    seen_id = None
    try:
        for _ in range(150):
            await asyncio.sleep(2)
            try:
                data = await api("/success-otp")
                if data.get("meta",{}).get("code") != 200: continue
                otps = data.get("data",{}).get("otps",[]) or []
                clean = number.lstrip("+")
                match = next((o for o in otps if clean in str(o.get("number","")).replace("+","")), None)
                if not match or match.get("otp_id") == seen_id: continue
                seen_id = match["otp_id"]
                full_msg = match.get("message","")
                otp_code = extract_otp(full_msg)
                if not otp_code: continue

                safe_otp = otp_code[:20]
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
                inline = InlineKeyboardMarkup([[InlineKeyboardButton(f"📋  {otp_code}", callback_data=f"cpo:{safe_otp}")]])
                await ctx.bot.send_message(uid, otp_text, parse_mode=ParseMode.HTML, reply_markup=inline)

                gid = cfg.get("otp_group_id")
                if gid:
                    grp = (
                        f"<b>BD TopSell</b>  {cfg['footer_msg']}\n"
                        f"━━━━━━━━━━━━━━━━\n"
                        f"📱 <b>Number :</b> {country.get('flag','')} <code>{display}</code>\n"
                        f"━━━━━━━━━━━━━━━━\n"
                        f"🔑 <b>OTP :</b> {otp_code}\n"
                        f"━━━━━━━━━━━━━━━━\n"
                        f"📝 <b>FULL MESSAGE :</b>\n# {full_msg}\n"
                        f"━━━━━━━━━━━━━━━━"
                    )
                    grp_btn = InlineKeyboardMarkup([[InlineKeyboardButton(f"📋  {otp_code}", callback_data=f"cpo:{safe_otp}")]])
                    try:
                        await ctx.bot.send_message(int(gid), grp, parse_mode=ParseMode.HTML, reply_markup=grp_btn)
                    except Exception as e:
                        log.warning(f"OTP group error: {e}")
                return
            except asyncio.CancelledError: return
            except Exception as e: log.debug(f"Poll: {e}")
    except asyncio.CancelledError: pass

# ── Callback ──────────────────────────────────────────────────
async def on_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    uid = q.from_user.id
    data = q.data

    if data.startswith("cpn:"):
        await q.answer(f"✅ নাম্বার: {data[4:]}", show_alert=True); return
    if data.startswith("cpo:"):
        await q.answer(f"✅ OTP কপি: {data[4:]}", show_alert=True); return

    if data == "change_num":
        await q.answer()
        s = get_sess(uid)
        for t in list(s["polling"].values()): t.cancel()
        s["polling"].clear()
        if s.get("service") and s.get("country"):
            await q.edit_message_text("⏳ নতুন নাম্বার আনা হচ্ছে...")
            numbers = await allocate_numbers(s["service"], s["country"])
            if not numbers:
                await q.edit_message_text("❌ নাম্বার পাওয়া যায়নি।"); return
            s["numbers"] = numbers
            txt = format_number_msg(s["service"], s["country"], numbers)
            sent = await q.edit_message_text(txt, reply_markup=number_inline_kb(numbers), parse_mode=ParseMode.HTML)
            for n in numbers:
                t = asyncio.create_task(poll_otp(uid, n["number"], n["display"], s["service"], s["country"], ctx))
                s["polling"][n["number"]] = t
        return

    if data == "otp_grp":
        gid = cfg.get("otp_group_id")
        await q.answer(f"OTP Group: {gid}" if gid else "OTP Group সেট নেই।", show_alert=True); return

    if data == "go_home":
        await q.answer()
        s = get_sess(uid)
        for t in list(s["polling"].values()): t.cancel()
        s["polling"].clear()
        s["step"] = "home"
        await ctx.bot.send_message(uid, "🏠 Main Menu", reply_markup=main_kb())
        return

    await q.answer()

# ── Main ──────────────────────────────────────────────────────
def main():
    log.info("✅ Bot starting (no Firebase mode)...")
    log.info(f"Services: {len(cfg['services'])}")
    log.info(f"Admin IDs: {cfg['admin_ids']}")
    log.info(f"OTP Group: {cfg['otp_group_id']}")

    app = Application.builder().token(BOT_TOKEN).concurrent_updates(True).build()
    app.add_handler(CommandHandler("start",      cmd_start))
    app.add_handler(CommandHandler("reload",     cmd_reload))
    app.add_handler(CommandHandler("broadcast",  cmd_broadcast))
    app.add_handler(CommandHandler("addservice", cmd_addservice))
    app.add_handler(CommandHandler("addcountry", cmd_addcountry))
    app.add_handler(CommandHandler("services",   cmd_services))
    app.add_handler(CallbackQueryHandler(on_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_message))
    app.run_polling(drop_pending_updates=True, allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
