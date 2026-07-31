"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SchoolCoursePicker, { SchoolCoursePickerValue } from "@/app/components/SchoolCoursePicker";

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
        <main className="min-h-screen bg-warm-bg px-6 py-12 text-charcoal">
          <div className="mx-auto max-w-6xl">
            <p className="text-slate-600">Loading browse page...</p>
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
        "Upload 4 approved resources to unlock 7 hours of downloads."
      );
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setDownloadingId(null);
      return;
    }

    setDownloadingId(resource.id);
    setUnlockTargetId(null);
    setUnlockNotice(null);

    try {
      const response = await fetch("/api/resources/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ resourceId: resource.id }),
      });

      const result = await response.json();
      if (!response.ok || !result.success || !result.signedUrl) {
        setDownloadingId(null);
        return;
      }

      window.open(result.signedUrl, "_blank", "noopener,noreferrer");

      setResources((current) =>
        current.map((item) =>
          item.id === resource.id
            ? { ...item, download_count: item.download_count + 1 }
            : item
        )
      );
    } finally {
      setDownloadingId(null);
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
    <main className="min-h-screen bg-warm-bg text-charcoal font-space-grotesk px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-warm-bg/50 to-warm-bg/30 p-8 shadow-2xl shadow-charcoal/20 sm:p-10">
          <div className="inline-flex items-center rounded-full border border-forest/30 bg-forest/10 px-3 py-1 text-xs font-medium text-forest">
            Verified Study Resource Hub
          </div>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-charcoal sm:text-5xl">
                Find notes, past papers, and study guides
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-600">
                Discover trusted resources curated for your university and course in one streamlined hub.
              </p>
            </div>
            <form onSubmit={handleSearchSubmit} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <label htmlFor="resource-search" className="mb-2 block text-sm text-slate-700">
                Search resources
              </label>
              <input
                id="resource-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or unit"
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50 placeholder:text-slate-400"
              />
            </form>
          </div>
        </section>

        {universities.length > 1 ? (
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
            <span className="text-sm text-slate-600">Popular universities</span>
            {featuredUniversities.map((university) => (
              <button
                key={university.id}
                type="button"
                onClick={() => handleFeaturedUniversitySelect(university.id)}
                className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm text-slate-600 transition hover:border-forest/50 hover:text-charcoal"
              >
                {university.name}
              </button>
            ))}
            <span className="ml-1 text-sm text-slate-400">🔎 search above if yours isn&apos;t listed</span>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-center">
            <span className="text-sm text-slate-500">Now live for {universities[0]?.name || 'Maseno University'} students</span>
          </div>
        )}

        <div className="mt-8 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-lg">
              <h2 className="text-lg font-semibold text-charcoal">Filters</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="university" className="mb-2 block text-sm text-slate-700">
                    University
                  </label>
                  <div className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-charcoal">
                    {activeUniversityName}
                  </div>
                </div>
                <SchoolCoursePicker
                  universityId={selectedUniversityId}
                  value={{ schoolId: selectedSchoolId, courseId: selectedCourseId || null }}
                  onChange={handleSchoolCourseChange}
                />

                <div>
                  <label htmlFor="resource-type" className="mb-2 block text-sm text-slate-700">
                    Resource Type
                  </label>
                  <select
                    id="resource-type"
                    value={resourceTypeFilter}
                    onChange={(e) => setResourceTypeFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-charcoal"
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
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-lg">
                <h3 className="text-base font-semibold text-forest">Need unlimited access?</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Upload 4 approved resources and unlock 7 hours of downloads with the 4-for-7 model.
                </p>
                <Link
                  href="/upload"
                  className="mt-4 block w-full rounded-xl border border-forest bg-forest/10 px-4 py-2 text-center text-sm font-medium text-forest transition hover:bg-forest/20"
                >
                  Upload resource
                </Link>
              </div>
            ) : null}
          </aside>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-charcoal">
                  {searchMode ? `Search results for "${searchQuery.trim()}"` : "Approved resources"}
                </h2>
                <p className="text-sm text-slate-600">
                  {searchMode
                    ? "Showing matching approved resources from across MVCorner."
                    : selectedCourseId
                      ? "Explore the current course collection below."
                      : "Choose a university and course to start browsing."}
                </p>
              </div>
              {selectedCourseId ? (
                <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-sm text-slate-600">
                  {filteredResources.length} results
                </span>
              ) : null}
            </div>

            {resourceLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-slate-600">
                Loading resources...
              </div>
            ) : (searchMode || selectedCourseId) && filteredResources.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredResources.map((resource) => (
                  <article
                    key={resource.id}
                    className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:border-forest/50 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${getResourceBadge(resource.resource_type)}`}>
                        {getResourceLabel(resource.resource_type)}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <span>⬇</span>
                        <span>{resource.download_count}</span>
                      </div>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-charcoal">{resource.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">
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
                        <p className="text-sm text-coral">{unlockNotice}</p>
                        <Link
                          href="/upload"
                          className="mt-2 inline-flex text-sm font-medium text-forest hover:text-leaf underline"
                        >
                          Upload a resource to unlock →
                        </Link>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDownload(resource)}
                        disabled={downloadingId === resource.id}
                        className="mt-5 w-full rounded-xl bg-forest px-4 py-2 text-sm font-medium text-white transition hover:bg-leaf disabled:cursor-not-allowed disabled:bg-slate-200/50"
                      >
                        {downloadingId === resource.id ? "Preparing..." : "Download"}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (searchMode || selectedCourseId) ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-slate-600">
                No approved resources match your current filters yet.
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-slate-600">
                Choose a university and course to start browsing.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}