"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PopularCourse = {
  id: string;
  name: string;
  universityId: string;
  resourceCount: number;
};

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [popularCourses, setPopularCourses] = useState<PopularCourse[]>([]);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setIsLoggedIn(!!session?.user);
      }
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsLoggedIn(!!session?.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHomepageData = async () => {
      const masenoUniversityResult = await supabase
        .from("universities")
        .select("id")
        .eq("name", "Maseno University")
        .maybeSingle();

      let topCourses: PopularCourse[] = [];

      if (masenoUniversityResult.data?.id) {
        const universityId = masenoUniversityResult.data.id;
        const { data: coursesData } = await supabase
          .from("courses")
          .select("id, name")
          .eq("university_id", universityId);

        const courseIds = (coursesData ?? []).map((course) => course.id);

        if (courseIds.length > 0) {
          const { data: approvedCourseResources } = await supabase
            .from("resources")
            .select("course_id")
            .eq("status", "approved")
            .in("course_id", courseIds);

          const resourceCountsByCourse = new Map<string, number>();

          (approvedCourseResources ?? []).forEach((resource) => {
            if (!resource.course_id) {
              return;
            }

            resourceCountsByCourse.set(
              resource.course_id,
              (resourceCountsByCourse.get(resource.course_id) ?? 0) + 1
            );
          });

          topCourses = (coursesData ?? [])
            .map((course) => ({
              id: course.id,
              name: course.name,
              universityId,
              resourceCount: resourceCountsByCourse.get(course.id) ?? 0,
            }))
            .filter((course) => course.resourceCount > 0)
            .sort(
              (a, b) => b.resourceCount - a.resourceCount || a.name.localeCompare(b.name)
            )
            .slice(0, 8);
        }
      }

      if (isMounted) {
        setPopularCourses(topCourses);
      }
    };

    loadHomepageData();

    return () => {
      isMounted = false;
    };
  }, []);

  const features = [
    {
      title: "Verified resources",
      description: "Peer-uploaded and moderated notes, past papers, and study guides.",
    },
    {
      title: "Maseno University only",
      description: "Organized by course for faster discovery across Maseno University.",
    },
    {
      title: "4-for-7 unlock model",
      description:
        "Upload 4 approved resources or pay a small fee for 7 hours of unlimited downloads.",
    },
    {
      title: "Course requests",
      description: "Can't find your course? Request it and it is added for everyone.",
    },
    {
      title: "Campus marketplace",
      description: "Buy and sell with the campus community - post a product in minutes.",
    },
  ];

  return (
    <main className="min-h-screen bg-warm-bg text-charcoal">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-forest px-6 py-16 text-white">
        <Image
          src="/images/hero-campus.jpg"
          alt="Maseno University campus"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-forest/75" />
        <div className="relative z-10 mx-auto max-w-6xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Everything you need on campus
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-white/90 sm:text-xl">
            MVCorner brings both sides of campus life into one platform: download verified study
            resources and buy or sell with the campus community in the marketplace.
          </p>
          <div className="mx-auto mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <p className="inline-flex max-w-2xl items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90">
              Upload 4 Notes to Unlock Unlimited Downloads for 7 Hours
            </p>
            <p className="inline-flex max-w-2xl items-center justify-center rounded-full bg-sunflower/20 px-4 py-2 text-sm font-medium text-sunflower">
              New sellers get 10 days of Pro free
            </p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/choose"
                className="inline-flex rounded-md bg-sunflower px-6 py-3 font-medium text-charcoal transition hover:bg-coral hover:text-white"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex rounded-md bg-sunflower px-6 py-3 font-medium text-charcoal transition hover:bg-coral hover:text-white"
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="inline-flex rounded-md border border-white/70 px-6 py-3 font-medium text-white transition hover:bg-white/20"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* TWO‑PANEL SECTION */}
      <section className="relative mx-auto mt-10 max-w-7xl overflow-hidden rounded-3xl border border-forest/15 shadow-xl shadow-forest/10">
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-24 -translate-x-1/2 md:block"
          style={{ clipPath: "polygon(22% 0, 100% 0, 78% 100%, 0 100%)" }}
        >
          <div className="h-full w-full bg-gradient-to-b from-sunflower/80 via-warm-bg/70 to-forest/80" />
        </div>
        <div className="relative flex flex-col md:flex-row overflow-hidden">
        {/* STUDY RESOURCES PANEL */}
          <div className="relative md:w-1/2 md:[clip-path:polygon(0_0,96%_0,84%_100%,0_100%)]">
            <Image
              src="/images/resources-hero.jpg"
              alt="Students studying"
              width={1200}
              height={900}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-forest/75" />
            <div className="absolute inset-0 flex flex-col items-center justify-end p-8 text-center text-white">
              <h2 className="text-3xl font-semibold">Study Resources</h2>
              <p className="mt-3 max-w-md text-sm text-white/90">
                Download notes, past papers, CATs and study guides organized by school and course.
              </p>
              <Link
                href="/dashboard"
                className="mt-5 inline-flex rounded-md bg-leaf px-5 py-2.5 font-medium text-white transition hover:bg-coral"
              >
                Explore Resources
              </Link>
            </div>
          </div>

        {/* MARKETPLACE PANEL */}
          <div className="relative md:w-1/2 md:[clip-path:polygon(16%_0,100%_0,100%_100%,4%_100%)]">
            <Image
              src="/images/marketplace-hero.jpg"
              alt="Outdoor market"
              width={1200}
              height={900}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-sunflower/75" />
            <div className="absolute inset-0 flex flex-col items-center justify-end p-8 text-center text-charcoal">
              <h2 className="text-3xl font-semibold">Marketplace</h2>
              <p className="mt-3 max-w-md text-sm text-charcoal/90">
                Buy and sell electronics, books, hostel essentials and more with the campus community.
              </p>
              <Link
                href="/marketplace"
                className="mt-5 inline-flex rounded-md bg-coral px-5 py-2.5 font-medium text-white transition hover:bg-forest"
              >
                Explore Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STYLE SECTION */}
      <section className="py-12">
        <div className="container mx-auto px-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/80 p-6 text-center shadow-sm">
            <h2 className="text-xl font-semibold">Growing Library</h2>
            <p className="mt-2 text-base">Verified notes, past papers and study guides added regularly</p>
          </div>
          <div className="rounded-lg border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/80 p-6 text-center shadow-sm">
            <h2 className="text-xl font-semibold">New Resources Weekly</h2>
            <p className="mt-2 text-base">Fresh uploads from the Maseno University community every week</p>
          </div>
          <div className="rounded-lg border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/80 p-6 text-center shadow-sm">
            <h2 className="text-xl font-semibold">Organized by Course</h2>
            <p className="mt-2 text-base">Find exactly what you need, filtered by school and course</p>
          </div>
        </div>
      </section>

      {popularCourses.length > 0 && (
        <section className="bg-forest/5 pb-8 pt-8">
          <div className="container mx-auto px-4">
            <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-coral/20 border-y-coral/20 border-l-4 border-l-coral bg-white/80 px-4 py-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-charcoal/75">Browse popular subjects</span>
                {popularCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/browse?university=${course.universityId}&course=${course.id}`}
                    className="rounded-full border border-forest/30 bg-warm-bg px-3 py-1.5 text-sm text-forest transition hover:border-coral hover:text-coral"
                  >
                    {course.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MARKETPLACE STATS SECTION */}
      <section className="py-12">
        <div className="container mx-auto grid gap-4 px-4 md:grid-cols-3">
          <div className="rounded-lg border-r-[0.5px] border-y-[0.5px] border-r-sunflower/20 border-y-sunflower/20 border-l-4 border-l-sunflower bg-white/80 p-6 text-center shadow-sm">
            <h2 className="text-xl font-semibold">Live Products</h2>
            <p className="mt-2 text-base">Browse what&apos;s being sold on campus right now.</p>
          </div>
          <div className="rounded-lg border-r-[0.5px] border-y-[0.5px] border-r-coral/20 border-y-coral/20 border-l-4 border-l-coral bg-white/80 p-6 text-center shadow-sm">
            <h2 className="text-xl font-semibold">Free to List</h2>
            <p className="mt-2 text-base">Post up to 3 items at no cost - no fees to get started.</p>
          </div>
          <div className="rounded-lg border-r-[0.5px] border-y-[0.5px] border-r-sunflower/20 border-y-sunflower/20 border-l-4 border-l-sunflower bg-white/80 p-6 text-center shadow-sm">
            <h2 className="text-xl font-semibold">Direct Contact</h2>
            <p className="mt-2 text-base">Reach sellers instantly via call or WhatsApp - no middleman.</p>
          </div>
        </div>
      </section>

      {/* FEATURE HIGHLIGHT CARDS */}
      <section className="bg-forest/5 pb-12">
        <div className="container mx-auto grid gap-4 px-4 md:grid-cols-2 xl:grid-cols-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="relative overflow-hidden rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-coral/20 border-y-coral/20 border-l-4 border-l-coral bg-white/85 p-6 shadow-md"
            >
              <div className="absolute right-0 top-0 h-6 w-6 bg-sunflower/35 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
              <h3 className="text-lg font-semibold text-forest">{feature.title}</h3>
              <p className="mt-2 text-sm text-charcoal/80">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold text-center text-forest">Frequently Asked Questions</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-3">
            <details className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/85 p-5 shadow-sm">
              <summary className="cursor-pointer font-medium text-charcoal">
                How do I download notes?
              </summary>
              <p className="mt-3 text-sm leading-6 text-charcoal/80">
                Upload 4 approved resources to unlock unlimited downloads for 7 hours.
              </p>
            </details>
            <details className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/85 p-5 shadow-sm">
              <summary className="cursor-pointer font-medium text-charcoal">Are the notes free?</summary>
              <p className="mt-3 text-sm leading-6 text-charcoal/80">
                Yes - upload your own notes to earn access. Once 4 of your uploads are approved, you unlock 7 hours of unlimited downloads.
              </p>
            </details>
            <details className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/85 p-5 shadow-sm">
              <summary className="cursor-pointer font-medium text-charcoal">
                Which university is supported?
              </summary>
              <p className="mt-3 text-sm leading-6 text-charcoal/80">
                MVCorner currently supports Maseno University, with more universities coming soon.
              </p>
            </details>
            <details className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/85 p-5 shadow-sm">
              <summary className="cursor-pointer font-medium text-charcoal">
                How do I request a course that isn&apos;t listed?
              </summary>
              <p className="mt-3 text-sm leading-6 text-charcoal/80">
                Use the course request feature after signing up - our admins review and add it for
                everyone once approved.
              </p>
            </details>
            <details className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/85 p-5 shadow-sm">
              <summary className="cursor-pointer font-medium text-charcoal">
                How do I sell something on the marketplace?
              </summary>
              <p className="mt-3 text-sm leading-6 text-charcoal/80">
                Create a free product listing, add photos and a price, and interested buyers can reach you
                directly by call or WhatsApp.
              </p>
            </details>
            <details className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/85 p-5 shadow-sm">
              <summary className="cursor-pointer font-medium text-charcoal">
                Is there a cost to sell?
              </summary>
              <p className="mt-3 text-sm leading-6 text-charcoal/80">
                The free tier allows up to 3 active products. A Pro tier is available if you want
                more product capacity.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* NATURAL SIGN‑UP FLOW */}
      <section className="bg-sunflower/10 py-12 text-center">
        {isLoggedIn ? (
          <Link
            href="/choose"
            className="inline-flex rounded-md bg-forest px-6 py-3 font-medium text-white transition hover:bg-leaf"
          >
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/dashboard"
              className="inline-flex rounded-md bg-forest px-6 py-3 font-medium text-white transition hover:bg-leaf"
            >
              Explore Resources
            </Link>
            <br />
            <Link
              href="/login"
              className="mt-4 inline-flex rounded-md border border-forest/30 bg-white/70 px-6 py-3 font-medium text-forest transition hover:bg-white"
            >
              Log in
            </Link>
          </>
        )}
      </section>

      <footer className="border-t border-forest/20 bg-white/60 py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 text-sm md:grid-cols-2 xl:grid-cols-4">
            <div>
              <h2 className="font-semibold text-forest">Resources</h2>
              <div className="mt-4 space-y-2 text-charcoal/80">
                <Link href="/browse" className="block transition hover:text-coral">Past Papers</Link>
                <Link href="/browse" className="block transition hover:text-coral">Lecture Notes</Link>
                <Link href="/browse" className="block transition hover:text-coral">Study Guides</Link>
                <Link href="/browse" className="block transition hover:text-coral">CATs</Link>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-forest">Marketplace</h2>
              <div className="mt-4 space-y-2 text-charcoal/80">
                <Link href="/marketplace" className="block transition hover:text-coral">Browse products</Link>
                <Link href="/marketplace/new" className="block transition hover:text-coral">Sell an item</Link>
                <Link href="/marketplace/pro" className="block transition hover:text-coral">Pro plan</Link>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-forest">University</h2>
              <div className="mt-4 space-y-2 text-charcoal/80">
                <Link href="/browse" className="block transition hover:text-coral">Maseno University</Link>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-forest">Support</h2>
              <div className="mt-4 space-y-2 text-charcoal/80">
                <Link href="/contact" className="block transition hover:text-coral">Contact</Link>
                <Link href="/privacy" className="block transition hover:text-coral">Privacy Policy</Link>
                <Link href="/terms" className="block transition hover:text-coral">Terms</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}