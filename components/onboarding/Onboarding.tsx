'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './onboarding.module.css';
import { IntakeProfileSchema, type IntakeProfile } from '@/lib/schemas';
import { useProfileStore } from '@/store/profile';
import { FreehandUnderline } from '@/components/notebook/rough/FreehandUnderline';

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad'] as const;
const MAJORS = ['Declared · CS', 'Declared · other STEM', 'Declared · non-STEM', 'Undeclared', 'Exploring'] as const;
const INTERESTS = ['AI / ML', 'Web & mobile', 'Systems', 'Data science', 'Design / HCI', 'Research', 'Founding / startup', 'Teaching', 'Security'] as const;
const BACKGROUND = ['First-gen', 'Transfer', 'International', 'Pre-med', 'Pre-law', 'Athlete', 'Working 10+ hrs/week', 'Caretaker at home'] as const;

type Answers = {
  name: string;
  year: string;
  majorStatus: string;
  interests: string[];
  background: string[];
  hoursPerWeek: number;
  why: string;
};

const defaultAnswers: Answers = {
  name: '',
  year: '',
  majorStatus: '',
  interests: [],
  background: [],
  hoursPerWeek: 8,
  why: '',
};

const STORE_KEY = 'pathway.onboarding.v3';

function loadAnswers(): Answers {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...defaultAnswers };
    return { ...defaultAnswers, ...JSON.parse(raw) };
  } catch (_) {
    return { ...defaultAnswers };
  }
}

function saveAnswers(a: Answers) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(a));
  } catch (_) {}
}

// Page IDs in order
const PAGE_IDS = ['welcome', 'name', 'year', 'major', 'interests', 'background', 'hours', 'why', 'review'] as const;
type PageId = typeof PAGE_IDS[number];
const TOTAL_PAGES = PAGE_IDS.length;

// Back arrow path: freehandArrow('left')
const BACK_ARROW_D = 'M60 20 Q46 17.5 34 20.2 T8 20.4 M16 12 Q11 18 8 20.4 Q11 22 16 28';
// Forward arrow path: freehandArrow('right')
const NEXT_ARROW_D = 'M4 20 Q18 17.5 30 20.2 T56 20.4 M48 12 Q53 18 56 20.4 Q53 22 48 28';

export function Onboarding() {
  const router = useRouter();
  const [pageIdx, setPageIdx] = useState(0);
  const [answers, setAnswersState] = useState<Answers>(() => defaultAnswers);
  const [isEntering, setIsEntering] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [interestsHint, setInterestsHint] = useState('0/3 selected.');
  const answersRef = useRef<Answers>(defaultAnswers);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const whyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadAnswers();
    setAnswersState(loaded);
    answersRef.current = loaded;
    setInterestsHint(`${loaded.interests.length}/3 selected.`);
  }, []);

  function setAnswers(a: Answers) {
    answersRef.current = a;
    setAnswersState(a);
    saveAnswers(a);
  }

  const currentPageId: PageId = PAGE_IDS[pageIdx];
  const isFirst = pageIdx === 0;
  const isLast = pageIdx === TOTAL_PAGES - 1;

  function validate(idx: number): boolean {
    const id = PAGE_IDS[idx];
    const a = answersRef.current;
    switch (id) {
      case 'welcome': return true;
      case 'name': return !!a.name.trim();
      case 'year': return !!a.year;
      case 'major': return !!a.majorStatus;
      case 'interests': return a.interests.length > 0;
      case 'background': return true;
      case 'hours': return true;
      case 'why': return true;
      case 'review': return true;
      default: return false;
    }
  }

  function goToPage(idx: number) {
    if (idx < 0 || idx >= TOTAL_PAGES) return;
    if (idx === pageIdx) return;
    setIsLeaving(true);
    setTimeout(() => {
      setIsLeaving(false);
      setPageIdx(idx);
      setIsEntering(true);
      setTimeout(() => setIsEntering(false), 420);
    }, 220);
  }

  function goToPageById(id: string) {
    const i = PAGE_IDS.indexOf(id as PageId);
    if (i >= 0) goToPage(i);
  }

  function tryAdvance() {
    if (!validate(pageIdx)) return;
    if (isLast) {
      finalize();
      return;
    }
    goToPage(pageIdx + 1);
  }

  function tryBack() {
    if (pageIdx === 0) return;
    goToPage(pageIdx - 1);
  }

  // Keydown handler
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName || '';
      const inTextarea = tag === 'TEXTAREA';
      if (inTextarea) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        tryAdvance();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        tryBack();
      } else if (e.key === 'Enter' && tag !== 'TEXTAREA' && tag !== 'INPUT') {
        e.preventDefault();
        tryAdvance();
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx]);

  // Autofocus on name page
  useEffect(() => {
    if (currentPageId === 'name') {
      setTimeout(() => nameInputRef.current?.focus(), 120);
    }
  }, [currentPageId]);

  // Entry animation on mount
  useEffect(() => {
    setIsEntering(true);
    setTimeout(() => setIsEntering(false), 420);
  }, []);

  function finalize() {
    const a = answersRef.current;
    const yearMap: Record<string, IntakeProfile['year']> = {
      Freshman: 'freshman',
      Sophomore: 'sophomore',
      Junior: 'junior',
      Senior: 'senior',
      Grad: 'grad',
    };
    const majorMap: Record<string, IntakeProfile['major_category']> = {
      'Declared · CS': 'stem',
      'Declared · other STEM': 'stem',
      'Declared · non-STEM': 'humanities',
      'Undeclared': 'undeclared',
      'Exploring': 'undeclared',
    };
    const major_category = majorMap[a.majorStatus] ?? 'undeclared';
    const isDeclared = a.majorStatus.startsWith('Declared');
    const mode: IntakeProfile['mode'] =
      !isDeclared ? 'discovery' : (a.why.trim().length > 0 ? 'directed' : 'partial');
    const profile: IntakeProfile = {
      year: yearMap[a.year],
      major_category,
      first_gen: a.background.includes('First-gen'),
      aid_status: 'none',
      hours_per_week: a.hoursPerWeek,
      interests: a.interests.slice(0, 3),
      mode,
      ...(a.why.trim() ? { end_goal: a.why.trim().slice(0, 300) } : {}),
      ...(a.background.length ? { background: a.background } : {}),
      ...(a.name.trim() ? { name: a.name.trim() } : {}),
    };
    const parsed = IntakeProfileSchema.safeParse(profile);
    if (!parsed.success) {
      console.error('profile validation failed', parsed.error.issues);
      return;
    }
    useProfileStore.getState().setProfile(parsed.data);
    router.push('/pathway');
  }

  function toggleMultiPill(key: 'interests' | 'background', val: string, max: number) {
    const a = answersRef.current;
    const arr = [...a[key]];
    const idx = arr.indexOf(val);
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else if (arr.length < max) {
      arr.push(val);
    }
    const next = { ...a, [key]: arr };
    setAnswers(next);
    if (key === 'interests') {
      setInterestsHint(`${arr.length}/3 selected.`);
    }
  }

  function setSinglePill(key: 'year' | 'majorStatus', val: string) {
    const next = { ...answersRef.current, [key]: val };
    setAnswers(next);
  }

  // Next button label
  let nextLabel = 'next';
  if (isLast) nextLabel = 'build my plan';
  else if (isFirst) nextLabel = 'begin';

  const nextIsPrimary = isFirst || isLast;
  const canNext = validate(pageIdx);

  function renderPage() {
    const a = answers;
    switch (currentPageId) {
      case 'welcome':
        return (
          <div className={`${styles.pageBody} ${styles.pageBodySingle}`}>
            <div>
              <div className={styles.qKicker}>a working notebook · intro</div>
              <h1 className={styles.qTitle}>
                Let&rsquo;s figure out<br />your pathway.
                <span className={styles.qUl}>
                  <FreehandUnderline width={460} seed={1} stroke="#c94c3a" strokeWidth={2.4} />
                </span>
              </h1>
              <div className={styles.qBody} style={{ marginTop: 22, maxWidth: 600 }}>
                <p style={{ fontFamily: "'Caveat', cursive", fontSize: 28, color: 'var(--ink-navy)', lineHeight: 1.2 }}>
                  Seven quick questions.<br />Then we build your plan.
                </p>
                <p style={{ marginTop: 20 }}>
                  I&rsquo;ll turn your answers into a 5-stage plan — direction, community, signal, summer, year-2 capstone. Everything lives in this notebook.
                </p>
                <p style={{ marginTop: 18, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                  no login. no email. answers save to this device.
                </p>
              </div>
              <div className={styles.welcomeStamp}>draft · v1</div>
            </div>
          </div>
        );

      case 'name':
        return (
          <div className={styles.pageBody}>
            <div>
              <div className={styles.qKicker}>01 · quick intro</div>
              <h1 className={styles.qTitle}>
                What should<br />I call you?
                <span className={styles.qUl}>
                  <FreehandUnderline width={380} seed={2} stroke="#c94c3a" strokeWidth={2.4} />
                </span>
              </h1>
              <div className={styles.qBody}>
                <p>A first name is fine. It&rsquo;ll show up in the marginalia on your plan.</p>
              </div>
            </div>
            <div>
              <div className={styles.aKicker}>your name →</div>
              <div className={styles.aArea}>
                <input
                  ref={nameInputRef}
                  className={styles.inkInput}
                  type="text"
                  placeholder="e.g. Maya"
                  value={a.name}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setAnswers({ ...answersRef.current, name: e.target.value.trim() })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      tryAdvance();
                    }
                  }}
                />
                <div className={styles.fieldHint}>stored on this device only.</div>
              </div>
            </div>
          </div>
        );

      case 'year':
        return (
          <div className={styles.pageBody}>
            <div>
              <div className={styles.qKicker}>02 · where are you</div>
              <h1 className={styles.qTitle}>
                What year<br />are you?
                <span className={styles.qUl}>
                  <FreehandUnderline width={320} seed={3} stroke="#c94c3a" strokeWidth={2.4} />
                </span>
              </h1>
              <div className={styles.qBody}>
                <p>Changes what stages are live — freshmen see the year-2 capstone, seniors get a shorter runway.</p>
              </div>
            </div>
            <div>
              <div className={styles.aKicker}>pick one →</div>
              <div className={styles.aArea}>
                <div className={styles.pillGroup}>
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      className={`${styles.pill}${a.year === y ? ' ' + styles.isSelected : ''}`}
                      onClick={() => setSinglePill('year', y)}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'major':
        return (
          <div className={styles.pageBody}>
            <div>
              <div className={styles.qKicker}>03 · direction</div>
              <h1 className={styles.qTitle}>
                Major status?
                <span className={styles.qUl}>
                  <FreehandUnderline width={340} seed={4} stroke="#c94c3a" strokeWidth={2.4} />
                </span>
              </h1>
              <div className={styles.qBody}>
                <p>Decides whether Stage 1 on your plan is &ldquo;declare&rdquo; vs. &ldquo;explore.&rdquo; Be honest — you can change this later.</p>
              </div>
            </div>
            <div>
              <div className={styles.aKicker}>pick one →</div>
              <div className={styles.aArea}>
                <div className={styles.pillGroup}>
                  {MAJORS.map((m) => (
                    <button
                      key={m}
                      className={`${styles.pill}${a.majorStatus === m ? ' ' + styles.isSelected : ''}`}
                      onClick={() => setSinglePill('majorStatus', m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'interests':
        return (
          <div className={styles.pageBody}>
            <div>
              <div className={styles.qKicker}>04 · what pulls you</div>
              <h1 className={`${styles.qTitle} ${styles.qTitleSm}`}>
                Which of these<br />sound like you?
                <span className={styles.qUl}>
                  <FreehandUnderline width={400} seed={5} stroke="#c94c3a" strokeWidth={2.4} />
                </span>
              </h1>
              <div className={styles.qBody}>
                <p>Pick <strong>up to 3</strong>. These drive which clubs, labs, and summer options surface on your plan.</p>
              </div>
            </div>
            <div>
              <div className={styles.aKicker}>select up to 3 →</div>
              <div className={styles.aArea}>
                <div className={styles.pillGroup}>
                  {INTERESTS.map((x) => (
                    <button
                      key={x}
                      className={`${styles.pill}${a.interests.includes(x) ? ' ' + styles.isSelected : ''}`}
                      onClick={() => toggleMultiPill('interests', x, 3)}
                    >
                      {x}
                    </button>
                  ))}
                </div>
                <div className={styles.fieldHint}>{interestsHint}</div>
              </div>
            </div>
          </div>
        );

      case 'background':
        return (
          <div className={styles.pageBody}>
            <div>
              <div className={styles.qKicker}>05 · context</div>
              <h1 className={`${styles.qTitle} ${styles.qTitleSm}`}>
                Anything I should<br />factor in?
                <span className={styles.qUl}>
                  <FreehandUnderline width={400} seed={6} stroke="#c94c3a" strokeWidth={2.4} />
                </span>
              </h1>
              <div className={styles.qBody}>
                <p>Optional. These unlock specific programs — AAP peer learning, first-gen-only grants, transfer orientation, etc.</p>
              </div>
            </div>
            <div>
              <div className={styles.aKicker}>select any →</div>
              <div className={styles.aArea}>
                <div className={styles.pillGroup}>
                  {BACKGROUND.map((x) => (
                    <button
                      key={x}
                      className={`${styles.pill}${a.background.includes(x) ? ' ' + styles.isSelected : ''}`}
                      onClick={() => toggleMultiPill('background', x, 99)}
                    >
                      {x}
                    </button>
                  ))}
                </div>
                <div className={styles.fieldHint}>feel free to skip — you can add later.</div>
              </div>
            </div>
          </div>
        );

      case 'hours':
        return (
          <div className={styles.pageBody}>
            <div>
              <div className={styles.qKicker}>06 · reality check</div>
              <h1 className={`${styles.qTitle} ${styles.qTitleSm}`}>
                Hours per week<br />for extras?
                <span className={styles.qUl}>
                  <FreehandUnderline width={380} seed={7} stroke="#c94c3a" strokeWidth={2.4} />
                </span>
              </h1>
              <div className={styles.qBody}>
                <p>After classes, studying, job, sleep. What&rsquo;s actually left for clubs, research, and side projects.</p>
              </div>
            </div>
            <div>
              <div className={styles.aKicker}>drag the slider →</div>
              <div className={styles.aArea}>
                <input
                  className={styles.slider}
                  id="q-hours"
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={a.hoursPerWeek}
                  onInput={(e) => {
                    const val = parseInt((e.target as HTMLInputElement).value, 10);
                    setAnswers({ ...answersRef.current, hoursPerWeek: val });
                  }}
                  onChange={() => {}}
                />
                <div className={styles.sliderTicks} style={{ maxWidth: 480 }}>
                  <span>0</span><span>10</span><span>20</span><span>30+</span>
                </div>
                <div>
                  <span className={styles.sliderVal}>{a.hoursPerWeek} hrs / week</span>
                </div>
                <div className={styles.fieldHint}>this paces the number of commitments per stage.</div>
              </div>
            </div>
          </div>
        );

      case 'why':
        return (
          <div className={styles.pageBody}>
            <div>
              <div className={styles.qKicker}>07 · freeform</div>
              <h1 className={`${styles.qTitle} ${styles.qTitleSm}`}>
                What pulls you<br />to this?
                <span className={styles.qUl}>
                  <FreehandUnderline width={360} seed={8} stroke="#c94c3a" strokeWidth={2.4} />
                </span>
              </h1>
              <div className={styles.qBody}>
                <p>A sentence or two. This shows up in the &ldquo;Why this fits you&rdquo; block on each stage card.</p>
              </div>
            </div>
            <div>
              <div className={styles.aKicker}>a line or two →</div>
              <div className={styles.aArea}>
                <textarea
                  ref={whyTextareaRef}
                  className={styles.inkTextarea}
                  rows={5}
                  placeholder="e.g. ML and making stuff that thinks is what pulls me in."
                  spellCheck={false}
                  value={a.why}
                  onChange={(e) => setAnswers({ ...answersRef.current, why: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 'review': {
        const row = (lbl: string, val: string, goto: string) => (
          <div className={styles.reviewRow} key={lbl}>
            <span className={styles.reviewLbl}>{lbl}</span>
            <span className={styles.reviewVal}>
              {val ? val : <em>— skipped —</em>}
            </span>
            <button className={styles.reviewEdit} onClick={() => goToPageById(goto)}>✎ edit</button>
          </div>
        );
        return (
          <div className={`${styles.pageBody} ${styles.pageBodySingle}`}>
            <div>
              <div className={styles.qKicker}>last look · review</div>
              <h1 className={`${styles.qTitle} ${styles.qTitleSm}`}>
                Does this<br />sound like you?
                <span className={styles.qUl}>
                  <FreehandUnderline width={400} seed={9} stroke="#c94c3a" strokeWidth={2.4} />
                </span>
              </h1>
              <div className={styles.qBody} style={{ maxWidth: 600 }}>
                <p>Tap ✎ to hop back and edit anything. When it reads right, hit <strong style={{ color: 'var(--ink-red)' }}>build my plan →</strong>.</p>
              </div>
              <div className={styles.reviewList} style={{ marginTop: 28 }}>
                {row('Name', a.name, 'name')}
                {row('Year', a.year, 'year')}
                {row('Major', a.majorStatus, 'major')}
                {row('Interests', a.interests.length ? a.interests.join(' · ') : '', 'interests')}
                {row('Context', a.background.length ? a.background.join(' · ') : '', 'background')}
                {row('Hours', `${a.hoursPerWeek} hrs / week`, 'hours')}
                {row('Why', a.why, 'why')}
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  const pageClasses = [
    styles.page,
    isEntering ? styles.isEntering : '',
    isLeaving ? styles.isLeaving : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.stage}>
      <div className={styles.kbdHint}>use <kbd>←</kbd> <kbd>→</kbd> to navigate</div>

      <div className={pageClasses}>
        {renderPage()}
      </div>

      <button
        className={`${styles.corner} ${styles.cornerBack}`}
        aria-label="back"
        disabled={isFirst}
        onClick={tryBack}
      >
        <svg className={styles.cornerSvg} viewBox="0 0 64 40">
          <path
            d={BACK_ARROW_D}
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span className={styles.cornerLbl}>back</span>
      </button>

      <button
        className={`${styles.corner} ${styles.cornerNext}${nextIsPrimary ? ' ' + styles.cornerPrimary : ''}`}
        aria-label="next"
        disabled={!canNext}
        onClick={tryAdvance}
      >
        <span className={styles.cornerLbl}>{nextLabel}</span>
        <svg className={styles.cornerSvg} viewBox="0 0 64 40">
          <path
            d={NEXT_ARROW_D}
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      <div className={styles.stageCounter}>
        page {pageIdx + 1} of {TOTAL_PAGES}
      </div>
    </div>
  );
}
