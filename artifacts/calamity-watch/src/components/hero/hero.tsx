import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { btn, btnPrimary } from "@/components/kit";
import { utcTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Readout } from "./readout";
import { useSceneClock } from "./use-scene";
import { VW, WorldScene } from "./world";

const SCENE_LABEL = "Illustration of how a signal grows: public posts about a flood on the Nepal–Bihar border, a hurricane in Florida and a wildfire in California appear as glowing dots that multiply. Not live data.";
const TAGLINE = "Hazard warnings read from public posts, scored for fear, and checked against the official record.";

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 1440, h: 800 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth || 1440, h: el.clientHeight || 800 });
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

/**
 * The two actions, then one line naming the latest alert once the ledger has answered. The line keeps its height
 * while the answer is pending (and when there is none), so the hero does not grow under the reader after load.
 */
function Actions({ kerala, latest }: { kerala?: string; latest?: { id: number | string; text: string } }) {
  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-center gap-3">
        {latest ? (
          <Link href={`/alerts/${latest.id}`} className={`${btnPrimary} px-5`} data-testid="link-latest-alert">Open the latest alert</Link>
        ) : (
          <a href="#recorder" className={`${btnPrimary} px-5`} data-testid="link-see-board">Read the recorder</a>
        )}
        <Link href={kerala ? `/replay?s=${kerala}` : "/replay"} className={`${btn} px-5`} data-testid="link-replay-kerala">Replay Kerala floods 2018</Link>
      </div>
      <p className="mt-3 min-h-[20px] text-[13px] leading-5 text-ink-muted" data-testid="text-latest-alert">{latest?.text ?? ""}</p>
    </div>
  );
}

export type HeroProps = { variant: "a" | "b"; kerala?: string; latest?: { id: number | string; text: string } };

/** Version A: the map fills the night hero behind the wordmark; the readout sits bottom-right. Tall or narrow viewports stack the three instead. */
function HeroA({ kerala, latest }: HeroProps) {
  const host = useRef<HTMLElement>(null);
  const { ref: box, size } = useSize<HTMLDivElement>();
  const clock = useSceneClock(host);
  const overlay = size.w >= 900 && size.w / size.h >= 1.45;
  // Overlay: the whole world fits the width (as the reference picture shows it) and sits a little below centre so the
  // wordmark block has the top of the frame and the readout the bottom-right; the Pacific margins are already trimmed.
  const scale = VW / Math.max(320, size.w);
  return (
    <section ref={host} className="night relative" aria-labelledby="hero-h" data-testid="hero" data-hero-layout={overlay ? "overlay" : "stacked"}>
      <div ref={box} className={cn("relative", overlay && "h-[clamp(620px,calc(100svh-64px),900px)]")}>
        {overlay && (
          <div className="absolute inset-0 flex items-center pt-[4%]">
            <WorldScene t={clock.t} scale={scale} fit="meet" className="w-full h-auto block" label={SCENE_LABEL} />
          </div>
        )}
        <div className={cn("relative mx-auto max-w-[1440px] px-4 md:px-8 pt-6 md:pt-12", overlay ? "h-full" : "pb-10")}>
          <div className="max-w-[720px]">
            <h1 id="hero-h" className="display wordmark" data-testid="text-wordmark">Calamity Watch Post</h1>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-[26px] text-ink-muted" data-testid="text-statement">{TAGLINE}</p>
            <Actions kerala={kerala} latest={latest} />
          </div>
          {!overlay && (
            <div className="mt-10 -mx-4 md:mx-0">
              <WorldScene t={clock.t} scale={scale} fit="meet" className="w-full h-auto block" label={SCENE_LABEL} />
            </div>
          )}
          <Readout
            t={clock.t}
            paused={clock.paused}
            reduced={clock.reduced}
            onToggle={clock.toggle}
            onRestart={clock.restart}
            className={cn(overlay ? "absolute right-8 bottom-7 w-[560px] max-w-[calc(100%-64px)]" : "mt-8 max-w-[560px]")}
          />
        </div>
      </div>
    </section>
  );
}

/** Version B: the wordmark block sits above a "desk sheet" of the world, ruled above and below with a dateline; the readout is a wire dispatch beside the caption. */
function HeroB({ kerala, latest }: HeroProps) {
  const host = useRef<HTMLElement>(null);
  const { ref: box, size } = useSize<HTMLDivElement>();
  const clock = useSceneClock(host);
  const scale = VW / Math.max(320, size.w);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <section ref={host} className="night relative" aria-labelledby="hero-h" data-testid="hero" data-hero-layout="desk">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 pt-8 md:pt-14">
        <div className="max-w-[720px]">
          <h1 id="hero-h" className="display wordmark" data-testid="text-wordmark">Calamity Watch Post</h1>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-[26px] text-ink-muted" data-testid="text-statement">{TAGLINE}</p>
          <Actions kerala={kerala} latest={latest} />
        </div>
        <div className="mt-12 border-t border-rule-strong">
          <div className="flex items-center justify-between gap-4 h-8 mono text-[12px] text-ink-muted">
            <span>World · scripted illustration</span>
            <span data-testid="text-hero-clock">{utcTime(now.toISOString())}</span>
          </div>
          <div ref={box} className="-mx-4 md:mx-0">
            <WorldScene t={clock.t} scale={scale} fit="meet" className="w-full h-auto block" label={SCENE_LABEL} />
          </div>
          <div className="border-t border-rule-strong pt-5 pb-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,520px)] md:items-start">
            <p className="max-w-[46ch] text-[14px] leading-5 text-ink-muted">
              Three regions light up at different moments, each slowly at first and then faster, as the system would see posts about a flood, a hurricane and a wildfire arrive. The sequence is scripted and the same on every visit; the recorder below is live.
            </p>
            <Readout t={clock.t} paused={clock.paused} reduced={clock.reduced} onToggle={clock.toggle} onRestart={clock.restart} dispatch className="md:justify-self-end w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Hero(props: HeroProps) {
  return props.variant === "b" ? <HeroB {...props} /> : <HeroA {...props} />;
}

