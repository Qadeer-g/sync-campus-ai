import assert from 'node:assert/strict'
const mem = new Map<string, string>()
;(globalThis as any).window = { localStorage: {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => { mem.set(k, String(v)) },
  removeItem: (k: string) => { mem.delete(k) },
} }
import * as A from '../lib/advisor'
import * as S from '../lib/store'
import { demoSubjects } from '../lib/demo-data'
const { analyse, recommend, weeklyPlan, studyHours, marksToReach, projectionIfWeakReachTarget, bandFor, isWeak } = A
const { initialState, saveSubject, deleteSubject, migrateSubjects, saveState, loadSavedState, quarantineRecords, readQuarantine, SUBJECT_QUARANTINE_KEY, QUARANTINE_KEY } = S
let n = 0
const t = (name: string, fn: () => void) => { mem.clear(); fn(); n++; console.log('PASS', name) }
const sub = (id: string, name: string, obtained: number, total = 100, creditHours = 3) => ({ id, code: 'SUB-' + id, name, creditHours, obtained, total })
const byName = (recs: any[], name: string) => recs.find((r) => r.subject.name === name)!
const T = '2026-11-22T10:00:00.000Z'

t('seed subjects are generic: "Subject N" names, SUB-0N codes, no official-looking data', () => {
  assert.equal(demoSubjects.length, 6)
  demoSubjects.forEach((s, i) => { assert.equal(s.name, `Subject ${i + 1}`); assert.equal(s.code, `SUB-0${i + 1}`) })
})
t('overall score = total obtained / total marks (independent arithmetic: 366/550 = 66.5)', () => {
  const a = analyse(demoSubjects)
  const sumO = demoSubjects.reduce((x, s) => x + s.obtained, 0), sumT = demoSubjects.reduce((x, s) => x + s.total, 0)
  assert.equal(sumO, 366); assert.equal(sumT, 550)
  assert.equal(a.totalObtained, 366); assert.equal(a.totalMarks, 550); assert.equal(a.overallPct, Math.round((366 / 550) * 1000) / 10); assert.equal(a.overallPct, 66.5)
})
t('per-subject percentages incl. the /50 subject (41/50 = 82%)', () => {
  assert.deepEqual(analyse(demoSubjects).rows.map((r) => r.pct), [78, 52, 44, 66, 85, 82])
})
t('estimated GPA, credit-weighted on the demo scale (hand-computed 42.5/17 = 2.5)', () => {
  assert.equal(analyse(demoSubjects).estimatedGpa, 2.5)
})
t('weak subjects = below 60%, weakest first: Subject 3 (44) then Subject 2 (52)', () => {
  const a = analyse(demoSubjects)
  assert.deepEqual(a.weak.map((w) => w.name), ['Subject 3', 'Subject 2'])
  assert.equal(a.weakest!.name, 'Subject 3'); assert.equal(a.strongest!.name, 'Subject 5')
})
t('band & weak boundaries: 49.9 critical, 50 weak, 59.9 weak, 60 average(not weak), 70 good, 80 excellent', () => {
  assert.equal(bandFor(49.9), 'critical'); assert.equal(bandFor(50), 'weak'); assert.equal(bandFor(59.9), 'weak'); assert.equal(bandFor(60), 'average')
  assert.equal(bandFor(69.9), 'average'); assert.equal(bandFor(70), 'good'); assert.equal(bandFor(79.9), 'good'); assert.equal(bandFor(80), 'excellent')
  assert.equal(isWeak(59.9), true); assert.equal(isWeak(60), false)
})
t('classification uses the displayed 1-decimal percentage: 59.96 shows as 60% and is NOT weak', () => {
  const a = analyse([sub('1', 'X', 59.96)]); assert.equal(a.rows[0].pct, 60); assert.equal(a.weak.length, 0)
  assert.equal(analyse([sub('1', 'X', 59.94)]).weak.length, 1)
})
t('empty / zero-total data never produces NaN or crashes', () => {
  const e = analyse([]); assert.equal(e.overallPct, 0); assert.equal(e.estimatedGpa, 0); assert.equal(e.weak.length, 0); assert.equal(e.strongest, null)
  assert.deepEqual(recommend([]), []); assert.equal(projectionIfWeakReachTarget([]), null)
  const z = analyse([sub('1', 'Z', 0, 0)]); assert.equal(z.rows[0].pct, 0); assert.ok(!Number.isNaN(z.overallPct))
})
t('studyHours follows the documented formula (credits x (0.75 + 0.06 x points below 70)), 0.5 steps, 1..12 h', () => {
  assert.equal(studyHours(44, 3), 7); assert.equal(studyHours(52, 3), 5.5); assert.equal(studyHours(66, 3), 3)
  assert.equal(studyHours(78, 3), 2.5); assert.equal(studyHours(85, 3), 2.5); assert.equal(studyHours(82, 2), 1.5)
  assert.equal(studyHours(0, 3), 12, 'capped at 12'); assert.equal(studyHours(100, 1), 1, 'floor of 1 h')
})
t('marksToReach is exact for whole and fractional targets', () => {
  assert.equal(marksToReach({ obtained: 44, total: 100 }, 60), 16); assert.equal(marksToReach({ obtained: 41, total: 50 }, 60), 0)
  assert.equal(marksToReach({ obtained: 25, total: 50 }, 60), 5); assert.equal(marksToReach({ obtained: 1, total: 3 }, 60), 1)
})
t('recommendations are in weakest-first order with correct priorities', () => {
  const r = recommend(demoSubjects)
  assert.deepEqual(r.map((x) => x.subject.name), ['Subject 3', 'Subject 2', 'Subject 4', 'Subject 1', 'Subject 6', 'Subject 5'])
  assert.deepEqual(r.map((x) => x.priority), ['High', 'High', 'Medium', 'Low', 'Low', 'Low'])
  assert.deepEqual(r.map((x) => x.hoursPerWeek), [7, 5.5, 3, 2.5, 1.5, 2.5])
})
t('Subject 3 (44/100): reason & tips use its real numbers', () => {
  const s3 = byName(recommend(demoSubjects), 'Subject 3')
  assert.match(s3.reason, /44% \(44\/100\)/); assert.match(s3.reason, /16 points below the 60% target/); assert.match(s3.reason, /At least 16 marks more out of 100/); assert.match(s3.reason, /lowest-scoring subject/)
  assert.ok(s3.tips.some((x: string) => /rebuild fundamentals/.test(x)), 'gap 16 > 15 -> fundamentals tip')
  assert.ok(s3.tips.some((x: string) => /about 7 h\/week/.test(x)))
  assert.ok(s3.tips.some((x: string) => /weakest subject/.test(x)))
})
t('Subject 2 (52/100): different numbers -> different text; GPA tip matches independent calculation (2.50 -> 2.61)', () => {
  const s2 = byName(recommend(demoSubjects), 'Subject 2')
  assert.match(s2.reason, /52% \(52\/100\)/); assert.match(s2.reason, /8 points below/); assert.match(s2.reason, /At least 8 marks/); assert.match(s2.reason, /14\.5 points below your overall score of 66\.5%/)
  assert.ok(s2.tips.some((x: string) => /Find the topics/.test(x)) && !s2.tips.some((x: string) => /rebuild fundamentals/.test(x)))
  const gpaAfter = Math.round(((42.5 - 5.1 + 2.3 * 3) / 17) * 100) / 100   // independent: Subject 2 -> 60% (2.3 pts)
  assert.equal(gpaAfter, 2.61)
  assert.ok(s2.tips.some((x: string) => x.includes('from 2.50 to 2.61')))
})
t('Subject 4 (66, Medium): buffer and marks-to-70 are computed, not canned', () => {
  const s4 = byName(recommend(demoSubjects), 'Subject 4')
  assert.match(s4.reason, /6 points above the 60% target/); assert.match(s4.reason, /buffer of 6 marks/)
  assert.ok(s4.tips.some((x: string) => /would need 4 marks more out of 100/.test(x))); assert.ok(s4.tips.some((x: string) => /weak subjects need the extra time/.test(x)))
})
t('Subject 5 is strongest -> says so; low-priority tips differ from weak ones', () => {
  const s5 = byName(recommend(demoSubjects), 'Subject 5')
  assert.ok(s5.tips.some((x: string) => /strongest subject/.test(x))); assert.match(s5.reason, /25 points above the target and 18\.5 above your overall score of 66\.5%/)
})
t('tips are not one canned list per band: >= 12 distinct tip strings across 6 demo subjects', () => {
  const all = new Set(recommend(demoSubjects).flatMap((r) => r.tips)); assert.ok(all.size >= 12, `got ${all.size}`)
})
t('changing marks changes the recommendation: Subject 3 44 -> 58 gives "close" tip and 4.5 h', () => {
  const changed = demoSubjects.map((s) => (s.name === 'Subject 3' ? { ...s, obtained: 58 } : s))
  const s3 = byName(recommend(changed), 'Subject 3')
  assert.equal(s3.hoursPerWeek, 4.5); assert.ok(s3.tips.some((x: string) => /You are close: about 2 marks/.test(x))); assert.ok(!s3.tips.some((x: string) => /rebuild fundamentals/.test(x)))
  assert.match(s3.reason, /58% \(58\/100\)/)
})
t('all subjects >= 60: no weak, no High priority, no projection, "strongest" text without weak-subject wording', () => {
  const ok = [sub('1', 'A', 90), sub('2', 'B', 72), sub('3', 'C', 61)]
  const a = analyse(ok); assert.equal(a.weak.length, 0); assert.equal(projectionIfWeakReachTarget(ok), null)
  const r = recommend(ok); assert.ok(r.every((x) => x.priority !== 'High'))
  assert.ok(byName(r, 'A').tips.some((x: string) => /short weekly revision/.test(x)))
})
t('single subject works (no "lowest/strongest of several" claims)', () => {
  const r = recommend([sub('1', 'Only', 40)]); assert.equal(r.length, 1); assert.ok(!/lowest-scoring/.test(r[0].reason)); assert.ok(!r[0].tips.some((x) => /weakest subject/.test(x)))
})
t('projection if weak subjects reach 60%: overall 66.5 -> 70.9, GPA 2.5 -> 3.01 (hand-computed)', () => {
  const p = projectionIfWeakReachTarget(demoSubjects)!
  assert.deepEqual(p.from, { overallPct: 66.5, estimatedGpa: 2.5 }); assert.equal(p.to.overallPct, Math.round((390 / 550) * 1000) / 10); assert.equal(p.to.overallPct, 70.9)
  assert.equal(p.to.estimatedGpa, Math.round((51.2 / 17) * 100) / 100); assert.equal(p.to.estimatedGpa, 3.01)
})
t('weekly plan: total hours equal suggested hours, blocks <= 2 h, all hours positive', () => {
  const recs = recommend(demoSubjects); const plan = weeklyPlan(recs)
  const planned = Object.values(plan).flat(); const sum = planned.reduce((x, b) => x + b.hours, 0)
  assert.equal(sum, recs.reduce((x, r) => x + r.hoursPerWeek, 0)); assert.ok(planned.every((b) => b.hours > 0 && b.hours <= 2))
})

/* ---- shared store: marks changes, dashboard summaries, persistence ---- */
t('saveSubject UPDATE: values replaced in place, id/order kept, analysedAt refreshed, activity logged', () => {
  const s0 = initialState(); const s3 = s0.subjects.find((x) => x.name === 'Subject 3')!
  const s1 = saveSubject(s0, { ...s3, obtained: 62 }, T)
  assert.equal(s1.subjects.length, 6); assert.deepEqual(s1.subjects.map((x) => x.id), s0.subjects.map((x) => x.id))
  assert.equal(s1.subjects.find((x) => x.id === s3.id)!.obtained, 62); assert.equal(s1.analysedAt, T)
  assert.equal(s1.activity[0].title, 'Marks updated'); assert.equal(s1.activity[0].detail, 'Subject 3 · 62%')
  assert.equal(s0.subjects.find((x) => x.id === s3.id)!.obtained, 44, 'original state not mutated')
})
t('saveSubject ADD: new id generated and appended; unknown id is treated as an add', () => {
  const s0 = initialState()
  const s1 = saveSubject(s0, { code: 'SUB-07', name: 'Subject 7', creditHours: 2, obtained: 30, total: 50 }, T)
  assert.equal(s1.subjects.length, 7); assert.ok(s1.subjects[6].id.startsWith('sub')); assert.equal(s1.activity[0].title, 'Subject added'); assert.equal(s1.activity[0].detail, 'Subject 7 · 60%')
  const s2 = saveSubject(s0, { id: 'ghost', code: 'X', name: 'Ghost', creditHours: 1, obtained: 1, total: 2 }, T); assert.equal(s2.subjects.length, 7); assert.equal(s2.subjects[6].id, 'ghost')
})
t('deleteSubject removes it, refreshes analysedAt, logs; unknown id is a no-op (same reference)', () => {
  const s0 = initialState(); const s1 = deleteSubject(s0, 'sub-6', T)
  assert.equal(s1.subjects.length, 5); assert.ok(!s1.subjects.some((x) => x.id === 'sub-6')); assert.equal(s1.activity[0].title, 'Subject removed'); assert.equal(s1.analysedAt, T)
  assert.equal(deleteSubject(s0, 'nope', T), s0)
})
t('Dashboard summaries (same analyse(subjects) the dashboard calls) change when marks change', () => {
  const s0 = initialState(); const before = analyse(s0.subjects)
  assert.deepEqual([before.overallPct, before.estimatedGpa, before.weak.length], [66.5, 2.5, 2])
  const s1 = saveSubject(s0, { ...s0.subjects[2], obtained: 70 }, T)     // Subject 3: 44 -> 70
  const after = analyse(s1.subjects)
  assert.deepEqual([after.overallPct, after.weak.length], [Math.round((392 / 550) * 1000) / 10, 1]); assert.ok(after.estimatedGpa > before.estimatedGpa)
  const s2 = deleteSubject(s1, 'sub-2', T); assert.equal(analyse(s2.subjects).weak.length, 0)
})
t('persistence: edited marks survive save -> load, and logout -> login', () => {
  let s = saveSubject(initialState(), { ...initialState().subjects[2], obtained: 58 }, T)
  s = { ...s, isAuthed: true }; saveState(s)
  assert.equal(loadSavedState()!.state.subjects[2].obtained, 58)
  s = { ...s, isAuthed: false }; saveState(s)                                   // logout (store keeps data)
  let loaded = loadSavedState()!; assert.equal(loaded.state.isAuthed, false); assert.deepEqual(loaded.state.subjects, s.subjects)
  s = { ...loaded.state, isAuthed: true }; saveState(s)                          // login again
  loaded = loadSavedState()!; assert.equal(loaded.state.isAuthed, true); assert.deepEqual(loaded.state.subjects, s.subjects)
  assert.equal(analyse(loaded.state.subjects).rows[2].pct, 58); assert.equal(loaded.state.analysedAt, T)
})
t('persistence: added and removed subjects persist too', () => {
  let s = saveSubject(initialState(), { code: 'SUB-07', name: 'Subject 7', creditHours: 2, obtained: 30, total: 50 }, T)
  s = deleteSubject(s, 'sub-1', T); saveState(s); const l = loadSavedState()!
  assert.deepEqual(l.state.subjects.map((x) => x.name), ['Subject 2', 'Subject 3', 'Subject 4', 'Subject 5', 'Subject 6', 'Subject 7'])
})
t('fresh browser has no saved data -> loader returns null (defaults = Subject 1-6 demo marks)', () => {
  assert.equal(loadSavedState(), null); assert.equal(initialState().subjects.length, 6)
})
t('migrateSubjects keeps valid entries and reports every unusable one', () => {
  const good = { id: 'g', code: 'SUB-01', name: 'Subject 1', creditHours: 3, obtained: 50, total: 100 }
  const bad = [null, 'x', 5, { ...good, id: '' }, { ...good, id: 'b1', name: '  ' }, { ...good, id: 'b2', obtained: -1 }, { ...good, id: 'b3', obtained: 101 }, { ...good, id: 'b4', total: 0 },
    { ...good, id: 'b5', obtained: NaN }, { ...good, id: 'b6', obtained: '50' }, { ...good, id: 'b7', creditHours: 0 }, { ...good, id: 'b8', total: Infinity }]
  const r = migrateSubjects([good, ...bad, { ...good, id: 'g2', code: 7 }])
  assert.deepEqual(r.subjects.map((s) => s.id), ['g', 'g2']); assert.equal(r.skipped.length, bad.length); assert.equal(r.subjects[1].code, 'N/A')
})
t('loadSavedState: corrupt subject is skipped + reported, valid ones loaded, Advisor math has no NaN', () => {
  const s = initialState(); mem.set('ssuet-smart-campus-demo', JSON.stringify({ version: 1, state: { ...s, subjects: [...s.subjects.slice(0, 2), { id: 'bad', name: 'Broken', obtained: 'abc', total: 100, creditHours: 3 }] } }))
  const l = loadSavedState()!; assert.equal(l.state.subjects.length, 2); assert.equal(l.skippedSubjects.length, 1)
  const a = analyse(l.state.subjects); assert.ok(Number.isFinite(a.overallPct) && Number.isFinite(a.estimatedGpa))
})
t('subject quarantine is stored under its own key, de-duplicated, and does not touch the complaint quarantine', () => {
  assert.equal(quarantineRecords([{ id: 'bad' }], SUBJECT_QUARANTINE_KEY), 1); assert.equal(quarantineRecords([{ id: 'bad' }], SUBJECT_QUARANTINE_KEY), 1)
  assert.equal(readQuarantine(SUBJECT_QUARANTINE_KEY).length, 1); assert.equal(readQuarantine(QUARANTINE_KEY).length, 0); assert.notEqual(SUBJECT_QUARANTINE_KEY, QUARANTINE_KEY)
})
console.log(`\n${n} checks passed`)
