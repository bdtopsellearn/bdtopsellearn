// =====================================================
// BANGLADESH TOP EARN — Firebase Integrated Full App
// =====================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
         signOut, onAuthStateChanged, sendPasswordResetEmail,
         setPersistence, browserLocalPersistence
       } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection,
         addDoc, getDocs, query, where, orderBy, onSnapshot,
         serverTimestamp, deleteDoc
       } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase Config ──────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDm6XCdj_Zs6w5rowypsjm-MoF31Sn9tCM",
  authDomain: "bdtopsellearn.firebaseapp.com",
  projectId: "bdtopsellearn",
  storageBucket: "bdtopsellearn.firebasestorage.app",
  messagingSenderId: "157769457261",
  appId: "1:157769457261:web:a134db45502f2c31cde964",
  measurementId: "G-Y8K0VNK0T5"
};

const fbApp  = initializeApp(firebaseConfig);
const auth   = getAuth(fbApp);
const db     = getFirestore(fbApp);

// Keep login FOREVER (never ask again until user clicks logout)
setPersistence(auth, browserLocalPersistence);

// ── Constants ─────────────────────────────────────────
const ADMIN_EMAIL = 'mdjobayerislam2580@gmail.com';

const JOB_DEFAULTS = [
  { id:'facebook',  name:'ফেসবুক সেল',    icon:'f',  iconBg:'#1877f2', rate:14, locked:false, password:'',           notice:'' },
  { id:'gmail',     name:'জিমেইল সেল',    icon:'✉',  iconBg:'#e53e3e', rate:18, locked:false, password:'@shanto@#&', notice:'' },
  { id:'instagram', name:'ইনস্টা সেল',   icon:'📷', iconBg:'#e1306c', rate:3,  locked:false, password:'@topearn08', notice:'' },
];

const DEFAULT_SETTINGS = {
  activationFee:   30,
  referralBonus:   20,
  activationBonus: 20,
  minWithdrawal:   50,
  launchDate:      '2026-04-30',
  noticeTicker:    'গিফট কোড বোনাস দেওয়া হয় — টেলিগ্রাম জয়েন করুন।',
  admin1link:'', admin2link:'', tgchannel:'',
  fbpage:'', ytchannel:'', bkashNum:'01XXXXXXXXX', nagadNum:'01XXXXXXXXX'
};

// ── State ─────────────────────────────────────────────
let currentUser  = null;   // Firebase Auth user
let currentUserData = null; // Firestore user document
let siteSettings = { ...DEFAULT_SETTINGS };
let siteJobs     = [...JOB_DEFAULTS];
let payingMethod = '';
let lastPage     = 'home';
let ageTimer     = null;

// ── Loading Overlay ───────────────────────────────────
function showLoading(msg = 'Loading...') {
  let el = document.getElementById('loadingOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loadingOverlay';
    el.innerHTML = `<div class="loading-spinner"></div><p>${msg}</p>`;
    el.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,.92);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-size:15px;font-weight:600;color:#444';
    document.body.appendChild(el);
  } else {
    el.querySelector('p').textContent = msg;
    el.style.display = 'flex';
  }
}
function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'none';
}

// ── Toast ─────────────────────────────────────────────
function toast(msg, dur = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), dur);
}

// ── Auth State — runs on every page load ──────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    showLoading('Loading your account...');
    currentUser = user;
    await loadUserData(user.uid);
    await loadSettings();
    await loadJobs();
    hideLoading();
    enterApp();
  } else {
    currentUser = null;
    currentUserData = null;
    showAuthScreen();
  }
});

// ── Firestore Helpers ─────────────────────────────────
async function loadUserData(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    currentUserData = { uid, ...snap.data() };
  }
}

async function saveUserData(fields) {
  await updateDoc(doc(db, 'users', currentUser.uid), fields);
  currentUserData = { ...currentUserData, ...fields };
}

async function loadSettings() {
  const snap = await getDoc(doc(db, 'config', 'settings'));
  if (snap.exists()) siteSettings = { ...DEFAULT_SETTINGS, ...snap.data() };
}

async function saveSettingsDB(data) {
  await setDoc(doc(db, 'config', 'settings'), data, { merge: true });
  siteSettings = { ...siteSettings, ...data };
}

async function loadJobs() {
  const snap = await getDoc(doc(db, 'config', 'jobs'));
  if (snap.exists()) siteJobs = snap.data().list || JOB_DEFAULTS;
}

async function saveJobsDB() {
  await setDoc(doc(db, 'config', 'jobs'), { list: siteJobs });
}

// ── Auth: Register ────────────────────────────────────
async function doRegister() {
  const refId  = document.getElementById('refId').value.trim();
  const name   = document.getElementById('regName').value.trim();
  const email  = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass   = document.getElementById('regPass').value;
  const pass2  = document.getElementById('regPass2').value;
  if (!name || !email || !pass) return toast('সব ঘর পূরণ করুন।');
  if (pass !== pass2)           return toast('পাসওয়ার্ড মিলছে না।');
  if (pass.length < 6)          return toast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
  showLoading('একাউন্ট তৈরি হচ্ছে...');
  try {
    const cred  = await createUserWithEmailAndPassword(auth, email, pass);
    const uid   = cred.user.uid;
    const docId = await generateUserId();
    const userData = {
      uid, name, email, active: false,
      balance: 0, joinDate: serverTimestamp(),
      referredBy: refId || null, numericId: docId
    };
    await setDoc(doc(db, 'users', uid), userData);
    currentUserData = { uid, ...userData, joinDate: Date.now() };
    // notify referrer chain later when activated
    toast('একাউন্ট তৈরি হয়েছে! ✅');
  } catch (e) {
    hideLoading();
    toast(firebaseError(e));
  }
}

async function generateUserId() {
  const snap = await getDoc(doc(db, 'config', 'counter'));
  const next = snap.exists() ? (snap.data().val || 10000) + 1 : 10001;
  await setDoc(doc(db, 'config', 'counter'), { val: next });
  return next;
}

// ── Auth: Login ───────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) return toast('ইমেইল ও পাসওয়ার্ড দিন।');
  showLoading('লগইন হচ্ছে...');
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged will fire and load the app
  } catch (e) {
    hideLoading();
    toast(firebaseError(e));
  }
}

// ── Auth: Forgot Password ─────────────────────────────
async function doForgotPassword() {
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) return toast('ইমেইল দিন।');
  showLoading('রিসেট ইমেইল পাঠানো হচ্ছে...');
  try {
    await sendPasswordResetEmail(auth, email);
    hideLoading();
    toast('✅ পাসওয়ার্ড রিসেট ইমেইল পাঠানো হয়েছে! ইনবক্স চেক করুন।');
    switchTab('login');
  } catch (e) {
    hideLoading();
    toast(firebaseError(e));
  }
}
window.doForgotPassword = doForgotPassword;

// ── Auth: Logout ──────────────────────────────────────
async function doLogout() {
  await signOut(auth);
  closeMenu();
}
window.doLogout = doLogout;

// ── Firebase Error Messages ───────────────────────────
function firebaseError(e) {
  const map = {
    'auth/email-already-in-use':    'এই ইমেইল দিয়ে আগেই একাউন্ট আছে।',
    'auth/invalid-email':           'ইমেইল সঠিক নয়।',
    'auth/user-not-found':          'এই ইমেইলে কোনো একাউন্ট নেই।',
    'auth/wrong-password':          'পাসওয়ার্ড ভুল।',
    'auth/invalid-credential':      'ইমেইল বা পাসওয়ার্ড ভুল।',
    'auth/too-many-requests':       'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।',
    'auth/network-request-failed':  'ইন্টারনেট সংযোগ সমস্যা।',
    'auth/weak-password':           'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
  };
  return map[e.code] || ('সমস্যা: ' + e.message);
}

// ── Screen Switching ──────────────────────────────────
function showAuthScreen() {
  document.getElementById('appScreen').classList.remove('active');
  document.getElementById('authScreen').classList.add('active');
  hideLoading();
}

function enterApp() {
  document.getElementById('authScreen').classList.remove('active');
  document.getElementById('appScreen').classList.add('active');
  updateHeaderUI();
  initProjects();
  startSiteAge();
  updateNoticeBar();
  updateSupportLinks();
  showSection('home');
  const isAdmin = currentUser.email === ADMIN_EMAIL;
  document.getElementById('adminMenuItem').style.display = isAdmin ? 'block' : 'none';
  // Show welcome modal once per session
  if (!sessionStorage.getItem('welcomed')) {
    sessionStorage.setItem('welcomed', '1');
    setTimeout(() => openModal('welcomeModal'), 900);
    // Wire up Telegram/Admin buttons
    const s = siteSettings;
    document.getElementById('joinTgBtn').onclick  = () => s.tgchannel  && window.open(s.tgchannel,  '_blank');
    document.getElementById('admin1Btn').onclick  = () => s.admin1link && window.open(s.admin1link, '_blank');
    document.getElementById('admin2Btn').onclick  = () => s.admin2link && window.open(s.admin2link, '_blank');
  }
  listenNotifications();
}

// ── UI Updates ────────────────────────────────────────
function updateHeaderUI() {
  const u = currentUserData;
  if (!u) return;
  const bal = (u.balance || 0).toFixed(2);
  document.getElementById('welcomeName').textContent   = u.name  || 'User';
  document.getElementById('walletBal').textContent     = bal;
  document.getElementById('walletBig').textContent     = bal;
  document.getElementById('sideMenuName').textContent  = u.name  || 'User';
  document.getElementById('sideMenuId').textContent    = 'ID: ' + (u.numericId || '---');
  document.getElementById('sideMenuBal').textContent   = bal;
  const joined = u.joinDate?.seconds
    ? new Date(u.joinDate.seconds * 1000)
    : new Date(u.joinDate || Date.now());
  document.getElementById('sideMenuSince').textContent = joined.toLocaleDateString('en',{month:'short',year:'numeric'});
  const statusEl = document.getElementById('sideMenuStatus');
  statusEl.textContent  = u.active ? '● Active' : '● Inactive';
  statusEl.className    = 'side-status-badge' + (u.active ? ' active-badge' : '');
  // Inactive banner
  document.getElementById('inactiveBanner').style.display = u.active ? 'none' : 'block';
  // Wallet section
  document.getElementById('activeWalletWarn').style.display = u.active ? 'none' : 'block';
  document.getElementById('withdrawSection').style.display  = u.active ? 'block' : 'none';
  // Profile fields
  document.getElementById('profileName').value  = u.name  || '';
  document.getElementById('profileEmail').value = u.email || '';
  // Ref link
  document.getElementById('refLinkBox').textContent =
    window.location.origin + window.location.pathname + '?ref=' + (u.numericId || '');
  renderTeamLevels();
}

function updateNoticeBar() {
  document.getElementById('noticeTicker').textContent = siteSettings.noticeTicker || DEFAULT_SETTINGS.noticeTicker;
}

function updateSupportLinks() {
  const s = siteSettings;
  const set = (id, href) => { const el = document.getElementById(id); if (el && href) el.href = href; };
  set('link-fbpage',    s.fbpage);
  set('link-tgchannel', s.tgchannel);
  set('link-admin1',    s.admin1link);
  set('link-ytchannel', s.ytchannel);
}

// ── Project Grid ──────────────────────────────────────
function initProjects() {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = '';
  siteJobs.forEach(job => {
    const div   = document.createElement('div');
    div.className = 'project-item';
    const bgStyle = job.iconBg.includes('gradient')
      ? `background:${job.iconBg}` : `background:${job.iconBg}`;
    div.innerHTML = `
      <div class="proj-icon" style="${bgStyle}">
        <span>${job.icon}</span>
        ${job.locked ? '<span class="proj-locked">🔒</span>' : ''}
      </div>
      <div class="proj-label">${job.name}</div>`;
    div.onclick = () => handleProjectClick(job);
    grid.appendChild(div);
  });
}

function handleProjectClick(job) {
  if (!currentUserData?.active) { showActivate(); return; }
  if (job.locked) { toast('এই ফিচার শীঘ্রই আসছে!'); return; }
  if (job.id === 'refer') { showSection('team'); return; }
  if (job.id === 'giftcode') { useGiftCode(); return; }
  if (['facebook','gmail','instagram'].includes(job.id)) {
    openJobPage(job); return;
  }
  toast('শীঘ্রই আসছে!');
}

function openJobPage(job) {
  const rateEl   = document.getElementById('rate-'   + job.id);
  const noticeEl = document.getElementById('notice-' + job.id);
  if (rateEl)   rateEl.textContent = 'Rate: ৳' + Number(job.rate).toFixed(2);
  if (noticeEl) {
    if (job.password) {
      noticeEl.innerHTML = `🔑 <div><strong>ব্যবহারের পাসওয়ার্ড:</strong>
        <span style="color:#b45309;font-weight:700">${job.password}</span>
        <button onclick="navigator.clipboard.writeText('${job.password}').then(()=>toast('কপি হয়েছে!'))"
          style="background:#444;color:#fff;border:none;padding:2px 8px;border-radius:6px;font-size:11px;cursor:pointer;margin-left:6px">COPY</button>
        </div>`;
    } else if (job.notice) {
      noticeEl.textContent = job.notice;
    } else {
      noticeEl.innerHTML = '';
    }
  }
  showSection('job-' + job.id);
}

// ── Site Age Counter ──────────────────────────────────
function startSiteAge() {
  if (ageTimer) clearInterval(ageTimer);
  function tick() {
    const launch = new Date(siteSettings.launchDate || DEFAULT_SETTINGS.launchDate).getTime();
    const diff   = Math.max(0, Date.now() - launch);
    const days   = Math.floor(diff / 86400000);
    const hrs    = Math.floor((diff % 86400000) / 3600000);
    const mins   = Math.floor((diff % 3600000)  / 60000);
    const secs   = Math.floor((diff % 60000)    / 1000);
    const box    = (n, l) => `<div class="age-box"><div class="age-num">${String(n).padStart(2,'0')}</div><div class="age-label">${l}</div></div>`;
    document.getElementById('siteAge').innerHTML =
      box(days,'দিন') + box(hrs,'ঘন্টা') + box(mins,'মিনিট') + box(secs,'সেকেন্ড');
  }
  tick();
  ageTimer = setInterval(tick, 1000);
}

// ── Navigation ────────────────────────────────────────
function showSection(sec) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + sec);
  if (pg) { pg.classList.add('active'); lastPage = sec; }
  if (sec === 'admin')         { loadAdminPanel(); }
  if (sec === 'wallet')        { renderPaymentHistory(); }
  if (sec === 'notifications') { renderNotifications(); }
  if (sec === 'team')          { renderTeamLevels(); }
  if (sec === 'help')          { updateSupportLinks(); }
}
window.showSection = showSection;

function goBack() { showSection(lastPage === 'history' ? 'home' : lastPage); }
window.goBack = goBack;

// ── Team ──────────────────────────────────────────────
async function renderTeamLevels() {
  if (!currentUserData) return;
  const myId = String(currentUserData.numericId);
  // Level 1 = direct referrals
  const q1 = query(collection(db,'users'), where('referredBy','==', myId));
  const snap1 = await getDocs(q1);
  const l1 = snap1.docs.map(d => d.data());
  document.getElementById('teamSize').textContent = l1.length;
  let html = '';
  for (let lv = 1; lv <= 5; lv++) {
    html += `<div class="level-row">
      <span class="level-label">Level ${lv} ${lv===1?'('+l1.length+')':'(0)'}</span>
      <button class="btn-view" onclick="viewLevelMembers(${lv})">View</button>
    </div>`;
  }
  document.getElementById('teamLevels').innerHTML = html;
}

async function viewLevelMembers(lv) {
  document.getElementById('levelModalTitle').textContent = 'Level ' + lv + ' Members';
  if (lv === 1) {
    const myId = String(currentUserData.numericId);
    const snap = await getDocs(query(collection(db,'users'), where('referredBy','==',myId)));
    const members = snap.docs.map(d => d.data());
    document.getElementById('levelModalList').innerHTML = members.length
      ? members.map(m => `<div class="user-row"><strong>${m.name}</strong><br/><small>${m.email}</small><br/><span class="user-status-badge ${m.active?'badge-active':'badge-inactive'}">${m.active?'Active':'Inactive'}</span></div>`).join('')
      : '<p class="empty-msg">No members.</p>';
  } else {
    document.getElementById('levelModalList').innerHTML = '<p class="empty-msg">Higher level tracking coming soon.</p>';
  }
  openModal('levelModal');
}
window.viewLevelMembers = viewLevelMembers;

function copyRefLink() {
  const link = document.getElementById('refLinkBox').textContent;
  navigator.clipboard.writeText(link).then(() => toast('রেফারেল লিংক কপি হয়েছে! 📋'));
}
window.copyRefLink = copyRefLink;

// ── Job Submission ────────────────────────────────────
async function submitJob(jobId) {
  if (!currentUserData?.active) { showActivate(); return; }
  const job  = siteJobs.find(j => j.id === jobId);
  let   data = {};
  if (jobId === 'facebook') {
    data = { uid: document.getElementById('fb-uid').value.trim(), email: document.getElementById('fb-email').value.trim(), pass: document.getElementById('fb-pass').value, fa2: document.getElementById('fb-2fa').value.trim() };
    if (!data.uid || !data.email || !data.pass) return toast('সব ঘর পূরণ করুন।');
  } else if (jobId === 'gmail') {
    data = { email: document.getElementById('gm-email').value.trim(), pass: document.getElementById('gm-pass').value };
    if (!data.email || !data.pass) return toast('সব ঘর পূরণ করুন।');
  } else if (jobId === 'instagram') {
    data = { user: document.getElementById('ig-user').value.trim(), pass: document.getElementById('ig-pass').value, fa2: document.getElementById('ig-2fa').value.trim() };
    if (!data.user || !data.pass) return toast('সব ঘর পূরণ করুন।');
  }
  showLoading('সাবমিট হচ্ছে...');
  try {
    await addDoc(collection(db, 'submissions'), {
      userId:   currentUser.uid,
      numericId:currentUserData.numericId,
      userName: currentUserData.name,
      userEmail:currentUserData.email,
      jobId, jobType: jobId,
      data, rate: job?.rate || 0,
      status: 'pending',
      time: serverTimestamp()
    });
    hideLoading();
    toast('✅ সাবমিট হয়েছে! অনুমোদনের অপেক্ষায় আছে।');
    // Clear fields
    ['fb-uid','fb-email','fb-pass','fb-2fa','gm-email','gm-pass','ig-user','ig-pass','ig-2fa']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  } catch (e) {
    hideLoading();
    toast('সমস্যা হয়েছে: ' + e.message);
  }
}
window.submitJob = submitJob;

async function viewHistory(jobId) {
  showLoading('লোড হচ্ছে...');
  const q = query(
    collection(db,'submissions'),
    where('userId','==', currentUser.uid),
    where('jobId','==', jobId),
    orderBy('time','desc')
  );
  const snap = await getDocs(q);
  hideLoading();
  document.getElementById('historyTitle').textContent =
    jobId.charAt(0).toUpperCase() + jobId.slice(1) + ' History';
  const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  document.getElementById('historyList').innerHTML = subs.length
    ? subs.map(s => `<div class="submission-row">
        <div><strong>${s.jobId?.toUpperCase()}</strong></div>
        <div class="sub-meta">${s.time?.seconds ? new Date(s.time.seconds*1000).toLocaleString() : 'Just now'}</div>
        <div class="sub-meta">Rate: ৳${s.rate}</div>
        <span class="sub-status sub-${s.status}">${s.status?.toUpperCase()}</span>
      </div>`).join('')
    : '<p class="empty-msg">কোনো ইতিহাস নেই।</p>';
  showSection('history');
}
window.viewHistory = viewHistory;

// ── COPY JOB DATA (Admin — Google Sheets) ─────────────
async function copyJobData(type) {
  // Show loading state on the button
  const statusEl = document.getElementById('copyDataStatus');
  if (statusEl) { statusEl.style.display='block'; statusEl.className='copy-data-status loading'; statusEl.textContent='⏳ ডাটা লোড হচ্ছে...'; }

  let txt = '';
  let count = 0;

  try {
    if (type === 'referral') {
      // Referral data from users collection
      const snap = await getDocs(collection(db, 'users'));
      const users = snap.docs.map(d => d.data());
      txt = 'Referrer ID\tReferrer Name\tReferrer Email\tReferred User\tReferred Email\tActive\tJoined\n';
      for (const u of users) {
        if (u.referredBy) {
          const referrer = users.find(r => String(r.numericId) === String(u.referredBy));
          const dt = u.joinDate?.seconds ? new Date(u.joinDate.seconds*1000).toLocaleString() : 'N/A';
          txt += `${u.referredBy}\t${referrer?.name||'Unknown'}\t${referrer?.email||'N/A'}\t${u.name}\t${u.email}\t${u.active?'Yes':'No'}\t${dt}\n`;
          count++;
        }
      }
      if (count === 0) txt += 'No referral data yet.\n';
    } else {
      // Job submission data - each field in its own column
      const q = query(collection(db,'submissions'), where('jobType','==', type), orderBy('time','desc'));
      const snap = await getDocs(q);
      const subs = snap.docs.map(d => d.data());
      count = subs.length;

      // Build header based on job type
      const headers = {
        facebook:  'No\tUser Name\tUser Email\tUID/Profile\tLogin Email\tPassword\t2FA Key\tRate\tStatus\tDate',
        gmail:     'No\tUser Name\tUser Email\tGmail Address\tPassword\tRate\tStatus\tDate',
        instagram: 'No\tUser Name\tUser Email\tUsername\tPassword\t2FA Key\tRate\tStatus\tDate',
      };
      txt = (headers[type] || 'No\tUser Name\tEmail\tStatus\tRate\tDate') + '\n';

      subs.forEach((s, i) => {
        const dt = s.time?.seconds ? new Date(s.time.seconds*1000).toLocaleString() : 'N/A';
        const d  = s.data || {};
        if (type === 'facebook') {
          txt += `${i+1}\t${s.userName}\t${s.userEmail}\t${d.uid||''}\t${d.email||''}\t${d.pass||''}\t${d.fa2||''}\t৳${s.rate}\t${s.status}\t${dt}\n`;
        } else if (type === 'gmail') {
          txt += `${i+1}\t${s.userName}\t${s.userEmail}\t${d.email||''}\t${d.pass||''}\t৳${s.rate}\t${s.status}\t${dt}\n`;
        } else if (type === 'instagram') {
          txt += `${i+1}\t${s.userName}\t${s.userEmail}\t${d.user||''}\t${d.pass||''}\t${d.fa2||''}\t৳${s.rate}\t${s.status}\t${dt}\n`;
        } else {
          txt += `${i+1}\t${s.userName}\t${s.userEmail}\t${s.status}\t৳${s.rate}\t${dt}\n`;
        }
      });
      if (count === 0) txt += 'No submissions yet.\n';
    }

    await navigator.clipboard.writeText(txt);
    if (statusEl) {
      statusEl.className = 'copy-data-status success';
      statusEl.textContent = `✅ ${type.toUpperCase()} ডাটা কপি হয়েছে! (${count} rows) — Google Sheet খুলে Ctrl+V চাপুন`;
      setTimeout(() => { if(statusEl) statusEl.style.display='none'; }, 4000);
    }
    toast(`✅ ${count} টি ${type} ডাটা কপি হয়েছে!`);
  } catch(err) {
    if (statusEl) {
      statusEl.className = 'copy-data-status error';
      statusEl.textContent = '❌ কপি করতে সমস্যা: ' + err.message;
    }
    toast('কপি করতে সমস্যা: ' + err.message);
  }
}
window.copyJobData = copyJobData;

// ── Download Job Data as CSV ───────────────────────────
async function downloadJobData(type) {
  const statusEl = document.getElementById('csvDownloadStatus');
  if (statusEl) { statusEl.style.display='block'; statusEl.className='copy-data-status loading'; statusEl.textContent='⏳ ডাটা প্রস্তুত হচ্ছে...'; }

  let csvRows = [];
  let filename = '';
  let count = 0;

  try {
    if (type === 'referral') {
      filename = 'referral_data.csv';
      const snap  = await getDocs(collection(db, 'users'));
      const users = snap.docs.map(d => d.data());
      csvRows.push(['Referrer ID','Referrer Name','Referrer Email','Referred Name','Referred Email','Active','Joined Date']);
      for (const u of users) {
        if (u.referredBy) {
          const referrer = users.find(r => String(r.numericId) === String(u.referredBy));
          const dt = u.joinDate?.seconds ? new Date(u.joinDate.seconds*1000).toLocaleString() : 'N/A';
          csvRows.push([
            u.referredBy,
            referrer?.name  || 'Unknown',
            referrer?.email || 'N/A',
            u.name,
            u.email,
            u.active ? 'Yes' : 'No',
            dt
          ]);
          count++;
        }
      }
    } else {
      filename = `${type}_submissions.csv`;
      const q    = query(collection(db,'submissions'), where('jobType','==', type), orderBy('time','desc'));
      const snap = await getDocs(q);
      const subs = snap.docs.map(d => d.data());
      count = subs.length;

      // Header per job type
      const headerMap = {
        facebook:  ['No','User Name','User Email','UID/Profile','Login Email','Password','2FA Key','Rate','Status','Date'],
        gmail:     ['No','User Name','User Email','Gmail Address','Password','Rate','Status','Date'],
        instagram: ['No','User Name','User Email','Username','Password','2FA Key','Rate','Status','Date'],
      };
      csvRows.push(headerMap[type] || ['No','User Name','User Email','Status','Rate','Date']);

      subs.forEach((s, i) => {
        const dt = s.time?.seconds ? new Date(s.time.seconds*1000).toLocaleString() : 'N/A';
        const d  = s.data || {};
        if (type === 'facebook') {
          csvRows.push([i+1, s.userName, s.userEmail, d.uid||'', d.email||'', d.pass||'', d.fa2||'', '৳'+s.rate, s.status, dt]);
        } else if (type === 'gmail') {
          csvRows.push([i+1, s.userName, s.userEmail, d.email||'', d.pass||'', '৳'+s.rate, s.status, dt]);
        } else if (type === 'instagram') {
          csvRows.push([i+1, s.userName, s.userEmail, d.user||'', d.pass||'', d.fa2||'', '৳'+s.rate, s.status, dt]);
        } else {
          csvRows.push([i+1, s.userName, s.userEmail, s.status, '৳'+s.rate, dt]);
        }
      });

      if (count === 0) csvRows.push(['No data yet.']);
    }

    // Build CSV string — wrap fields in quotes to handle commas safely
    const csvStr = csvRows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')
    ).join('
');

    // BOM for UTF-8 so Bengali shows correctly in Excel
    const bom    = '﻿';
    const blob   = new Blob([bom + csvStr], { type: 'text/csv;charset=utf-8;' });
    const url    = URL.createObjectURL(blob);
    const link   = document.createElement('a');
    link.href    = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (statusEl) {
      statusEl.className = 'copy-data-status success';
      statusEl.textContent = `✅ ${type.toUpperCase()} CSV ডাউনলোড হয়েছে! (${count} rows) — "${filename}"`;
      setTimeout(() => { if (statusEl) statusEl.style.display='none'; }, 5000);
    }
    toast(`✅ ${filename} ডাউনলোড হয়েছে!`);
  } catch(err) {
    if (statusEl) {
      statusEl.className = 'copy-data-status error';
      statusEl.textContent = '❌ ডাউনলোড করতে সমস্যা: ' + err.message;
    }
    toast('সমস্যা: ' + err.message);
  }
}
window.downloadJobData = downloadJobData;

// ── Wallet ────────────────────────────────────────────
async function renderPaymentHistory() {
  const q    = query(collection(db,'withdrawals'), where('userId','==',currentUser.uid), orderBy('time','desc'));
  const snap = await getDocs(q);
  const wds  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  document.getElementById('paymentHistory').innerHTML = wds.length
    ? wds.map(w => `<div class="withdraw-row">
        <div><strong>৳${w.amount}</strong> via ${w.method}</div>
        <div class="sub-meta">${w.number} — ${w.time?.seconds ? new Date(w.time.seconds*1000).toLocaleString() : ''}</div>
        <span class="sub-status sub-${w.status}">${w.status?.toUpperCase()}</span>
      </div>`).join('')
    : '<p class="empty-msg">কোনো লেনদেন নেই।</p>';
}

async function doWithdraw() {
  const s   = siteSettings;
  const amt = parseFloat(document.getElementById('withdrawAmt').value);
  const num = document.getElementById('withdrawNum').value.trim();
  const mth = document.getElementById('withdrawMethod').value;
  if (!amt || amt < s.minWithdrawal) return toast('সর্বনিম্ন উইথড্র ৳' + s.minWithdrawal);
  if (!num)  return toast('bKash/Nagad নম্বর দিন।');
  if ((currentUserData.balance || 0) < amt) return toast('পর্যাপ্ত ব্যালেন্স নেই।');
  showLoading('রিকোয়েস্ট পাঠানো হচ্ছে...');
  try {
    await addDoc(collection(db,'withdrawals'), {
      userId: currentUser.uid, userName: currentUserData.name,
      amount: amt, number: num, method: mth,
      status: 'pending', time: serverTimestamp()
    });
    const newBal = (currentUserData.balance || 0) - amt;
    await saveUserData({ balance: newBal });
    updateHeaderUI();
    renderPaymentHistory();
    hideLoading();
    toast('উইথড্র রিকোয়েস্ট পাঠানো হয়েছে!');
    document.getElementById('withdrawAmt').value = '';
    document.getElementById('withdrawNum').value = '';
  } catch(e) {
    hideLoading();
    toast('সমস্যা: ' + e.message);
  }
}
window.doWithdraw = doWithdraw;

// ── Profile ───────────────────────────────────────────
async function saveProfile() {
  const name    = document.getElementById('profileName').value.trim();
  const curPass = document.getElementById('currentPass').value;
  const newPass = document.getElementById('newPass').value;
  if (!name) return toast('নাম দিন।');
  showLoading('সেভ হচ্ছে...');
  try {
    await saveUserData({ name });
    if (curPass && newPass) {
      if (newPass.length < 6) { hideLoading(); return toast('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষর।'); }
      // Re-authenticate then update password
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
      const cred = EmailAuthProvider.credential(currentUser.email, curPass);
      await reauthenticateWithCredential(currentUser, cred);
      await updatePassword(currentUser, newPass);
      document.getElementById('currentPass').value = '';
      document.getElementById('newPass').value     = '';
    }
    updateHeaderUI();
    hideLoading();
    toast('প্রোফাইল সেভ হয়েছে! ✅');
  } catch(e) {
    hideLoading();
    toast(firebaseError(e));
  }
}
window.saveProfile = saveProfile;

// ── Notifications ─────────────────────────────────────
function listenNotifications() {
  const q = query(
    collection(db,'notifications'),
    where('to','in',['all', currentUser.uid]),
    orderBy('time','desc')
  );
  onSnapshot(q, snap => {
    const count = snap.docs.filter(d => !d.data().readBy?.includes(currentUser.uid)).length;
    document.getElementById('notifDot').style.display = count > 0 ? 'inline-block' : 'none';
  });
}

async function renderNotifications() {
  const q = query(
    collection(db,'notifications'),
    where('to','in',['all', currentUser.uid]),
    orderBy('time','desc')
  );
  const snap = await getDocs(q);
  const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  document.getElementById('notifList').innerHTML = notifs.length
    ? notifs.map(n => `<div class="submission-row">
        <div>${n.msg}</div>
        <div class="sub-meta">${n.time?.seconds ? new Date(n.time.seconds*1000).toLocaleString() : ''}</div>
      </div>`).join('')
    : '<p class="empty-msg">কোনো নোটিফিকেশন নেই।</p>';
  // Mark read
  notifs.forEach(async n => {
    if (!n.readBy?.includes(currentUser.uid)) {
      await updateDoc(doc(db,'notifications',n.id), { readBy: [...(n.readBy||[]), currentUser.uid] });
    }
  });
  document.getElementById('notifDot').style.display = 'none';
}
window.renderNotifications = renderNotifications;

async function clearNotifications() {
  document.getElementById('notifList').innerHTML = '<p class="empty-msg">Cleared.</p>';
  toast('Notifications cleared.');
}
window.clearNotifications = clearNotifications;

// ── Invoice ID generator ─────────────────────────────
function generateInvId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// ── Payment Steps content ─────────────────────────────
const PAY_STEPS = {
  nagad: (num, amt) => [
    `*167# ডায়াল করে আপনার NAGAD মোবাইল মেনুতে যান অথবা NAGAD অ্যাপে যান।`,
    `"Send Money" -এ ক্লিক করুন।`,
    `প্রাপক নম্বর হিসেবে লিখুনঃ <div class="step-number">${num} <button class="btn-copy-step" onclick="copyPayNumber()">COPY</button></div>`,
    `টাকার পরিমাণঃ <strong>৳${amt}</strong>`,
    `নিশ্চিত করতে এখন আপনার NAGAD মোবাইল মেনু পিন লিখুন।`,
    `সবকিছু ঠিক থাকলে, আপনি NAGAD থেকে একটি Transaction ID পাবেন।`,
    `এখন উপরের বক্সে সেই Transaction ID টি দিন এবং VERIFY বাটনে ক্লিক করুন।`
  ],
  bkash: (num, amt) => [
    `*247# ডায়াল করে আপনার bKash মোবাইল মেনুতে যান অথবা bKash অ্যাপে যান।`,
    `"Send Money" -এ ক্লিক করুন।`,
    `প্রাপক নম্বর হিসেবে লিখুনঃ <div class="step-number">${num} <button class="btn-copy-step" onclick="copyPayNumber()">COPY</button></div>`,
    `টাকার পরিমাণঃ <strong>৳${amt}</strong>`,
    `নিশ্চিত করতে এখন আপনার bKash পিন লিখুন।`,
    `সবকিছু ঠিক থাকলে, আপনি bKash থেকে একটি Transaction ID পাবেন।`,
    `এখন উপরের বক্সে সেই Transaction ID টি দিন এবং VERIFY বাটনে ক্লিক করুন।`
  ]
};

// ── Activation ────────────────────────────────────────
function showActivate() {
  document.getElementById('activeFeeDisplay').textContent = (siteSettings.activationFee || 30).toFixed(2);
  openModal('activateModal');
}
window.showActivate = showActivate;

function proceedActivate() {
  closeModal('activateModal');
  const fee = (siteSettings.activationFee || 30).toFixed(2);
  document.getElementById('payableAmt').textContent = fee;
  // Generate invoice ID and show in modal
  const inv = generateInvId();
  window._currentInvId = inv;
  const invEl = document.getElementById('payModalInv');
  if (invEl) invEl.textContent = inv;
  openModal('paymentModal');
}
window.proceedActivate = proceedActivate;

function choosePay(method) {
  payingMethod = method;
  closeModal('paymentModal');
  const s   = siteSettings;
  const fee = (s.activationFee || 30).toFixed(2);
  const num = method === 'bkash' ? (s.bkashNum||'01XXXXXXXXX') : (s.nagadNum||'01XXXXXXXXX');
  window._currentPayNumber = num;

  // Fill instruction modal
  const invId = window._currentInvId || generateInvId();
  const invEl2 = document.getElementById('payInstrInv');
  if (invEl2) invEl2.textContent = invId;

  document.getElementById('payInstAmt').textContent    = fee;
  document.getElementById('payInstNumber').textContent = num;

  // Build steps HTML
  const steps = PAY_STEPS[method](num, fee);
  document.getElementById('paySteps').innerHTML = steps.map((s, i) =>
    `<div class="pay-step-row">
       <div class="step-num-badge">${i+1}</div>
       <div class="step-text">${s}</div>
     </div>`
  ).join('');

  // Show number + amount
  document.getElementById('payInstNumber').textContent = num;
  document.getElementById('payInstAmt').textContent    = fee;

  openModal('payInstructModal');
}
window.choosePay = choosePay;

function copyPayNumber() {
  const num = window._currentPayNumber || document.getElementById('payInstNumber').textContent;
  navigator.clipboard.writeText(num).then(() => toast('নম্বর কপি হয়েছে! 📋'));
}
window.copyPayNumber = copyPayNumber;

async function confirmPayment() {
  const txn = document.getElementById('txnId').value.trim();
  if (!txn) return toast('Transaction ID দিন।');
  if (txn.length < 5) return toast('সঠিক Transaction ID দিন।');
  showLoading('ভেরিফাই হচ্ছে...');
  try {
    await addDoc(collection(db,'withdrawals'), {
      userId:    currentUser.uid,
      userName:  currentUserData.name,
      userEmail: currentUserData.email,
      amount:    siteSettings.activationFee || 30,
      number:    txn,
      method:    'Activation via ' + payingMethod,
      invId:     window._currentInvId || '',
      status:    'pending-activation',
      time:      serverTimestamp()
    });
    closeModal('payInstructModal');
    document.getElementById('txnId').value = '';
    hideLoading();
    toast('✅ পেমেন্ট সাবমিট হয়েছে! শীঘ্রই একটিভ করা হবে।');
  } catch(e) {
    hideLoading();
    toast('সমস্যা: ' + e.message);
  }
}
window.confirmPayment = confirmPayment;

// ── Gift Code ─────────────────────────────────────────
async function useGiftCode() {
  const code = prompt('গিফট কোড দিন:');
  if (!code) return;
  const snap = await getDocs(query(collection(db,'giftcodes'), where('code','==',code.toUpperCase()), where('used','==',false)));
  if (snap.empty) { toast('❌ অবৈধ বা ব্যবহৃত গিফট কোড!'); return; }
  const docRef = snap.docs[0];
  const gc     = docRef.data();
  showLoading('রিডিম হচ্ছে...');
  await updateDoc(docRef.ref, { used: true, usedBy: currentUser.uid, usedAt: serverTimestamp() });
  const newBal = (currentUserData.balance || 0) + gc.amount;
  await saveUserData({ balance: newBal });
  updateHeaderUI();
  hideLoading();
  toast('🎉 গিফট কোড রিডিম হয়েছে! +৳' + gc.amount);
}

// ── Modal Helpers ─────────────────────────────────────
function openModal(id)  { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
window.openModal  = openModal;
window.closeModal = closeModal;

// ── Auth UI Helpers ───────────────────────────────────
function switchTab(tab) {
  ['login','signup','forgot'].forEach(t => {
    document.getElementById(t + 'Form').classList.toggle('active', t === tab);
  });
  document.querySelectorAll('.auth-tab').forEach((b,i) => {
    b.classList.toggle('active', (i===0&&tab==='login')||(i===1&&tab==='signup'));
  });
}
window.switchTab = switchTab;

function showForgotPassword() { switchTab('forgot'); }
window.showForgotPassword = showForgotPassword;

function togglePass(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}
window.togglePass = togglePass;

// ── Side Menu ─────────────────────────────────────────
function openMenu()  {
  document.getElementById('sideMenu').classList.add('open');
  document.getElementById('menuOverlay').classList.add('open');
}
function closeMenu() {
  document.getElementById('sideMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('open');
}
window.openMenu  = openMenu;
window.closeMenu = closeMenu;

// ── URL Referral Param ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref) {
    const el = document.getElementById('refId');
    if (el) el.value = ref;
    switchTab('signup');
  }
});

// ============================================================
//  ADMIN PANEL
// ============================================================
async function loadAdminPanel() {
  if (currentUser?.email !== ADMIN_EMAIL) return;
  renderAdminDashboard();
}

function adminTab(btn, tab) {
  document.querySelectorAll('.admin-tab').forEach(b  => b.classList.remove('active'));
  document.querySelectorAll('.admin-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('admin-' + tab).classList.add('active');
  if (tab === 'dashboard')   renderAdminDashboard();
  if (tab === 'users')       renderAdminUsers();
  if (tab === 'jobs')        renderAdminJobs();
  if (tab === 'settings')    loadAdminSettings();
  if (tab === 'withdrawals') renderAdminWithdrawals();
}
window.adminTab = adminTab;

async function renderAdminDashboard() {
  const usersSnap = await getDocs(collection(db,'users'));
  const users     = usersSnap.docs.map(d => d.data());
  const subsSnap  = await getDocs(collection(db,'submissions'));
  const wdSnap    = await getDocs(query(collection(db,'withdrawals'),
                      where('status','in',['pending','pending-activation'])));
  document.getElementById('stat-users').textContent   = users.length;
  document.getElementById('stat-active').textContent  = users.filter(u => u.active).length;
  document.getElementById('stat-jobs').textContent    = subsSnap.size;
  document.getElementById('stat-pending').textContent = wdSnap.size;
  renderGiftCodes();
}

async function renderAdminUsers() {
  const search = document.getElementById('searchUser')?.value.toLowerCase() || '';
  const snap   = await getDocs(collection(db,'users'));
  const users  = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
    .filter(u => u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search));
  document.getElementById('adminUsersList').innerHTML = users.length
    ? users.map(u => `
      <div class="user-row">
        <div class="user-row-top">
          <span class="user-row-name">${u.name}</span>
          <span class="user-status-badge ${u.active?'badge-active':'badge-inactive'}">${u.active?'Active':'Inactive'}</span>
        </div>
        <div class="sub-meta">${u.email} | ID: ${u.numericId} | ৳${(u.balance||0).toFixed(2)}</div>
        <div class="sub-meta">Joined: ${u.joinDate?.seconds ? new Date(u.joinDate.seconds*1000).toLocaleDateString() : 'N/A'}</div>
        <div class="user-row-actions">
          ${u.active
            ? `<button class="btn-sm-red"   onclick="adminDeactivate('${u.docId}')">Deactivate</button>`
            : `<button class="btn-sm-green" onclick="adminActivate('${u.docId}')">Activate</button>`}
          <button class="btn-sm-blue" onclick="adminAddBal('${u.docId}')">+ Balance</button>
          <button class="btn-sm-red"  onclick="adminDeductBal('${u.docId}')">- Balance</button>
        </div>
      </div>`).join('')
    : '<p class="empty-msg">কোনো ইউজার নেই।</p>';
}
window.renderAdminUsers = renderAdminUsers;

async function adminActivate(docId) {
  showLoading('একটিভ করা হচ্ছে...');
  const snap = await getDoc(doc(db,'users',docId));
  const u    = snap.data();
  const s    = siteSettings;
  const newBal = (u.balance || 0) + s.activationBonus;
  await updateDoc(doc(db,'users',docId), { active: true, balance: newBal });
  // Give referral bonus
  if (u.referredBy) {
    const rSnap = await getDocs(query(collection(db,'users'), where('numericId','==', Number(u.referredBy))));
    if (!rSnap.empty) {
      const rDoc  = rSnap.docs[0];
      const rData = rDoc.data();
      await updateDoc(rDoc.ref, { balance: (rData.balance||0) + s.referralBonus });
      await addDoc(collection(db,'notifications'), {
        to: rDoc.id, msg: `🎉 আপনার রেফারেল ${u.name} একটিভ হয়েছে! +৳${s.referralBonus} যোগ হয়েছে।`,
        time: serverTimestamp(), readBy: []
      });
    }
  }
  // Send notification to activated user
  await addDoc(collection(db,'notifications'), {
    to: docId, msg: `✅ আপনার একাউন্ট একটিভ হয়েছে! +৳${s.activationBonus} বোনাস যোগ হয়েছে।`,
    time: serverTimestamp(), readBy: []
  });
  if (currentUser.uid === docId) { await loadUserData(docId); updateHeaderUI(); }
  hideLoading();
  renderAdminUsers();
  renderAdminDashboard();
  toast('User activated!');
}
window.adminActivate = adminActivate;

async function adminDeactivate(docId) {
  await updateDoc(doc(db,'users',docId), { active: false });
  if (currentUser.uid === docId) { await loadUserData(docId); updateHeaderUI(); }
  renderAdminUsers();
  toast('User deactivated.');
}
window.adminDeactivate = adminDeactivate;

async function adminAddBal(docId) {
  const amt = parseFloat(prompt('Add amount (৳):'));
  if (!amt || isNaN(amt)) return;
  const snap = await getDoc(doc(db,'users',docId));
  await updateDoc(doc(db,'users',docId), { balance: (snap.data().balance||0) + amt });
  if (currentUser.uid === docId) { await loadUserData(docId); updateHeaderUI(); }
  renderAdminUsers();
  toast('Balance added.');
}
window.adminAddBal = adminAddBal;

async function adminDeductBal(docId) {
  const amt = parseFloat(prompt('Deduct amount (৳):'));
  if (!amt || isNaN(amt)) return;
  const snap = await getDoc(doc(db,'users',docId));
  const newB = Math.max(0, (snap.data().balance||0) - amt);
  await updateDoc(doc(db,'users',docId), { balance: newB });
  if (currentUser.uid === docId) { await loadUserData(docId); updateHeaderUI(); }
  renderAdminUsers();
  toast('Balance deducted.');
}
window.adminDeductBal = adminDeductBal;

// ── Admin Jobs ─────────────────────────────────────────
// Filter state
let _jobFilter = 'all';
let _jobSearch = '';

async function renderAdminJobs() {
  // ── Rate & lock settings ──
  document.getElementById('jobSettingsList').innerHTML = siteJobs.map(j => `
    <div class="job-settings-item">
      <span class="job-settings-name">${j.name}</span>
      <div class="job-settings-controls">
        <span class="rate-label">Rate ৳</span>
        <input type="number" value="${j.rate}" id="rate-set-${j.id}" class="rate-input"/>
        <button class="btn-sm-blue" onclick="saveJobRate('${j.id}')">Save</button>
        <button class="btn-sm-${j.locked?'green':'red'}" onclick="toggleJobLock('${j.id}')">${j.locked?'🔓 Unlock':'🔒 Lock'}</button>
      </div>
    </div>`).join('');

  // ── Password & notice settings ──
  document.getElementById('jobPasswordSettings').innerHTML = siteJobs
    .filter(j => ['facebook','gmail','instagram'].includes(j.id))
    .map(j => `
    <div class="job-pass-block">
      <div class="job-pass-title">${j.name}</div>
      <label class="field-label">Password</label>
      <div class="input-row">
        <div class="input-group" style="flex:1"><input type="text" id="pass-set-${j.id}" value="${j.password||''}" placeholder="Password"/></div>
        <button class="btn-sm-blue" onclick="saveJobPass('${j.id}')">Save</button>
      </div>
      <label class="field-label">Notice Text</label>
      <div class="input-row">
        <div class="input-group" style="flex:1"><input type="text" id="notice-set-${j.id}" value="${j.notice||''}" placeholder="Notice message..."/></div>
        <button class="btn-sm-blue" onclick="saveJobNotice('${j.id}')">Save</button>
      </div>
    </div>`).join('');

  // ── Submissions table ──
  const snap = await getDocs(query(collection(db,'submissions'), orderBy('time','desc')));
  const allSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const pending  = allSubs.filter(s => s.status === 'pending').length;
  const approved = allSubs.filter(s => s.status === 'approved').length;
  const rejected = allSubs.filter(s => s.status === 'rejected').length;

  // Filter controls
  const filterBar = `
    <div class="sub-filter-bar">
      <div class="sub-filter-counts">
        <span class="sub-count-badge all-badge"   onclick="filterSubs('all')"  >All (${allSubs.length})</span>
        <span class="sub-count-badge pend-badge"  onclick="filterSubs('pending')">⏳ Pending (${pending})</span>
        <span class="sub-count-badge appr-badge"  onclick="filterSubs('approved')">✅ Approved (${approved})</span>
        <span class="sub-count-badge rej-badge"   onclick="filterSubs('rejected')">❌ Rejected (${rejected})</span>
      </div>
      <div class="sub-search-wrap">
        <input type="text" id="subSearchInput" placeholder="🔍 নাম বা ইমেইল খুঁজুন..." oninput="filterSubsBySearch()" class="sub-search-input"/>
      </div>
    </div>`;

  // Store all subs in window for filtering
  window._allAdminSubs = allSubs;

  const container = document.getElementById('adminJobSubmissions');
  container.innerHTML = filterBar + '<div id="subsTableWrap"></div>';
  renderSubsTable();
}
window.renderAdminJobs = renderAdminJobs;

function filterSubs(status) {
  _jobFilter = status;
  // Highlight active filter
  document.querySelectorAll('.sub-count-badge').forEach(b => b.classList.remove('active-filter'));
  const map = {all:'all-badge',pending:'pend-badge',approved:'appr-badge',rejected:'rej-badge'};
  const el = document.querySelector('.' + map[status]);
  if (el) el.classList.add('active-filter');
  renderSubsTable();
}
window.filterSubs = filterSubs;

function filterSubsBySearch() {
  _jobSearch = document.getElementById('subSearchInput')?.value.toLowerCase() || '';
  renderSubsTable();
}
window.filterSubsBySearch = filterSubsBySearch;

function renderSubsTable() {
  const wrap = document.getElementById('subsTableWrap');
  if (!wrap) return;
  const allSubs = window._allAdminSubs || [];

  let filtered = allSubs;
  if (_jobFilter !== 'all') filtered = filtered.filter(s => s.status === _jobFilter);
  if (_jobSearch) filtered = filtered.filter(s =>
    s.userName?.toLowerCase().includes(_jobSearch) ||
    s.userEmail?.toLowerCase().includes(_jobSearch)
  );

  if (!filtered.length) {
    wrap.innerHTML = '<p class="empty-msg">কোনো সাবমিশন নেই।</p>';
    return;
  }

  const JOB_ICONS = { facebook:'🇫', gmail:'✉', instagram:'📷' };
  const JOB_COLORS = { facebook:'#1877f2', gmail:'#ea4335', instagram:'#e1306c' };

  wrap.innerHTML = `
    <div class="subs-table-wrap">
      <table class="subs-table">
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th>Type</th>
            <th>Rate</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((s, i) => {
            const dt    = s.time?.seconds ? new Date(s.time.seconds*1000).toLocaleDateString('bn-BD') : 'N/A';
            const color = JOB_COLORS[s.jobId] || '#888';
            const statusClass = s.status === 'approved' ? 'sub-approved' : s.status === 'rejected' ? 'sub-rejected' : 'sub-pending';
            return `<tr class="sub-table-row ${s.status === 'pending' ? 'row-pending' : ''}">
              <td class="td-num">${i+1}</td>
              <td class="td-user">
                <div class="td-user-name">${s.userName || '—'}</div>
                <div class="td-user-email">${s.userEmail || '—'}</div>
              </td>
              <td><span class="td-type-badge" style="background:${color}">${(s.jobId||'').toUpperCase()}</span></td>
              <td class="td-rate">৳${s.rate}</td>
              <td><span class="sub-status ${statusClass}">${(s.status||'').toUpperCase()}</span></td>
              <td class="td-date">${dt}</td>
              <td class="td-action">
                <button class="btn-view-detail" onclick="viewJobDetail('${s.id}')">View</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}
window.renderSubsTable = renderSubsTable;

// ── View Job Detail Modal ─────────────────────────────
async function viewJobDetail(subId) {
  const allSubs = window._allAdminSubs || [];
  let s = allSubs.find(x => x.id === subId);
  if (!s) {
    // fallback: fetch from Firestore
    const snap = await getDoc(doc(db,'submissions',subId));
    if (!snap.exists()) return toast('সাবমিশন পাওয়া যায়নি।');
    s = { id: snap.id, ...snap.data() };
  }

  const JOB_COLORS  = { facebook:'#1877f2', gmail:'#ea4335', instagram:'#e1306c' };
  const FIELD_LABELS = {
    facebook:  { uid:'UID / Profile Link', email:'Login Email/Phone', pass:'Password', fa2:'2FA Key' },
    gmail:     { email:'Gmail Address', pass:'Password' },
    instagram: { user:'Username', pass:'Password', fa2:'2FA Key' },
  };

  const color     = JOB_COLORS[s.jobId] || '#888';
  const dt        = s.time?.seconds ? new Date(s.time.seconds*1000).toLocaleString() : 'N/A';
  const statusClass = s.status==='approved'?'sub-approved':s.status==='rejected'?'sub-rejected':'sub-pending';

  document.getElementById('jdTypeBadge').textContent         = (s.jobId||'').toUpperCase();
  document.getElementById('jdTypeBadge').style.background    = color;
  document.getElementById('jdUser').textContent              = s.userName || '—';
  document.getElementById('jdEmail').textContent             = s.userEmail || '—';
  document.getElementById('jdDate').textContent              = dt;
  document.getElementById('jdRate').textContent              = '৳' + (s.rate || 0);
  document.getElementById('jdStatusBadge').textContent       = (s.status||'PENDING').toUpperCase();
  document.getElementById('jdStatusBadge').className        = 'sub-status ' + statusClass;

  // Build data table
  const labels = FIELD_LABELS[s.jobId] || {};
  const dataRows = s.data
    ? Object.entries(s.data).map(([k, v]) => `
        <tr>
          <td class="jd-field-key">${labels[k] || k}</td>
          <td class="jd-field-val">
            <span>${v || '—'}</span>
            ${v ? `<button class="btn-copy-field" onclick="navigator.clipboard.writeText('${v.replace(/'/g,"\'")}').then(()=>toast('কপি হয়েছে! ✅'))">COPY</button>` : ''}
          </td>
        </tr>`).join('')
    : '<tr><td colspan="2" class="empty-msg">কোনো ডাটা নেই</td></tr>';

  document.getElementById('jdDataTable').innerHTML = `
    <table class="jd-table">
      <tbody>${dataRows}</tbody>
    </table>`;

  // Action buttons
  document.getElementById('jdActions').innerHTML = s.status === 'pending'
    ? `<button class="btn-jd-approve" onclick="approveJobFromDetail('${s.id}','${s.userId}',${s.rate})">✅ Approve — +৳${s.rate}</button>
       <button class="btn-jd-reject"  onclick="rejectJobFromDetail('${s.id}')">❌ Reject</button>`
    : `<div class="jd-done-msg">${s.status==='approved'?'✅ This job was approved.':'❌ This job was rejected.'}</div>`;

  openModal('jobDetailModal');
}
window.viewJobDetail = viewJobDetail;

async function approveJobFromDetail(subId, userId, rate) {
  showLoading('Approving...');
  await approveJob(subId, userId, rate);
  closeModal('jobDetailModal');
  hideLoading();
  // Refresh table
  const snap = await getDocs(query(collection(db,'submissions'), orderBy('time','desc')));
  window._allAdminSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderSubsTable();
}
window.approveJobFromDetail = approveJobFromDetail;

async function rejectJobFromDetail(subId) {
  await rejectJob(subId);
  closeModal('jobDetailModal');
  // Refresh
  const snap = await getDocs(query(collection(db,'submissions'), orderBy('time','desc')));
  window._allAdminSubs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderSubsTable();
}
window.rejectJobFromDetail = rejectJobFromDetail;

async function saveJobRate(jobId) {
  const val = parseFloat(document.getElementById('rate-set-' + jobId).value);
  if (isNaN(val)) return;
  const j = siteJobs.find(j => j.id === jobId);
  if (j) { j.rate = val; await saveJobsDB(); initProjects(); toast('Rate saved.'); }
}
window.saveJobRate = saveJobRate;

async function toggleJobLock(jobId) {
  const j = siteJobs.find(j => j.id === jobId);
  if (j) { j.locked = !j.locked; await saveJobsDB(); initProjects(); renderAdminJobs(); toast(j.locked?'Locked.':'Unlocked.'); }
}
window.toggleJobLock = toggleJobLock;

async function saveJobPass(jobId) {
  const j = siteJobs.find(j => j.id === jobId);
  if (j) { j.password = document.getElementById('pass-set-'+jobId).value; await saveJobsDB(); toast('Password saved.'); }
}
window.saveJobPass = saveJobPass;

async function saveJobNotice(jobId) {
  const j = siteJobs.find(j => j.id === jobId);
  if (j) { j.notice = document.getElementById('notice-set-'+jobId).value; await saveJobsDB(); toast('Notice saved.'); }
}
window.saveJobNotice = saveJobNotice;

async function approveJob(subId, userId, rate) {
  showLoading('Approving...');
  await updateDoc(doc(db,'submissions',subId), { status:'approved' });
  const uSnap  = await getDoc(doc(db,'users',userId));
  const uData  = uSnap.data();
  await updateDoc(doc(db,'users',userId), { balance: (uData.balance||0) + rate });
  await addDoc(collection(db,'notifications'), {
    to: userId, msg: `✅ আপনার জব অনুমোদিত হয়েছে! +৳${rate} যোগ হয়েছে।`,
    time: serverTimestamp(), readBy: []
  });
  if (currentUser.uid === userId) { await loadUserData(userId); updateHeaderUI(); }
  hideLoading();
  renderAdminJobs();
  toast('Job approved! ৳' + rate + ' added.');
}
window.approveJob = approveJob;

async function rejectJob(subId) {
  await updateDoc(doc(db,'submissions',subId), { status:'rejected' });
  renderAdminJobs();
  toast('Job rejected.');
}
window.rejectJob = rejectJob;

// ── Admin Settings ─────────────────────────────────────
function loadAdminSettings() {
  const s = siteSettings;
  document.getElementById('sett-activefee').value   = s.activationFee   || 30;
  document.getElementById('sett-refbonus').value    = s.referralBonus   || 20;
  document.getElementById('sett-activebonus').value = s.activationBonus || 20;
  document.getElementById('sett-minwithdraw').value = s.minWithdrawal   || 50;
  document.getElementById('sett-launchdate').value  = s.launchDate      || '';
  document.getElementById('admin1link').value  = s.admin1link  || '';
  document.getElementById('admin2link').value  = s.admin2link  || '';
  document.getElementById('tgchannel').value   = s.tgchannel   || '';
  document.getElementById('fbpage').value      = s.fbpage      || '';
  document.getElementById('ytchannel').value   = s.ytchannel   || '';
  document.getElementById('bkashNum').value    = s.bkashNum    || '';
  document.getElementById('nagadNum').value    = s.nagadNum    || '';
}

async function saveSettings() {
  const data = {
    activationFee:   parseFloat(document.getElementById('sett-activefee').value)   || 30,
    referralBonus:   parseFloat(document.getElementById('sett-refbonus').value)    || 20,
    activationBonus: parseFloat(document.getElementById('sett-activebonus').value) || 20,
    minWithdrawal:   parseFloat(document.getElementById('sett-minwithdraw').value) || 50,
    launchDate:      document.getElementById('sett-launchdate').value,
  };
  await saveSettingsDB(data);
  startSiteAge();
  toast('Settings saved! ✅');
}
window.saveSettings = saveSettings;

async function saveContacts() {
  const data = {
    admin1link: document.getElementById('admin1link').value.trim(),
    admin2link: document.getElementById('admin2link').value.trim(),
    tgchannel:  document.getElementById('tgchannel').value.trim(),
    fbpage:     document.getElementById('fbpage').value.trim(),
    ytchannel:  document.getElementById('ytchannel').value.trim(),
    bkashNum:   document.getElementById('bkashNum').value.trim(),
    nagadNum:   document.getElementById('nagadNum').value.trim(),
  };
  await saveSettingsDB(data);
  updateSupportLinks();
  toast('Contacts saved! ✅');
}
window.saveContacts = saveContacts;

async function sendNotification() {
  const msg = document.getElementById('notifMsg').value.trim();
  if (!msg) return toast('মেসেজ দিন।');
  showLoading('পাঠানো হচ্ছে...');
  await addDoc(collection(db,'notifications'), {
    to: 'all', msg, time: serverTimestamp(), readBy: []
  });
  document.getElementById('notifMsg').value = '';
  hideLoading();
  toast('সবাইকে নোটিফিকেশন পাঠানো হয়েছে!');
}
window.sendNotification = sendNotification;

async function updateTicker() {
  const msg = document.getElementById('tickerMsg').value.trim();
  if (!msg) return toast('Notice text দিন।');
  await saveSettingsDB({ noticeTicker: msg });
  updateNoticeBar();
  document.getElementById('tickerMsg').value = '';
  toast('Ticker updated!');
}
window.updateTicker = updateTicker;

// ── Gift Codes ─────────────────────────────────────────
async function createGiftCode() {
  const code = document.getElementById('giftCodeInput').value.trim().toUpperCase();
  const amt  = parseFloat(document.getElementById('giftAmtInput').value);
  if (!code || !amt) return toast('Code এবং Amount দিন।');
  showLoading('Creating...');
  const exists = await getDocs(query(collection(db,'giftcodes'), where('code','==',code)));
  if (!exists.empty) { hideLoading(); return toast('এই কোড আগেই আছে!'); }
  await addDoc(collection(db,'giftcodes'), { code, amount: amt, used: false, createdAt: serverTimestamp() });
  document.getElementById('giftCodeInput').value = '';
  document.getElementById('giftAmtInput').value  = '';
  hideLoading();
  renderGiftCodes();
  toast('Gift code created! 🎁');
}
window.createGiftCode = createGiftCode;

async function renderGiftCodes() {
  const snap  = await getDocs(collection(db,'giftcodes'));
  const codes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  document.getElementById('giftCodeList').innerHTML = codes.length
    ? codes.map(c => `
      <div class="gift-code-item">
        <strong>${c.code}</strong>
        <span>৳${c.amount}</span>
        <span class="sub-status ${c.used?'sub-rejected':'sub-approved'}">${c.used?'Used':'Active'}</span>
        <button class="btn-sm-red" onclick="deleteGiftCode('${c.id}')">Delete</button>
      </div>`).join('')
    : '<p class="empty-msg">কোনো গিফট কোড নেই।</p>';
}

async function deleteGiftCode(id) {
  await deleteDoc(doc(db,'giftcodes',id));
  renderGiftCodes();
  toast('Deleted.');
}
window.deleteGiftCode = deleteGiftCode;

// ── Admin Withdrawals ──────────────────────────────────
async function renderAdminWithdrawals() {
  const snap = await getDocs(query(collection(db,'withdrawals'), orderBy('time','desc')));
  const wds  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  document.getElementById('adminWithdrawList').innerHTML = wds.length
    ? wds.map(w => `
      <div class="withdraw-row">
        <div><strong>${w.userName}</strong></div>
        <div class="sub-meta">৳${w.amount} via ${w.method} — ${w.number}</div>
        <div class="sub-meta">${w.time?.seconds ? new Date(w.time.seconds*1000).toLocaleString() : ''}</div>
        ${(w.status==='pending'||w.status==='pending-activation') ? `
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn-sm-green" onclick="approveWithdrawal('${w.id}','${w.userId}','${w.status}',${w.amount})">✅ Approve</button>
            <button class="btn-sm-red"   onclick="rejectWithdrawal('${w.id}','${w.userId}',${w.amount},'${w.status}')">❌ Reject</button>
          </div>`
          : `<span class="sub-status sub-${w.status==='approved'?'approved':'rejected'}">${w.status?.toUpperCase()}</span>`}
      </div>`).join('')
    : '<p class="empty-msg">কোনো রিকোয়েস্ট নেই।</p>';
}
window.renderAdminWithdrawals = renderAdminWithdrawals;

async function approveWithdrawal(wId, userId, status, amount) {
  showLoading('Processing...');
  await updateDoc(doc(db,'withdrawals',wId), { status:'approved' });
  if (status === 'pending-activation') {
    const snap = await getDoc(doc(db,'users',userId));
    const u    = snap.data();
    const s    = siteSettings;
    await updateDoc(doc(db,'users',userId), { active: true, balance: (u.balance||0) + s.activationBonus });
    if (u.referredBy) {
      const rSnap = await getDocs(query(collection(db,'users'), where('numericId','==', Number(u.referredBy))));
      if (!rSnap.empty) {
        const rDoc = rSnap.docs[0];
        await updateDoc(rDoc.ref, { balance: (rDoc.data().balance||0) + s.referralBonus });
      }
    }
    await addDoc(collection(db,'notifications'), {
      to: userId, msg: `✅ একাউন্ট একটিভ হয়েছে! +৳${s.activationBonus} বোনাস যোগ হয়েছে।`,
      time: serverTimestamp(), readBy: []
    });
    toast('Activation approved!');
  } else {
    await addDoc(collection(db,'notifications'), {
      to: userId, msg: `💰 ৳${amount} উইথড্র অনুমোদিত হয়েছে।`,
      time: serverTimestamp(), readBy: []
    });
    toast('Withdrawal approved!');
  }
  if (currentUser.uid === userId) { await loadUserData(userId); updateHeaderUI(); }
  hideLoading();
  renderAdminWithdrawals();
  renderAdminDashboard();
}
window.approveWithdrawal = approveWithdrawal;

async function rejectWithdrawal(wId, userId, amount, status) {
  showLoading('Rejecting...');
  await updateDoc(doc(db,'withdrawals',wId), { status:'rejected' });
  // Refund if normal withdrawal (not activation)
  if (status === 'pending') {
    const snap = await getDoc(doc(db,'users',userId));
    await updateDoc(doc(db,'users',userId), { balance: (snap.data().balance||0) + amount });
    if (currentUser.uid === userId) { await loadUserData(userId); updateHeaderUI(); }
  }
  await addDoc(collection(db,'notifications'), {
    to: userId, msg: status === 'pending'
      ? `❌ উইথড্র রিকোয়েস্ট বাতিল। ৳${amount} ফেরত দেওয়া হয়েছে।`
      : '❌ পেমেন্ট ভেরিফাই হয়নি। সঠিক ট্রানজেকশন আইডি দিয়ে আবার চেষ্টা করুন।',
    time: serverTimestamp(), readBy: []
  });
  hideLoading();
  renderAdminWithdrawals();
  toast('Rejected.');
}
window.rejectWithdrawal = rejectWithdrawal;

// expose doLogin, doRegister
window.doLogin    = doLogin;
window.doRegister = doRegister;
