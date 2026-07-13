"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import SchoolCoursePicker, { SchoolCoursePickerValue } from "@/app/components/SchoolCoursePicker";
import { Skeleton } from "@/components/Skeleton";

type University = {
  id: string;
  name: string;
};

type Resource = {
  id: string;
  title: string;
  unit_name: string | null;
  resource_type: string;
  storage_path: string;
  download_count: number;
  course_name?: string | null;
  university_name?: string | null;
};

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <section className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 shadow-2xl shadow-slate-950/40 sm:p-10">
              <Skeleton className="h-7 w-48 mb-6" />
              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div>
                  <Skeleton className="h-12 w-96 mb-4" />
                  <Skeleton className="h-6 w-80" />
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </div>
            </section>

            <div className="mt-8 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
                  <Skeleton className="h-7 w-20 mb-4" />
                  <div className="mt-4 space-y-4">
                    <Skeleton className="h-5 w-16 mb-2" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-5 w-20 mb-2" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                </div>
              </aside>

              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-5 w-12" />
                      </div>
                      <Skeleton className="h-7 w-full mt-4" />
                      <Skeleton className="h-5 w-3/4 mt-2" />
                      <Skeleton className="h-5 w-1/2 mt-2" />
                      <Skeleton className="h-10 w-full mt-5 rounded-xl" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      }
    >
      <BrowsePageContent />
    </Suspense>
  );
}

function BrowsePageContent() {
  const searchParams = useSearchParams();
  const [universities, setUniversities] = useState<University[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchResults, setSearchResults] = useState<Resource[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [resourceLoading, setResourceLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<string | null>(null);
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);
  const [unlockTargetId, setUnlockTargetId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setIsAdmin(false);
        setUnlockExpiresAt(null);
        setProfileLoaded(true);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin, unlock_expires_at")
        .eq("id", session.user.id)
        .single();

      if (!error && data) {
        setIsAdmin(Boolean(data.is_admin));
        setUnlockExpiresAt(data.unlock_expires_at);
      }

      setProfileLoaded(true);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsAdmin(false);
        setUnlockExpiresAt(null);
        setProfileLoaded(true);
        return;
      }

      supabase
        .from("profiles")
        .select("is_admin, unlock_expires_at")
        .eq("id", session.user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setIsAdmin(Boolean(data.is_admin));
            setUnlockExpiresAt(data.unlock_expires_at);
          }

          setProfileLoaded(true);
        });
    });

    loadProfile();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const runSearch = async (term: string) => {
    const trimmedTerm = term.trim();
    if (!trimmedTerm) {
      setSearchResults([]);
      setSearchMode(false);
      return;
    }
    setSearchMode(true);
    setResourceLoading(true);

    // Step 1: find courses whose name matches the search term
    const { data: matchingCourses } = await supabase
      .from("courses")
      .select("id")
      .ilike("name", `%${trimmedTerm}%`);

    const matchingCourseIds = (matchingCourses ?? []).map((c) => c.id);

    // Step 2: find resource_ids linked to those courses (if any matched)
    let resourceIdsFromCourseMatch: string[] = [];
    if (matchingCourseIds.length > 0) {
      const { data: linkedResources } = await supabase
        .from("resource_courses")
        .select("resource_id")
        .in("course_id", matchingCourseIds);
      resourceIdsFromCourseMatch = Array.from(
        new Set((linkedResources ?? []).map((r) => r.resource_id))
      );
    }

    // Step 3: build the combined OR filter — title, unit_name, OR resource 
    // id is in the course-matched list
    let orFilter = `title.ilike.%${trimmedTerm}%,unit_name.ilike.%${trimmedTerm}%`;
    if (resourceIdsFromCourseMatch.length > 0) {
      orFilter += `,id.in.(${resourceIdsFromCourseMatch.join(",")})`;
    }

    const { data, error } = await supabase
      .from("resources")
      .select("id, title, unit_name, resource_type, storage_path, download_count, course_id")
      .eq("status", "approved")
      .or(orFilter)
      .order("created_at", { ascending: false });

    if (error || !data) {
      setSearchResults([]);
      setResourceLoading(false);
      return;
    }

    const courseIds = Array.from(new Set(data.map((resource) => resource.course_id)));
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("id, name, university_id")
      .in("id", courseIds);
    const universityIds = Array.from(
      new Set((courseData ?? []).map((course) => course.university_id))
    );
    const { data: universityData, error: universityError } = await supabase
      .from("universities")
      .select("id, name")
      .in("id", universityIds);
    if (!courseError && !universityError) {
      const courseMap = new Map((courseData ?? []).map((course) => [course.id, course]));
      const universityMap = new Map((universityData ?? []).map((university) => [university.id, university]));
      const enrichedResults = data.map((resource) => {
        const course = courseMap.get(resource.course_id);
        const university = course ? universityMap.get(course.university_id) : undefined;
        return {
          ...resource,
          course_name: course?.name ?? null,
          university_name: university?.name ?? null,
        };
      });
      setSearchResults(enrichedResults);
    } else {
      setSearchResults([]);
    }
    setResourceLoading(false);
  };

  useEffect(() => {
    const trimmedTerm = searchQuery.trim();

    if (!trimmedTerm) {
      setSearchResults([]);
      setSearchMode(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      runSearch(trimmedTerm);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    const loadUniversities = async () => {
      const { data, error } = await supabase
        .from("universities")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!error && data) {
        setUniversities(data);

        const masenoUniversity = data.find((university) => university.name === "Maseno University");
        const activeUniversityId = masenoUniversity?.id ?? data[0]?.id ?? "";
        setSelectedUniversityId(activeUniversityId);
      }
    };

    loadUniversities();
  }, [searchParams]);

  useEffect(() => {
    const loadCourseSelection = async () => {
      if (!selectedUniversityId) {
        setSelectedSchoolId(null);
        setSelectedCourseId("");
        setResources([]);
        return;
      }

      const courseParam = searchParams.get("course");

      if (!courseParam) {
        setSelectedSchoolId(null);
        setSelectedCourseId("");
        setResources([]);
        return;
      }

      const { data, error } = await supabase
        .from("courses")
        .select("id, school_id")
        .eq("id", courseParam)
        .eq("university_id", selectedUniversityId)
        .maybeSingle();

      if (!error && data) {
        setSelectedSchoolId(data.school_id ?? null);
        setSelectedCourseId(data.id);
        return;
      }

      setSelectedSchoolId(null);
      setSelectedCourseId("");
      setResources([]);
    };

    loadCourseSelection();
  }, [searchParams, selectedUniversityId]);

  useEffect(() => {
    const loadResources = async () => {
      if (!selectedCourseId) {
        setResources([]);
        return;
      }

      setResourceLoading(true);

      // Step 1: resolve which resource_ids are linked to this course via the
      // junction table (covers both the primary course_id column and any
      // additional courses added through resource_courses).
      const { data: linkedRows, error: linkError } = await supabase
        .from("resource_courses")
        .select("resource_id")
        .eq("course_id", selectedCourseId);

      if (linkError || !linkedRows || linkedRows.length === 0) {
        setResources([]);
        setResourceLoading(false);
        return;
      }

      const resourceIds = linkedRows.map((row) => row.resource_id);

      // Step 2: fetch the actual resources filtered by those ids.
      const { data, error } = await supabase
        .from("resources")
        .select("id, title, unit_name, resource_type, storage_path, download_count")
        .in("id", resourceIds)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setResources(data);
      } else {
        setResources([]);
      }

      setResourceLoading(false);
    };

    loadResources();
  }, [selectedCourseId]);

  const hasUnlockedAccess = () => {
    if (isAdmin) {
      return true;
    }

    if (!unlockExpiresAt) {
      return false;
    }

    return new Date(unlockExpiresAt).getTime() > Date.now();
  };

  const activeResources = searchMode ? searchResults : resources;
  const filteredResources = activeResources.filter((resource) => {
    const matchesType =
      resourceTypeFilter === "all" || resource.resource_type === resourceTypeFilter;

    return matchesType;
  });

  const getResourceBadge = (type: string) => {
    switch (type) {
      case "past_paper":
        return "bg-amber-500/15 text-amber-200";
      case "assignment":
        return "bg-violet-500/15 text-violet-200";
      case "summary":
        return "bg-emerald-500/15 text-emerald-200";
      default:
        return "bg-sky-500/15 text-sky-200";
    }
  };

  const getResourceLabel = (type: string) => {
    switch (type) {
      case "past_paper":
        return "PAST PAPER";
      case "assignment":
        return "ASSIGNMENT";
      case "summary":
        return "SUMMARY";
      default:
        return "NOTES";
    }
  };

  const handleDownload = async (resource: Resource) => {
    if (!hasUnlockedAccess()) {
      setUnlockTargetId(resource.id);
      setUnlockNotice(
        "Upload 4 approved resources or pay KES 30 to unlock 7 hours of downloads"
      );
      return;
    }

    setDownloadingId(resource.id);
    setUnlockTargetId(null);
    setUnlockNotice(null);

    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(resource.storage_path, 60);

    if (error || !data?.signedUrl) {
      setDownloadingId(null);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");

    const { data: resourceData } = await supabase
      .from("resources")
      .select("download_count")
      .eq("id", resource.id)
      .single();

    await supabase
      .from("resources")
      .update({ download_count: (resourceData?.download_count ?? 0) + 1 })
      .eq("id", resource.id);

    setResources((current) =>
      current.map((item) =>
        item.id === resource.id
          ? { ...item, download_count: item.download_count + 1 }
          : item
      )
    );

    setDownloadingId(null);
  };

  const refreshProfile = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("is_admin, unlock_expires_at")
      .eq("id", session.user.id)
      .single();

    if (data) {
      setIsAdmin(Boolean(data.is_admin));
      setUnlockExpiresAt(data.unlock_expires_at);
    }
  };

  const checkTransactionStatus = useCallback(async () => {
    if (!paymentReference) return;

    const { data } = await supabase
      .from("transactions")
      .select("status")
      .eq("paystack_reference", paymentReference)
      .single();

    if (!data) return;

    if (data.status === "success") {
      setPaymentMessage("Payment confirmed! You now have 7 hours of unlimited downloads.");
      setPollingCount(0);
      setPaymentReference(null);
      setPaymentSucceeded(true);
      await refreshProfile();
    } else if (data.status === "failed") {
      setPaymentMessage("Payment was not completed. Please try again.");
      setPollingCount(0);
      setPaymentReference(null);
      setPaymentError(true);
    }
  }, [paymentReference]);

  useEffect(() => {
    if (!paymentSucceeded) return;
    const timeout = setTimeout(() => {
      setShowPaymentForm(false);
      setPaymentSucceeded(false);
      setPhoneNumber("");
      setPaymentMessage(null);
    }, 4000);
    return () => clearTimeout(timeout);
  }, [paymentSucceeded]);

  useEffect(() => {
    if (!paymentReference || pollingCount >= 30) {
      return;
    }

    const interval = setInterval(async () => {
      await checkTransactionStatus();
      setPollingCount((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [paymentReference, pollingCount, checkTransactionStatus]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(false);
    setPaymentMessage(null);

    const phonePattern = /^(07|01)\d{8}$/;
    if (!phonePattern.test(phoneNumber)) {
      setPaymentMessage("Please enter a valid Kenyan phone number (e.g. 0712345678)");
      setPaymentError(true);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return;
    }

    setPaymentInProgress(true);

    try {
      const response = await fetch("/api/paystack/charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ phoneNumber })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error("Failed to initiate payment");
      }

      setPaymentReference(result.data.reference);
      setPaymentMessage("Check your phone to enter your M-Pesa PIN and complete the payment...");
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentMessage("Something went wrong. Please try again.");
      setPaymentError(true);
    } finally {
      setPaymentInProgress(false);
    }
  };

  const featuredUniversities = universities.filter((university) =>
    [
      "University of Nairobi",
      "Kenyatta University",
      "Moi University",
      "JKUAT",
      "Maseno University",
      "Strathmore University",
    ].includes(university.name)
  );
  const activeUniversityName =
    universities.find((university) => university.id === selectedUniversityId)?.name ??
    "Maseno University";

  const handleFeaturedUniversitySelect = (universityId: string) => {
    setSelectedUniversityId(universityId);
    setSelectedSchoolId(null);
    setSelectedCourseId("");
    setResources([]);
    setSearchQuery("");
    setSearchMode(false);
    setSearchResults([]);
  };

  const handleSchoolCourseChange = (nextValue: SchoolCoursePickerValue) => {
    setSelectedSchoolId(nextValue.schoolId);
    setSelectedCourseId(nextValue.courseId ?? "");
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    runSearch(searchQuery);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 shadow-2xl shadow-slate-950/40 sm:p-10">
          <div className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-sm font-medium text-sky-200">
            Verified Study Resource Hub
          </div>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Find notes, past papers, and study guides
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-400">
                Discover trusted resources curated for your university and course in one streamlined hub.
              </p>
            </div>
            <form onSubmit={handleSearchSubmit} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <label htmlFor="resource-search" className="mb-2 block text-sm font-medium text-slate-300">
                Search resources
              </label>
              <input
                id="resource-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or unit"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
              />
            </form>
          </div>
        </section>

        {universities.length > 1 ? (
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
            <span className="text-sm text-slate-400">Popular universities</span>
            {featuredUniversities.map((university) => (
              <button
                key={university.id}
                type="button"
                onClick={() => handleFeaturedUniversitySelect(university.id)}
                className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-500 hover:text-white"
              >
                {university.name}
              </button>
            ))}
            <span className="ml-1 text-sm text-slate-500">🔎 search above if yours isn&apos;t listed</span>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-center">
            <span className="text-sm text-slate-300">Now live for {universities[0]?.name || 'Maseno University'} students</span>
          </div>
        )}

        <div className="mt-8 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <h2 className="text-lg font-semibold text-white">Filters</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="university" className="mb-2 block text-sm text-slate-300">
                    University
                  </label>
                  <div className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200">
                    {activeUniversityName}
                  </div>
                </div>
                <SchoolCoursePicker
                  universityId={selectedUniversityId}
                  value={{ schoolId: selectedSchoolId, courseId: selectedCourseId || null }}
                  onChange={handleSchoolCourseChange}
                />

                <div>
                  <label htmlFor="resource-type" className="mb-2 block text-sm text-slate-300">
                    Resource Type
                  </label>
                  <select
                    id="resource-type"
                    value={resourceTypeFilter}
                    onChange={(e) => setResourceTypeFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="notes">notes</option>
                    <option value="past_paper">past_paper</option>
                    <option value="assignment">assignment</option>
                    <option value="summary">summary</option>
                  </select>
                </div>
              </div>
            </div>

            {profileLoaded && !hasUnlockedAccess() ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 shadow-lg">
                <h3 className="text-base font-semibold text-amber-200">Need unlimited access?</h3>
                <p className="mt-2 text-sm leading-6 text-amber-100/90">
                  Upload 4 approved resources and unlock 7 hours of downloads with the 4-for-7 model.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href="/upload"
                    className="flex-1 rounded-full bg-amber-500 px-4 py-2 text-center text-sm font-medium text-slate-950 transition hover:bg-amber-400"
                  >
                    Upload resource
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentForm(true);
                      setPaymentSucceeded(false);
                    }}
                    className="flex-1 rounded-full border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20"
                  >
                    Pay KES 30
                  </button>
                </div>
              </div>
            ) : null}
          </aside>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {searchMode ? `Search results for "${searchQuery.trim()}"` : "Approved resources"}
                </h2>
                <p className="text-sm text-slate-400">
                  {searchMode
                    ? "Showing matching approved resources from across Campus Vault."
                    : selectedCourseId
                      ? "Explore the current course collection below."
                      : "Choose a university and course to start browsing."}
                </p>
              </div>
              {selectedCourseId ? (
                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300">
                  {filteredResources.length} results
                </span>
              ) : null}
            </div>

            {resourceLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400">
                Loading resources...
              </div>
            ) : (searchMode || selectedCourseId) && filteredResources.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredResources.map((resource) => (
                  <article
                    key={resource.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition hover:border-sky-500/40 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${getResourceBadge(resource.resource_type)}`}>
                        {getResourceLabel(resource.resource_type)}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-slate-400">
                        <span>⬇</span>
                        <span>{resource.download_count}</span>
                      </div>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-white">{resource.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      {resource.unit_name ?? "No unit listed"}
                    </p>
                    {resource.course_name || resource.university_name ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {resource.course_name}
                        {resource.course_name && resource.university_name ? " • " : ""}
                        {resource.university_name}
                      </p>
                    ) : null}

                    {unlockTargetId === resource.id && unlockNotice ? (
                      <div className="mt-5 space-y-2">
                        <p className="text-sm text-amber-300">{unlockNotice}</p>
                        {!showPaymentForm ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowPaymentForm(true);
                              setUnlockTargetId(null);
                              setUnlockNotice(null);
                            }}
                            className="w-full rounded-xl border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20"
                          >
                            Pay KES 30
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDownload(resource)}
                        disabled={downloadingId === resource.id}
                        className="mt-5 w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                      >
                        {downloadingId === resource.id ? "Preparing..." : "Download"}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (searchMode || selectedCourseId) ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400">
                No approved resources match your current filters yet.
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400">
                Choose a university and course to start browsing.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentForm || paymentReference ? (
        <div
          className="fixed inset-0 flex items-center justify-center bg-slate-950/80 z-50 p-4"
          onClick={() => {
            if (!paymentReference) {
              setShowPaymentForm(false);
              setPhoneNumber("");
              setPaymentMessage(null);
              setPaymentError(false);
            }
          }}
        >
          <div
            className={`rounded-2xl border bg-slate-900 p-6 shadow-xl max-w-md w-full transition-all ${
              paymentReference ? "border-2 border-blue-400/80 shadow-blue-500/30 animate-pulse" : "border border-blue-800/40"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-blue-400">Need unlimited access?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Pay KES 30 via M-Pesa to unlock 7 hours of downloads!
            </p>
            <div className="mt-5 space-y-3">
  {paymentSucceeded ? (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
        <svg className="h-9 w-9 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-base font-medium text-emerald-300">
        {paymentMessage}
      </p>
      <button
        type="button"
        onClick={() => {
          setShowPaymentForm(false);
          setPaymentSucceeded(false);
          setPhoneNumber("");
          setPaymentMessage(null);
        }}
        className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
      >
        Done
      </button>
    </div>
  ) : (
    <form onSubmit={handlePaymentSubmit} className="space-y-3">
      {paymentMessage && (
                  <p className={`text-sm ${paymentError ? "text-red-300" : "text-blue-300"}`}>
                    {paymentMessage}
                  </p>
                )}
                {paymentReference && pollingCount < 30 && (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-transparent"></div>
                  </div>
                )}
                {paymentReference && pollingCount >= 30 && (
                  <div className="space-y-3">
                    <p className="text-sm text-blue-300">
                      We haven&apos;t received confirmation yet. If you didn&apos;t complete the payment on your phone, you can cancel and try again.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={checkTransactionStatus}
                        className="flex-1 rounded-full border border-blue-500/60 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
                      >
                        Check status
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentReference(null);
                          setPollingCount(0);
                          setPaymentMessage(null);
                          setPaymentError(false);
                        }}
                        className="flex-1 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
                      >
                        Cancel &amp; retry
                      </button>
                    </div>
                  </div>
                )}
                {!paymentReference && (
                  <>
                    <input
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={paymentInProgress}
                      className="w-full rounded-xl border border-blue-500/40 bg-slate-800 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={paymentInProgress}
                      className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-600/50"
                    >
                      {paymentInProgress ? "Processing..." : "Send Payment Request"}
                    </button>
                  </>
                )}
                {!paymentReference && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentForm(false);
                      setPhoneNumber("");
                      setPaymentMessage(null);
                      setPaymentError(false);
                    }}
                    className="w-full text-xs text-slate-400 underline"
                  >
                    Cancel payment
                  </button>
                )}
              </form>
              )}  
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

