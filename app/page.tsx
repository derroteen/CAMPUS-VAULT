import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
          Your campus hub
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Campus Vault</h1>
        <p className="mt-6 text-lg text-slate-300 sm:text-xl">
          A secure place to organize campus life, resources, and opportunities.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-500"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-700 px-4 py-2 font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
