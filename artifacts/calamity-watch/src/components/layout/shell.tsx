import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Board" },
  { href: "/alerts", label: "Alerts" },
  { href: "/replay", label: "Replay" },
  { href: "/model", label: "Model" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/about", label: "About" },
];

function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle cx="9" cy="9" r="7.5" fill="none" stroke="#FF5C7A" strokeWidth="1.2" opacity=".6" />
      <circle cx="9" cy="9" r="4.5" fill="none" stroke="#5EEAD4" strokeWidth="1.2" />
      <circle cx="9" cy="9" r="1.8" fill="#E6EBF2" />
    </svg>
  );
}

export function TopNav() {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const active = (h: string) => (h === "/" ? loc === "/" : loc.startsWith(h));
  return (
    <nav aria-label="Main" className="border-b border-line bg-[#0C1424]">
      <div className="mx-auto max-w-[1600px] px-4 h-12 flex items-center gap-6">
        <Link href="/" data-testid="link-home" className="flex items-center gap-2 font-bold tracking-[-0.015em]">
          <Mark /> Calamity Watch
        </Link>
        <ul className="hidden md:flex items-center gap-1 text-[14px]">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                data-testid={`link-nav-${n.label.toLowerCase()}`}
                aria-current={active(n.href) ? "page" : undefined}
                className={cn("rounded-[4px] px-2.5 py-1.5 text-muted-foreground hover:text-foreground", active(n.href) && "text-foreground bg-surface-2")}
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <button type="button" className="md:hidden ml-auto p-2" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} data-testid="button-menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <ul className="md:hidden border-t border-line px-4 py-2 fade-in">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} onClick={() => setOpen(false)} data-testid={`link-mnav-${n.label.toLowerCase()}`} className={cn("block py-2", active(n.href) ? "text-foreground" : "text-muted-foreground")}>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line mt-12">
      <div className="mx-auto max-w-[1600px] px-4 py-8 grid gap-8 md:grid-cols-[2fr_1fr_1fr] text-[14px] leading-5 text-muted-foreground">
        <div className="max-w-[60ch]">
          <p className="text-foreground font-bold">Not an official warning source.</p>
          <p className="mt-1">
            Calamity Watch is an experimental research system built by Aman. Its alerts come from public posts and statistical models and can be wrong in both directions. For warnings, follow your national meteorological service and local authorities.
          </p>
        </div>
        <div>
          <p className="text-foreground font-bold">Sources</p>
          <ul className="mt-1 space-y-0.5">
            <li>Posts: X API, Bluesky firehose</li>
            <li>Official: GDACS, USGS, NWS, NASA FIRMS</li>
            <li>Weather: Open-Meteo</li>
          </ul>
        </div>
        <div>
          <p className="text-foreground font-bold">Licences</p>
          <ul className="mt-1 space-y-0.5">
            <li>Map: OpenFreeMap, OpenMapTiles, OpenStreetMap contributors (ODbL)</li>
            <li>Type: Atkinson Hyperlegible (OFL)</li>
            <li>
              Datasets and model cards: <Link href="/model" className="underline underline-offset-2" data-testid="link-footer-model">model page</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <main className={cn("mx-auto px-4 py-8", wide ? "max-w-[1600px]" : "max-w-[1200px]")}>{children}</main>;
}
