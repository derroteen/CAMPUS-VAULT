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
    <nav className="relative z-50 border-b border-forest/15 bg-forest">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex flex-shrink-0 items-center gap-3 whitespace-nowrap text-lg font-semibold text-sunflower">
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
            href={email ? "/dashboard" : "/browse"}
            className="whitespace-nowrap rounded-md px-3 py-2 text-warm-bg transition hover:bg-sunflower/20 hover:text-sunflower"
          >
            Study Resources
          </Link>
          <Link
            href="/marketplace"
            className="whitespace-nowrap rounded-md px-3 py-2 text-warm-bg transition hover:bg-sunflower/20 hover:text-sunflower"
          >
            Marketplace
          </Link>
          <Link
            href="/support"
            className="whitespace-nowrap rounded-md px-3 py-2 text-warm-bg transition hover:bg-sunflower/20 hover:text-sunflower"
          >
            Support
          </Link>
          {email ? (
            <>
              <Link
                href="/marketplace/my-listings"
                className="whitespace-nowrap rounded-md px-3 py-2 text-warm-bg transition hover:bg-sunflower/20 hover:text-sunflower"
              >
                My Listings
              </Link>
              <span className="hidden max-w-32 truncate text-warm-bg/80 sm:inline-block">
                {email}
              </span>
              <button
                onClick={handleLogout}
                className="whitespace-nowrap rounded-md border border-sunflower/40 px-3 py-2 text-sunflower transition hover:bg-sunflower/20"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-md px-3 py-2 text-warm-bg transition hover:bg-sunflower/20 hover:text-sunflower"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="whitespace-nowrap rounded-md bg-coral px-3 py-2 text-white transition hover:bg-forest"
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
            className="p-1 text-sunflower hover:text-coral focus:outline-none"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Panel */}
      {isOpen && (
        <div className="space-y-3 border-t border-forest/15 bg-forest/95 px-6 py-4 text-sm md:hidden">
          <Link
            href={email ? "/dashboard" : "/browse"}
            onClick={() => setIsOpen(false)}
            className="block rounded-md px-3 py-2 text-warm-bg transition hover:bg-sunflower/20 hover:text-sunflower"
          >
            Study Resources
          </Link>
          <Link
            href="/marketplace"
            onClick={() => setIsOpen(false)}
            className="block rounded-md px-3 py-2 text-warm-bg transition hover:bg-sunflower/20 hover:text-sunflower"
          >
            Marketplace
          </Link>
          <Link
            href="/support"
            onClick={() => setIsOpen(false)}
            className="block rounded-md px-3 py-2 text-warm-bg transition hover:bg-sunflower/20 hover:text-sunflower"
          >
            Support
          </Link>
          {email ? (
            <>
              <Link
                href="/marketplace/my-listings"
                onClick={() => setIsOpen(false)}
                className="block rounded-md px-3 py-2 text-warm-bg transition hover:bg-sunflower/20 hover:text-sunflower"
              >
                My Listings
              </Link>
              <div className="truncate px-3 py-1 text-xs text-warm-bg/70">
                Signed in as: <span className="text-sunflower">{email}</span>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="w-full rounded-md border border-sunflower/40 px-3 py-2 text-left text-sunflower transition hover:bg-sunflower/20"
              >
                Log out
              </button>
            </>
          ) : (
            <div className="space-y-2 border-t border-forest/15 pt-2">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block rounded-md border border-sunflower/40 px-3 py-2 text-center text-warm-bg transition hover:bg-sunflower/20 hover:text-sunflower"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsOpen(false)}
                className="block rounded-md bg-coral px-3 py-2 text-center text-white transition hover:bg-forest"
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