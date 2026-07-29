"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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
    <nav className="relative border-b border-slate-800 bg-slate-950/90 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-white whitespace-nowrap flex-shrink-0">
          <Image
            src="/logo.svg"
            alt="MVCorner Logo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          MVCorner
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3 text-sm">
          <Link
            href="/marketplace"
            className="rounded-md px-3 py-2 text-slate-300 transition hover:text-white whitespace-nowrap"
          >
            Marketplace
          </Link>
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

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-300 hover:text-white focus:outline-none p-1"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Panel */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-6 py-4 space-y-3 text-sm">
          <Link
            href="/marketplace"
            onClick={() => setIsOpen(false)}
            className="block rounded-md px-3 py-2 text-slate-300 transition hover:text-white"
          >
            Marketplace
          </Link>
          {email ? (
            <>
              <div className="px-3 py-1 text-xs text-slate-400 truncate">
                Signed in as: <span className="text-slate-200">{email}</span>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="w-full text-left rounded-md border border-slate-700 px-3 py-2 text-slate-100 transition hover:bg-slate-800"
              >
                Log out
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block text-center rounded-md border border-slate-700 px-3 py-2 text-slate-300 transition hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsOpen(false)}
                className="block text-center rounded-md bg-sky-600 px-3 py-2 text-white transition hover:bg-sky-500"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
