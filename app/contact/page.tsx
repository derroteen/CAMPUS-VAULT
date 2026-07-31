import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-warm-bg text-charcoal font-space-grotesk">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-2xl shadow-slate-950/40 sm:p-10">
        <div className="mb-8">
          <div className="inline-flex items-center rounded-full border border-forest/30 bg-forest/10 px-3 py-1 text-xs font-medium text-forest">
            Support
          </div>
          <h1 className="mt-4 text-3xl font-semibold">Get in Touch</h1>
          <p className="mt-4 text-lg text-slate-600">
            Have a question, found a bug, or need help with your account? Reach out.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 p-5 transition hover:border-forest/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest/20 text-forest">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Email Us</p>
              <a
                href="mailto:infodteqsolutions@gmail.com"
                className="text-lg font-medium text-charcoal transition hover:text-forest"
              >
                infodteqsolutions@gmail.com
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 p-5 transition hover:border-coral/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral/20 text-coral">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">WhatsApp</p>
              <a
                href="https://wa.me/254716555311"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-medium text-charcoal transition hover:text-coral"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-forest/5 p-4 text-center">
          <p className="text-sm text-slate-600">
            We typically respond within 24-48 hours.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-forest hover:text-leaf underline">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
