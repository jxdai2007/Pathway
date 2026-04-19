import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) return NextResponse.json({ ok:false, error:'no file' }, { status:400 });
    const ab = await file.arrayBuffer();
    const b64 = Buffer.from(ab).toString('base64');
    const media_type = (file.type && file.type.includes('pdf')) ? 'application/pdf' : 'application/pdf';

    const prompt = `You will be given a student's resume. Extract a profile that matches EXACTLY this JSON shape:
{
  "name": string,
  "year": "Freshman"|"Sophomore"|"Junior"|"Senior"|"Grad",
  "majorStatus": "Declared · CS"|"Declared · other STEM"|"Declared · non-STEM"|"Undeclared"|"Exploring",
  "interests": array of up to 3 strings from ["AI / ML","Web & mobile","Systems","Data science","Design / HCI","Research","Founding / startup","Teaching","Security"],
  "background": array of strings from ["First-gen","Transfer","International","Pre-med","Pre-law","Athlete","Working 10+ hrs/week","Caretaker at home"],
  "hoursPerWeek": integer 0-30,
  "why": string of at most 300 chars, a first-person sentence about what pulls them
}
Rules:
- If the resume doesn't explicitly state first-gen or transfer, omit from background.
- Pick interests based on listed projects/coursework/keywords.
- Year: if not obvious, infer from graduation year (2028=freshman, 2027=soph, 2026=junior, 2025=senior; grad student if pursuing Masters/PhD).
- hoursPerWeek: estimate from listed activities; default 8 if unclear.
- Output ONLY the JSON, no prose, no markdown fences.`;

    const resp = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type, data: b64 } } as any,
          { type: 'text', text: prompt },
        ],
      }],
    });
    const text = resp.content.map((b:any)=>b.type==='text'?b.text:'').join('').trim();
    const jsonStart = text.indexOf('{'); const jsonEnd = text.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd <= jsonStart) return NextResponse.json({ ok:false, error:'no_json', raw:text.slice(0,500) }, { status:502 });
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd+1));
    return NextResponse.json({ ok:true, answers: parsed });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}
