"use client";

import {
  CalendarDays,
  Code2,
  HandCoins,
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
  { num: "05", label: "DONACIONES", href: "/app/donaciones", Icon: HandCoins },
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
        {/* En móvil se reduce a un rail de iconos: con 216px fijos el contenido
            se quedaba sin ancho utilizable en pantallas de ~375px. */}
        <nav className="flex w-[60px] flex-none flex-col border-r border-line bg-panel py-4 sm:w-[216px] sm:py-5">
          <div className="flex items-baseline justify-center gap-2 pb-5 sm:justify-start sm:px-5 sm:pb-6">
            <span className="text-[15px] font-bold tracking-wide sm:text-[19px]">
              NEXA
            </span>
            <span className="hidden font-mono text-[9px] tracking-[2px] text-cyan sm:inline">
              v0.1
            </span>
          </div>

          <div className="flex flex-col gap-0.5 px-1.5 sm:px-2.5">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center justify-center gap-2.5 border-l-2 py-3.5 font-mono text-xs tracking-wide sm:justify-start sm:px-3.5 sm:py-[11px] ${
                    active
                      ? "border-cyan bg-cyan/10 text-fg"
                      : "border-transparent text-fg2 hover:text-fg"
                  }`}
                >
                  <span className="hidden text-[10px] text-cyan sm:inline">
                    {item.num}
                  </span>
                  <item.Icon
                    size={16}
                    strokeWidth={1.75}
                    className="flex-none text-cyan/70 sm:size-3.5"
                  />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-auto flex flex-col items-center gap-3 border-t border-line px-2 pt-4 sm:flex-row sm:gap-2.5 sm:px-5">
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
              <div className="hidden min-w-0 sm:block">
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
              className="cursor-pointer text-fg3 hover:text-red sm:ml-auto"
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
