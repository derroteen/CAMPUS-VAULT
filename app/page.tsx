"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/Skeleton";

type PopularCourse = {
  id: string;
  name: string;
  universityId: string;
  resourceCount: number;
};

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const [popularCourses, setPopularCourses] = useState<PopularCourse[]>([]);

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

  useEffect(() => {
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
            .sort((a, b) => b.resourceCount - a.resourceCount || a.name.localeCompare(b.name))
            .slice(0, 8);
        }
      }


      setPopularCourses(topCourses);
    };

    loadHomepageData();
  }, []);

  if (loading) {
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
            <Skeleton className="h-6 w-40 mx-auto mb-4 rounded-full" />
            <Skeleton className="h-12 w-full max-w-3xl mx-auto mb-4" />
            <Skeleton className="h-7 w-full max-w-2xl mx-auto mb-6" />
            <Skeleton className="h-8 w-full max-w-4xl mx-auto mb-8" />
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Skeleton className="h-12 w-32 rounded-md" />
              <Skeleton className="h-12 w-32 rounded-md" />
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>

          {/* Feature Highlight Cards */}
          <div className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const features = [
    {
      title: "Verified resources",
      description: "Peer-uploaded and moderated notes, past papers, and study guides",
    },
    {
      title: "Maseno University only",
      description: "Organized by course for faster discovery across Maseno University",
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
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Download Maseno University Notes, Past Papers & Study Resources
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
            Access verified notes, CATs, past papers and study guides for Maseno University students.
            Upload your own resources or unlock unlimited downloads for 7 hours.
          </p>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-300">
            Campus Vault helps Maseno University students download notes, past papers, CATs,
            assignments and study guides &mdash; organized by course and unit for fast, easy access.
          </p>
          <h2 className="mx-auto mt-8 max-w-4xl text-2xl font-semibold leading-tight text-white sm:text-3xl">
            Upload 4 Notes or Pay KSh 30 to Unlock Unlimited Downloads for 7 Hours
          </h2>
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

        {/* Stats Row */}
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
            <p className="text-xl font-bold text-white">Growing Library</p>
            <p className="mt-2 text-sm text-slate-400">Verified notes, past papers and study guides added regularly</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
            <p className="text-xl font-bold text-white">New Resources Weekly</p>
            <p className="mt-2 text-sm text-slate-400">Fresh uploads from Maseno University students every week</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
            <p className="text-xl font-bold text-white">Organized by Course</p>
            <p className="mt-2 text-sm text-slate-400">Find exactly what you need, filtered by school and course</p>
          </div>
        </div>

        {popularCourses.length > 0 && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-400">Browse popular subjects</span>
              {popularCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/browse?university=${course.universityId}&course=${course.id}`}
                  className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-500 hover:text-white"
                >
                  {course.name}
                </Link>
              ))}
            </div>
          </section>
        )}

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
                Join Maseno University students sharing and accessing study resources.
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

        {/* FAQ */}
        <section className="mt-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-semibold text-white">Frequently Asked Questions</h2>
            <div className="mt-8 space-y-3">
              <details className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <summary className="cursor-pointer font-medium text-white">How do I download notes?</summary>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Upload 4 approved resources, or pay KSh 30 via M-Pesa to unlock unlimited downloads
                  for 7 hours.
                </p>
              </details>
              <details className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <summary className="cursor-pointer font-medium text-white">Are the notes free?</summary>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Yes &mdash; upload your own notes to earn access, or pay a small one-time fee for
                  temporary unlimited access.
                </p>
              </details>
              <details className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <summary className="cursor-pointer font-medium text-white">Which university is supported?</summary>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Campus Vault currently supports Maseno University, with more universities coming soon.
                </p>
              </details>
              <details className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <summary className="cursor-pointer font-medium text-white">
                  How do I request a course that isn&apos;t listed?
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Use the course request feature after signing up &mdash; our admins review and add it for
                  everyone once approved.
                </p>
              </details>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-slate-800 py-10">
          <div className="grid gap-8 text-sm md:grid-cols-3">
            <div>
              <h2 className="font-semibold text-white">Resources</h2>
              <div className="mt-4 space-y-2 text-slate-400">
                <Link href="/browse" className="block transition hover:text-white">Past Papers</Link>
                <Link href="/browse" className="block transition hover:text-white">Lecture Notes</Link>
                <Link href="/browse" className="block transition hover:text-white">Study Guides</Link>
                <Link href="/browse" className="block transition hover:text-white">CATs</Link>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-white">University</h2>
              <div className="mt-4 space-y-2 text-slate-400">
                <Link href="/browse" className="block transition hover:text-white">Maseno University</Link>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-white">Support</h2>
              <div className="mt-4 space-y-2 text-slate-400">
                <Link href="/contact" className="block transition hover:text-white">Contact</Link>
                <Link href="/privacy" className="block transition hover:text-white">Privacy Policy</Link>
                <Link href="/terms" className="block transition hover:text-white">Terms</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
