export function PanelEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-10 py-12 text-center">
      <div className="text-2xl font-bold text-[#1e3a5f] font-[Caveat,cursive]">pick a first move</div>
      <div className="max-w-xs text-sm italic text-[#6b6658]">open the dashed prompt on the left — three options will appear.</div>
    </div>
  );
}
