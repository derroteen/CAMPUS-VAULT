"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

type PaymentSuccessModalProps = {
  amountPaid: number;
  expiresAt: string;
  onClose: () => void;
};

export default function PaymentSuccessModal({ amountPaid, expiresAt, onClose }: PaymentSuccessModalProps) {
  const [checkVisible, setCheckVisible] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const animateIn = window.requestAnimationFrame(() => {
      setCheckVisible(true);
    });

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(animateIn);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const formattedExpiresAt = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-KE", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Active now";

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
      aria-label="Pro payment success"
    >
      <div className="w-full max-w-md rounded-3xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white p-6 shadow-2xl sm:p-7">
        <div className="mx-auto flex w-fit items-center justify-center rounded-full border border-sunflower/35 bg-sunflower/15 p-2">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-forest text-white transition-transform duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              checkVisible ? "scale-100" : "scale-0"
            }`}
          >
            <Check className="h-8 w-8" strokeWidth={3} />
          </div>
        </div>

        <h2 className="mt-5 text-center text-2xl font-bold text-charcoal">You&apos;re now Pro</h2>
        <p className="mt-2 text-center text-sm text-charcoal/65">
          Boosted visibility and unlimited listings are active on your account.
        </p>

        <div className="mt-5 rounded-2xl border border-forest/20 bg-forest/10 p-4 text-sm text-charcoal">
          <p>
            <span className="font-medium text-charcoal/70">Amount paid:</span> KES {amountPaid}
          </p>
          <p className="mt-2">
            <span className="font-medium text-charcoal/70">Pro until:</span> {formattedExpiresAt}
          </p>
        </div>

        <Link
          href="/marketplace/my-listings"
          className="mt-6 block w-full rounded-xl bg-coral py-3 text-center text-sm font-medium text-white transition hover:bg-forest"
        >
          Go to my listings
        </Link>
      </div>
    </div>
  );
}
