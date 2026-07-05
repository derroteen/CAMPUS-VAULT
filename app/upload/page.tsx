"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
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

const resourceTypes = ["notes", "past_paper", "assignment", "summary"] as const;

export default function UploadPage() {
  const router = useRouter();
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [resourceType, setResourceType] = useState<(typeof resourceTypes)[number]>("notes");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
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
        .order("name", { ascending: true });

      if (!error && data) {
        setUniversities(data);
      }

      setLoading(false);
    };

    ensureSession();
  }, [router]);

  useEffect(() => {
    const loadCourses = async () => {
      if (!selectedUniversityId) {
        setCourses([]);
        setSelectedCourseId("");
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
    };

    loadCourses();
  }, [selectedUniversityId]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
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

    if (!selectedUniversityId || !selectedCourseId || !file || !title.trim()) {
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
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setMessage("Submitted for review");
    setTitle("");
    setFile(null);
    setSelectedUniversityId("");
    setSelectedCourseId("");
    setResourceType("notes");
    setSubmitting(false);
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
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Upload a resource</h1>
          <p className="mt-2 text-slate-400">
            Share notes, past papers, assignments, or summaries for review.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="university" className="mb-2 block text-sm text-slate-300">
                University
              </label>
              <select
                id="university"
                value={selectedUniversityId}
                onChange={(e) => setSelectedUniversityId(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
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

          <div>
            <label htmlFor="resourceType" className="mb-2 block text-sm text-slate-300">
              Resource type
            </label>
            <select
              id="resourceType"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value as (typeof resourceTypes)[number])}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="mb-2 block text-sm text-slate-300">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Calculus Midterm Notes"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label htmlFor="file" className="mb-2 block text-sm text-slate-300">
              File
            </label>
            <input
              id="file"
              type="file"
              onChange={handleFileChange}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
              Back to dashboard
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
