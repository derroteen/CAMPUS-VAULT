"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setIsLoggedIn(!!session?.user);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsLoggedIn(!!session?.user);
      });

      setLoading(false);

      return () => subscription.unsubscribe();
    };

    checkSession();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-slate-300">Loading...</p>
      </main>
    );
  }

  const features = [
    {
      title: "Verified resources",
      description: "Peer-uploaded and moderated notes, past papers, and study guides",
    },
    {
      title: "57+ Kenyan universities",
      description: "Organized by university and course for easy discovery",
    },
    {
      title: "4-for-7 unlock model",
      description: "Upload 4 approved resources or pay a small fee for 7 hours of unlimited downloads",
    },
    {
      title: "Course requests",
      description: "Can't find your course? Request it and it's added for everyone",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Hero Section */}
        <div className="text-center">
          <Image
            src="/logo.svg"
            alt="Campus Vault Logo"
            width={64}
            height={64}
            className="mx-auto mb-6 h-16 w-16"
          />
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
            Your campus hub
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Campus Vault</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
            A secure place to organize campus life, resources, and opportunities.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-sky-600 px-6 py-3 font-medium text-white transition hover:bg-sky-500"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="rounded-md bg-sky-600 px-6 py-3 font-medium text-white transition hover:bg-sky-500"
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border border-slate-700 px-6 py-3 font-medium text-slate-200 transition hover:bg-slate-800"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Highlight Cards */}
        <div className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Closing CTA Section */}
        {!isLoggedIn && (
          <div className="mt-16 text-center">
            <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-10">
              <h2 className="text-3xl font-semibold text-white">Ready to get started?</h2>
              <p className="mt-3 text-slate-400">
                Join thousands of students sharing and accessing study resources.
              </p>
              <div className="mt-8">
                <Link
                  href="/signup"
                  className="inline-flex rounded-md bg-sky-600 px-8 py-3 font-medium text-white transition hover:bg-sky-500"
                >
                  Sign up for free
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
