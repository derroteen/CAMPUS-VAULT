"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SchoolCoursePicker, { SchoolCoursePickerValue } from "@/app/components/SchoolCoursePicker";
import PasswordInput from "@/components/PasswordInput";

type University = {
  id: string;
  name: string;
};

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    const loadUniversity = async () => {
      const { data, error } = await supabase
        .from("universities")
        .select("id, name")
        .order("name", { ascending: true });

      if (!error && data) {
        setUniversities(data);
        const masenoUniversity = data.find((university) => university.name === "Maseno University");
        setSelectedUniversityId(masenoUniversity?.id ?? data[0]?.id ?? "");
      }
    };

    void loadUniversity();
  }, []);

  const handleSchoolCourseChange = (nextValue: SchoolCoursePickerValue) => {
    setSelectedSchoolId(nextValue.schoolId);
    setSelectedCourseId(nextValue.courseId ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          university_id: selectedUniversityId || null,
          course_id: selectedCourseId || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (signUpData.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          university_id: selectedUniversityId || null,
          course_id: selectedCourseId || null,
        })
        .eq("id", signUpData.user.id);

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign up with your email and password.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="fullName">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-0"
            />
          </div>
          
          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-0"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="password">
              Password
            </label>
            <PasswordInput
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <p className="mb-3 text-sm text-slate-300">Select your course for Maseno University</p>
            <SchoolCoursePicker
              universityId={selectedUniversityId}
              value={{ schoolId: selectedSchoolId, courseId: selectedCourseId }}
              onChange={handleSchoolCourseChange}
            />
            {universities.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Loading course options…</p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-sky-400 hover:text-sky-300">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
