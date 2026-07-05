"use client";

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
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsAdmin(false);
        setUnlockExpiresAt(null);
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
        });
    });

    loadProfile();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">Browse resources</h1>
          <p className="mt-2 text-slate-400">
            Select a university and course to see approved materials.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
            <label htmlFor="university" className="mb-2 block text-sm text-slate-300">
              University
            </label>
            <select
              id="university"
              value={selectedUniversityId}
              onChange={(e) => setSelectedUniversityId(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
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

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
            <label htmlFor="course" className="mb-2 block text-sm text-slate-300">
              Course
            </label>
            <select
              id="course"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
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
        </div>

        <div className="mt-8">
          {resourceLoading ? (
            <p className="text-slate-400">Loading resources...</p>
          ) : selectedCourseId && resources.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{resource.title}</h2>
                      <p className="mt-2 text-sm text-slate-400">
                        {resource.unit_name ? `${resource.unit_name} • ` : ""}
                        {resource.resource_type}
                      </p>
                    </div>
                    <span className="rounded-full bg-sky-900/60 px-3 py-1 text-xs text-sky-200">
                      {resource.download_count} downloads
                    </span>
                  </div>
                  {unlockTargetId === resource.id && unlockNotice ? (
                    <div className="mt-5 space-y-2">
                      <p className="text-sm text-amber-300">{unlockNotice}</p>
                      <button
                        type="button"
                        className="w-full rounded-md border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20"
                      >
                        Pay KES 30
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDownload(resource)}
                      disabled={downloadingId === resource.id}
                      className="mt-5 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                    >
                      {downloadingId === resource.id ? "Preparing..." : "Download"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : selectedCourseId ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-slate-400">
              No approved resources found for this course yet.
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-slate-400">
              Choose a course to view approved resources.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
