"use client";

import { useEffect, useState } from "react";

export default function UnsubscribePage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"ready" | "submitting" | "success" | "error">("ready");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function confirmUnsubscribe() {
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(result.error ?? "We couldn't process your request. Please try again.");
        return;
      }

      setStatus("success");
      setMessage(result.message ?? "You have been unsubscribed from reminder emails.");
    } catch {
      setStatus("error");
      setMessage("We couldn't process your request. Please check your connection and try again.");
    }
  }

  const isInvalidToken = !token && status === "ready";

  return (
    <main className="flex min-h-screen items-center justify-center bg-warm-bg px-4 py-12 text-charcoal">
      <section className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-center shadow-2xl shadow-slate-950/40 sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Unsubscribe from reminder emails?
        </h1>
        <p className="mt-4 text-slate-300">
          Confirm below if you no longer want to receive reminder emails from MVCorner.
        </p>
        {isInvalidToken ? (
          <p className="mt-6 text-amber-300">This unsubscribe link is missing or invalid.</p>
        ) : status === "success" ? (
          <p className="mt-6 text-emerald-300" role="status">{message}</p>
        ) : (
          <>
            {message && <p className="mt-6 text-rose-300" role="alert">{message}</p>}
            <button
              type="button"
              onClick={confirmUnsubscribe}
              disabled={!token || status === "submitting"}
              className="mt-8 rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "submitting" ? "Unsubscribing..." : "Confirm unsubscribe"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
