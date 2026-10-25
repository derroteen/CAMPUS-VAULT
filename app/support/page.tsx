"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { CheckCircle, Mail, MessageCircle } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/site-config";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  "Account & login",
  "Upload or course request",
  "Payment or subscription",
  "Marketplace listing",
  "Report a bug",
  "Something else",
] as const;

type Category = (typeof CATEGORIES)[number];

function resolveTopicFromQuery(param: string | null): Category {
  if (!param) return "Account & login";
  const p = param.toLowerCase();
  if (p.includes("upload") || p.includes("course")) {
    return "Upload or course request";
  }
  if (p.includes("payment") || p.includes("pay") || p.includes("sub")) {
    return "Payment or subscription";
  }
  if (p.includes("account") || p.includes("login")) {
    return "Account & login";
  }
  if (p.includes("market")) {
    return "Marketplace listing";
  }
  if (p.includes("bug")) {
    return "Report a bug";
  }
  const match = CATEGORIES.find((c) => c.toLowerCase() === p);
  if (match) return match;
  return "Account & login";
}

function SupportContent() {
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<Category>(() =>
    resolveTopicFromQuery(topicParam)
  );
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedTicketRef, setSubmittedTicketRef] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (topicParam) {
      setTopic(resolveTopicFromQuery(topicParam));
    }
  }, [topicParam]);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (isMounted && session?.user) {
          if (session.user.email) {
            setEmail((prev) => prev || session.user.email || "");
          }
          const fullName =
            (session.user.user_metadata?.full_name as string) ||
            (session.user.user_metadata?.name as string) ||
            "";
          if (fullName) {
            setName((prev) => prev || fullName);
          }
        }
      } catch (err) {
        console.error("Could not fetch user session for support form:", err);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/support", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          email,
          category: topic,
          message,
          website,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(
          data.error ||
            `Failed to send support request. Please try again or email ${SUPPORT_EMAIL}.`
        );
        return;
      }

      setSubmittedTicketRef(data.ticketRef);
    } catch (err) {
      console.error("Support form submission error:", err);
      setErrorMessage(
        `Something went wrong. Please try again or email us directly at ${SUPPORT_EMAIL}.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-sky-300 hover:text-leaf transition underline mb-4"
        >
          &larr; Back to home
        </Link>
        <span className="eyebrow block">Support Desk</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl text-charcoal">
          Help & Support
        </h1>
        <p className="mt-2 text-slate-400 max-w-2xl text-base">
          Have an issue with your account, notes, payments, or marketplace listing?
          Submit a ticket below or contact us directly.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Main form / success column */}
        <div className="lg:col-span-7 xl:col-span-8">
          {submittedTicketRef ? (
            <div className="relative rounded-2xl border border-slate-700 bg-slate-900/80 p-6 sm:p-8 shadow-xl border-l-4 border-forest">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest/20 text-sky-300">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <span className="eyebrow block">Status</span>
                  <h2 className="text-2xl font-bold text-charcoal">Request sent</h2>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-forest/25 bg-forest/10 p-5">
                <p className="text-xs uppercase font-medium tracking-wider text-slate-400">
                  Ticket Reference
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-sky-300">
                  {submittedTicketRef}
                </p>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-slate-300">
                Thank you! We&apos;ve logged your ticket and sent a confirmation receipt
                to <strong className="text-charcoal">{email}</strong>. Our team will review
                your message and get back to you shortly.
              </p>

              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                If you have screenshots or additional information to provide, you can also write directly to{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[${submittedTicketRef}] Follow-up: ${topic}`)}`}
                  className="font-medium text-sky-300 underline hover:text-leaf transition"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedTicketRef(null);
                    setMessage("");
                  }}
                  className="btn-outline px-6 py-2.5 text-sm font-medium transition hover:border-slate-500"
                >
                  Submit another request
                </button>
                <Link
                  href="/"
                  className="btn-gradient inline-flex items-center px-6 py-2.5 text-sm font-medium"
                >
                  Return to home
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl border border-slate-700 bg-slate-900/80 p-6 sm:p-8 shadow-xl border-l-4 border-forest">
              <h2 className="text-xl font-semibold text-sky-300">Submit a Ticket</h2>
              <p className="mt-1 text-sm text-slate-400">
                Please fill in the details below and we will get back to you as soon as possible.
              </p>

              {errorMessage ? (
                <div className="mt-6 rounded-xl border border-coral/30 bg-coral/10 p-4 text-sm text-coral">
                  {errorMessage}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {/* Honeypot field - invisible to human users */}
                <div
                  className="hidden"
                  aria-hidden="true"
                  style={{ display: "none" }}
                >
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Your Name <span className="text-coral">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50 placeholder:text-slate-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Email Address <span className="text-coral">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="e.g. you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50 placeholder:text-slate-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="topic"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Topic <span className="text-coral">*</span>
                  </label>
                  <select
                    id="topic"
                    name="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value as Category)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50 disabled:opacity-60"
                  >
                    {CATEGORIES.map((cat) => (
                      <option
                        key={cat}
                        value={cat}
                        className="bg-slate-900 text-charcoal"
                      >
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-slate-300"
                    >
                      Message <span className="text-coral">*</span>
                    </label>
                    <span
                      className={`text-xs ${
                        message.length > 2000
                          ? "font-semibold text-coral"
                          : "text-slate-400"
                      }`}
                    >
                      {message.length}/2000
                    </span>
                  </div>
                  <textarea
                    id="message"
                    name="message"
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={6}
                    placeholder="Describe your question or issue in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50 placeholder:text-slate-500 disabled:opacity-60 resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gradient w-full py-3.5 px-6 font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      <span>Sending request...</span>
                    </>
                  ) : (
                    <span>Send Request</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar cards column */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Email Support Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg border-l-4 border-forest transition hover:border-forest/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/20 text-sky-300">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-charcoal">Support Email</h3>
                <p className="text-xs text-slate-400">Direct inbox</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Prefer writing with your own email client? Drop us a line anytime.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-3 inline-flex items-center text-sm font-medium text-sky-300 hover:text-leaf underline break-all transition"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          {/* WhatsApp Support Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg border-l-4 border-leaf transition hover:border-leaf/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf/20 text-leaf">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-charcoal">WhatsApp</h3>
                <p className="text-xs text-slate-400">Direct chat</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Have a quick question? Reach our team on WhatsApp for prompt help.
            </p>
            <a
              href="https://wa.me/254716555311"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-leaf hover:underline transition"
            >
              Chat on WhatsApp &rarr;
            </a>
          </div>

          {/* Buy us a coffee Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg border-l-4 border-sunflower transition hover:border-sunflower/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sunflower/20 text-sunflower">
                <span className="text-lg">☕</span>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal">Buy Us a Coffee</h3>
                <p className="text-xs text-slate-400">Fuel MVCorner</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              MVCorner is an independent community project. Support servers and development with a coffee.
            </p>
            <Link
              href="/coffee"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-300 hover:text-coral hover:underline transition"
            >
              ☕ Buy us a coffee &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-warm-bg text-charcoal font-space-grotesk px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl animate-pulse">
            <div className="h-6 w-32 rounded bg-slate-800" />
            <div className="mt-4 h-10 w-64 rounded bg-slate-800" />
            <div className="mt-2 h-4 w-96 rounded bg-slate-800" />
            <div className="mt-8 grid gap-8 lg:grid-cols-12">
              <div className="h-96 rounded-2xl bg-slate-900/80 lg:col-span-8" />
              <div className="h-96 rounded-2xl bg-slate-900/80 lg:col-span-4" />
            </div>
          </div>
        }
      >
        <SupportContent />
      </Suspense>
    </main>
  );
}
