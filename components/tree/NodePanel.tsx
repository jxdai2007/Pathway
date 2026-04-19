'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { usePathwayStore } from '@/store/pathway';

export function NodePanel() {
  const selectedId = usePathwayStore((s) => s.selectedId);
  const node = usePathwayStore((s) => (selectedId ? s.nodesById[selectedId] : null));
  const setSelected = usePathwayStore((s) => s.setSelected);
  const toggleTodoDone = usePathwayStore((s) => s.toggleTodoDone);

  if (!node) return (
    <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>
  );

  const copyEmail = async () => {
    if (!node.outreach_email_draft) return;
    const { subject, body } = node.outreach_email_draft;
    const mail = `mailto:${encodeURIComponent(node.human_contact?.email_or_office ?? '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); } catch {}
    window.location.href = mail;
  };

  return (
    <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelected(null)}>
      <SheetContent className="w-[420px] sm:max-w-[420px] bg-cream border-l border-line overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-h1 text-ink">{node.title}</SheetTitle>
          {node.description && <SheetDescription className="text-body text-ink-2">{node.description}</SheetDescription>}
        </SheetHeader>

        <div className="space-y-5 mt-5 px-1">
          {node.why_this && (
            <section>
              <h3 className="text-meta font-semibold text-ink mb-1 uppercase tracking-wider">Why this fits</h3>
              <p className="text-body text-ink-2">{node.why_this}</p>
            </section>
          )}

          {node.why_now && (
            <section>
              <h3 className="text-meta font-semibold text-ink mb-1 uppercase tracking-wider">Why now</h3>
              <p className="text-body text-ink-2">{node.why_now}</p>
            </section>
          )}

          {node.todos.length > 0 && (
            <section>
              <h3 className="text-meta font-semibold text-ink mb-2 uppercase tracking-wider">Your next steps</h3>
              <ul className="space-y-2">
                {node.todos.map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Checkbox checked={t.done} onCheckedChange={() => toggleTodoDone(node.id, i)} className="mt-1" />
                    <span className={`text-body ${t.done ? 'line-through text-ink-3' : 'text-ink'}`}>{t.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {node.human_contact && (
            <section className="rounded-md border border-line p-3 bg-paper-2">
              <h3 className="text-meta font-semibold text-ink mb-1 uppercase tracking-wider">Before you decide — talk to a real advisor.</h3>
              <p className="text-body text-ink-2">
                {node.human_contact.name} · {node.human_contact.role}<br />
                {node.human_contact.email_or_office}
              </p>
            </section>
          )}

          {node.outreach_email_draft && (
            <section>
              <h3 className="text-meta font-semibold text-ink mb-1 uppercase tracking-wider">Draft outreach email</h3>
              <div className="text-body border border-line rounded-md p-3 bg-paper">
                <div className="font-semibold text-ink">Subject: {node.outreach_email_draft.subject}</div>
                <div className="mt-2 whitespace-pre-wrap text-ink-2">{node.outreach_email_draft.body}</div>
              </div>
              <Button onClick={copyEmail} className="mt-3 w-full bg-ucla-blue text-cream hover:bg-ucla-darkblue">
                Copy & open mail client
              </Button>
            </section>
          )}

          {node.source_url && (
            <section>
              <a href={node.source_url} target="_blank" rel="noreferrer" className="text-meta text-ucla-blue underline hover:text-ucla-darkblue">
                Source: {node.source_url}
              </a>
            </section>
          )}

          {node.estimated_time_cost && (
            <section>
              <div className="text-tiny text-ink-3">Estimated time: {node.estimated_time_cost}</div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
