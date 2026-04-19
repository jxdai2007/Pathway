'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SlideShell } from './SlideShell';
import { GoalSuggestions } from './GoalSuggestions';
import { IntakeProfileSchema } from '@/lib/schemas';
import { useProfileStore } from '@/store/profile';
import personas from '@/data/ucla/personas.json';

// ---- Types ----
type YearEnum = 'freshman' | 'sophomore' | 'junior' | 'senior';
type MajorCategoryEnum = 'stem' | 'humanities' | 'social_science' | 'undeclared';
type AidStatusEnum = 'pell' | 'work_study' | 'none';
type ModeEnum = 'directed' | 'partial' | 'discovery';

const STEPS = ['welcome', 'year', 'major', 'hours', 'aid', 'firstgen', 'interests', 'mode', 'goal', 'ready'] as const;
type Step = typeof STEPS[number];

// Steps that show progress dots (skip welcome + ready)
const DOT_STEPS = STEPS.slice(1, -1); // year..mode = 8 steps

const YEAR_OPTIONS: { label: string; value: YearEnum }[] = [
  { label: 'Freshman', value: 'freshman' },
  { label: 'Sophomore', value: 'sophomore' },
  { label: 'Junior', value: 'junior' },
  { label: 'Senior', value: 'senior' },
];

const AID_OPTIONS: { label: string; value: AidStatusEnum }[] = [
  { label: 'Pell grant', value: 'pell' },
  { label: 'Work-study', value: 'work_study' },
  { label: 'No aid', value: 'none' },
  { label: 'Prefer not to say', value: 'none' },
];

const INTEREST_OPTIONS = ['AI/ML', 'data', 'storytelling', 'math', 'teaching', 'cybersec', 'policy', 'bio', 'design'];

function slugInterest(s: string): string {
  return s.toLowerCase().replace(/\//g, '_').trim();
}

function majorToCategory(major: string): MajorCategoryEnum {
  if (/comput|cs|software/i.test(major)) return 'stem';
  if (/bio|neuro|chem|physic|math|engineer/i.test(major)) return 'stem';
  if (/econ|business/i.test(major)) return 'social_science';
  if (/english|history|philosoph|art|literature|language/i.test(major)) return 'humanities';
  if (/sociol|psychol|polit|anthropol/i.test(major)) return 'social_science';
  return 'undeclared';
}

const maya = personas.find((p) => p.key === 'maya')!;

export function Onboarding() {
  const router = useRouter();
  const setProfile = useProfileStore((s) => s.setProfile);

  const [step, setStep] = useState<Step>('welcome');
  const [year, setYear] = useState<YearEnum | null>(null);
  const [majorText, setMajorText] = useState('');
  const [hours, setHours] = useState<number>(8);
  const [aid, setAid] = useState<AidStatusEnum | null>(null);
  // 'pns' = Prefer not to say (coerced to false on submit); null = unselected
  const [firstGen, setFirstGen] = useState<boolean | 'pns' | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [mode, setMode] = useState<ModeEnum | null>(null);
  const [goal, setGoal] = useState('');
  const [aidLabel, setAidLabel] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stepIndex = STEPS.indexOf(step);

  const goBack = useCallback(() => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  }, [stepIndex]);

  const goNext = useCallback(() => {
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]);
  }, [stepIndex]);

  const autoAdvance = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      goNext();
    }, 180);
  }, [goNext]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inTextarea = document.activeElement?.tagName === 'TEXTAREA';
      if (e.key === 'ArrowLeft') goBack();
      if (e.key === 'ArrowRight' && canAdvance()) goNext();
      if (e.key === 'Enter' && !inTextarea) {
        if (step === 'welcome') goNext();
        else if (canAdvance()) goNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, goBack, goNext, year, majorText, hours, aid, firstGen, interests, mode]);

  function canAdvance(): boolean {
    switch (step) {
      case 'welcome': return true;
      case 'year': return year !== null;
      case 'major': return majorText.trim().length > 0;
      case 'hours': return true;
      case 'aid': return aid !== null;
      case 'firstgen': return firstGen !== null; // null = unselected; true/false/'pns' all valid
      case 'interests': return interests.length >= 1;
      case 'mode': return mode !== null;
      case 'goal': return true;
      case 'ready': return true;
      default: return false;
    }
  }

  function handleDemoMaya() {
    const p = maya.profile as {
      year: YearEnum; major_category: MajorCategoryEnum; first_gen: boolean;
      aid_status: AidStatusEnum; hours_per_week: number; interests: string[];
      mode: ModeEnum; end_goal?: string;
    };
    setYear(p.year);
    setMajorText('Computer Science'); // representative major for Maya (stem)
    setHours(p.hours_per_week);
    setAid(p.aid_status);
    setAidLabel(p.aid_status === 'pell' ? 'Pell grant' : p.aid_status === 'work_study' ? 'Work-study' : 'No aid');
    setFirstGen(p.first_gen === true ? true : false);
    // interests are already slugged in persona; convert back to display for UI
    const displayInterests = p.interests.map((s) =>
      s === 'ai_ml' ? 'AI/ML' : s === 'storytelling' ? 'storytelling' : s
    );
    setInterests(displayInterests);
    setMode(p.mode);
    setGoal(p.end_goal ?? '');
    setStep('ready');
  }

  function handleSubmit() {
    setSubmitError(null);
    const sluggedInterests = interests.map(slugInterest).slice(0, 3);
    const candidate = {
      year: year!,
      major_category: majorToCategory(majorText),
      first_gen: firstGen === true ? true : false,
      aid_status: aid!,
      hours_per_week: hours,
      interests: sluggedInterests,
      mode: mode!,
      ...(goal.trim() ? { end_goal: goal.trim().slice(0, 300) } : {}),
    };
    const result = IntakeProfileSchema.safeParse(candidate);
    if (!result.success) {
      setSubmitError(result.error.issues.map((i) => i.message).join('; '));
      return;
    }
    setProfile(result.data);
    router.push('/pathway');
  }

  // ---- Dot header ----
  const dotIndex = DOT_STEPS.indexOf(step as typeof DOT_STEPS[number]);

  function renderHeader() {
    return (
      <header className="flex items-center justify-between px-6 py-4 border-b border-line bg-cream">
        <div className="flex items-center gap-1.5">
          {DOT_STEPS.map((s, i) => {
            let cls = 'w-2 h-2 rounded-full transition-colors ';
            if (dotIndex < 0) {
              cls += 'bg-line'; // welcome or ready
            } else if (i < dotIndex) {
              cls += 'bg-ucla-blue'; // done
            } else if (i === dotIndex) {
              cls += 'bg-ucla-blue opacity-100 scale-125'; // current
            } else {
              cls += 'bg-line'; // future
            }
            return <span key={s} className={cls} />;
          })}
        </div>
        <button
          type="button"
          onClick={handleDemoMaya}
          className="text-meta text-ink-3 hover:text-ink underline underline-offset-2 transition-colors"
        >
          Use demo · Maya
        </button>
      </header>
    );
  }

  // ---- Choice button ----
  function ChoiceBtn({
    label, active, onClick,
  }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          'w-full text-left px-4 py-3 rounded-md border text-body transition-colors mb-2',
          active
            ? 'bg-ucla-blue text-cream border-ucla-blue'
            : 'border-line text-ink hover:border-ucla-blue hover:bg-paper-2',
        ].join(' ')}
      >
        {label}
      </button>
    );
  }

  // ---- Slides ----
  function renderSlide() {
    switch (step) {
      case 'welcome':
        return (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="text-tiny uppercase tracking-wider text-ink-3 mb-3">Pathway · UCLA</div>
            <h1 className="text-display font-bold text-ink mb-4 leading-tight">
              The mentor who&rsquo;s been at UCLA for ten years.
              <br />
              <span className="text-ink-3 font-semibold">On demand. With citations.</span>
            </h1>
            <p className="text-body text-ink-2 mb-8 max-w-md mx-auto">
              A few quick questions. Then we&rsquo;ll sketch your next two years as a tree you can walk through, branching on what feels right to you.
              <br />
              <span className="text-ink-3">Nothing leaves your device. No account.</span>
            </p>
            <button
              type="button"
              onClick={goNext}
              className="bg-ucla-blue text-cream px-8 py-3 rounded-md text-body font-semibold hover:bg-ucla-darkblue transition-colors"
            >
              Let&rsquo;s start &rarr;
            </button>
          </div>
        );

      case 'year':
        return (
          <SlideShell qnum={1} total={8} question="What year are you?" sub="This helps us calibrate timing and eligibility.">
            {YEAR_OPTIONS.map((opt) => (
              <ChoiceBtn
                key={opt.value}
                label={opt.label}
                active={year === opt.value}
                onClick={() => {
                  setYear(opt.value);
                  autoAdvance();
                }}
              />
            ))}
          </SlideShell>
        );

      case 'major':
        return (
          <SlideShell qnum={2} total={8} question="What's your major (or area of interest)?" sub="Type anything — we'll map it.">
            <input
              type="text"
              value={majorText}
              onChange={(e) => setMajorText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && majorText.trim()) goNext(); }}
              placeholder="e.g. Computer Science, Biology, History..."
              className="w-full px-4 py-3 rounded-md border border-line bg-cream text-ink text-body placeholder:text-ink-4 focus:outline-none focus:border-ucla-blue"
              autoFocus
            />
            <button
              type="button"
              onClick={goNext}
              disabled={!majorText.trim()}
              className="mt-4 bg-ucla-blue text-cream px-6 py-2.5 rounded-md text-body font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Next &rarr;
            </button>
          </SlideShell>
        );

      case 'hours':
        return (
          <SlideShell qnum={3} total={8} question="How many hours per week can you commit?" sub="Be honest — we'll suggest things you can actually do.">
            <div className="mb-4">
              <span className="text-display font-bold text-ucla-blue">{hours}</span>
              <span className="text-body text-ink-3 ml-1">hrs / week</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full accent-ucla-blue"
            />
            <div className="flex justify-between text-meta text-ink-4 mt-1">
              <span>0</span>
              <span>40</span>
            </div>
            <button
              type="button"
              onClick={goNext}
              className="mt-6 bg-ucla-blue text-cream px-6 py-2.5 rounded-md text-body font-semibold hover:opacity-90 transition-opacity"
            >
              Next &rarr;
            </button>
          </SlideShell>
        );

      case 'aid':
        return (
          <SlideShell qnum={4} total={8} question="What's your financial aid situation?" sub="Helps surface paid opportunities and scholarships.">
            {AID_OPTIONS.map((opt) => (
              <ChoiceBtn
                key={opt.label}
                label={opt.label}
                active={aidLabel === opt.label}
                onClick={() => {
                  setAidLabel(opt.label);
                  setAid(opt.value);
                  autoAdvance();
                }}
              />
            ))}
          </SlideShell>
        );

      case 'firstgen':
        return (
          <SlideShell qnum={5} total={8} question="Are you a first-generation college student?" sub="First-gen students often qualify for special programs and support.">
            {[
              { label: 'Yes', value: true as boolean | 'pns' },
              { label: 'No', value: false as boolean | 'pns' },
              { label: 'Prefer not to say', value: 'pns' as boolean | 'pns' },
            ].map((opt) => (
              <ChoiceBtn
                key={opt.label}
                label={opt.label}
                active={firstGen === opt.value}
                onClick={() => {
                  setFirstGen(opt.value);
                  autoAdvance();
                }}
              />
            ))}
          </SlideShell>
        );

      case 'interests':
        return (
          <SlideShell qnum={6} total={8} question="What are your interests?" sub="Pick up to 3 that resonate most.">
            <div className="flex flex-wrap gap-2 mb-4">
              {INTEREST_OPTIONS.map((opt) => {
                const active = interests.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setInterests(interests.filter((i) => i !== opt));
                      } else if (interests.length < 3) {
                        setInterests([...interests, opt]);
                      }
                    }}
                    className={[
                      'px-3 py-1.5 rounded-md border text-body transition-colors',
                      active
                        ? 'bg-ucla-blue text-cream border-ucla-blue'
                        : 'border-line text-ink hover:border-ucla-blue',
                    ].join(' ')}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <p className="text-meta text-ink-4 mb-4">{interests.length}/3 selected</p>
            <button
              type="button"
              onClick={goNext}
              disabled={interests.length === 0}
              className="bg-ucla-blue text-cream px-6 py-2.5 rounded-md text-body font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Next &rarr;
            </button>
          </SlideShell>
        );

      case 'mode':
        return (
          <SlideShell qnum={7} total={8} question="How do you like to explore?" sub="This shapes whether we give you a clear path or open exploration.">
            {[
              { label: 'Directed — I know what I want, show me the steps', value: 'directed' as ModeEnum },
              { label: 'Discovery — I\'m still figuring it out, surprise me', value: 'discovery' as ModeEnum },
            ].map((opt) => (
              <ChoiceBtn
                key={opt.value}
                label={opt.label}
                active={mode === opt.value}
                onClick={() => {
                  setMode(opt.value);
                  autoAdvance();
                }}
              />
            ))}
          </SlideShell>
        );

      case 'goal':
        return (
          <SlideShell qnum={8} total={8} question="What's your end goal?" sub="Optional but helpful. Describe in your own words.">
            <GoalSuggestions
              mode={mode}
              major={majorText}
              value={goal}
              onPick={(v) => setGoal(v)}
            />
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value.slice(0, 300))}
              placeholder="e.g. Apply to PhD programs in AI/ML..."
              rows={4}
              className="w-full mt-4 px-4 py-3 rounded-md border border-line bg-cream text-ink text-body placeholder:text-ink-4 focus:outline-none focus:border-ucla-blue resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-meta text-ink-4">{goal.length}/300</span>
              <button
                type="button"
                onClick={goNext}
                className="bg-ucla-blue text-cream px-6 py-2.5 rounded-md text-body font-semibold hover:opacity-90 transition-opacity"
              >
                Next &rarr;
              </button>
            </div>
          </SlideShell>
        );

      case 'ready': {
        const firstGenLabel = firstGen === true ? 'Yes' : firstGen === 'pns' ? 'Prefer not to say' : 'No';
        const aidLabel = aid === 'pell' ? 'Pell grant' : aid === 'work_study' ? 'Work-study' : 'No aid';
        return (
          <div className="max-w-xl mx-auto">
            <h2 className="text-h1 font-bold text-ink mb-1">Ready to build your pathway?</h2>
            <p className="text-body text-ink-2 mb-6">Here&rsquo;s what we&rsquo;ve got. Looks right?</p>
            <div className="bg-cream border border-line rounded-lg p-5 mb-6 space-y-3">
              <SummaryRow label="Year" value={year ?? ''} />
              <SummaryRow label="Major" value={majorText} />
              <SummaryRow label="Hours / week" value={String(hours)} />
              <SummaryRow label="Aid" value={aidLabel} />
              <SummaryRow label="First-gen" value={firstGenLabel} />
              <SummaryRow label="Interests" value={interests.join(', ')} />
              <SummaryRow label="Mode" value={mode ?? ''} />
              {goal.trim() && <SummaryRow label="Goal" value={goal.trim()} />}
            </div>
            {submitError && (
              <p className="text-meta text-urgent mb-4">{submitError}</p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full bg-ucla-blue text-cream px-6 py-3 rounded-md text-body font-semibold hover:opacity-90 transition-opacity"
            >
              Generate my tree &rarr;
            </button>
            <button
              type="button"
              onClick={goBack}
              className="w-full mt-2 text-meta text-ink-3 hover:text-ink underline underline-offset-2 transition-colors"
            >
              &larr; Go back
            </button>
          </div>
        );
      }

      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {renderHeader()}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        {renderSlide()}
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-body">
      <span className="text-ink-3 min-w-[110px] shrink-0">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  );
}
