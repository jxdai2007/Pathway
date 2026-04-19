import React from 'react';

type ModeEnum = 'directed' | 'partial' | 'discovery';

function getSuggestions(mode: ModeEnum | null, major: string): string[] {
  const directed = mode === 'directed';

  if (/comput|cs|software/i.test(major)) {
    return directed
      ? ['PhD in AI/ML', 'SWE internship at a top company', 'Launch a startup by senior year', 'Full-ride CS grad school', 'Research + publish a paper']
      : ['AI / ML', 'Cybersecurity', 'Backend / systems', 'Full-stack + product', 'Data science'];
  }

  if (/bio|neuro|chem/i.test(major)) {
    return directed
      ? ['Medical school', 'PhD in neuroscience', 'Public health research', 'Biotech industry job', 'Clinical research role']
      : ['Pre-med pathway', 'Wet-lab research', 'Computational bio', 'Public health', 'Biotech industry'];
  }

  if (/econ|business|math/i.test(major)) {
    return directed
      ? ['Investment banking analyst', 'Quant research role', 'Policy / think-tank fellowship', 'Economics PhD', 'Consulting role']
      : ['Quant / finance', 'Economics research', 'Policy / public interest', 'Data + business', 'Entrepreneurship'];
  }

  return directed
    ? ['Graduate school in my field', 'Industry job after graduation', 'Research experience before applying', 'Fellowship or scholarship', 'Starting something of my own']
    : ['Research track', 'Industry track', 'Creative / applied track', 'Policy / public interest', 'Entrepreneurship'];
}

function toggleChip(current: string, chip: string): string {
  const parts = current
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const idx = parts.indexOf(chip);
  if (idx >= 0) {
    parts.splice(idx, 1);
  } else {
    parts.push(chip);
  }
  return parts.join(', ');
}

export function GoalSuggestions({
  mode,
  major,
  value,
  onPick,
}: {
  mode: ModeEnum | null;
  major: string;
  value: string;
  onPick: (v: string) => void;
}) {
  const suggestions = getSuggestions(mode, major);
  const active = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div>
      <p className="text-meta text-ink-3 mb-2">Tap to add; tap again to remove.</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((chip) => {
          const isActive = active.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onPick(toggleChip(value, chip))}
              className={[
                'px-3 py-1.5 rounded-md border text-meta transition-colors',
                isActive
                  ? 'bg-ucla-blue text-cream border-ucla-blue'
                  : 'border-line text-ink-2 hover:border-ucla-blue hover:text-ink',
              ].join(' ')}
            >
              {chip}
            </button>
          );
        })}
      </div>
    </div>
  );
}
