'use client';
import { useState } from 'react';
import type { IntakeProfile, ExpandResponse } from '@/lib/schemas';
import { IntakeProfileSchema } from '@/lib/schemas';

export default function FallbackPage() {
  const [profile, setProfile] = useState<Partial<IntakeProfile>>({
    year: 'freshman',
    major_category: 'stem',
    first_gen: false,
    aid_status: 'none',
    hours_per_week: 10,
    interests: ['ai_ml'],
    mode: 'discovery',
  });
  const [result, setResult] = useState<ExpandResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = IntakeProfileSchema.safeParse(profile);
    if (!parsed.success) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/expand-node', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          profile: parsed.data,
          parent_id: 'root',
          path_trace: [],
          requestId: `fallback-${Date.now()}`,
        }),
      });
      const json: ExpandResponse = await resp.json();
      setResult(json);
      if (!json.ok) setError(json.error);
    } catch (e) {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper px-6 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-display font-bold text-ink mb-2">
          Pathway — Linear Fallback
        </h1>
        <p className="text-body text-ink-2 mb-6">
          Simplified mode: tell us about you, see 3 moves for the next 30 days.
        </p>

        <form
          onSubmit={onSubmit}
          className="space-y-4 bg-cream border border-line rounded-md p-5 shadow-card"
        >
          <div>
            <label className="block text-meta text-ink-2 mb-1">Year</label>
            <select
              className="w-full border border-line rounded px-2 py-1 bg-paper"
              value={profile.year}
              onChange={(e) =>
                setProfile((p) => ({ ...p, year: e.target.value as any }))
              }
            >
              <option value="freshman">Freshman</option>
              <option value="sophomore">Sophomore</option>
              <option value="junior">Junior</option>
              <option value="senior">Senior</option>
            </select>
          </div>

          <div>
            <label className="block text-meta text-ink-2 mb-1">
              Major area
            </label>
            <select
              className="w-full border border-line rounded px-2 py-1 bg-paper"
              value={profile.major_category}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  major_category: e.target.value as any,
                }))
              }
            >
              <option value="stem">STEM</option>
              <option value="humanities">Humanities</option>
              <option value="social_science">Social Science</option>
              <option value="undeclared">Undeclared</option>
            </select>
          </div>

          <div>
            <label className="block text-meta text-ink-2 mb-1">
              Hours per week
            </label>
            <input
              type="number"
              min={0}
              max={40}
              className="w-full border border-line rounded px-2 py-1 bg-paper"
              value={profile.hours_per_week}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  hours_per_week: Number(e.target.value),
                }))
              }
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-body text-ink-2">
              <input
                type="checkbox"
                checked={profile.first_gen}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, first_gen: e.target.checked }))
                }
              />
              First-generation
            </label>
          </div>

          <div>
            <label className="block text-meta text-ink-2 mb-1">
              Financial aid
            </label>
            <select
              className="w-full border border-line rounded px-2 py-1 bg-paper"
              value={profile.aid_status}
              onChange={(e) =>
                setProfile((p) => ({ ...p, aid_status: e.target.value as any }))
              }
            >
              <option value="none">None</option>
              <option value="pell">Pell Grant</option>
              <option value="work_study">Work Study</option>
            </select>
          </div>

          <div>
            <label className="block text-meta text-ink-2 mb-1">
              Interests (comma-separated, up to 3)
            </label>
            <input
              className="w-full border border-line rounded px-2 py-1 bg-paper"
              defaultValue={(profile.interests ?? []).join(', ')}
              onChange={(e) => {
                const list = e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 3);
                setProfile((p) => ({ ...p, interests: list }));
              }}
            />
          </div>

          <div>
            <label className="block text-meta text-ink-2 mb-1">Mode</label>
            <select
              className="w-full border border-line rounded px-2 py-1 bg-paper"
              value={profile.mode}
              onChange={(e) =>
                setProfile((p) => ({ ...p, mode: e.target.value as any }))
              }
            >
              <option value="discovery">Discovery</option>
              <option value="directed">Directed</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ucla-blue text-cream rounded px-4 py-2 font-semibold disabled:opacity-50"
          >
            {loading ? 'Thinking…' : 'Show my 3 moves'}
          </button>

          {error && <div className="text-urgent text-meta">{error}</div>}
        </form>

        {result?.ok && (
          <ul className="mt-8 space-y-4">
            {result.children.map((c) => (
              <li
                key={c.id}
                className="rounded-md bg-cream border-l-4 border-ucla-blue border-y border-r border-line p-4 shadow-card"
              >
                <div className="text-h2 font-semibold text-ink">{c.title}</div>
                <div className="text-body text-ink-2 mt-1">{c.why_this}</div>
                {c.source_url && (
                  <a
                    href={c.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-2 text-meta text-ucla-blue underline"
                  >
                    Source
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
