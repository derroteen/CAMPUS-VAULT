"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Backpack, BookOpen, Laptop } from "lucide-react";

/* ─── floating card config ──────────────────────────────────────────── */
const FLOATS = [
  {
    Icon: BookOpen,
    label: "Textbooks",
    color: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
    cls: "mkt-float-1",
  },
  {
    Icon: Laptop,
    label: "Electronics",
    color: "text-indigo-400",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/10",
    cls: "mkt-float-2",
  },
  {
    Icon: Backpack,
    label: "Bags & gear",
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    cls: "mkt-float-3",
  },
] as const;

/* ─── feed card data ─────────────────────────────────────────────────── */
const FEED_CARDS = [
  {
    title: "Engineering textbook",
    price: "KES 800",
    badge: "New",
    badgeCls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    cls: "mkt-feed-new",
  },
  {
    title: "Laptop charger",
    price: "KES 450",
    badge: "Used",
    badgeCls: "bg-slate-700 text-slate-300 border-slate-600",
    cls: "mkt-feed-old-1",
  },
  {
    title: "Calculus textbook",
    price: "KES 350",
    badge: "Used",
    badgeCls: "bg-slate-700 text-slate-300 border-slate-600",
    cls: "mkt-feed-old-2",
  },
];

export default function MarketplaceStory() {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        el.dataset.playing = entry.isIntersecting ? "true" : "false";
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative px-4 py-12 sm:px-6">
      <div
        ref={sectionRef}
        data-playing="false"
        className="mkt-root mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/80 shadow-2xl backdrop-blur-md"
      >
        {/* shared background */}
        <div className="mkt-bg pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 grid items-center gap-10 p-8 md:grid-cols-2 md:gap-16 md:p-12">

          {/* LEFT: copy */}
          <div>
            <span className="eyebrow block">Campus marketplace</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              Sell it before the semester ends.
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {[
                "Post up to 3 items free",
                "Buyers reach you by call or WhatsApp, no middleman",
                "New sellers get 10 days of Pro free",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                    ✓
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/marketplace"
                className="btn-gradient inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold shadow-md"
              >
                Browse marketplace
              </Link>
              <Link
                href="/marketplace/new"
                className="btn-outline inline-flex items-center px-5 py-2.5 text-sm font-medium"
              >
                Sell an item
              </Link>
            </div>
          </div>

          {/* RIGHT: phone + floats */}
          <div className="flex items-center justify-center" aria-hidden="true">
            <div className="relative flex items-center justify-center">
              {/* Floating accent cards */}
              {FLOATS.map(({ Icon, label, color, border, bg, cls }) => (
                <div
                  key={label}
                  className={`mkt-float ${cls} pointer-events-none absolute flex items-center gap-2 rounded-xl border ${border} ${bg} px-3 py-2 text-xs font-medium text-slate-200 shadow-lg backdrop-blur-md`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  {label}
                </div>
              ))}

              {/* Phone shell */}
              <div className="mkt-phone relative flex h-[520px] w-[260px] flex-col overflow-hidden rounded-[2.8rem] border-4 border-slate-600 bg-[#0a0f1e] shadow-2xl">
                {/* notch */}
                <div className="absolute left-1/2 top-3 z-30 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-700" />

                {/* SCREEN 1: New listing */}
                <div className="mkt-screen mkt-screen-listing absolute inset-0 flex flex-col px-4 pb-4 pt-12">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">New listing</p>
                  {/* photo placeholder */}
                  <div className="mkt-photo relative mb-3 h-28 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                    <div className="mkt-photo-fill absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-500 to-emerald-500 opacity-0" />
                    <div className="mkt-photo-icon absolute inset-0 flex items-center justify-center opacity-0">
                      <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                    </div>
                  </div>
                  {/* typewriter title */}
                  <div className="mkt-typewriter mb-1 overflow-hidden whitespace-nowrap text-sm font-bold text-charcoal">
                    Engineering textbook
                  </div>
                  {/* price */}
                  <div className="mkt-price text-xs font-semibold text-emerald-400 opacity-0">KES 800</div>
                  {/* post button */}
                  <button
                    type="button"
                    className="mkt-post-btn mt-auto w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-2.5 text-xs font-bold text-white shadow-lg"
                  >
                    Post listing
                  </button>
                </div>

                {/* SCREEN 2: Feed */}
                <div className="mkt-screen mkt-screen-feed absolute inset-0 flex flex-col px-3 pb-3 pt-12 opacity-0">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Marketplace</p>
                  <div className="relative flex-1 overflow-hidden">
                    {FEED_CARDS.map(({ title, price, badge, badgeCls, cls }) => (
                      <div
                        key={title}
                        className={`mkt-feed-card ${cls} absolute left-0 right-0 flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-800/70 p-2.5`}
                      >
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-indigo-600/60 to-blue-500/60" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-slate-100">{title}</p>
                          <p className="text-[10px] font-medium text-emerald-400">{price}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${badgeCls}`}>{badge}</span>
                      </div>
                    ))}

                    {/* chat bubbles */}
                    <div className="mkt-chat absolute inset-x-2 bottom-2 space-y-2 opacity-0">
                      <div className="mkt-bubble-buyer flex justify-start opacity-0">
                        <span className="max-w-[70%] rounded-2xl rounded-bl-sm bg-emerald-700/80 px-3 py-1.5 text-[10px] text-white shadow">
                          Is this still available?
                        </span>
                      </div>
                      <div className="mkt-bubble-seller flex justify-end opacity-0">
                        <span className="max-w-[70%] rounded-2xl rounded-br-sm bg-violet-700/80 px-3 py-1.5 text-[10px] text-white shadow">
                          Yes! Meet at the library
                        </span>
                      </div>
                    </div>

                    {/* SOLD stamp + burst */}
                    <div className="mkt-sold-wrap pointer-events-none absolute inset-0 flex items-center justify-center opacity-0">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={`mkt-burst-dot mkt-burst-dot-${i + 1} absolute h-2 w-2 rounded-full`} />
                      ))}
                      <div className="mkt-sold-stamp rounded-xl border-[3px] border-red-500 bg-red-950/90 px-5 py-2 text-center font-mono text-lg font-black tracking-widest text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                        SOLD
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}