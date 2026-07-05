"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PendingResource = {
  id: string;
  title: string;
  resource_type: string;
  uploader_id: string;
  course_id: string;
  storage_path: string;
};

type PendingCourseRequest = {
  id: string;
  requested_name: string;
  requested_code: string;
  university_id: string;
  requested_by: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<PendingResource[]>([]);
  const [courseRequests, setCourseRequests] = useState<PendingCourseRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [universities, setUniversities] = useState<Record<string, string>>({});
  const [requesters, setRequesters] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    const loadAdminPage = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (!profileData?.is_admin) {
        router.replace("/dashboard");
        return;
      }

      const { data: pendingResources, error: resourcesError } = await supabase
        .from("resources")
        .select("id, title, resource_type, uploader_id, course_id, storage_path")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!resourcesError && pendingResources) {
        setResources(pendingResources);
      }

      const { data: pendingRequests, error: requestsError } = await supabase
        .from("course_requests")
        .select("id, requested_name, requested_code, university_id, requested_by")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!requestsError && pendingRequests) {
        setCourseRequests(pendingRequests);
      }

      const uploaderIds = Array.from(
        new Set((pendingResources ?? []).map((resource) => resource.uploader_id))
      );
      const courseIds = Array.from(
        new Set((pendingResources ?? []).map((resource) => resource.course_id))
      );
      const requestersIds = Array.from(
        new Set((pendingRequests ?? []).map((request) => request.requested_by))
      );
      const universityIds = Array.from(
        new Set((pendingRequests ?? []).map((request) => request.university_id))
      );

      if (uploaderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", uploaderIds);

        const profileMap = Object.fromEntries(
          (profilesData ?? []).map((profile) => [profile.id, profile.email])
        );
        setProfiles(profileMap);
      }

      if (courseIds.length > 0) {
        const { data: coursesData } = await supabase
          .from("courses")
          .select("id, code")
          .in("id", courseIds);

        const courseMap = Object.fromEntries(
          (coursesData ?? []).map((course) => [course.id, course.code])
        );
        setCourses(courseMap);
      }

      if (requestersIds.length > 0) {
        const { data: requestersData } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", requestersIds);

        const requesterMap = Object.fromEntries(
          (requestersData ?? []).map((profile) => [profile.id, profile.email])
        );
        setRequesters(requesterMap);
      }

      if (universityIds.length > 0) {
        const { data: universitiesData } = await supabase
          .from("universities")
          .select("id, name")
          .in("id", universityIds);

        const universityMap = Object.fromEntries(
          (universitiesData ?? []).map((university) => [university.id, university.name])
        );
        setUniversities(universityMap);
      }

      setLoading(false);
    };

    loadAdminPage();
  }, [router]);

  const handleApproveResource = async (resourceId: string, uploaderId: string) => {
    setProcessingId(resourceId);

    const { error: updateError } = await supabase
      .from("resources")
      .update({ status: "approved" })
      .eq("id", resourceId);

    if (updateError) {
      setProcessingId(null);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("approved_uploads_count, unlock_expires_at")
      .eq("id", uploaderId)
      .single();

    const currentCount = profileData?.approved_uploads_count ?? 0;
    const nextCount = currentCount + 1;
    const unlockAt = nextCount >= 4
      ? new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString()
      : profileData?.unlock_expires_at ?? null;

    await supabase
      .from("profiles")
      .update({
        approved_uploads_count: nextCount >= 4 ? 0 : nextCount,
        unlock_expires_at: unlockAt,
      })
      .eq("id", uploaderId);

    setResources((current) => current.filter((resource) => resource.id !== resourceId));
    setProcessingId(null);
  };

  const handleRejectResource = async (resourceId: string) => {
    setProcessingId(resourceId);

    await supabase.from("resources").update({ status: "rejected" }).eq("id", resourceId);

    setResources((current) => current.filter((resource) => resource.id !== resourceId));
    setProcessingId(null);
  };

  const handlePreviewResource = async (storagePath: string) => {
    setPreviewError(null);

    const { data, error } = await supabase.storage
      .from("resources")
      .createSignedUrl(storagePath, 60);

    if (error || !data?.signedUrl) {
      setPreviewError("Unable to preview this resource right now.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleApproveCourseRequest = async (
    requestId: string,
    universityId: string,
    requestedName: string,
    requestedCode: string
  ) => {
    setProcessingId(requestId);

    await supabase.from("courses").insert({
      university_id: universityId,
      code: requestedCode.trim(),
      name: requestedName.trim(),
    });

    await supabase
      .from("course_requests")
      .update({ status: "approved" })
      .eq("id", requestId);

    setCourseRequests((current) => current.filter((request) => request.id !== requestId));
    setProcessingId(null);
  };

  const handleRejectCourseRequest = async (requestId: string) => {
    setProcessingId(requestId);

    await supabase
      .from("course_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    setCourseRequests((current) => current.filter((request) => request.id !== requestId));
    setProcessingId(null);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-slate-300">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Admin dashboard</h1>
            <p className="mt-2 text-slate-400">Review uploads and course requests.</p>
          </div>
          <Link href="/dashboard" className="text-sm text-sky-400 hover:text-sky-300">
            Back to dashboard
          </Link>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <h2 className="text-xl font-semibold">Pending resources</h2>
          {previewError ? (
            <p className="mt-3 text-sm text-rose-400">{previewError}</p>
          ) : null}
          <div className="mt-4 space-y-3">
            {resources.length === 0 ? (
              <p className="text-slate-400">No pending resources.</p>
            ) : (
              resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-medium text-white">{resource.title}</h3>
                    <p className="text-sm text-slate-400">
                      {resource.resource_type} • uploader: {profiles[resource.uploader_id] ?? "Unknown"} • course: {courses[resource.course_id] ?? "Unknown"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handlePreviewResource(resource.storage_path)}
                      className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleApproveResource(resource.id, resource.uploader_id)}
                      disabled={processingId === resource.id}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectResource(resource.id)}
                      disabled={processingId === resource.id}
                      className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <h2 className="text-xl font-semibold">Pending course requests</h2>
          <div className="mt-4 space-y-3">
            {courseRequests.length === 0 ? (
              <p className="text-slate-400">No pending course requests.</p>
            ) : (
              courseRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-medium text-white">
                      {request.requested_code} — {request.requested_name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      University: {universities[request.university_id] ?? "Unknown"} • requester: {requesters[request.requested_by] ?? "Unknown"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleApproveCourseRequest(
                          request.id,
                          request.university_id,
                          request.requested_name,
                          request.requested_code
                        )
                      }
                      disabled={processingId === request.id}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectCourseRequest(request.id)}
                      disabled={processingId === request.id}
                      className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
