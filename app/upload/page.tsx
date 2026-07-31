"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SchoolCoursePicker, { SchoolCoursePickerValue } from "@/app/components/SchoolCoursePicker";

type University = {
  id: string;
  name: string;
};

const resourceTypes = ["notes", "past_paper", "assignment", "summary"] as const;

export default function UploadPage() {
  const router = useRouter();
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [resourceType, setResourceType] = useState<(typeof resourceTypes)[number]>("notes");
  const [title, setTitle] = useState("");
  const [unitName, setUnitName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showCourseRequest, setShowCourseRequest] = useState(false);
  const [courseRequestName, setCourseRequestName] = useState("");
  const [courseRequestCode, setCourseRequestCode] = useState("");
  const [courseRequestSchoolId, setCourseRequestSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ensureSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("universities")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!error && data) {
        setUniversities(data);
        if (data.length === 1) {
          setSelectedUniversityId(data[0].id);
        }
      }

      setLoading(false);
    };

    ensureSession();
  }, [router]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
  };

  const handleSchoolCourseChange = (nextValue: SchoolCoursePickerValue) => {
    setSelectedSchoolId(nextValue.schoolId);
    setSelectedCourseId(nextValue.courseId ?? "");
  };

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

  const handleCourseRequestSubmit = async (event?: FormEvent<HTMLFormElement> | null) => {
    event?.preventDefault();
    setError(null);
    setMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setError("You must be logged in to request a course.");
      return;
    }

    if (!selectedUniversityId || !courseRequestName.trim() || !courseRequestCode.trim()) {
      setError("Please choose a university, enter a course name, and provide a course code.");
      return;
    }

    const { error: requestError } = await supabase.from("course_requests").insert({
      university_id: selectedUniversityId,
      requested_name: courseRequestName.trim(),
      requested_code: courseRequestCode.trim(),
      requested_by: session.user.id,
      status: "pending",
    });

    if (requestError) {
      setError(requestError.message);
      return;
    }

    // Send admin notification (non-blocking)
    fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        type: "course_request",
        title: `${courseRequestCode.trim()} - ${courseRequestName.trim()}`,
        userEmail: session.user.email ?? "",
      }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Admin notification API returned error status:", res.status);
        }
      })
      .catch((err) => {
        console.error("Failed to send course request admin email notification:", err);
      });

    setMessage("Thanks! Your course has been submitted for review. You can still upload once it's approved.");
    setShowCourseRequest(false);
    setCourseRequestName("");
    setCourseRequestCode("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setError("You must be logged in to upload a resource.");
      return;
    }

    if (!selectedUniversityId || !selectedCourseId || !file || !title.trim() || !unitName.trim()) {
      setError("Please fill in all fields and choose a file.");
      return;
    }

    setSubmitting(true);

    const timestamp = Date.now();
    const safeFileName = file.name.replace(/\s+/g, "-");
    const storagePath = `${session.user.id}/${timestamp}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("resources")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setError(uploadError.message);
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("resources").insert({
      title: title.trim(),
      storage_path: storagePath,
      resource_type: resourceType,
      status: "pending",
      uploader_id: session.user.id,
      course_id: selectedCourseId,
      unit_name: unitName.trim(),
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Send admin notification (non-blocking)
    fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        type: "upload",
        title: title.trim(),
        userEmail: session.user.email ?? "",
      }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Admin notification API returned error status:", res.status);
        }
      })
      .catch((err) => {
        console.error("Failed to send upload admin email notification:", err);
      });

    setMessage("Submitted for review");
    setTitle("");
    setUnitName("");
    setFile(null);
    setSelectedUniversityId("");
    setSelectedCourseId("");
    setResourceType("notes");
    setSubmitting(false);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 text-charcoal">
        <p className="text-slate-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-warm-bg text-charcoal font-space-grotesk px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-2xl shadow-charcoal/20 sm:p-10">
        <div className="mb-8">
          <div className="inline-flex items-center rounded-full border border-forest/30 bg-forest/10 px-3 py-1 text-xs font-medium text-forest">
            Contribute a Resource
          </div>
          <h1 className="mt-4 text-3xl font-semibold">Upload a resource</h1>
          <p className="mt-2 text-slate-600">
            Share notes, past papers, assignments, or summaries for review.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <label htmlFor="university" className="mb-2 block text-sm text-slate-700">
                University
              </label>
              <select
                id="university"
                value={selectedUniversityId}
                onChange={(e) => setSelectedUniversityId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-charcoal"
              >
                <option value="">Select a university</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <SchoolCoursePicker
                universityId={selectedUniversityId}
                value={{ schoolId: selectedSchoolId, courseId: selectedCourseId || null }}
                onChange={handleSchoolCourseChange}
              />
              <button
                type="button"
                onClick={() => setShowCourseRequest((current) => !current)}
                className="mt-3 text-sm text-forest transition hover:text-leaf"
              >
                Can&apos;t find your course? Request it
              </button>
            </div>
          </div>

          {showCourseRequest ? (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="courseRequestName" className="mb-2 block text-sm text-slate-700">
                    Course name
                  </label>
                  <input
                    id="courseRequestName"
                    type="text"
                    value={courseRequestName}
                    onChange={(e) => setCourseRequestName(e.target.value)}
                    placeholder="e.g. Introduction to Algorithms"
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-charcoal"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="courseRequestCode" className="mb-2 block text-sm text-slate-700">
                    Course Code
                  </label>
                  <input
                    id="courseRequestCode"
                    type="text"
                    value={courseRequestCode}
                    onChange={(e) => setCourseRequestCode(e.target.value)}
                    placeholder="e.g. BAC101"
                    className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-charcoal"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <SchoolCoursePicker
                  universityId={selectedUniversityId}
                  value={{ schoolId: courseRequestSchoolId, courseId: null }}
                  onChange={(nextValue) => setCourseRequestSchoolId(nextValue.schoolId)}
                  showCourseDropdown={false}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleCourseRequestSubmit()}
                  className="rounded-xl bg-forest px-4 py-2 text-sm font-medium text-white transition hover:bg-leaf"
                >
                  Submit request
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <label htmlFor="resourceType" className="mb-2 block text-sm text-slate-700">
                Resource type
              </label>
              <div className="flex items-center gap-3">
                <select
                  id="resourceType"
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value as (typeof resourceTypes)[number])}
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-charcoal"
                >
                  {resourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${getResourceBadgeClass(resourceType)}`}>
                  {getResourceLabel(resourceType)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <label htmlFor="unitName" className="mb-2 block text-sm text-slate-700">
                Unit / Topic
              </label>
              <input
                id="unitName"
                type="text"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="e.g. Financial Accounting I"
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-charcoal"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <label htmlFor="title" className="mb-2 block text-sm text-slate-700">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Calculus Midterm Notes"
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-charcoal"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <label htmlFor="file" className="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-4 py-8 text-center transition hover:border-forest/50">
              <Upload className="mb-3 h-8 w-8 text-forest" />
              <span className="text-sm font-medium text-slate-600">Click to browse or drag a file here</span>
              <span className="mt-1 text-sm text-slate-500">PDF, DOCX, PPTX, TXT, and more</span>
            </label>
            <input id="file" type="file" onChange={handleFileChange} className="hidden" />
            {file ? (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600">
                <div>
                  <p className="font-medium text-charcoal">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-sm text-forest transition hover:text-leaf"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>

          {error ? <p className="text-sm text-coral">{error}</p> : null}
          {message ? <p className="text-sm text-forest">{message}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <Link href="/dashboard" className="text-sm text-forest hover:text-leaf underline">
              Back to dashboard
            </Link>
            <button
              type="submit"
              disabled={submitting || !selectedCourseId || !unitName.trim()}
              className="rounded-xl bg-forest px-4 py-2 font-medium text-white transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}