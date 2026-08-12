"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

type TipGratitudeModalProps = {
  amountPaid: number;
  onClose: () => void;
};

type HeartParticle = {
  id: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  active: boolean;
};

export default function TipGratitudeModal({ amountPaid, onClose }: TipGratitudeModalProps) {
  const [heartVisible, setHeartVisible] = useState(false);
  const [particles, setParticles] = useState<HeartParticle[]>([]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const heartAnimate = window.requestAnimationFrame(() => {
      setHeartVisible(true);
    });

    const burstTimer = window.setTimeout(() => {
      const nextParticles = Array.from({ length: 7 }, (_, index) => {
        const angle = (index / 7) * Math.PI * 2 - Math.PI / 2;
        const distance = 48 + (index % 3) * 10;
        return {
          id: index,
          offsetX: Math.cos(angle) * distance,
          offsetY: Math.sin(angle) * distance,
          scale: 0.55 + (index % 3) * 0.12,
          rotation: -24 + index * 8,
          active: false,
        };
      });

      setParticles(nextParticles);

      window.requestAnimationFrame(() => {
        setParticles((currentParticles) =>
          currentParticles.map((particle) => ({ ...particle, active: true }))
        );
      });

      window.setTimeout(() => {
        setParticles([]);
      }, 720);
    }, 380);

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(heartAnimate);
      window.clearTimeout(burstTimer);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/70 p-4 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Tip gratitude"
    >
      <div className="w-full max-w-md rounded-3xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white p-6 shadow-2xl sm:p-7">
        <div className="relative mx-auto flex w-fit items-center justify-center rounded-full border border-sunflower/35 bg-sunflower/15 p-2">
          <div
            className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-coral/15 text-coral transition-transform duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              heartVisible ? "scale-100" : "scale-0"
            }`}
          >
            <Heart className="h-8 w-8 fill-coral" strokeWidth={2.2} />

            {particles.map((particle) => (
              <span
                key={particle.id}
                className="pointer-events-none absolute left-1/2 top-1/2 text-coral transition-all duration-[720ms] ease-out"
                style={{
                  transform: particle.active
                    ? `translate(-50%, -50%) translate(${particle.offsetX}px, ${particle.offsetY}px) scale(${particle.scale}) rotate(${particle.rotation}deg)`
                    : "translate(-50%, -50%) translate(0px, 0px) scale(0.25) rotate(0deg)",
                  opacity: particle.active ? 0 : 1,
                  }}
                >
                <Heart className="h-3.5 w-3.5 fill-coral" strokeWidth={2.2} />
              </span>
            ))}
          </div>
        </div>

        <h2 className="mt-5 text-center text-2xl font-bold text-charcoal">Thank you</h2>
        <p className="mt-2 text-center text-sm text-charcoal/65">
          Your tip helps keep MVCorner running for the whole campus.
        </p>

        <div className="mt-5 rounded-2xl border border-forest/20 bg-forest/10 p-4 text-sm text-charcoal">
          <p>
            <span className="font-medium text-charcoal/70">Tip sent:</span> KES {amountPaid.toLocaleString("en-KE")}
          </p>
        </div>

        <Link
          href="/dashboard"
          className="mt-6 block w-full rounded-xl bg-coral py-3 text-center text-sm font-medium text-white transition hover:bg-forest"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}