"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChevronDown,
  Coffee,
  FileCheck,
  FileText,
  Home,
  Lock,
  School,
  Unlock,
  Users,
} from "lucide-react";

interface CampusStoryProps {
  isLoggedIn: boolean;
}

const NODES = [
  {
    name: "Library",
    x: "18%",
    y: "17.5%",
    Icon: BookOpen,
    color: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
    cls: "story-node-1",
  },
  {
    name: "Lecture hall",
    x: "82%",
    y: "17.5%",
    Icon: School,
    color: "text-indigo-400",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/10",
    cls: "story-node-2",
  },
  {
    name: "Hostel",
    x: "9.6%",
    y: "50%",
    Icon: Building2,
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    cls: "story-node-3",
  },
  {
    name: "Cafeteria",
    x: "90.4%",
    y: "50%",
    Icon: Coffee,
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    cls: "story-node-4",
  },
  {
    name: "Study group",
    x: "18%",
    y: "82.5%",
    Icon: Users,
    color: "text-pink-400",
    border: "border-pink-500/30",
    bg: "bg-pink-500/10",
    cls: "story-node-5",
  },
  {
    name: "Your room",
    x: "82%",
    y: "82.5%",
    Icon: Home,
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    cls: "story-node-6",
  },
];

export default function CampusStory({ isLoggedIn }: CampusStoryProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [stage, setStage] = useState<-1 | 0 | 1 | 2 | 3>(-1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (!sectionRef.current) return;
        const rect = sectionRef.current.getBoundingClientRect();
        const innerHeight = window.innerHeight;
        const scrollable = rect.height - innerHeight;
        const p = scrollable > 0 ? Math.min(Math.max(-rect.top / scrollable, 0), 1) : 0;
        setProgress(p);

        let nextStage: -1 | 0 | 1 | 2 | 3 = -1;
        if (rect.top < 0.55 * innerHeight) {
          if (p > 0.66) {
            nextStage = 3;
          } else if (p > 0.42) {
            nextStage = 2;
          } else if (p > 0.20) {
            nextStage = 1;
          } else {
            nextStage = 0;
          }
        }
        setStage(nextStage);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <>
      {/* ANIMATED SCROLL-DRIVEN VERSION */}
      <section
        id="how-it-works"
        ref={sectionRef}
        className="relative h-[260vh] motion-reduce:hidden"
      >
        <div
          className="story sticky top-0 h-svh w-full overflow-hidden pt-24"
          data-stage={stage}
          style={{ ["--p" as string]: progress }}
        >
          {/* Thin gradient progress line at top */}
          <div className="story-progress-bar" />

          {/* Faint 48px grid & blue/violet radial glows */}
          <div className="story-bg pointer-events-none absolute inset-0" aria-hidden="true" />

          {/* 12 ambient drifting particles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {([
              { left: "8%",  delay: "0s",    dur: "7s"  },
              { left: "16%", delay: "1.2s",  dur: "9s"  },
              { left: "27%", delay: "0.4s",  dur: "6.5s"},
              { left: "35%", delay: "2.1s",  dur: "8s"  },
              { left: "44%", delay: "0.8s",  dur: "10s" },
              { left: "53%", delay: "3.4s",  dur: "7.5s"},
              { left: "62%", delay: "1.7s",  dur: "9.5s"},
              { left: "70%", delay: "0.2s",  dur: "6s"  },
              { left: "78%", delay: "2.8s",  dur: "8.5s"},
              { left: "85%", delay: "1.1s",  dur: "7s"  },
              { left: "91%", delay: "3.9s",  dur: "11s" },
              { left: "96%", delay: "0.6s",  dur: "9s"  },
            ] as { left: string; delay: string; dur: string }[]).map((p, i) => (
              <div
                key={i}
                className="story-particle"
                style={{
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                }}
              />
            ))}
          </div>

          {/* Container */}
          <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center px-6 pb-8 md:grid md:grid-cols-12 md:items-center md:gap-12 md:pb-0">
            {/* Left Column: Step bars, captions stack, hint */}
            <div className="flex flex-col justify-center md:col-span-5">
              {/* Step indicator bars */}
              <div className="mb-6 flex items-center gap-2">
                {[0, 1, 2, 3].map((stepIdx) => (
                  <div
                    key={stepIdx}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      stage >= stepIdx
                        ? "w-8 bg-gradient-to-r from-blue-500 to-purple-500"
                        : "w-4 bg-slate-700/60"
                    }`}
                  />
                ))}
              </div>

              {/* 4 Captions stacked in one grid cell */}
              <div className="relative grid min-h-[190px] grid-cols-1 grid-rows-1">
                {/* Caption 0 */}
                <div
                  data-caption="0"
                  className="story-caption col-start-1 row-start-1"
                  aria-hidden={stage !== 0 && stage !== -1}
                >
                  <span className="eyebrow block">Step 1 · Upload</span>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
                    A classmate shares a past paper.
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    Lecture notes, past exams, or CATs are uploaded directly from their device in seconds.
                  </p>
                </div>

                {/* Caption 1 */}
                <div
                  data-caption="1"
                  className="story-caption col-start-1 row-start-1"
                  aria-hidden={stage !== 1}
                >
                  <span className="eyebrow block">Step 2 · Review</span>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
                    It&apos;s checked before anyone sees it.
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    Every submission is verified by moderators for course relevance and readable quality.
                  </p>
                </div>

                {/* Caption 2 */}
                <div
                  data-caption="2"
                  className="story-caption col-start-1 row-start-1"
                  aria-hidden={stage !== 2}
                >
                  <span className="eyebrow block">Step 3 · Share</span>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
                    Then the whole campus gets it.
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    Approved study materials instantly become available to students across all schools.
                  </p>
                </div>

                {/* Caption 3 */}
                <div
                  data-caption="3"
                  className="story-caption col-start-1 row-start-1"
                  aria-hidden={stage !== 3}
                >
                  <span className="eyebrow block">Step 4 · Unlock</span>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
                    Upload 4, download free for 24 hours.
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    Give back by contributing your own notes to enjoy unlimited access to the entire vault.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {isLoggedIn ? (
                      <Link
                        href="/upload"
                        className="btn-gradient inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold shadow-md"
                      >
                        <span>Upload a resource</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link
                        href="/signup"
                        className="btn-gradient inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold shadow-md"
                      >
                        <span>Start uploading</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                    <Link
                      href="/browse"
                      className="btn-outline inline-flex items-center px-5 py-2.5 text-sm font-medium"
                    >
                      Browse resources
                    </Link>
                  </div>
                </div>
              </div>

              {/* Keep scrolling hint at stage -1 / 0 only */}
              <div
                className={`story-scroll-hint mt-8 flex items-center gap-2 text-xs font-medium text-slate-400 transition-opacity duration-300 ${
                  stage <= 0 ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <ChevronDown className="h-4 w-4 animate-bounce text-sky-400" />
                <span>Keep scrolling to explore</span>
              </div>
            </div>

            {/* Right Column: 500x400 aspect-[5/4] Scene */}
            <div className="flex items-center justify-center md:col-span-7">
              <div
                className="story-scene-container relative aspect-[5/4] w-full max-w-[340px] overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/80 p-0 shadow-2xl backdrop-blur-md sm:max-w-[420px] md:max-w-[500px]"
                aria-hidden="true"
              >
                {/* Soft inside glow */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-purple-600/10" />

                {/* SVG Layer: 500x400 Coordinate Space */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 500 400"
                  fill="none"
                >
                  <defs>
                    <filter
                      id="story-dot-glow"
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                    >
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* 6 Curved lines from center (250, 200) outward */}
                  <path
                    d="M 250 200 Q 170 110 90 70"
                    pathLength="1"
                    className="story-network-line"
                  />
                  <path
                    d="M 250 200 Q 330 110 410 70"
                    pathLength="1"
                    className="story-network-line"
                  />
                  <path
                    d="M 250 200 Q 150 180 48 200"
                    pathLength="1"
                    className="story-network-line"
                  />
                  <path
                    d="M 250 200 Q 350 180 452 200"
                    pathLength="1"
                    className="story-network-line"
                  />
                  <path
                    d="M 250 200 Q 170 290 90 330"
                    pathLength="1"
                    className="story-network-line"
                  />
                  <path
                    d="M 250 200 Q 330 290 410 330"
                    pathLength="1"
                    className="story-network-line"
                  />

                  {/* Glowing dots with SVG animateMotion (Stage 2 only) */}
                  {stage === 2 && (
                    <g className="story-dots">
                      <circle r="4" fill="#60a5fa" filter="url(#story-dot-glow)">
                        <animateMotion
                          dur="2s"
                          repeatCount="indefinite"
                          path="M 250 200 Q 170 110 90 70"
                        />
                      </circle>
                      <circle r="4" fill="#818cf8" filter="url(#story-dot-glow)">
                        <animateMotion
                          dur="2s"
                          repeatCount="indefinite"
                          path="M 250 200 Q 330 110 410 70"
                        />
                      </circle>
                      <circle r="4" fill="#34d399" filter="url(#story-dot-glow)">
                        <animateMotion
                          dur="2s"
                          repeatCount="indefinite"
                          path="M 250 200 Q 150 180 48 200"
                        />
                      </circle>
                      <circle r="4" fill="#fbbf24" filter="url(#story-dot-glow)">
                        <animateMotion
                          dur="2s"
                          repeatCount="indefinite"
                          path="M 250 200 Q 350 180 452 200"
                        />
                      </circle>
                      <circle r="4" fill="#f472b6" filter="url(#story-dot-glow)">
                        <animateMotion
                          dur="2s"
                          repeatCount="indefinite"
                          path="M 250 200 Q 170 290 90 330"
                        />
                      </circle>
                      <circle r="4" fill="#c084fc" filter="url(#story-dot-glow)">
                        <animateMotion
                          dur="2s"
                          repeatCount="indefinite"
                          path="M 250 200 Q 330 290 410 330"
                        />
                      </circle>
                    </g>
                  )}
                </svg>

                {/* 3 Pulse Rings expanding from center at Stage 2 */}
                <div className="story-pulse-ring story-pulse-ring-1" />
                <div className="story-pulse-ring story-pulse-ring-2" />
                <div className="story-pulse-ring story-pulse-ring-3" />

                {/* Stage 2 Campus Nodes */}
                {NODES.map((node) => {
                  const { name, x, y, Icon, color, border, bg, cls } = node;
                  return (
                    <div
                      key={name}
                      className={`story-node story-node-float ${cls} absolute flex flex-col items-center pointer-events-none`}
                      style={{ left: x, top: y }}
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full border ${border} ${bg} shadow-lg backdrop-blur-md sm:h-10 sm:w-10`}
                      >
                        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
                      </div>
                      <span className="mt-1 whitespace-nowrap rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-300 drop-shadow sm:text-[11px]">
                        {name}
                      </span>
                    </div>
                  );
                })}

                {/* Stage 0 & 1 Document Card */}
                <div className="story-doc-card overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md sm:p-5">
                  <div className="story-scan-line" />
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <span className="inline-flex items-center rounded-full border border-forest/40 bg-forest/15 px-2.5 py-0.5 text-[10px] font-medium text-sky-300">
                      Maseno University
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                      PDF
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral/20 text-coral">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold leading-tight text-charcoal">
                          BIO 201 · CAT 2
                        </h4>
                        <p className="text-[11px] text-slate-400">Past paper · PDF</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="h-2 w-full rounded bg-slate-800" />
                      <div className="h-2 w-4/5 rounded bg-slate-800/80" />
                      <div className="h-2 w-5/6 rounded bg-slate-800/60" />
                      <div className="h-2 w-3/4 rounded bg-slate-800/40" />
                      <div className="h-2 w-2/3 rounded bg-slate-800/30" />
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-800/60 pt-3 font-mono text-[10px] text-slate-400">
                      <span>Verified Resource</span>
                      <span>Semester 1</span>
                    </div>
                  </div>

                  <div className="story-stamp">
                    <div className="rounded-lg border-[3px] border-emerald-500 bg-emerald-950/85 px-3 py-1 text-center font-mono text-sm font-black tracking-widest text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      APPROVED
                    </div>
                  </div>
                </div>

                {/* Stage 3 Unlock Card */}
                <div className="story-unlock-card card-glass rounded-2xl border border-slate-700/80 bg-slate-900/95 p-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="eyebrow block">Status Dashboard</span>
                      <h3 className="text-sm font-bold text-charcoal sm:text-base">
                        Your uploads
                      </h3>
                    </div>
                    <div className="relative">
                      <span className="story-chip-locked inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                        <Lock className="h-3 w-3" />
                        <span>Locked</span>
                      </span>
                      <span className="story-chip-unlocked inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                        <Unlock className="h-3 w-3" />
                        <span>Unlocked</span>
                      </span>
                    </div>
                  </div>

                  {/* 4 slots filling with gradient + FileCheck icon */}
                  <div className="my-4 grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((slotNum) => (
                      <div
                        key={slotNum}
                        className={`story-slot story-slot-${slotNum} relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-800/40 p-1.5`}
                      >
                        <div className="story-slot-fill absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-500 opacity-0" />
                        <div className="relative z-10 flex flex-col items-center justify-center">
                          <FileCheck className="story-slot-icon h-5 w-5 text-slate-400" />
                          <span className="mt-1 font-mono text-[9px] font-medium text-slate-300">
                            {slotNum}/4
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 24h progress ring */}
                  <div className="flex items-center gap-3.5 rounded-xl border border-slate-800/80 bg-slate-950/50 p-3">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 54 54">
                        <circle
                          cx="27"
                          cy="27"
                          r="22"
                          className="fill-none stroke-slate-800"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx="27"
                          cy="27"
                          r="22"
                          className="story-progress-circle fill-none stroke-emerald-400"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-bold text-sky-300">24h</span>
                      </div>
                    </div>
                    <div className="text-xs leading-snug text-slate-300">
                      <span className="mb-0.5 block font-semibold text-emerald-400">
                        Access Granted
                      </span>
                      Unlimited downloads after 4 approved uploads.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATIC ACCESSIBILITY FALLBACK (Shown only on motion-reduce) */}
      <div className="mx-auto hidden max-w-6xl px-6 py-16 motion-reduce:block">
        <div className="mb-12 text-center">
          <span className="eyebrow">How It Works</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
            From upload to campus-wide access
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-400">
            MVCorner is powered by students sharing with students. Here is how resources flow through our community.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-700 border-l-4 border-l-forest bg-slate-900/80 p-6 shadow-lg">
            <span className="eyebrow block">Step 1 · Upload</span>
            <h3 className="mt-2 text-lg font-bold text-charcoal">
              A classmate shares a past paper.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Lecture notes, past exams, or CATs are uploaded directly from their device in seconds.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 border-l-4 border-l-forest bg-slate-900/80 p-6 shadow-lg">
            <span className="eyebrow block">Step 2 · Review</span>
            <h3 className="mt-2 text-lg font-bold text-charcoal">
              It&apos;s checked before anyone sees it.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Every submission is verified by moderators for course relevance and readable quality.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 border-l-4 border-l-forest bg-slate-900/80 p-6 shadow-lg">
            <span className="eyebrow block">Step 3 · Share</span>
            <h3 className="mt-2 text-lg font-bold text-charcoal">
              Then the whole campus gets it.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Approved study materials instantly become available to students across all schools.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 border-l-4 border-l-forest bg-slate-900/80 p-6 shadow-lg">
            <span className="eyebrow block">Step 4 · Unlock</span>
            <h3 className="mt-2 text-lg font-bold text-charcoal">
              Upload 4, download free for 24 hours.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Give back by contributing your own notes to enjoy unlimited access to the entire vault.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {isLoggedIn ? (
            <Link
              href="/upload"
              className="btn-gradient inline-flex items-center gap-2 px-6 py-3 font-semibold shadow-md"
            >
              <span>Upload a resource</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/signup"
              className="btn-gradient inline-flex items-center gap-2 px-6 py-3 font-semibold shadow-md"
            >
              <span>Start uploading</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            href="/browse"
            className="btn-outline inline-flex items-center px-6 py-3 font-medium"
          >
            Browse resources
          </Link>
        </div>
      </div>
    </>
  );
}
