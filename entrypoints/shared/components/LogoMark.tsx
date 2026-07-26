interface LogoMarkProps {
  compact?: boolean;
}

export function LogoMark({ compact = false }: LogoMarkProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-xl bg-primary-500 shadow-sm shadow-primary-500/20">
        <span className="size-3 rounded-full border-[3px] border-white" />
      </span>
      {!compact && <span className="font-semibold tracking-tight text-ink">Rio Recorder</span>}
    </div>
  );
}
