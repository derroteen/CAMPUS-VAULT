"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type University = {
  id: string;
  name: string;
};

type Course = {
  id: string;
  name: string;
  code: string;
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
        <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
          <div className="mx-auto max-w-6xl">
            <p className="text-slate-400">Loading browse page...</p>
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchResults, setSearchResults] = useState<Resource[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loading, setLoading] = useState(true);
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

    const { data, error } = await supabase
      .from("resources")
      .select("id, title, unit_name, resource_type, storage_path, download_count, course_id")
      .eq("status", "approved")
      .or(`title.ilike.%${trimmedTerm}%,unit_name.ilike.%${trimmedTerm}%`)
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
        .order("name", { ascending: true });

      if (!error && data) {
        setUniversities(data);

        const universityParam = searchParams.get("university");
        if (universityParam) {
          const matchingUniversity = data.find((university) => university.id === universityParam);
          if (matchingUniversity) {
            setSelectedUniversityId(matchingUniversity.id);
          }
        }
      }

      setLoading(false);
    };

    loadUniversities();
  }, [searchParams]);

  useEffect(() => {
    const loadCourses = async () => {
      if (!selectedUniversityId) {
        setCourses([]);
        setSelectedCourseId("");
        setResources([]);
        return;
      }

      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("university_id", selectedUniversityId)
        .order("name", { ascending: true });

      if (!error && data) {
        setCourses(data);
      }
      setSelectedCourseId("");
      setResources([]);
    };

    loadCourses();
  }, [selectedUniversityId]);

  useEffect(() => {
    const loadResources = async () => {
      if (!selectedCourseId) {
        setResources([]);
        return;
      }

      setResourceLoading(true);
      const { data, error } = await supabase
        .from("resources")
        .select("id, title, unit_name, resource_type, storage_path, download_count")
        .eq("course_id", selectedCourseId)
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

  const handleFeaturedUniversitySelect = (universityId: string) => {
    setSelectedUniversityId(universityId);
    setSearchQuery("");
    setSearchMode(false);
    setSearchResults([]);
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

        <div className="mt-8 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <h2 className="text-lg font-semibold text-white">Filters</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="university" className="mb-2 block text-sm text-slate-300">
                    University
                  </label>
                  <select
                    id="university"
                    value={selectedUniversityId}
                    onChange={(e) => setSelectedUniversityId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                    disabled={loading}
                  >
                    <option value="">Select a university</option>
                    {universities.map((university) => (
                      <option key={university.id} value={university.id}>
                        {university.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="course" className="mb-2 block text-sm text-slate-300">
                    Course
                  </label>
                  <select
                    id="course"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                    disabled={!selectedUniversityId || courses.length === 0}
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </select>
                </div>

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
                <Link
                  href="/upload"
                  className="mt-4 inline-flex rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-400"
                >
                  Upload resource
                </Link>
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
                        <button
                          type="button"
                          className="w-full rounded-xl border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20"
                        >
                          Pay KES 30
                        </button>
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
    </main>
  );
}
