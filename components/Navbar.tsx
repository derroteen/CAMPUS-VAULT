"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setEmail(session?.user?.email ?? null);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-white whitespace-nowrap flex-shrink-0">
          <Image
            src="/logo.svg"
            alt="Campus Vault Logo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          Campus Vault
        </Link>

        <div className="flex items-center gap-3 text-sm">
          {email ? (
            <>
              <span className="hidden text-slate-300 sm:inline-block max-w-32 truncate">
                {email}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md border border-slate-700 px-3 py-2 text-slate-100 transition hover:bg-slate-800 whitespace-nowrap"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-slate-300 transition hover:text-white whitespace-nowrap"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-sky-600 px-3 py-2 text-white transition hover:bg-sky-500 whitespace-nowrap"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
