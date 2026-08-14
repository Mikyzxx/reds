"use client";

import {
  CalendarDays,
  Code2,
  Phone,
  Power,
  SquareKanban,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ActiveCallBar from "@/components/ActiveCallBar";
import { CallProvider } from "@/contexts/CallContext";
import { logout, useSession } from "@/lib/auth";
import { assetUrl } from "@/lib/api";

const NAV_ITEMS = [
  { num: "01", label: "PLANNER", href: "/app/planner", Icon: SquareKanban },
  { num: "02", label: "CALENDARIO", href: "/app/calendar", Icon: CalendarDays },
  { num: "03", label: "LLAMADAS", href: "/app/calls", Icon: Phone },
  { num: "04", label: "IDE", href: "/app/ide", Icon: Code2 },
];

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();

  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <span className="animate-nexapulse font-mono text-[11px] tracking-[3px] text-cyan">
          CARGANDO NEXA_OS…
        </span>
      </div>
    );
  }

  return (
    <CallProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <nav className="flex w-[216px] flex-none flex-col border-r border-line bg-panel py-5">
          <div className="flex items-baseline gap-2 px-5 pb-6">
            <span className="text-[19px] font-bold tracking-wide">NEXA</span>
            <span className="font-mono text-[9px] tracking-[2px] text-cyan">
              v0.1
            </span>
          </div>

          <div className="flex flex-col gap-0.5 px-2.5">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 border-l-2 px-3.5 py-[11px] font-mono text-xs tracking-wide ${
                    active
                      ? "border-cyan bg-cyan/10 text-fg"
                      : "border-transparent text-fg2 hover:text-fg"
                  }`}
                >
                  <span className="text-[10px] text-cyan">{item.num}</span>
                  <item.Icon
                    size={14}
                    strokeWidth={1.75}
                    className="text-cyan/70"
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-auto flex items-center gap-2.5 border-t border-line px-5 pt-4">
            <Link
              href="/app/profile"
              title="Ver perfil"
              className="flex min-w-0 flex-1 items-center gap-2.5"
            >
              {user.avatar_url ? (
                <img
                  src={assetUrl(user.avatar_url)}
                  alt={user.display_name}
                  className="h-8 w-8 flex-none border border-cyan/30 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 flex-none items-center justify-center border border-cyan/30 bg-cyan/10 font-mono text-[11px] text-cyan">
                  {user.initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">
                  {user.display_name}
                </div>
                <div className="font-mono text-[10px] text-fg3">
                  en línea ●
                </div>
              </div>
            </Link>
            <button
              title="Cerrar sesión"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="ml-auto cursor-pointer text-fg3 hover:text-red"
            >
              <Power size={14} strokeWidth={2} />
            </button>
          </div>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>

        <ActiveCallBar />
      </div>
    </CallProvider>
  );
}
