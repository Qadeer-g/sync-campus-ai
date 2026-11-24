import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as G from '../lib/agent'
import * as A from '../lib/advisor'
import { demoSubjects, demoComplaints, demoAttendance, defaultNotificationPrefs } from '../lib/demo-data'
const { answer, answerIntent, detectLanguage, normalize, INTENT_IDS, ALL_SUGGESTIONS, ROUTES, MAX_INPUT_LENGTH } = G
let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log('PASS', name) }

const ctx = (over: Partial<G.AgentContext> = {}): G.AgentContext => ({ subjects: demoSubjects, complaints: demoComplaints, attendance: demoAttendance, theme: 'light', prefs: defaultNotificationPrefs, ...over })
const ask = (q: string, c = ctx(), pref: G.LangPref = 'auto', last: G.Lang = 'en') => answer(q, c, pref, last)
const intentOf = (q: string, c = ctx()) => ask(q, c).intent
const src = (f: string) => fs.readFileSync(require('path').join(__dirname, '..', f), 'utf-8')

/* ===== 1. The example questions from the brief, English ===== */
const EXAMPLES_EN: [string, string][] = [
  ['Where is the Complaint Center?', 'complaints.where'],
  ['How do I submit a complaint?', 'complaints.submit'],
  ['How do I mark attendance?', 'attendance.mark'],
  ['Which subjects are weak?', 'advisor.weak'],
  ['How do I change settings?', 'settings.how'],
]
t('brief example questions (English) route to the right intent and reply in English', () => {
  for (const [q, intent] of EXAMPLES_EN) { const r = ask(q); assert.equal(r.intent, intent, q); assert.equal(r.lang, 'en', q); assert.ok(r.text.length > 30) }
})
const EXAMPLES_UR: [string, string][] = [
  ['Complaint Center kahan hai?', 'complaints.where'],
  ['Shikayat kaise darj karun?', 'complaints.submit'],
  ['Attendance kaise lagaun?', 'attendance.mark'],
  ['Kaun se subjects kamzor hain?', 'advisor.weak'],
  ['Settings kaise change karun?', 'settings.how'],
  ['Mera attendance kaise mark karun?', 'attendance.mark'],
  ['Mujhe apna overall score batao', 'advisor.overall'],
  ['Dark mode kaise on karun?', 'settings.theme'],
  ['Demo data reset kaise karun?', 'settings.reset'],
]
t('the same questions in Roman Urdu route correctly and reply in Roman Urdu', () => {
  for (const [q, intent] of EXAMPLES_UR) { const r = ask(q); assert.equal(r.intent, intent, q); assert.equal(r.lang, 'ur', q) }
})
t('Roman Urdu replies really are Roman Urdu (differ from English, contain Urdu markers)', () => {
  for (const id of INTENT_IDS.filter((i) => !['lang_en', 'lang_ur'].includes(i))) {
    const en = answerIntent(id, ctx(), 'en')!, ur = answerIntent(id, ctx(), 'ur')!
    assert.notEqual(en.text, ur.text, id); assert.ok(/\b(hai|hain|mein|aur|ke|ki|ka|karein|dabayein|nahi|kholein|ho|se)\b/i.test(ur.text), `${id}: ${ur.text.slice(0, 60)}`)
  }
})

/* ===== 2. Language handling ===== */
t('language detection: English, Roman Urdu, mixed, unknown falls back to last language', () => {
  assert.equal(detectLanguage(normalize('where is the complaint center'), 'ur'), 'en'); assert.equal(detectLanguage(normalize('complaint kahan hai'), 'en'), 'ur')
  assert.equal(detectLanguage(normalize('my attendance kaise mark karun'), 'en'), 'ur'); assert.equal(detectLanguage(normalize('attendance'), 'ur'), 'ur'); assert.equal(detectLanguage(normalize('attendance'), 'en'), 'en')
  assert.equal(detectLanguage(normalize('qwerty'), 'ur'), 'ur')
})
t('a one-word follow-up keeps the language of the conversation', () => {
  assert.equal(ask('attendance', ctx(), 'auto', 'ur').lang, 'ur'); assert.equal(ask('attendance', ctx(), 'auto', 'en').lang, 'en')
})
t('switch commands: "Roman Urdu" / "urdu" -> ur, "English" -> en, replied in the NEW language, with setLanguage', () => {
  const u = ask('Roman Urdu'); assert.equal(u.intent, 'lang_ur'); assert.equal(u.setLanguage, 'ur'); assert.equal(u.lang, 'ur'); assert.match(u.text, /Roman Urdu mein/)
  const e = ask('english please', ctx(), 'auto', 'ur'); assert.equal(e.intent, 'lang_en'); assert.equal(e.setLanguage, 'en'); assert.equal(e.lang, 'en')
  assert.equal(ask('urdu mein complaint kahan hai').intent, 'complaints.where', 'a specific question beats the switch word')
})
t('sticky language preference overrides auto detection', () => {
  assert.equal(ask('Where is the Complaint Center?', ctx(), 'ur').lang, 'ur'); assert.equal(ask('Complaint Center kahan hai?', ctx(), 'en').lang, 'en')
})
t('Urdu-script input gets a polite Roman Urdu "only English / Roman Urdu" message, not a wrong answer', () => {
  const r = ask('شکایت کہاں ہے'); assert.equal(r.intent, 'fallback'); assert.equal(r.lang, 'ur'); assert.match(r.text, /Roman Urdu/)
})

/* ===== 3. Coverage of all five areas + conflicts ===== */
const ROUTING: [string, string][] = [
  ['Where is the dashboard?', 'dashboard.where'], ['give me my summary', 'dashboard.overview'], ['dashboard', 'dashboard.overview'],
  ['complaint', 'complaints.overview'], ['what does under review mean', 'complaints.statuses'], ['how do I move a complaint to the next status', 'complaints.move'],
  ['where can I submit a complaint', 'complaints.submit'], ['how do I submit my complaint', 'complaints.submit'], ['how do I track a complaint', 'complaints.status'],
  ['my complaints', 'complaints.status'], ['how many complaints do I have open', 'complaints.status'], ['what is my complaint status', 'complaints.status'],
  ['Meri complaint ka status kya hai?', 'complaints.status'], ['meri complaint ka status check karna hai', 'complaints.status'],
  ['I want to file a new complaint about the cafeteria', 'complaints.submit'],
  ['attendance', 'attendance.overview'], ['where is qr attendance', 'attendance.where'], ['how do I mark my attendance', 'attendance.mark'], ['how do I take attendance', 'attendance.mark'],
  ['how does the teacher start a QR session', 'attendance.teacher'], ['Teacher QR session kaise start karun?', 'attendance.teacher'], ['where do I get the session pin for attendance', 'attendance.teacher'],
  ['my attendance', 'attendance.my'], ['how many attendance records do I have', 'attendance.my'], ['mera attendance kitni hai', 'attendance.my'],
  ['qr code expired', 'attendance.problem'], ['camera not working for attendance', 'attendance.problem'], ['attendance already marked', 'attendance.problem'],
  ['where is academic advisor', 'advisor.where'], ['academic advisor', 'advisor.overview'], ['how do I enter marks', 'advisor.enter'], ['update my marks', 'advisor.enter'], ['how do I add a subject', 'advisor.enter'],
  ['what should I study first', 'advisor.plan'], ['give me study recommendations', 'advisor.plan'], ['what is my overall score', 'advisor.overall'], ["what's my gpa", 'advisor.overall'],
  ['how is my gpa calculated', 'advisor.rules'], ['how is a weak subject decided', 'advisor.rules'], ['which subject is my weakest', 'advisor.weak'],
  ['where are settings', 'settings.where'], ['settings', 'settings.overview'], ['how do I change the theme in settings', 'settings.theme'], ['switch to dark mode', 'settings.theme'],
  ['how do I change my name', 'settings.profile'], ['edit my email', 'settings.profile'], ['turn off notifications', 'settings.notifications'], ['reset demo data', 'settings.reset'],
  ['how do I log out', 'auth'], ['forgot password', 'auth'],
  ['hello', 'greeting'], ['salam', 'greeting'], ['assalam o alaikum', 'greeting'], ['thanks', 'thanks'], ['shukriya', 'thanks'], ['help', 'help'], ['what can you do', 'help'], ['Aap kya kar sakte hain?', 'help'],
  ['are you chatgpt?', 'about'], ['who are you', 'about'], ['what is your name', 'about'],
  ['how much are the fees', 'unsupported'], ['show me the campus map', 'unsupported'], ['where is the library', 'unsupported'], ['fees kitni hai', 'unsupported'],
]
t(`routing: ${ROUTING.length} varied questions all reach the intended intent`, () => {
  const wrong = ROUTING.filter(([q, intent]) => intentOf(q) !== intent).map(([q, intent]) => `${q} -> ${intentOf(q)} (wanted ${intent})`)
  assert.deepEqual(wrong, [])
})
t('typos in long keywords are tolerated (complant, attendnce, dashbord, sttings, recomendations)', () => {
  assert.equal(intentOf('complant kahan hai'), 'complaints.where'); assert.equal(intentOf('attendnce kaise lagaun'), 'attendance.mark'); assert.equal(intentOf('where is the dashbord'), 'dashboard.where')
  assert.equal(intentOf('where are sttings'), 'settings.where'); assert.equal(intentOf('study recomendations'), 'advisor.plan')
})
t('short words are NOT fuzzy-matched ("is there a way" must not become a theme/where question)', () => {
  assert.equal(intentOf('is there a way'), 'fallback'); assert.equal(intentOf('theirs'), 'fallback'); assert.equal(intentOf('there'), 'fallback')
})
t('case, punctuation, extra spaces and apostrophes do not matter', () => {
  for (const q of ['WHERE IS THE COMPLAINT CENTER???', '  where   is the complaint-center ! ', "where's the complaint center", 'Where is the Complaint Center?!?!']) assert.equal(intentOf(q), 'complaints.where', q)
})

/* ===== 4. Data-driven answers ===== */
t('weak subjects come from the real marks (Subject 3 44%, Subject 2 52%), weakest first', () => {
  const r = ask('Which subjects are weak?'); assert.match(r.text, /Subject 3 \(44%\), Subject 2 \(52%\)/); assert.match(r.text, /weakest is Subject 3/); assert.match(r.text, /60% target/)
  assert.deepEqual(A.analyse(demoSubjects).weak.map((w) => w.name), ['Subject 3', 'Subject 2'])
})
t('weak-subject answer follows edited marks, and says so when none are weak or none exist', () => {
  const edited = demoSubjects.map((s) => (s.name === 'Subject 3' ? { ...s, obtained: 70 } : s)); assert.match(ask('which subjects are weak', ctx({ subjects: edited })).text, /Subject 2 \(52%\)/); assert.ok(!/Subject 3 \(/.test(ask('which subjects are weak', ctx({ subjects: edited })).text))
  const none = demoSubjects.map((s) => ({ ...s, obtained: s.total * 0.9 })); assert.match(ask('which subjects are weak', ctx({ subjects: none })).text, /None of your subjects is below the 60% target\. Your lowest is Subject \d at 90%/)
  assert.match(ask('which subjects are weak', ctx({ subjects: [] })).text, /No subjects have been added/)
})
t('overall score / GPA match the Advisor exactly (66.5%, 366 of 550, GPA 2.50) and call GPA a demo scale', () => {
  const a = A.analyse(demoSubjects); const r = ask('what is my overall score'); assert.match(r.text, new RegExp(`${a.overallPct}% \\(${a.totalObtained} of ${a.totalMarks} marks\\)`)); assert.match(r.text, /2\.50/); assert.match(r.text, /demo 4\.0 scale/); assert.match(r.text, /not an official SSUET GPA/)
  assert.match(ask('mera overall score kya hai', ctx()).text, /66\.5%/); assert.match(ask('what is my gpa', ctx({ subjects: [] })).text, /No marks have been entered/)
})
t('study plan uses the real recommendations (order, priority, hours)', () => {
  const recs = A.recommend(demoSubjects); const r = ask('what should I study first')
  assert.ok(r.text.includes(`${recs[0].subject.name} (${recs[0].priority}, ${recs[0].hoursPerWeek} h/week)`)); assert.ok(r.text.includes(recs[0].reason)); assert.ok(r.text.includes(`about ${recs.reduce((x, y) => x + y.hoursPerWeek, 0)} h/week`))
})
t('rules answer quotes the Advisor constants (no drift): 60%, 0.75, 0.06, 1-12 h', () => {
  const r = ask('how is a weak subject decided').text; assert.ok(r.includes(`${A.WEAK_THRESHOLD}%`) && r.includes(String(A.HOURS_BASE)) && r.includes(String(A.HOURS_PER_POINT)) && r.includes(`${A.MIN_HOURS} and ${A.MAX_HOURS} h`))
})
t('complaint counts come from the real data; ticket lookup finds, reports unread, and handles unknown IDs', () => {
  const r = ask('how many complaints do I have'); assert.match(r.text, /You have 4 complaints: 1 Submitted, 2 Under Review, 1 Resolved/); assert.match(r.text, /Newest: DEMO-0157/); assert.match(r.text, /1 complaint has unread updates/)
  const found = demoComplaints.find((c) => c.ticketId === 'DEMO-0141')!; const tk = ask('what is the status of DEMO-0141?')
  assert.equal(tk.intent, 'complaints.status'); assert.ok(tk.text.includes(`"${found.title}"`) && tk.text.includes(found.status) && tk.text.includes(found.location) && /1 unread update/.test(tk.text)); assert.equal(tk.actions[0].href, '/complaints/DEMO-0141')
  assert.equal(ask('demo 0141 status').intent, 'complaints.status'); assert.equal(ask('DEMO-0141').intent, 'complaints.status')
  assert.match(ask('status of DEMO-9999').text, /couldn't find ticket DEMO-9999/); assert.match(ask('my complaints', ctx({ complaints: [] })).text, /no complaints yet/)
})
t('attendance count/latest come from the real records; empty state handled', () => {
  const latest = [...demoAttendance].sort((a, b) => Date.parse(b.markedAt) - Date.parse(a.markedAt))[0]
  const r = ask('how many attendance records do I have'); assert.match(r.text, new RegExp(`${demoAttendance.length} attendance records`)); assert.ok(r.text.includes(latest.subjectName))
  assert.match(ask('my attendance', ctx({ attendance: [] })).text, /no attendance records yet/)
})
t('dashboard summary combines marks, complaints and attendance; copes with no subjects', () => {
  const r = ask('give me my summary').text; assert.match(r, /66\.5%/); assert.match(r, /2 weak subjects/); assert.match(r, /3 open out of 4/); assert.match(r, /3 check-ins/)
  assert.match(ask('my summary', ctx({ subjects: [] })).text, /no subjects entered yet/)
})
t('settings answers reflect the current theme and notification preferences', () => {
  assert.match(ask('what theme am I using', ctx({ theme: 'dark' })).text, /currently Dark/); assert.match(ask('how do I change the theme', ctx({ theme: 'system' })).text, /currently System/)
  const r = ask('notifications', ctx({ prefs: { ...defaultNotificationPrefs, complaintUpdates: false, advisorTips: true, attendanceAlerts: true } })).text; assert.match(r, /complaint updates \(off\)/); assert.match(r, /attendance alerts \(on\)/); assert.match(r, /advisor alerts \(on\)/)
})

/* ===== 5. Navigation ===== */
t('explicit commands navigate; plain questions only offer buttons', () => {
  assert.equal(ask('open settings').navigate, '/settings'); assert.equal(ask('take me to the complaint center').navigate, '/complaints'); assert.equal(ask('go to dashboard').navigate, '/dashboard')
  assert.equal(ask('settings kholo').navigate, '/settings'); assert.equal(ask('Complaint Center kholo').navigate, '/complaints'); assert.equal(ask('open academic advisor').navigate, '/advisor')
  for (const q of ['Where is the Complaint Center?', 'where are settings', 'How do I submit a complaint?', 'Complaint Center kahan hai?', 'which subjects are weak', 'how do I open the settings page']) assert.equal(ask(q).navigate, undefined, q)
})
t('"show me" data questions never navigate away', () => { assert.equal(ask('show me which subjects are weak').navigate, undefined); assert.equal(ask('show me my complaints').navigate, undefined) })

/* ===== 6. Suggestion chips all work ===== */
t(`every suggestion chip (${ALL_SUGGESTIONS.length}) is understood and answered in its own language`, () => {
  for (const chip of ALL_SUGGESTIONS) { const r = ask(chip, ctx()); assert.notEqual(r.intent, 'fallback', chip) }
  for (const chip of Object.values((G as any).__never ?? {})) void chip
  const en = ALL_SUGGESTIONS.slice(0, ALL_SUGGESTIONS.length / 2), ur = ALL_SUGGESTIONS.slice(ALL_SUGGESTIONS.length / 2)
  for (const c of en) assert.equal(ask(c).lang, 'en', c); for (const c of ur) assert.equal(ask(c).lang, 'ur', c)
})
t('every reply offers follow-up chips in the reply language, and each of those chips works too', () => {
  for (const q of ['hello', 'where is the dashboard', 'Complaint Center kahan hai?', 'asdfgh', 'which subjects are weak']) {
    const r = ask(q); assert.ok(r.suggestions.length >= 2, q); for (const s of r.suggestions) { const rr = ask(s); assert.notEqual(rr.intent, 'fallback', s); assert.equal(rr.lang, r.lang, s) }
  }
})

/* ===== 7. Every intent x language x data state builds clean text ===== */
t('all intents build in both languages for empty, demo and extreme data: no undefined / NaN / [object / blank', () => {
  const states = [ctx({ subjects: [], complaints: [], attendance: [] }), ctx(), ctx({ subjects: demoSubjects.map((s) => ({ ...s, obtained: 0 })) }), ctx({ subjects: demoSubjects.map((s) => ({ ...s, obtained: s.total })) }), ctx({ theme: 'dark', prefs: { ...defaultNotificationPrefs, complaintUpdates: false } })]
  for (const st of states) for (const id of INTENT_IDS) for (const lang of ['en', 'ur'] as const) {
    const r = answerIntent(id, st, lang, id === 'complaints.status' ? 'DEMO-0141' : null)!
    assert.ok(r.text.trim().length > 20, `${id}/${lang}`); assert.ok(!/undefined|NaN|\[object|null\b/.test(r.text), `${id}/${lang}: ${r.text}`); assert.ok(r.suggestions.length >= 1, id)
  }
})
t('all action links go to real routes; labels are non-empty; ticket links look like /complaints/DEMO-xxxx', () => {
  const known = new Set<string>(Object.values(ROUTES)); const pages = ['dashboard', 'advisor', 'advisor/marks', 'advisor/recommendations', 'complaints', 'complaints/new', 'attendance/student', 'attendance/teacher', 'settings']
  for (const st of [ctx(), ctx({ subjects: [], complaints: [], attendance: [] })]) for (const id of INTENT_IDS) for (const lang of ['en', 'ur'] as const) for (const a of answerIntent(id, st, lang, 'DEMO-0141')!.actions) {
    assert.ok(a.label.length > 3, a.label); const base = a.href.split('#')[0]; assert.ok(known.has(a.href) || /^\/complaints\/DEMO-\d{4}$/.test(a.href), a.href); assert.ok(pages.includes(base.slice(1)) || /^\/complaints\/DEMO-\d{4}$/.test(base), base)
  }
})
t('route targets exist as real page files (no dead links)', () => {
  const files: Record<string, string> = { '/dashboard': 'app/(portal)/dashboard/page.tsx', '/advisor': 'app/(portal)/advisor/page.tsx', '/advisor/marks': 'app/(portal)/advisor/marks/page.tsx', '/advisor/recommendations': 'app/(portal)/advisor/recommendations/page.tsx',
    '/complaints': 'app/(portal)/complaints/page.tsx', '/complaints/new': 'app/(portal)/complaints/new/page.tsx', '/attendance/student': 'app/(portal)/attendance/student/page.tsx', '/attendance/teacher': 'app/(portal)/attendance/teacher/page.tsx', '/settings': 'app/(portal)/settings/page.tsx' }
  for (const href of Object.values(ROUTES)) assert.ok(fs.existsSync(require('path').join(__dirname, '..', files[href.split('#')[0]])), href)
  const settings = src('components/settings/profile-form.tsx') + src('components/settings/preferences-card.tsx') + src('components/settings/demo-data-card.tsx')
  for (const anchor of ['profile', 'preferences', 'demo-data']) assert.ok(settings.includes(`id="${anchor}"`), `#${anchor}`)
})

/* ===== 8. The labels the agent quotes really exist in the UI ===== */
t('every button / tab name quoted in the agent exists in the source (no label drift)', () => {
  const ui = ['components/complaints/complaints-nav.tsx', 'components/complaints/complaint-form.tsx', 'components/complaints/complaint-detail.tsx', 'components/advisor/advisor-nav.tsx', 'components/advisor/marks-entry.tsx', 'components/attendance/attendance-nav.tsx',
    'components/attendance/teacher-session.tsx', 'components/attendance/student-checkin.tsx', 'components/attendance/qr-scanner.tsx', 'components/settings/profile-form.tsx', 'components/settings/preferences-card.tsx', 'components/settings/demo-data-card.tsx',
    'components/shell/sidebar.tsx', 'components/shell/header.tsx', 'components/public/login-form.tsx', 'components/public/demo-fill.tsx', 'components/dashboard/dashboard-view.tsx', 'components/shell/nav-config.ts'].map(src).join('\n')
  const quoted = ['New Complaint', 'My Complaints', 'Submit complaint', 'Complaint title', 'Detailed description', 'Move to next status', 'Performance Overview', 'Marks Entry', 'Study Recommendations', 'Add subject', 'Save changes', 'Subject records', 'Subject name', 'Credit hours', 'Obtained marks', 'Total marks',
    'Student check-in', 'Teacher QR session', 'Generate QR code', 'Regenerate QR', 'Reset session', 'Scan QR code with camera', 'Mark attendance', 'Demo Fill Data', 'Log in', 'Log out', 'Reset Demo Data', 'Complaint Center', 'Academic Advisor', 'Settings', 'Dashboard', 'Preferences', 'Profile', 'Demo data', 'QR Attendance']
  for (const label of quoted) assert.ok(ui.includes(label), `label not found in UI source: ${label}`)
  const agentSrc = src('lib/agent.ts'); for (const label of quoted) assert.ok(agentSrc.includes(label), `agent never mentions: ${label}`)
})
t('the validation limits the agent quotes match the form (title >= 5, description >= 20 characters)', () => {
  const form = src('components/complaints/complaint-form.tsx'); assert.ok(form.includes('title.trim().length < 5') && form.includes('description.trim().length < 20'))
  assert.match(ask('how do I submit a complaint').text, /at least 5 characters/); assert.match(ask('how do I submit a complaint').text, /at least 20 characters/)
})
t('expiry options quoted (1, 2, 3, 5 or 10 minutes) match QR_DURATIONS', async () => { const d = await import('../lib/demo-data'); assert.deepEqual([...d.QR_DURATIONS], [1, 2, 3, 5, 10]); assert.match(ask('how does the teacher start a QR session').text, /1, 2, 3, 5 or 10 minutes/) })

/* ===== 9. Honesty / safety ===== */
t('never claims to be a real AI; says it is local, rule-based and not connected to an external model / SSUET / server', () => {
  for (const q of ['are you chatgpt?', 'who are you', 'what are you', 'kya aap ai hain', 'Aap kaun hain?']) { const r = ask(q); assert.equal(r.intent, 'about', q); assert.ok(/rule-based/.test(r.text)); assert.ok(/(not connected|connected nahi)/.test(r.text)) }
  for (const id of INTENT_IDS) for (const lang of ['en', 'ur'] as const) assert.ok(!/\b(openai|chatgpt|gpt-?\d|large language model|i am an ai|i'm an ai)\b/i.test(answerIntent(id, ctx(), lang)!.text.replace(/not connected to any external AI model/g, '')), id)
})
t('never reveals a session code or PIN (no 6-digit numbers / session codes in any reply)', () => {
  for (const q of ['what is the pin', 'what is the session code for attendance', 'give me the attendance pin', 'where do I get the session pin for attendance', 'qr code expired']) assert.ok(!/\b\d{6}\b/.test(ask(q).text), q)
  for (const id of INTENT_IDS) for (const lang of ['en', 'ur'] as const) assert.ok(!/\b\d{6}\b/.test(answerIntent(id, ctx(), lang)!.text), id)
  assert.match(ask('where do I get the session pin for attendance').text, /PIN is shown only on this teacher screen/)
})
t('fees / campus navigation are politely declined as out of scope (both removed from the project)', () => {
  for (const q of ['how much are the fees', 'fees kitni hai', 'show me the campus map', 'campus navigation', 'where is the library']) { const r = ask(q); assert.equal(r.intent, 'unsupported', q); assert.match(r.text, /(isn't part of this demo|demo ka hissa nahi)/) }
})
t('no reply promises real-world effects (emails, SSUET submission, push messages)', () => {
  for (const id of INTENT_IDS) { const txt = answerIntent(id, ctx(), 'en')!.text; assert.ok(!/will be (sent|emailed)|we will contact|has been sent to SSUET|submitted to SSUET\b(?!\.)/i.test(txt.replace(/not submitted to SSUET/gi, '').replace(/nothing is sent to SSUET/gi, '')), `${id}: ${txt}`) }
})

/* ===== 10. Robustness ===== */
t('empty / whitespace / symbols / emoji / gibberish -> helpful fallback with chips, never a crash', () => {
  for (const q of ['', '   ', '???', '!!!', '😀😀', '12345', 'asdfghjkl', 'lorem ipsum dolor sit amet', "'; DROP TABLE users; --", '${7*7}', '{{constructor}}', '\n\n\t']) {
    const r = ask(q); assert.equal(r.intent, 'fallback', JSON.stringify(q)); assert.ok(r.text.length > 20 && r.suggestions.length >= 2); assert.equal(r.navigate, undefined)
  }
})
t('very long input is truncated safely and still understood if the question is at the start', () => {
  const long = 'where is the complaint center ' + 'blah '.repeat(5000); assert.equal(ask(long).intent, 'complaints.where'); assert.equal(normalize('x'.repeat(10_000)).length, MAX_INPUT_LENGTH)
  assert.equal(ask('blah '.repeat(5000) + ' where is the complaint center').intent, 'fallback', 'beyond the length cap is ignored')
})
t('injection-style input never crashes and is never echoed back into the reply', () => {
  for (const q of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', 'javascript:alert(1)', '" onmouseover="x', '${process.env.SECRET}', '{{7*7}}']) {
    const r = ask(q); assert.ok(r.text.length > 20); assert.ok(!r.text.includes('<') || !/<(script|img)/i.test(r.text), q); assert.ok(!r.text.includes('process.env') && !r.text.includes('onerror'), q); assert.equal(r.navigate, undefined)
  }
})
t('prototype-pollution style words and odd characters are harmless', () => { for (const q of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', '[object Object]']) assert.equal(ask(q).intent, 'fallback', q) })
t('answer() is pure: same input, same output; it does not mutate the context', () => {
  const c = ctx(); const snap = JSON.stringify(c); const a = ask('which subjects are weak', c), b = ask('which subjects are weak', c)
  assert.deepEqual(a, b); assert.equal(JSON.stringify(c), snap)
})
t('600 random mixed-language questions never throw and always return text + chips', () => {
  const words = ['where', 'kahan', 'complaint', 'attendance', 'marks', 'weak', 'kamzor', 'settings', 'kaise', 'how', 'my', 'mera', 'the', 'status', 'hai', 'open', 'reset', 'demo', 'data', 'qr', 'pin', 'theme', 'dark', 'gpa', 'fees', 'hello', 'DEMO-0141', '???', 'x', 'یہ']
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
  for (let i = 0; i < 600; i++) { const q = Array.from({ length: 1 + Math.floor(rnd() * 7) }, () => words[Math.floor(rnd() * words.length)]).join(' '); const r = ask(q); assert.ok(typeof r.text === 'string' && r.text.length > 10, q); assert.ok(r.suggestions.length >= 1, q); assert.ok(!/undefined|NaN/.test(r.text), q) }
})
console.log(`\n${n} checks passed`)
