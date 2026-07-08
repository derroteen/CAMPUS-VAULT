import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40 sm:p-10">
        <div className="mb-8">
          <div className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-sm font-medium text-sky-200">
            Support
          </div>
          <h1 className="mt-4 text-3xl font-semibold">Get in Touch</h1>
          <p className="mt-4 text-lg text-slate-300">
            Have a question, found a bug, or need help with your account? Reach out.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 transition hover:border-slate-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-sky-400">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Email Us</p>
              <a
                href="mailto:infodteqsolutions@gmail.com"
                className="text-lg font-medium text-white transition hover:text-sky-400"
              >
                infodteqsolutions@gmail.com
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 transition hover:border-slate-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-emerald-400">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">WhatsApp</p>
              <a
                href="https://wa.me/254716555311"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-medium text-white transition hover:text-emerald-400"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-slate-800/30 p-4 text-center">
          <p className="text-sm text-slate-400">
            We typically respond within 24-48 hours.
          </p>
        </div>
        
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-slate-400 transition hover:text-white">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
