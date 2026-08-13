import type { LucideIcon } from "lucide-react";

export default function ComingSoon({
  num,
  title,
  detail,
  Icon,
}: {
  num: string;
  title: string;
  detail: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative border border-line2 bg-panel2 px-14 py-12 text-center">
        <div className="absolute -top-px -left-px h-3.5 w-3.5 border-t-2 border-l-2 border-cyan" />
        <div className="absolute -right-px -bottom-px h-3.5 w-3.5 border-r-2 border-b-2 border-cyan" />
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center border border-cyan/30 bg-cyan/10 text-cyan">
            <Icon size={26} strokeWidth={1.5} />
          </div>
        </div>
        <div className="mb-2 font-mono text-[10px] tracking-[3px] text-cyan">
          MÓDULO {num}
        </div>
        <div className="mb-3 text-2xl font-bold">{title}</div>
        <div className="mb-5 max-w-[360px] text-[13px] leading-relaxed text-fg2">
          {detail}
        </div>
        <span className="animate-nexapulse inline-block border border-amber/40 px-3 py-1.5 font-mono text-[10px] tracking-[2px] text-amber">
          PRÓXIMAMENTE · FASE 2
        </span>
      </div>
    </div>
  );
}
