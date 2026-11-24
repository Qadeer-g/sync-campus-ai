import { analyse, HOURS_BASE, HOURS_PER_POINT, MAX_HOURS, MIN_HOURS, recommend, WEAK_THRESHOLD } from './advisor'
import { formatDate } from './format'
import type { AttendanceRecord, Complaint, NotificationPrefs, Subject, ThemePreference } from './types'

/* ----------------------------------------------------------------------------------------------
 * AI Campus Agent: a LOCAL, RULE-BASED assistant. There is no AI model, no network call and no
 * server. A question is normalised, matched against keyword rules (English + Roman Urdu) and
 * answered from predefined text plus the demo data stored in this browser.
 *
 * Matching: every intent lists "groups" of words. A group matches if ANY of its words/phrases
 * appears; an intent matches if ALL its groups match. The matching intent with the highest score
 * wins (default score = number of groups, so more specific questions beat general ones); on a
 * tie the one that matched more keywords wins, then the one declared first. Typo tolerance (1 edit) is applied only to words of 7+
 * letters, so short everyday words cannot be confused with each other.
 * -------------------------------------------------------------------------------------------- */

export type Lang = 'en' | 'ur'
export type LangPref = 'auto' | Lang
export type AgentAction = { label: string; href: string }

export type AgentContext = {
  subjects: Subject[]
  complaints: Complaint[]
  attendance: AttendanceRecord[]
  theme: ThemePreference
  prefs: NotificationPrefs
}

export type AgentReply = {
  intent: string
  lang: Lang
  text: string
  actions: AgentAction[]
  suggestions: string[]
  /** Set only for explicit "open / take me to ..." commands; the UI then navigates here. */
  navigate?: string
  /** Set when the user asked to switch the reply language. */
  setLanguage?: LangPref
}

export const MAX_INPUT_LENGTH = 300

/* ------------------------------------ text normalisation ------------------------------------ */

export function normalize(text: string): string {
  return text
    .slice(0, MAX_INPUT_LENGTH)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const hasUrduScript = (text: string) => /[\u0600-\u06ff]/.test(text)
const TICKET_RE = /demo[\s-]?(\d{4})/i

/* ------------------------------------ language detection ------------------------------------ */

const UR_WORDS = new Set(
  `kahan kahaan kidhar kaise kese kaisay kya kyun kyu kon kaun konsa konsi konse mujhe mujhay mera meri mere hai hain hoon hun hota hoti hote hua hui hue
   karun karon karna karni karein karen karo karta karti sakta sakti sakte chahiye chahta chahti batao batayein bataein bataye dikhao dikhaiye khol kholo
   shikayat shikayet shikayaat hazri haazri kamzor kamzoor nambar naye naya nayi wala wali wale ka ki ke ko se mein mai aur ya nahi nahin abhi theek
   shukriya shukria mehrbani salam aoa madad kitne kitna kitni tarika tareeka tariqa bhej bhejna bhejni bhejun darj likhna likhni dalna daalna badalna
   badlo tabdeel jao chalo dena dein ap aap tum tumhara apka aapka apni apna apne yeh ye woh wo iss us usko isko sab kuch kuchh phir lekin magar bhi
   sirf bohat bahut zyada kam jaldi masla maslay padhai parhun padhun parhna padhna lagana lagani lagao lagaun lagayein lagayen urdu`.split(/\s+/),
)
const EN_WORDS = new Set(
  `the is are was be am i my me you your we it a an of in on for to and or with what whats where how which who when why can could do does did should would
   please show tell open go help need want about from this that these those there here have has any all some`.split(/\s+/),
)

export function detectLanguage(norm: string, fallback: Lang): Lang {
  const tokens = norm.split(' ').filter(Boolean)
  const ur = tokens.filter((t) => UR_WORDS.has(t)).length
  const en = tokens.filter((t) => EN_WORDS.has(t)).length
  if (ur === 0 && en === 0) return fallback
  if (ur > en) return 'ur'
  if (en > ur) return 'en'
  return fallback
}

/* --------------------------------------- term matching -------------------------------------- */

function withinOneEdit(a: string, b: string) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1)
  const [longer, shorter] = a.length > b.length ? [a, b] : [b, a]
  return longer.slice(i + 1) === shorter.slice(i)
}

function hasTerm(norm: string, tokens: string[], term: string) {
  if (term.includes(' ')) return ` ${norm} `.includes(` ${term} `)
  if (tokens.includes(term)) return true
  return term.length >= 7 && tokens.some((t) => t.length >= 7 && withinOneEdit(t, term))
}

/* ------------------------------------------ routes ------------------------------------------ */

export const ROUTES = {
  dashboard: '/dashboard',
  advisor: '/advisor',
  marks: '/advisor/marks',
  recommendations: '/advisor/recommendations',
  complaints: '/complaints',
  newComplaint: '/complaints/new',
  attendanceStudent: '/attendance/student',
  attendanceTeacher: '/attendance/teacher',
  settings: '/settings',
  settingsProfile: '/settings#profile',
  settingsPreferences: '/settings#preferences',
  settingsDemoData: '/settings#demo-data',
} as const

/* ------------------------------------------ intents ----------------------------------------- */

type Build = (c: B) => Omit<AgentReply, 'intent' | 'lang'>
type B = { ctx: AgentContext; lang: Lang; norm: string; ticket: string | null; t: (en: string, ur: string) => string }
type IntentDef = { id: string; all: string[][]; score?: number; build: Build }

const WHERE = ['where', 'wheres', 'kahan', 'kahaan', 'kidhar', 'find', 'locate', 'open', 'go to', 'goto', 'take me', 'navigate', 'kholo', 'khol', 'jao', 'le chalo', 'le jao', 'dikhao', 'link', 'page', 'show me', 'access']
const C_TERMS = ['complaint', 'complaints', 'complain', 'complaining', 'ticket', 'tickets', 'shikayat', 'shikayet', 'shikayaat', 'shikayatein', 'grievance']
const A_TERMS = ['attendance', 'attendence', 'hazri', 'haazri', 'qr', 'check in', 'checkin', 'roll call']
const AD_TERMS = ['subject', 'subjects', 'marks', 'advisor', 'academic', 'grade', 'grades', 'result', 'results', 'gpa', 'cgpa', 'study', 'padhai']
const S_TERMS = ['settings', 'setting', 'preferences', 'preference']

const NAV_COMMAND = ['open', 'go to', 'goto', 'take me', 'navigate to', 'show me', 'kholo', 'khol do', 'khol dein', 'jao', 'le chalo', 'le jao', 'dikhao']
const QUESTION_WORDS = ['where', 'how', 'kahan', 'kahaan', 'kidhar', 'kaise', 'kese', 'kaisay', 'what', 'which', 'kya']

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
const onOff = (v: boolean, _lang: Lang) => (v ? 'on' : 'off')
const themeName = (t: ThemePreference) => (t === 'dark' ? 'Dark' : t === 'light' ? 'Light' : 'System')

const TOPICS = 'Dashboard, Academic Advisor, Complaint Center, QR Attendance and Settings'
const TOPICS_UR = 'Dashboard, Academic Advisor, Complaint Center, QR Attendance aur Settings'

const SUGGEST = {
  en: {
    complaintWhere: 'Where is the Complaint Center?',
    submit: 'How do I submit a complaint?',
    mark: 'How do I mark attendance?',
    weak: 'Which subjects are weak?',
    settings: 'How do I change settings?',
    overall: 'What is my overall score?',
    plan: 'What should I study first?',
    status: 'What is my complaint status?',
    attMy: 'How many attendance records do I have?',
    teacher: 'How does the teacher start a QR session?',
    theme: 'How do I switch to dark mode?',
    reset: 'How do I reset demo data?',
    help: 'What can you do?',
    summary: 'Give me my summary',
  },
  ur: {
    complaintWhere: 'Complaint Center kahan hai?',
    submit: 'Shikayat kaise darj karun?',
    mark: 'Attendance kaise lagaun?',
    weak: 'Kaun se subjects kamzor hain?',
    settings: 'Settings kaise change karun?',
    overall: 'Mera overall score kya hai?',
    plan: 'Mujhe pehle kya parhna chahiye?',
    status: 'Meri complaint ka status kya hai?',
    attMy: 'Mere attendance records kitne hain?',
    teacher: 'Teacher QR session kaise start karun?',
    theme: 'Dark mode kaise on karun?',
    reset: 'Demo data reset kaise karun?',
    help: 'Aap kya kar sakte hain?',
    summary: 'Mera summary batao',
  },
} as const
export const ALL_SUGGESTIONS = [...Object.values(SUGGEST.en), ...Object.values(SUGGEST.ur)]
const sg = (c: B, ...keys: (keyof typeof SUGGEST.en)[]) => keys.map((k) => SUGGEST[c.lang][k])

const intents: IntentDef[] = [
  /* ---------- language switches ---------- */
  {
    id: 'lang_ur',
    all: [['roman urdu', 'romanurdu', 'urdu']],
    build: (c) => ({ text: 'Theek hai, ab jawab Roman Urdu mein milenge. (English mein wapas jane ke liye "English" likhein.)', actions: [], suggestions: sg({ ...c, lang: 'ur' }, 'help', 'complaintWhere', 'weak'), setLanguage: 'ur' }),
  },
  {
    id: 'lang_en',
    all: [['english', 'inglish', 'angrezi']],
    build: (c) => ({ text: 'Sure, I will reply in English from now on. (Write "Roman Urdu" to switch back.)', actions: [], suggestions: sg({ ...c, lang: 'en' }, 'help', 'complaintWhere', 'weak'), setLanguage: 'en' }),
  },

  /* ---------- about / help / chit-chat ---------- */
  {
    id: 'about',
    all: [['chatgpt', 'gpt', 'openai', 'claude', 'gemini', 'llm', 'real ai', 'external ai', 'ai model', 'are you ai', 'are you a bot', 'are you real', 'artificial', 'who are you', 'what are you', 'your name', 'aap kaun', 'tum kaun', 'apka naam', 'aapka naam', 'tumhara naam', 'kya aap ai', 'kya tum ai']],
    score: 3,
    build: (c) => ({
      text: c.t(
        "I'm a local, rule-based assistant built into this demo. I match your question to a topic and answer from predefined responses and the demo data stored in this browser. I'm not connected to any external AI model, to SSUET, or to any server, so I can only help with this portal: " + TOPICS + '.',
        "Main is demo mein bana hua local, rule-based assistant hoon. Main aapke sawal ko ek topic se match karke predefined jawab aur is browser mein mojood demo data se jawab deta hoon. Main kisi external AI model, SSUET ya kisi server se connected nahi hoon, is liye sirf is portal mein madad kar sakta hoon: " + TOPICS_UR + '.',
      ),
      actions: [],
      suggestions: sg(c, 'help', 'complaintWhere', 'weak'),
    }),
  },
  {
    id: 'help',
    all: [['help', 'what can you do', 'what do you do', 'madad', 'kya kar sakte', 'kya kar sakta', 'options', 'topics', 'features', 'menu', 'commands']],
    build: (c) => ({
      text: c.t(
        'I can help with five areas of this demo portal:\n• Dashboard: your summary.\n• Academic Advisor: marks, weak subjects, study plan.\n• Complaint Center: submit and track demo complaints.\n• QR Attendance: student check-in and the teacher QR session.\n• Settings: profile, theme, notifications, reset demo data.\nAsk in English or Roman Urdu, for example "Where is the Complaint Center?" or "Which subjects are weak?".',
        'Main is demo portal ke paanch hisson mein madad kar sakta hoon:\n• Dashboard: aapka summary.\n• Academic Advisor: marks, kamzor subjects, study plan.\n• Complaint Center: demo shikayat darj karna aur track karna.\n• QR Attendance: student check-in aur teacher QR session.\n• Settings: profile, theme, notifications, demo data reset.\nEnglish ya Roman Urdu mein poochein, jaise "Complaint Center kahan hai?" ya "Kaun se subjects kamzor hain?".',
      ),
      actions: [],
      suggestions: sg(c, 'complaintWhere', 'weak', 'mark'),
    }),
  },
  {
    id: 'unsupported',
    all: [['fee', 'fees', 'challan', 'tuition', 'scholarship', 'hostel', 'transport', 'bus', 'library', 'map', 'directions', 'route', 'building', 'canteen', 'campus map', 'campus navigation', 'navigate campus']],
    build: (c) => ({
      text: c.t(
        "That isn't part of this demo. This prototype has no fees or campus-navigation features and uses no real SSUET data. I can help with " + TOPICS + '.',
        'Yeh cheez is demo ka hissa nahi hai. Is prototype mein fees ya campus navigation nahi hai aur koi asli SSUET data istemal nahi hota. Main in mein madad kar sakta hoon: ' + TOPICS_UR + '.',
      ),
      actions: [],
      suggestions: sg(c, 'help', 'complaintWhere', 'mark'),
    }),
  },
  {
    id: 'auth',
    all: [['logout', 'log out', 'sign out', 'login', 'log in', 'sign in', 'password', 'forgot password']],
    score: 2,
    build: (c) => ({
      text: c.t(
        'Login is simulated and local: no real SSUET account is used. On the Login page, click "Demo Fill Data" to fill in demo details, then click "Log in". To sign out, use "Log out" at the bottom of the left sidebar or in the menu at the top right. Your demo data stays saved in this browser.',
        'Login simulated aur local hai: koi asli SSUET account istemal nahi hota. Login page par "Demo Fill Data" dabayein taake demo details bhar jayein, phir "Log in" dabayein. Sign out ke liye left sidebar ke neeche ya upar right ke menu mein "Log out" dabayein. Aapka demo data is browser mein save rehta hai.',
      ),
      actions: [],
      suggestions: sg(c, 'help', 'summary', 'settings'),
    }),
  },

  /* ---------- Complaint Center ---------- */
  {
    id: 'complaints.statuses',
    all: [['under review', 'resolved', 'submitted', 'stages', 'stage', 'statuses'], ['mean', 'means', 'meaning', 'matlab', 'explain', 'difference']],
    build: (c) => ({
      text: c.t(
        'A demo complaint moves through three statuses: Submitted (it was created), Under Review (it is being looked at) and Resolved (it is finished). Every change adds a dated entry to the ticket\'s status history.',
        'Demo complaint teen statuses se guzarti hai: Submitted (darj ho gayi), Under Review (jaiza liya ja raha hai) aur Resolved (mukammal). Har tabdeeli ticket ki status history mein tareekh ke sath add hoti hai.',
      ),
      actions: [{ label: 'Open Complaint Center', href: ROUTES.complaints }],
      suggestions: sg(c, 'status', 'submit'),
    }),
  },
  {
    id: 'complaints.move',
    all: [C_TERMS, ['next status', 'move', 'advance', 'change status', 'resolve', 'status badlo', 'status change']],
    build: (c) => ({
      text: c.t(
        'Open a complaint from "My Complaints". On its detail page, the demo-only "Move to next status" button moves it Submitted → Under Review → Resolved and adds a history entry. It only demonstrates the flow: no university office is involved.',
        '"My Complaints" se complaint kholein. Uske detail page par demo-only "Move to next status" button usay Submitted → Under Review → Resolved tak le jata hai aur history entry add karta hai. Yeh sirf flow dikhane ke liye hai: koi university office shamil nahi.',
      ),
      actions: [{ label: 'Open Complaint Center', href: ROUTES.complaints }],
      suggestions: sg(c, 'status', 'submit'),
    }),
  },
  {
    id: 'complaints.status',
    all: [C_TERMS, ['my', 'mera', 'meri', 'mere', 'how many', 'kitni', 'kitne', 'open', 'pending', 'status', 'track', 'update', 'updates', 'progress', 'latest', 'check', 'dekho', 'dekhna', 'kya hua']],
    build: (c) => {
      const list = c.ctx.complaints
      const actions: AgentAction[] = [{ label: 'Open Complaint Center', href: ROUTES.complaints }]
      if (c.ticket) {
        const found = list.find((x) => x.ticketId.toLowerCase() === c.ticket!.toLowerCase())
        if (!found) {
          return {
            text: c.t(`I couldn't find ticket ${c.ticket} in this browser's demo data. Check the ID in "My Complaints".`, `Mujhe is browser ke demo data mein ticket ${c.ticket} nahi mila. "My Complaints" mein ID check karein.`),
            actions,
            suggestions: sg(c, 'status', 'submit'),
          }
        }
        const unread = found.unreadCount > 0 ? c.t(` It has ${found.unreadCount} unread ${plural(found.unreadCount, 'update', 'updates')}.`, ` Is mein ${found.unreadCount} unread update(s) hain.`) : ''
        return {
          text: c.t(
            `${found.ticketId}: "${found.title}"${found.location ? ` (${found.location})` : ''} is ${found.status}. Last updated ${formatDate(found.updatedAt)}.${unread}`,
            `${found.ticketId}: "${found.title}"${found.location ? ` (${found.location})` : ''} ki halat: ${found.status}. Aakhri update ${formatDate(found.updatedAt)}.${unread}`,
          ),
          actions: [{ label: `Open ${found.ticketId}`, href: `/complaints/${found.ticketId}` }, ...actions],
          suggestions: sg(c, 'status', 'submit'),
        }
      }
      if (list.length === 0) {
        return {
          text: c.t('You have no complaints yet. Use "New Complaint" to create a demo one.', 'Abhi aapki koi complaint nahi hai. Demo complaint banane ke liye "New Complaint" istemal karein.'),
          actions: [{ label: 'New Complaint', href: ROUTES.newComplaint }],
          suggestions: sg(c, 'submit', 'help'),
        }
      }
      const count = (s: Complaint['status']) => list.filter((x) => x.status === s).length
      const newest = [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
      const unreadComplaints = list.filter((x) => x.unreadCount > 0).length
      const unreadEn = unreadComplaints ? ` ${unreadComplaints} ${plural(unreadComplaints, 'complaint has', 'complaints have')} unread updates.` : ''
      const unreadUr = unreadComplaints ? ` ${unreadComplaints} complaint(s) mein unread updates hain.` : ''
      return {
        text: c.t(
          `You have ${list.length} ${plural(list.length, 'complaint', 'complaints')}: ${count('Submitted')} Submitted, ${count('Under Review')} Under Review, ${count('Resolved')} Resolved. Newest: ${newest.ticketId} "${newest.title}" (${newest.status}).${unreadEn}`,
          `Aapki ${list.length} complaint(s) hain: ${count('Submitted')} Submitted, ${count('Under Review')} Under Review, ${count('Resolved')} Resolved. Sab se nayi: ${newest.ticketId} "${newest.title}" (${newest.status}).${unreadUr}`,
        ),
        actions,
        suggestions: sg(c, 'submit', 'help'),
      }
    },
  },
  {
    id: 'complaints.submit',
    all: [C_TERMS, ['submit', 'file', 'lodge', 'raise', 'create', 'new', 'register', 'write', 'send', 'darj', 'karni', 'karna', 'karun', 'bhej', 'bhejna', 'bhejni', 'bhejun', 'kaise', 'kese', 'kaisay', 'how', 'steps', 'process', 'tareeka']],
    build: (c) => ({
      text: c.t(
        'To submit a complaint:\n1. Open Complaint Center and choose the "New Complaint" tab.\n2. Pick a Category, then enter the Location, a Complaint title (at least 5 characters) and a Detailed description (at least 20 characters). An attachment is optional.\n3. Click "Submit complaint". You get a demo ticket ID such as DEMO-0160.\nThis is a Local Demo: the complaint is saved only in this browser and is not submitted to SSUET.',
        'Shikayat darj karne ke liye:\n1. Complaint Center kholein aur "New Complaint" tab chunein.\n2. Category chunein, phir Location, Complaint title (kam az kam 5 characters) aur Detailed description (kam az kam 20 characters) likhein. Attachment zaroori nahi.\n3. "Submit complaint" dabayein. Aapko DEMO-0160 jaisa demo ticket ID mil jata hai.\nYeh Local Demo hai: shikayat sirf is browser mein save hoti hai, SSUET ko nahi bheji jati.',
      ),
      actions: [{ label: 'New Complaint', href: ROUTES.newComplaint }, { label: 'Open Complaint Center', href: ROUTES.complaints }],
      suggestions: sg(c, 'status', 'help'),
    }),
  },
  {
    id: 'complaints.where',
    all: [C_TERMS, WHERE],
    build: (c) => ({
      text: c.t(
        'The Complaint Center is in the left sidebar. "My Complaints" lists your complaints; use the "New Complaint" tab to create one.',
        'Complaint Center left sidebar mein hai. "My Complaints" mein aapki shikayatein nazar aati hain, aur "New Complaint" tab se nayi shikayat darj hoti hai.',
      ),
      actions: [{ label: 'Open Complaint Center', href: ROUTES.complaints }, { label: 'New Complaint', href: ROUTES.newComplaint }],
      suggestions: sg(c, 'submit', 'status'),
    }),
  },
  {
    id: 'complaints.overview',
    all: [C_TERMS],
    build: (c) => ({
      text: c.t(
        'The Complaint Center lets you create demo complaints, search them by ticket ID, title or location, filter by status (Submitted, Under Review, Resolved) and open a ticket to see its history. It is a Local Demo: nothing is sent to SSUET.',
        'Complaint Center mein aap demo complaints bana sakte hain, ticket ID, title ya location se search kar sakte hain, status (Submitted, Under Review, Resolved) se filter kar sakte hain aur ticket khol kar uski history dekh sakte hain. Yeh Local Demo hai: SSUET ko kuch nahi bheja jata.',
      ),
      actions: [{ label: 'Open Complaint Center', href: ROUTES.complaints }],
      suggestions: sg(c, 'submit', 'status'),
    }),
  },

  /* ---------- QR Attendance ---------- */
  {
    id: 'attendance.problem',
    all: [A_TERMS, ['expired', 'expire', 'invalid', 'not working', 'error', 'wrong', 'incorrect', 'failed', 'duplicate', 'already', 'permission', 'denied', 'blocked', 'masla', 'problem', 'issue', 'kaam nahi', 'nahi ho raha']],
    build: (c) => ({
      text: c.t(
        'Common attendance messages:\n• Expired: the QR code\'s time ran out. In the teacher view, click "Regenerate QR".\n• Code or PIN not recognised: check the session code and 6-digit PIN on the teacher screen. A regenerated QR makes the old code invalid.\n• Already marked: attendance can be marked only once per session.\n• Camera problems: allow camera permission, or use the session code and PIN instead. Camera scanning depends on your browser.',
        'Attendance ke aam messages:\n• Expired: QR code ka waqt khatam ho gaya. Teacher view mein "Regenerate QR" dabayein.\n• Code ya PIN nahi mila: teacher screen par session code aur 6-digit PIN check karein. QR regenerate karne se purana code invalid ho jata hai.\n• Already marked: ek session mein attendance sirf ek baar lagti hai.\n• Camera ka masla: camera permission allow karein, ya session code aur PIN istemal karein. Camera scanning browser par depend karti hai.',
      ),
      actions: [{ label: 'Student check-in', href: ROUTES.attendanceStudent }, { label: 'Teacher QR session', href: ROUTES.attendanceTeacher }],
      suggestions: sg(c, 'mark', 'teacher'),
    }),
  },
  {
    id: 'attendance.teacher',
    all: [A_TERMS, ['teacher', 'teachers', 'generate', 'session', 'sessions', 'expiry', 'regenerate', 'faculty', 'ustad', 'ustaad', 'pin']],
    build: (c) => ({
      text: c.t(
        'To start a session (demo teacher view):\n1. Open the "Teacher QR session" tab.\n2. Choose a subject and an expiry time (1, 2, 3, 5 or 10 minutes), then click "Generate QR code".\n3. The screen shows the QR code, a countdown, the session code and a 6-digit PIN, plus the list of checked-in students.\nUse "Regenerate QR" for a fresh code, or "Reset session" to clear it. The PIN is shown only on this teacher screen.',
        'Session start karne ke liye (demo teacher view):\n1. "Teacher QR session" tab kholein.\n2. Subject aur expiry time (1, 2, 3, 5 ya 10 minutes) chunein, phir "Generate QR code" dabayein.\n3. Screen par QR code, countdown, session code, 6-digit PIN aur checked-in students ki list nazar aati hai.\nNaya code lene ke liye "Regenerate QR" ya session saaf karne ke liye "Reset session" dabayein. PIN sirf isi teacher screen par dikhta hai.',
      ),
      actions: [{ label: 'Teacher QR session', href: ROUTES.attendanceTeacher }],
      suggestions: sg(c, 'mark', 'attMy'),
    }),
  },
  {
    id: 'attendance.mark',
    all: [A_TERMS, ['mark', 'how', 'kaise', 'kese', 'kaisay', 'steps', 'scan', 'check in', 'take', 'lagana', 'lagani', 'lagao', 'lagaun', 'lagayein', 'lagayen', 'karun', 'karna', 'karni', 'submit']],
    build: (c) => ({
      text: c.t(
        'To mark attendance:\n1. Have a session started in the "Teacher QR session" tab (the demo teacher view).\n2. In "Student check-in", click "Scan QR code with camera" if your browser supports it, or type the Session code and the 6-digit PIN and click "Mark attendance".\nExpired or already-used sessions are rejected. This is a local demo: no real SSUET attendance records are used.',
        'Attendance lagane ke liye:\n1. "Teacher QR session" tab (demo teacher view) mein session start karwayein.\n2. "Student check-in" mein, agar browser support kare to "Scan QR code with camera" dabayein, warna Session code aur 6-digit PIN likh kar "Mark attendance" dabayein.\nExpired ya pehle se istemal hone wale session reject ho jate hain. Yeh local demo hai: asli SSUET attendance record istemal nahi hota.',
      ),
      actions: [{ label: 'Student check-in', href: ROUTES.attendanceStudent }, { label: 'Teacher QR session', href: ROUTES.attendanceTeacher }],
      suggestions: sg(c, 'teacher', 'attMy'),
    }),
  },
  {
    id: 'attendance.my',
    all: [A_TERMS, ['my', 'mera', 'meri', 'mere', 'record', 'records', 'history', 'how many', 'kitni', 'kitne', 'total', 'count', 'percentage', 'present', 'dekho']],
    build: (c) => {
      const list = [...c.ctx.attendance].sort((a, b) => Date.parse(b.markedAt) - Date.parse(a.markedAt))
      if (list.length === 0) {
        return {
          text: c.t('There are no attendance records yet. Use "Student check-in" once a session is open.', 'Abhi koi attendance record nahi hai. Session khulne ke baad "Student check-in" istemal karein.'),
          actions: [{ label: 'Student check-in', href: ROUTES.attendanceStudent }],
          suggestions: sg(c, 'mark', 'teacher'),
        }
      }
      const l = list[0]
      return {
        text: c.t(
          `You have ${list.length} attendance ${plural(list.length, 'record', 'records')} in this demo. Latest: ${l.subjectName} on ${formatDate(l.markedAt)} (${l.method}).`,
          `Is demo mein aapke ${list.length} attendance record(s) hain. Aakhri: ${l.subjectName}, ${formatDate(l.markedAt)} (${l.method}).`,
        ),
        actions: [{ label: 'Student check-in', href: ROUTES.attendanceStudent }],
        suggestions: sg(c, 'mark', 'teacher'),
      }
    },
  },
  {
    id: 'attendance.where',
    all: [A_TERMS, WHERE],
    build: (c) => ({
      text: c.t(
        'QR Attendance is not in the sidebar. Open the Dashboard and click "Mark attendance" on the QR Attendance card. It has two tabs: "Student check-in" and "Teacher QR session".',
        'QR Attendance sidebar mein nahi hai. Dashboard kholein aur QR Attendance card par "Mark attendance" dabayein. Wahan do tabs hain: "Student check-in" aur "Teacher QR session".',
      ),
      actions: [{ label: 'Student check-in', href: ROUTES.attendanceStudent }, { label: 'Teacher QR session', href: ROUTES.attendanceTeacher }],
      suggestions: sg(c, 'mark', 'teacher'),
    }),
  },
  {
    id: 'attendance.overview',
    all: [A_TERMS],
    build: (c) => ({
      text: c.t(
        'QR Attendance is a local demo with two views: "Teacher QR session" creates a time-limited QR code, session code and PIN; "Student check-in" marks attendance by scanning or typing the code and PIN.',
        'QR Attendance ek local demo hai jis mein do views hain: "Teacher QR session" time-limited QR code, session code aur PIN banata hai; "Student check-in" scan karke ya code aur PIN likh kar attendance lagata hai.',
      ),
      actions: [{ label: 'Student check-in', href: ROUTES.attendanceStudent }, { label: 'Teacher QR session', href: ROUTES.attendanceTeacher }],
      suggestions: sg(c, 'mark', 'teacher'),
    }),
  },

  /* ---------- Academic Advisor ---------- */
  {
    id: 'advisor.rules',
    all: [['how', 'kaise', 'kese', 'kaisay', 'calculated', 'calculate', 'calculation', 'rule', 'rules', 'decide', 'decided', 'formula', 'criteria'], ['weak', 'gpa', 'cgpa', 'overall', 'score', 'hours', 'priority', 'percentage', 'kamzor']],
    build: (c) => ({
      text: c.t(
        `How the Academic Advisor works:\n• Percentage = obtained ÷ total × 100.\n• Overall score = total obtained ÷ total marks.\n• A subject is weak below ${WEAK_THRESHOLD}%. Priority is High (weak), Medium (60–69.9%) or Low (70%+).\n• Study hours per week = credit hours × (${HOURS_BASE} + ${HOURS_PER_POINT} × points below 70%), rounded to 0.5 h and kept between ${MIN_HOURS} and ${MAX_HOURS} h.\n• Estimated GPA uses a demo 4.0 scale, not an official SSUET scale.\nThese are simple rules, not AI predictions.`,
        `Academic Advisor is tarah kaam karta hai:\n• Percentage = obtained ÷ total × 100.\n• Overall score = total obtained ÷ total marks.\n• ${WEAK_THRESHOLD}% se neeche subject kamzor (weak) hai. Priority: High (weak), Medium (60–69.9%) ya Low (70%+).\n• Haftawar study hours = credit hours × (${HOURS_BASE} + ${HOURS_PER_POINT} × 70% se kam points), 0.5 h tak round, ${MIN_HOURS} se ${MAX_HOURS} h ke darmiyan.\n• Estimated GPA demo 4.0 scale par hai, asli SSUET scale nahi.\nYeh saade rules hain, AI predictions nahi.`,
      ),
      actions: [{ label: 'Study Recommendations', href: ROUTES.recommendations }],
      suggestions: sg(c, 'weak', 'plan'),
    }),
  },
  {
    id: 'advisor.enter',
    all: [['marks', 'subject', 'subjects', 'grade', 'grades'], ['enter', 'add', 'update', 'edit', 'change', 'input', 'fill', 'save', 'remove', 'delete', 'likhna', 'likhni', 'daalna', 'dalna', 'daalun', 'dalun', 'badalna', 'badlo', 'tabdeel']],
    build: (c) => ({
      text: c.t(
        'To enter or update marks:\n1. Open Academic Advisor and choose the "Marks Entry" tab.\n2. To add a subject, fill in Subject name, Credit hours, Obtained marks and Total marks, then click "Add subject". To change one, click its pencil icon in "Subject records", edit the values and click "Save changes".\nResults update straight away. Marks are demo data kept only in this browser.',
        'Marks enter ya update karne ke liye:\n1. Academic Advisor kholein aur "Marks Entry" tab chunein.\n2. Subject add karne ke liye Subject name, Credit hours, Obtained marks aur Total marks bharein, phir "Add subject" dabayein. Kisi ko badalne ke liye "Subject records" mein uska pencil icon dabayein, values badlein aur "Save changes" dabayein.\nNatayej foran update ho jate hain. Marks demo data hain jo sirf is browser mein rehte hain.',
      ),
      actions: [{ label: 'Marks Entry', href: ROUTES.marks }],
      suggestions: sg(c, 'weak', 'overall'),
    }),
  },
  {
    id: 'advisor.weak',
    all: [AD_TERMS, ['weak', 'weakest', 'low', 'lowest', 'poor', 'failing', 'fail', 'behind', 'struggling', 'kamzor', 'kamzoor', 'kam', 'improve', 'improvement', 'worst', 'below']],
    build: (c) => {
      const a = analyse(c.ctx.subjects)
      const actions = [{ label: 'Study Recommendations', href: ROUTES.recommendations }]
      if (c.ctx.subjects.length === 0) {
        return {
          text: c.t('No subjects have been added yet. Add some in "Marks Entry" and I can tell you which ones are weak.', 'Abhi koi subject add nahi hua. "Marks Entry" mein add karein, phir main bata sakta hoon kaun se kamzor hain.'),
          actions: [{ label: 'Marks Entry', href: ROUTES.marks }],
          suggestions: sg(c, 'help', 'settings'),
        }
      }
      if (a.weak.length === 0) {
        const w = a.weakest!
        return {
          text: c.t(
            `None of your subjects is below the ${WEAK_THRESHOLD}% target. Your lowest is ${w.name} at ${w.pct}%.`,
            `Aapka koi subject ${WEAK_THRESHOLD}% target se neeche nahi hai. Sab se kam ${w.name} hai (${w.pct}%).`,
          ),
          actions,
          suggestions: sg(c, 'plan', 'overall'),
        }
      }
      const list = a.weak.map((w) => `${w.name} (${w.pct}%)`).join(', ')
      return {
        text: c.t(
          `Subjects below the ${WEAK_THRESHOLD}% target: ${list}. The weakest is ${a.weak[0].name}. Open Study Recommendations for a plan based on your marks.`,
          `${WEAK_THRESHOLD}% target se neeche subjects: ${list}. Sab se kamzor ${a.weak[0].name} hai. Apne marks par mabni plan ke liye Study Recommendations kholein.`,
        ),
        actions,
        suggestions: sg(c, 'plan', 'overall'),
      }
    },
  },
  {
    id: 'advisor.plan',
    all: [['study plan', 'recommendation', 'recommendations', 'recommend', 'what should i study', 'kya padhun', 'kya parhun', 'padhna chahiye', 'parhna chahiye', 'study hours', 'weekly plan', 'schedule', 'tips', 'suggestions', 'suggest']],
    score: 2,
    build: (c) => {
      const actions = [{ label: 'Study Recommendations', href: ROUTES.recommendations }]
      if (c.ctx.subjects.length === 0) {
        return {
          text: c.t('Add your subjects in "Marks Entry" first. Then I can summarise your study plan.', 'Pehle "Marks Entry" mein subjects add karein. Phir main study plan bata sakta hoon.'),
          actions: [{ label: 'Marks Entry', href: ROUTES.marks }],
          suggestions: sg(c, 'help', 'settings'),
        }
      }
      const recs = recommend(c.ctx.subjects)
      const top = recs.slice(0, 3).map((r) => `${r.subject.name} (${r.priority}, ${r.hoursPerWeek} h/week)`).join(', ')
      const total = recs.reduce((x, r) => x + r.hoursPerWeek, 0)
      return {
        text: c.t(
          `Study these first: ${top}. In total about ${total} h/week is suggested. ${recs[0].reason} Open Study Recommendations for the full reasons, tips and weekly plan.`,
          `Pehle in ko parhein: ${top}. Kul takreeban ${total} h/week suggest hota hai. ${recs[0].reason} Poori wajoohat, tips aur weekly plan ke liye Study Recommendations kholein.`,
        ),
        actions,
        suggestions: sg(c, 'weak', 'overall'),
      }
    },
  },
  {
    id: 'advisor.overall',
    all: [['overall score', 'overall', 'gpa', 'cgpa', 'percentage', 'average score', 'my score', 'my marks', 'total marks', 'mera score', 'mere marks']],
    score: 2,
    build: (c) => {
      if (c.ctx.subjects.length === 0) {
        return {
          text: c.t('No marks have been entered yet, so there is no overall score. Add subjects in "Marks Entry".', 'Abhi koi marks enter nahi hue, is liye overall score nahi hai. "Marks Entry" mein subjects add karein.'),
          actions: [{ label: 'Marks Entry', href: ROUTES.marks }],
          suggestions: sg(c, 'help', 'settings'),
        }
      }
      const a = analyse(c.ctx.subjects)
      return {
        text: c.t(
          `Your overall score is ${a.overallPct}% (${a.totalObtained} of ${a.totalMarks} marks). Your estimated GPA is ${a.estimatedGpa.toFixed(2)} on a demo 4.0 scale, which is not an official SSUET GPA.`,
          `Aapka overall score ${a.overallPct}% hai (${a.totalMarks} marks mein se ${a.totalObtained}). Aapka estimated GPA ${a.estimatedGpa.toFixed(2)} hai (demo 4.0 scale), jo asli SSUET GPA nahi hai.`,
        ),
        actions: [{ label: 'Performance Overview', href: ROUTES.advisor }],
        suggestions: sg(c, 'weak', 'plan'),
      }
    },
  },
  {
    id: 'advisor.where',
    all: [['advisor', 'academic', 'marks', 'subject', 'subjects'], WHERE],
    build: (c) => ({
      text: c.t(
        'Academic Advisor is in the left sidebar. It has three tabs: "Performance Overview", "Marks Entry" and "Study Recommendations".',
        'Academic Advisor left sidebar mein hai. Isme teen tabs hain: "Performance Overview", "Marks Entry" aur "Study Recommendations".',
      ),
      actions: [{ label: 'Open Academic Advisor', href: ROUTES.advisor }, { label: 'Marks Entry', href: ROUTES.marks }],
      suggestions: sg(c, 'weak', 'plan'),
    }),
  },
  {
    id: 'advisor.overview',
    all: [['advisor', 'academic', 'marks', 'subject', 'subjects', 'grade', 'grades', 'result', 'results']],
    build: (c) => ({
      text: c.t(
        'The Academic Advisor calculates your percentages, overall score and estimated GPA from the marks you enter, flags weak subjects and builds study recommendations and a weekly plan. Everything is demo data stored in this browser.',
        'Academic Advisor aapke enter kiye hue marks se percentages, overall score aur estimated GPA nikalta hai, kamzor subjects batata hai aur study recommendations aur weekly plan banata hai. Sab kuch demo data hai jo is browser mein save hota hai.',
      ),
      actions: [{ label: 'Open Academic Advisor', href: ROUTES.advisor }],
      suggestions: sg(c, 'weak', 'overall', 'plan'),
    }),
  },

  /* ---------- Settings ---------- */
  {
    id: 'settings.reset',
    all: [['reset', 'clear', 'wipe', 'delete', 'default', 'restore', 'saaf', 'mita', 'mitao', 'dobara'], ['demo data', 'all data', 'everything', 'sab kuch', 'saara data', 'data', 'demo']],
    score: 3,
    build: (c) => ({
      text: c.t(
        'Go to Settings → "Demo data" and click "Reset Demo Data". A confirmation dialog appears first. It restores marks, complaints, attendance sessions and history, notifications, activity, notification preferences and the profile (back to "Demo Student"). Your theme and login are kept. Only data in this browser is affected.',
        'Settings → "Demo data" mein jakar "Reset Demo Data" dabayein. Pehle confirmation dialog aata hai. Yeh marks, complaints, attendance sessions aur history, notifications, activity, notification preferences aur profile ("Demo Student" par) wapas default kar deta hai. Aapka theme aur login barqarar rehte hain. Sirf is browser ka data mutasir hota hai.',
      ),
      actions: [{ label: 'Open Demo data settings', href: ROUTES.settingsDemoData }],
      suggestions: sg(c, 'settings', 'theme'),
    }),
  },
  {
    id: 'settings.theme',
    all: [['theme', 'dark mode', 'light mode', 'dark', 'night mode', 'appearance', 'colour', 'color']],
    score: 3,
    build: (c) => ({
      text: c.t(
        `Your theme is currently ${themeName(c.ctx.theme)}. Go to Settings → Preferences and choose Light, Dark or System.`,
        `Aapka theme abhi ${themeName(c.ctx.theme)} hai. Settings → Preferences mein jakar Light, Dark ya System chunein.`,
      ),
      actions: [{ label: 'Open Preferences', href: ROUTES.settingsPreferences }],
      suggestions: sg(c, 'settings', 'reset'),
    }),
  },
  {
    id: 'settings.notifications',
    all: [['notification', 'notifications', 'alert', 'alerts', 'bell', 'notify', 'mute']],
    score: 3,
    build: (c) => {
      const p = c.ctx.prefs
      return {
        text: c.t(
          `In Settings → Preferences → Notifications you can switch complaint updates (${onOff(p.complaintUpdates, c.lang)}), attendance alerts (${onOff(p.attendanceAlerts, c.lang)}) and advisor alerts (${onOff(p.advisorTips, c.lang)}) on or off. A switched-off type is hidden from the bell menu and comes back when you switch it on. No email or push messages are ever sent.`,
          `Settings → Preferences → Notifications mein complaint updates (${onOff(p.complaintUpdates, c.lang)}), attendance alerts (${onOff(p.attendanceAlerts, c.lang)}) aur advisor alerts (${onOff(p.advisorTips, c.lang)}) on ya off kar sakte hain. Off ki hui qism bell menu se chhup jati hai aur on karne par wapas aa jati hai. Koi email ya push message nahi bheja jata.`,
        ),
        actions: [{ label: 'Open Preferences', href: ROUTES.settingsPreferences }],
        suggestions: sg(c, 'settings', 'theme'),
      }
    },
  },
  {
    id: 'settings.profile',
    all: [['profile', 'my name', 'edit name', 'change name', 'email', 'phone', 'department', 'semester', 'batch', 'personal details', 'apni details', 'naam']],
    score: 3,
    build: (c) => ({
      text: c.t(
        'Go to Settings → Profile. You can edit the name, demo student ID, email, phone (optional), department, program, semester and batch, then click "Save changes". Your edits stay after you log out, log in or refresh.',
        'Settings → Profile mein jayein. Wahan naam, demo student ID, email, phone (optional), department, program, semester aur batch badal kar "Save changes" dabayein. Aapki tabdeeliyan logout, login ya refresh ke baad bhi rehti hain.',
      ),
      actions: [{ label: 'Open Profile settings', href: ROUTES.settingsProfile }],
      suggestions: sg(c, 'settings', 'theme'),
    }),
  },
  {
    id: 'settings.how',
    all: [S_TERMS.concat(['customize']), ['change', 'how', 'kaise', 'kese', 'kaisay', 'update', 'edit', 'badalna', 'badal', 'tabdeel', 'set', 'steps']],
    build: (c) => ({
      text: c.t(
        'In Settings you can:\n• edit your demo profile (name, email and more) and click "Save changes";\n• choose a Light, Dark or System theme;\n• switch notification types on or off;\n• use "Reset Demo Data" (it asks for confirmation first).\nEverything is saved only in this browser.',
        'Settings mein aap:\n• apna demo profile (naam, email waghaira) badal kar "Save changes" dabayein;\n• Light, Dark ya System theme chunein;\n• notification ki qismein on ya off karein;\n• "Reset Demo Data" istemal karein (pehle confirmation poochta hai).\nSab kuch sirf is browser mein save hota hai.',
      ),
      actions: [{ label: 'Open Settings', href: ROUTES.settings }],
      suggestions: sg(c, 'theme', 'reset'),
    }),
  },
  {
    id: 'settings.where',
    all: [S_TERMS, WHERE],
    build: (c) => ({
      text: c.t(
        'Settings is in the left sidebar, and also in the menu under your name at the top right. It has Profile, Preferences (theme and notifications) and Demo data.',
        'Settings left sidebar mein hai, aur upar right mein apne naam ke menu mein bhi hai. Isme Profile, Preferences (theme aur notifications) aur Demo data hain.',
      ),
      actions: [{ label: 'Open Settings', href: ROUTES.settings }],
      suggestions: sg(c, 'settings', 'theme'),
    }),
  },
  {
    id: 'settings.overview',
    all: [S_TERMS],
    build: (c) => ({
      text: c.t(
        'Settings lets you edit the demo profile, choose a theme, switch notification types on or off and reset the demo data.',
        'Settings mein aap demo profile badal sakte hain, theme chun sakte hain, notifications on ya off kar sakte hain aur demo data reset kar sakte hain.',
      ),
      actions: [{ label: 'Open Settings', href: ROUTES.settings }],
      suggestions: sg(c, 'settings', 'theme'),
    }),
  },

  /* ---------- Dashboard ---------- */
  {
    id: 'dashboard.where',
    all: [['dashboard', 'home'], WHERE],
    build: (c) => ({
      text: c.t(
        'The Dashboard is the first item in the left sidebar. It shows your demo profile, an at-a-glance summary, recent activity and recent attendance.',
        'Dashboard left sidebar mein sab se upar hai. Isme aapka demo profile, at-a-glance summary, recent activity aur recent attendance nazar aati hai.',
      ),
      actions: [{ label: 'Open Dashboard', href: ROUTES.dashboard }],
      suggestions: sg(c, 'summary', 'mark'),
    }),
  },
  {
    id: 'dashboard.overview',
    all: [['dashboard', 'home', 'summary', 'overview', 'at a glance', 'snapshot', 'mera status', 'meri halat', 'mera summary', 'meri summary']],
    build: (c) => {
      const list = c.ctx.complaints
      const open = list.filter((x) => x.status !== 'Resolved').length
      const n = c.ctx.attendance.length
      if (c.ctx.subjects.length === 0) {
        return {
          text: c.t(
            `Your demo snapshot: no subjects entered yet. Complaints: ${open} open out of ${list.length}. Attendance: ${n} ${plural(n, 'check-in', 'check-ins')} recorded.`,
            `Aapka demo summary: abhi koi subject enter nahi hua. Complaints: ${list.length} mein se ${open} open. Attendance: ${n} check-in(s) record hain.`,
          ),
          actions: [{ label: 'Open Dashboard', href: ROUTES.dashboard }],
          suggestions: sg(c, 'help', 'status'),
        }
      }
      const a = analyse(c.ctx.subjects)
      return {
        text: c.t(
          `Your demo snapshot: overall score ${a.overallPct}% (${a.totalObtained} of ${a.totalMarks} marks), estimated GPA ${a.estimatedGpa.toFixed(2)} (demo scale), ${a.weak.length} weak ${plural(a.weak.length, 'subject', 'subjects')}. Complaints: ${open} open out of ${list.length}. Attendance: ${n} ${plural(n, 'check-in', 'check-ins')} recorded.`,
          `Aapka demo summary: overall score ${a.overallPct}% (${a.totalMarks} marks mein se ${a.totalObtained}), estimated GPA ${a.estimatedGpa.toFixed(2)} (demo scale), kamzor subjects: ${a.weak.length}. Complaints: ${list.length} mein se ${open} open. Attendance: ${n} check-in(s) record hain.`,
        ),
        actions: [{ label: 'Open Dashboard', href: ROUTES.dashboard }],
        suggestions: sg(c, 'weak', 'status'),
      }
    },
  },

  /* ---------- greetings (lowest priority) ---------- */
  {
    id: 'thanks',
    all: [['thanks', 'thank', 'thankyou', 'shukriya', 'shukria', 'mehrbani', 'jazakallah']],
    build: (c) => ({ text: c.t('You are welcome! Ask me anything else about the portal.', 'Koi baat nahi! Portal ke bare mein aur kuch poochna ho to batayein.'), actions: [], suggestions: sg(c, 'help', 'weak') }),
  },
  {
    id: 'greeting',
    all: [['hello', 'hi', 'hey', 'hola', 'salam', 'salaam', 'assalam', 'assalamualaikum', 'aoa']],
    build: (c) => ({
      text: c.t(
        "Hello! I'm the Smart Campus demo assistant. I can show you where things are and how to use " + TOPICS + '. What would you like to do?',
        "Assalam o alaikum! Main Smart Campus demo assistant hoon. Main bata sakta hoon ke " + TOPICS_UR + ' kahan hain aur unhein kaise istemal karna hai. Aap kya karna chahte hain?',
      ),
      actions: [],
      suggestions: sg(c, 'complaintWhere', 'weak', 'mark'),
    }),
  },
]

export const INTENT_IDS = intents.map((i) => i.id)

/* ------------------------------------------ entry points ------------------------------------ */

function fallback(lang: Lang, urduScript: boolean): AgentReply {
  const c = { lang } as B
  const text = urduScript
    ? 'Main abhi sirf English aur Roman Urdu samajhta hoon (jaise "Complaint Center kahan hai?"). Meharbani karke Roman Urdu mein likhein.'
    : lang === 'ur'
      ? 'Mujhe yeh sawal samajh nahi aaya. Main in cheezon mein madad kar sakta hoon: ' + TOPICS_UR + '. Neeche se koi sawal chunein ya apne alfaaz mein dobara poochein.'
      : "I didn't understand that one. I can help with " + TOPICS + '. Pick a question below or try asking in different words.'
  return { intent: 'fallback', lang, text, actions: [], suggestions: sg(c, 'help', 'complaintWhere', 'weak') }
}

function buildReply(def: IntentDef, ctx: AgentContext, lang: Lang, norm: string, ticket: string | null): AgentReply {
  const b: B = { ctx, lang, norm, ticket, t: (en, ur) => (lang === 'ur' ? ur : en) }
  const part = def.build(b)
  return { intent: def.id, lang, ...part }
}

/** Test/diagnostic helper: build the reply for a specific intent in a specific language. */
export function answerIntent(id: string, ctx: AgentContext, lang: Lang, ticket: string | null = null): AgentReply | null {
  const def = intents.find((i) => i.id === id)
  return def ? buildReply(def, ctx, lang, '', ticket) : null
}

export function answer(input: string, ctx: AgentContext, langPref: LangPref = 'auto', lastLang: Lang = 'en'): AgentReply {
  const urduScript = hasUrduScript(input)
  const norm = normalize(input)
  const ticketMatch = input.slice(0, MAX_INPUT_LENGTH).match(TICKET_RE)
  const ticket = ticketMatch ? `DEMO-${ticketMatch[1]}` : null
  const lang: Lang = urduScript ? 'ur' : langPref === 'auto' ? detectLanguage(norm, lastLang) : langPref
  if (!norm && !ticket) return fallback(lang, urduScript)

  // A ticket ID in the text counts as the words "ticket status", so a bare "DEMO-0141" looks the ticket up.
  const tokens = [...norm.split(' ').filter(Boolean), ...(ticket ? ['ticket', 'status'] : [])]
  const text = ticket ? `${norm} ticket status` : norm

  // Best match = highest score, then the most matched keywords, then the intent declared first.
  let best: IntentDef | null = null
  let bestScore = 0
  let bestMatches = 0
  for (const def of intents) {
    if (!def.all.every((group) => group.some((term) => hasTerm(text, tokens, term)))) continue
    const score = def.score ?? def.all.length
    const matches = def.all.reduce((n, group) => n + group.filter((term) => hasTerm(text, tokens, term)).length, 0)
    if (score > bestScore || (score === bestScore && matches > bestMatches)) {
      best = def
      bestScore = score
      bestMatches = matches
    }
  }
  if (!best) return fallback(lang, false)

  // The language switch intents reply in the language being switched to.
  const replyLang: Lang = best.id === 'lang_ur' ? 'ur' : best.id === 'lang_en' ? 'en' : lang
  const reply = buildReply(best, ctx, replyLang, text, ticket)

  // Explicit "open / take me to ..." commands navigate; plain "where is ..." questions only offer buttons.
  const isCommand = NAV_COMMAND.some((cmd) => hasTerm(text, tokens, cmd)) && !QUESTION_WORDS.some((w) => hasTerm(text, tokens, w) && w !== 'open')
  const navigational = best.id.endsWith('.where') || best.id.endsWith('.overview')
  if (isCommand && navigational && reply.actions.length > 0) reply.navigate = reply.actions[0].href
  return reply
}
