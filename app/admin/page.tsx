"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/Skeleton";
import { getAdminMfaGateStatus } from "@/lib/auth-mfa";

type PendingResource = {
  id: string;
  title: string;
  unit_name: string | null;
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

type PendingProductRequest = {
  id: string;
  title: string;
  description: string | null;
  requested_by: string;
};

type ApprovedProductRequest = {
  id: string;
  title: string;
  description: string | null;
  requested_by: string;
};

type TopContributor = {
  id: string;
  full_name: string | null;
  approved_uploads_count: number;
  is_premium_contributor: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<PendingResource[]>([]);
  const [courseRequests, setCourseRequests] = useState<PendingCourseRequest[]>([]);
  const [productRequests, setProductRequests] = useState<PendingProductRequest[]>([]);
  const [approvedProductRequests, setApprovedProductRequests] = useState<ApprovedProductRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [universities, setUniversities] = useState<Record<string, string>>({});
  const [requesters, setRequesters] = useState<Record<string, string>>({});
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [needsMfaChallenge, setNeedsMfaChallenge] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadAdminPage = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      setCurrentAdminId(session.user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (!profileData?.is_admin) {
        router.replace("/dashboard");
        return;
      }

      // Approve/reject writes require a 2FA-verified (aal2) session. Google
      // sign-in only reaches aal1, so admins need a fresh code here first.
      const mfaGateStatus = await getAdminMfaGateStatus();

      if (mfaGateStatus.status === "needs_enrollment") {
        router.replace("/account?mfa_required=1");
        return;
      }

      if (mfaGateStatus.status === "needs_challenge") {
        setMfaFactorId(mfaGateStatus.factorId);
        setNeedsMfaChallenge(true);
        setLoading(false);
        return;
      }

      setNeedsMfaChallenge(false);

      const { data: pendingResources, error: resourcesError } = await supabase
        .from("resources")
        .select("id, title, unit_name, resource_type, uploader_id, course_id, storage_path")
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

      const { data: pendingProductRequests, error: productRequestsError } = await supabase
        .from("product_requests")
        .select("id, title, description, requested_by")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!productRequestsError && pendingProductRequests) {
        setProductRequests(pendingProductRequests);
      }

      const { data: approvedRequests, error: approvedRequestsError } = await supabase
        .from("product_requests")
        .select("id, title, description, requested_by")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (!approvedRequestsError && approvedRequests) {
        setApprovedProductRequests(approvedRequests);
      }

      const uploaderIds = Array.from(
        new Set((pendingResources ?? []).map((resource) => resource.uploader_id))
      );
      const courseIds = Array.from(
        new Set((pendingResources ?? []).map((resource) => resource.course_id))
      );
      const requestersIds = Array.from(
        new Set([
          ...(pendingRequests ?? []).map((request) => request.requested_by),
          ...(pendingProductRequests ?? []).map((request) => request.requested_by),
          ...(approvedRequests ?? []).map((request) => request.requested_by),
        ])
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

      // Load top contributors
      const { data: contributorsData } = await supabase
        .from("profiles")
        .select("id, full_name, approved_uploads_count, is_premium_contributor")
        .order("approved_uploads_count", { ascending: false })
        .limit(20);

      if (contributorsData) {
        setTopContributors(contributorsData);
      }

      setLoading(false);
  };

  useEffect(() => {
    loadAdminPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleVerifyMfaChallenge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMfaError(null);

    if (!mfaFactorId) {
      setMfaError("Could not find your authenticator app. Try refreshing the page.");
      return;
    }

    const trimmedCode = mfaCode.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setMfaError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setMfaVerifying(true);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: trimmedCode,
    });

    if (error) {
      setMfaError(error.message);
      setMfaVerifying(false);
      return;
    }

    setMfaCode("");
    setMfaVerifying(false);
    setLoading(true);
    await loadAdminPage();
  };

  const notifyApproval = async (
    type: "course_request" | "resource",
    id: string,
    decision: "approved" | "rejected" = "approved",
    reason?: string
  ) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return;
    }

    try {
      const response = await fetch("/api/admin/approval-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type, id, decision, reason }),
      });

      if (!response.ok) {
        const errorText = `Approval email API returned error status: ${response.status}`;
        console.error(errorText);
        window.alert("The decision was saved, but the email to the user could not be sent.");
      }
    } catch (err) {
      const errorText = err instanceof Error ? err.message : String(err);
      console.error(errorText);
      window.alert("The decision was saved, but the email to the user could not be sent.");
    }
  };

  const handleApproveResource = async (resourceId: string, uploaderId: string) => {
    setProcessingId(resourceId);
    setActionError(null);

    const { data: updatedResource, error: updateError } = await supabase
      .from("resources")
      .update({ status: "approved" })
      .eq("id", resourceId)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedResource) {
      setActionError(
        updateError?.message ??
          "The approval didn't save — your admin session may need a fresh 2FA code. Reload the page and try again."
      );
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
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : profileData?.unlock_expires_at ?? null;

    await supabase
      .from("profiles")
      .update({
        approved_uploads_count: nextCount >= 4 ? 0 : nextCount,
        unlock_expires_at: unlockAt,
      })
      .eq("id", uploaderId);

    // Let the uploader know their document is live (non-blocking).
    notifyApproval("resource", resourceId);

    setResources((current) => current.filter((resource) => resource.id !== resourceId));
    setProcessingId(null);
  };

  const handleRejectResource = async (resourceId: string) => {
    const reason = window.prompt("Reason for rejecting (optional — it will be emailed to the user). Press Cancel to leave it pending.");
    if (reason === null) return;

    setProcessingId(resourceId);
    setActionError(null);

    const { data: updatedResource, error: updateError } = await supabase
      .from("resources")
      .update({ status: "rejected" })
      .eq("id", resourceId)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedResource) {
      setActionError(
        updateError?.message ??
          "The rejection didn't save — your admin session may need a fresh 2FA code. Reload the page and try again."
      );
      setProcessingId(null);
      return;
    }

    notifyApproval("resource", resourceId, "rejected", reason.trim());

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
    setActionError(null);

    const trimmedName = requestedName.trim();
    const trimmedCode = requestedCode.trim();

    // Check if a course with the same university, code, or name already exists
    const { data: existingCourse } = await supabase
      .from("courses")
      .select("id")
      .eq("university_id", universityId)
      .or(`code=eq.${trimmedCode},name=eq.${trimmedName}`)
      .maybeSingle();

    if (!existingCourse) {
      await supabase.from("courses").insert({
        university_id: universityId,
        code: trimmedCode,
        name: trimmedName,
      });
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("course_requests")
      .update({ status: "approved" })
      .eq("id", requestId)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedRequest) {
      setActionError(
        updateError?.message ??
          "The approval didn't save — your admin session may need a fresh 2FA code. Reload the page and try again."
      );
      setProcessingId(null);
      return;
    }

    // Let the requester know their course is now available (non-blocking).
    notifyApproval("course_request", requestId);

    setCourseRequests((current) => current.filter((request) => request.id !== requestId));
    setProcessingId(null);
  };

  const handleRejectCourseRequest = async (requestId: string) => {
    const reason = window.prompt("Reason for rejecting (optional — it will be emailed to the user). Press Cancel to leave it pending.");
    if (reason === null) return;

    setProcessingId(requestId);
    setActionError(null);

    const { data: updatedRequest, error: updateError } = await supabase
      .from("course_requests")
      .update({ status: "rejected" })
      .eq("id", requestId)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedRequest) {
      setActionError(
        updateError?.message ??
          "The rejection didn't save — your admin session may need a fresh 2FA code. Reload the page and try again."
      );
      setProcessingId(null);
      return;
    }

    notifyApproval("course_request", requestId, "rejected", reason.trim());

    setCourseRequests((current) => current.filter((request) => request.id !== requestId));
    setProcessingId(null);
  };

  const handleApproveProductRequest = async (requestId: string) => {
    setProcessingId(requestId);
    setActionError(null);

    const { data: updatedRequest, error: updateError } = await supabase
      .from("product_requests")
      .update({ status: "approved" })
      .eq("id", requestId)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedRequest) {
      setActionError(
        updateError?.message ??
          "The approval didn't save — your admin session may need a fresh 2FA code. Reload the page and try again."
      );
      setProcessingId(null);
      return;
    }

    setProductRequests((current) => current.filter((request) => request.id !== requestId));
    setProcessingId(null);
  };

  const handleRejectProductRequest = async (requestId: string) => {
    setProcessingId(requestId);
    setActionError(null);

    const { data: updatedRequest, error: updateError } = await supabase
      .from("product_requests")
      .update({ status: "rejected" })
      .eq("id", requestId)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedRequest) {
      setActionError(
        updateError?.message ??
          "The rejection didn't save — your admin session may need a fresh 2FA code. Reload the page and try again."
      );
      setProcessingId(null);
      return;
    }

    setProductRequests((current) => current.filter((request) => request.id !== requestId));
    setProcessingId(null);
  };

  const handleDeleteProductRequest = async (requestId: string) => {
    setProcessingId(requestId);

    await supabase
      .from("product_requests")
      .delete()
      .eq("id", requestId);

    setApprovedProductRequests((current) => current.filter((request) => request.id !== requestId));
    setProcessingId(null);
  };

  const handleGrantPremium = async (userId: string) => {
    if (!currentAdminId) return;
    setProcessingId(userId);

    // Calculate 90 days from now
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    await supabase
      .from("profiles")
      .update({
        is_premium_contributor: true,
        premium_granted_at: new Date().toISOString(),
        premium_granted_by: currentAdminId,
        unlock_expires_at: ninetyDaysFromNow.toISOString()
      })
      .eq("id", userId);

    // Update local state
    setTopContributors((current) =>
      current.map((contributor) =>
        contributor.id === userId
          ? { ...contributor, is_premium_contributor: true }
          : contributor
      )
    );

    setProcessingId(null);
  };

  const handleRevokePremium = async (userId: string) => {
    setProcessingId(userId);

    await supabase
      .from("profiles")
      .update({ is_premium_contributor: false })
      .eq("id", userId);

    // Update local state
    setTopContributors((current) =>
      current.map((contributor) =>
        contributor.id === userId
          ? { ...contributor, is_premium_contributor: false }
          : contributor
      )
    );

    setProcessingId(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-warm-bg text-charcoal font-space-grotesk px-6 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-5 w-80" />
            </div>
            <Skeleton className="h-5 w-32" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-64 mb-2" />
                    <Skeleton className="h-5 w-96" />
                  </div>
                  <div className="flex gap-2 mt-3 md:mt-0">
                    <Skeleton className="h-10 w-20 rounded-xl" />
                    <Skeleton className="h-10 w-20 rounded-xl" />
                    <Skeleton className="h-10 w-20 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="border-t border-slate-700" />

          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-64 mb-2" />
                    <Skeleton className="h-5 w-96" />
                  </div>
                  <div className="flex gap-2 mt-3 md:mt-0">
                    <Skeleton className="h-10 w-20 rounded-xl" />
                    <Skeleton className="h-10 w-20 rounded-xl" />
                    <Skeleton className="h-10 w-20 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (needsMfaChallenge) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 py-12 text-charcoal">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/85 p-8 shadow-lg border-l-4 border-forest">
          <h1 className="text-2xl font-semibold font-space-grotesk">Verify it&apos;s you</h1>
          <p className="mt-2 text-sm text-slate-400">
            Approving or rejecting anything here needs a fresh 2FA code, since you signed in with Google. Enter the 6-digit code from your authenticator app to continue.
          </p>

          <form onSubmit={handleVerifyMfaChallenge} className="mt-6 space-y-4">
            <div>
              <label htmlFor="adminMfaCode" className="mb-1 block text-sm text-slate-400">
                6-digit code
              </label>
              <input
                id="adminMfaCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoFocus
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-charcoal outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-forest/50"
                placeholder="123456"
                required
              />
            </div>

            {mfaError ? <p className="text-sm text-coral">{mfaError}</p> : null}

            <button
              type="submit"
              disabled={mfaVerifying}
              className="w-full rounded-xl bg-forest px-4 py-3 text-sm font-medium text-white transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-70"
            >
              {mfaVerifying ? "Verifying..." : "Verify and continue"}
            </button>
          </form>

          <Link href="/dashboard" className="mt-4 inline-block text-sm text-sky-300 hover:text-leaf underline">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const getResourceBadgeClass = (type: string) => {
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

  return (
    <main className="min-h-screen bg-warm-bg text-charcoal font-space-grotesk px-6 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold font-space-grotesk">Admin dashboard</h1>
            <p className="mt-2 text-slate-400">Review uploads and course requests.</p>
          </div>
          <Link href="/dashboard" className="text-sm text-sky-300 hover:text-leaf underline">
            Back to dashboard
          </Link>
        </div>

        {actionError ? (
          <p className="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
            {actionError}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Pending resources</p>
            <p className="mt-2 text-3xl font-semibold text-charcoal">{resources.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Pending course requests</p>
            <p className="mt-2 text-3xl font-semibold text-charcoal">{courseRequests.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Pending product requests</p>
            <p className="mt-2 text-3xl font-semibold text-charcoal">{productRequests.length}</p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg">
          <h2 className="text-xl font-semibold font-space-grotesk">Pending resources</h2>
          {previewError ? (
            <p className="mt-3 text-sm text-coral">{previewError}</p>
          ) : null}
          <div className="mt-4 space-y-3">
            {resources.length === 0 ? (
              <p className="text-slate-400">No pending resources.</p>
            ) : (
              resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-charcoal">{resource.title}</h3>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${getResourceBadgeClass(resource.resource_type)}`}>
                        {getResourceLabel(resource.resource_type)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {resource.unit_name ? `${resource.unit_name} • ` : ""}
                      uploader: {profiles[resource.uploader_id] ?? "Unknown"} • course: {courses[resource.course_id] ?? "Unknown"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handlePreviewResource(resource.storage_path)}
                      className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-medium text-charcoal transition hover:bg-slate-800/90"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleApproveResource(resource.id, resource.uploader_id)}
                      disabled={processingId === resource.id}
                      className="rounded-xl bg-forest px-3 py-2 text-sm font-medium text-white transition hover:bg-leaf disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectResource(resource.id)}
                      disabled={processingId === resource.id}
                      className="rounded-xl bg-coral px-3 py-2 text-sm font-medium text-white transition hover:bg-forest disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="border-t border-slate-700" />

        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg">
          <h2 className="text-xl font-semibold font-space-grotesk">Top Contributors</h2>
          <div className="mt-4 space-y-3">
            {topContributors.length === 0 ? (
              <p className="text-slate-400">No contributors yet.</p>
            ) : (
              topContributors.map((contributor) => (
                <div
                  key={contributor.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium text-charcoal flex items-center gap-2">
                        {contributor.full_name || 'Anonymous User'}
                        {contributor.is_premium_contributor && (
                          <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300 border border-amber-500/30">
                            Premium
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-400">
                        Approved uploads: <span className="font-medium text-charcoal">{contributor.approved_uploads_count}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!contributor.is_premium_contributor ? (
                      <button
                        onClick={() => handleGrantPremium(contributor.id)}
                        disabled={processingId === contributor.id}
                        className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-60"
                      >
                        Grant Premium
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRevokePremium(contributor.id)}
                        disabled={processingId === contributor.id}
                        className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-60"
                      >
                        Revoke Premium
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="border-t border-slate-700" />

        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg">
          <h2 className="text-xl font-semibold font-space-grotesk">Pending course requests</h2>
          <div className="mt-4 space-y-3">
            {courseRequests.length === 0 ? (
              <p className="text-slate-400">No pending course requests.</p>
            ) : (
              courseRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-medium text-charcoal">
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
                      className="rounded-xl bg-forest px-3 py-2 text-sm font-medium text-white transition hover:bg-leaf disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectCourseRequest(request.id)}
                      disabled={processingId === request.id}
                      className="rounded-xl bg-coral px-3 py-2 text-sm font-medium text-white transition hover:bg-forest disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="border-t border-slate-700" />

        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg">
          <h2 className="text-xl font-semibold font-space-grotesk">Pending product requests</h2>
          <div className="mt-4 space-y-3">
            {productRequests.length === 0 ? (
              <p className="text-slate-400">No pending product requests.</p>
            ) : (
              productRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-medium text-charcoal">{request.title}</h3>
                    {request.description ? (
                      <p className="mt-1 text-sm text-slate-400">{request.description}</p>
                    ) : null}
                    <p className="text-sm text-slate-400">
                      requester: {requesters[request.requested_by] ?? "Unknown"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveProductRequest(request.id)}
                      disabled={processingId === request.id}
                      className="rounded-xl bg-forest px-3 py-2 text-sm font-medium text-white transition hover:bg-leaf disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectProductRequest(request.id)}
                      disabled={processingId === request.id}
                      className="rounded-xl bg-coral px-3 py-2 text-sm font-medium text-white transition hover:bg-forest disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="border-t border-slate-700" />

        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg">
          <h2 className="text-xl font-semibold font-space-grotesk">Approved product requests</h2>
          <div className="mt-4 space-y-3">
            {approvedProductRequests.length === 0 ? (
              <p className="text-slate-400">No approved product requests.</p>
            ) : (
              approvedProductRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-medium text-charcoal">{request.title}</h3>
                    {request.description ? (
                      <p className="mt-1 text-sm text-slate-400">{request.description}</p>
                    ) : null}
                    <p className="text-sm text-slate-400">
                      requester: {requesters[request.requested_by] ?? "Unknown"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteProductRequest(request.id)}
                      disabled={processingId === request.id}
                      className="rounded-xl bg-coral px-3 py-2 text-sm font-medium text-white transition hover:bg-forest disabled:opacity-60"
                    >
                      Delete
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