"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type School = {
  id: string;
  name: string;
};

type Course = {
  id: string;
  name: string;
  code: string | null;
  school_id: string;
};

// A flat registry of every course we've ever fetched so we can show
// chip labels for courses from schools the user is no longer viewing.
type CourseRegistry = Record<string, Course>;

// ---------------------------------------------------------------------------
// Shared style tokens — mirrors SchoolCoursePicker exactly
// ---------------------------------------------------------------------------

const selectClassName =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-500";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type MultiCoursePickerProps = {
  universityId: string;
  selectedCourseIds: string[];
  onChange: (courseIds: string[]) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MultiCoursePicker({
  universityId,
  selectedCourseIds,
  onChange,
}: MultiCoursePickerProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Flat registry so chips can show labels even after switching schools.
  const [registry, setRegistry] = useState<CourseRegistry>({});

  // -------------------------------------------------------------------------
  // Load schools whenever universityId changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    let isActive = true;

    const loadSchools = async () => {
      setSchools([]);
      setCourses([]);
      setActiveSchoolId(null);

      if (!universityId) {
        setSchoolsLoading(false);
        return;
      }

      setSchoolsLoading(true);

      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .eq("university_id", universityId)
        .order("name", { ascending: true });

      if (!isActive) return;

      setSchools(!error && data ? data : []);
      setSchoolsLoading(false);
    };

    loadSchools();

    return () => {
      isActive = false;
    };
  }, [universityId]);

  // -------------------------------------------------------------------------
  // Load courses whenever the active school changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    let isActive = true;

    const loadCourses = async () => {
      setCourses([]);

      if (!universityId || !activeSchoolId) {
        setCoursesLoading(false);
        return;
      }

      setCoursesLoading(true);

      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code, school_id")
        .eq("university_id", universityId)
        .eq("school_id", activeSchoolId)
        .order("name", { ascending: true });

      if (!isActive) return;

      const fetched: Course[] = !error && data ? data : [];
      setCourses(fetched);
      setCoursesLoading(false);

      // Merge newly fetched courses into the registry.
      setRegistry((prev) => {
        const next = { ...prev };
        for (const c of fetched) {
          next[c.id] = c;
        }
        return next;
      });
    };

    loadCourses();

    return () => {
      isActive = false;
    };
  }, [universityId, activeSchoolId]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSchoolChange = (schoolId: string) => {
    setActiveSchoolId(schoolId || null);
  };

  const toggleCourse = (courseId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedCourseIds, courseId]);
    } else {
      onChange(selectedCourseIds.filter((id) => id !== courseId));
    }
  };

  const removeCourse = (courseId: string) => {
    onChange(selectedCourseIds.filter((id) => id !== courseId));
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const courseLabel = (id: string): string => {
    const c = registry[id];
    if (!c) return id;
    return c.code ? `${c.code} – ${c.name}` : c.name;
  };

  const hasSelection = selectedCourseIds.length > 0;
  const showValidationHint = !hasSelection;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      {/* ── School dropdown ──────────────────────────────────────────────── */}
      <div>
        <label htmlFor="multi-school" className="mb-2 block text-sm text-slate-300">
          School
        </label>
        <select
          id="multi-school"
          value={activeSchoolId ?? ""}
          onChange={(e) => handleSchoolChange(e.target.value)}
          className={selectClassName}
          disabled={schoolsLoading}
        >
          <option value="">
            {schoolsLoading ? "Loading schools…" : "Select a school"}
          </option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Course checkbox list ─────────────────────────────────────────── */}
      {activeSchoolId && (
        <div>
          <p className="mb-2 text-sm text-slate-300">
            Courses
            {coursesLoading && (
              <span className="ml-2 text-xs text-slate-500">Loading…</span>
            )}
          </p>

          {!coursesLoading && courses.length === 0 && (
            <p className="text-xs text-slate-500">
              No courses found for this school.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            {courses.map((course) => {
              const checked = selectedCourseIds.includes(course.id);
              return (
                <label
                  key={course.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white transition-colors hover:border-slate-500 hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleCourse(course.id, e.target.checked)}
                    className="h-4 w-4 rounded accent-indigo-500"
                  />
                  <span>
                    {course.code ? (
                      <>
                        <span className="mr-1 text-slate-400">{course.code}</span>
                        {course.name}
                      </>
                    ) : (
                      course.name
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Selected-courses chip list ───────────────────────────────────── */}
      {hasSelection && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Selected courses ({selectedCourseIds.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCourseIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-700 bg-indigo-950 px-2.5 py-1 text-xs text-indigo-300"
              >
                {courseLabel(id)}
                <button
                  type="button"
                  onClick={() => removeCourse(id)}
                  aria-label={`Remove ${courseLabel(id)}`}
                  className="ml-0.5 rounded-full p-0.5 text-indigo-400 transition-colors hover:bg-indigo-800 hover:text-white"
                >
                  {/* × icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                    className="h-3 w-3"
                    aria-hidden="true"
                  >
                    <path d="M6 4.586 9.293 1.293a1 1 0 1 1 1.414 1.414L7.414 6l3.293 3.293a1 1 0 0 1-1.414 1.414L6 7.414 2.707 10.707a1 1 0 0 1-1.414-1.414L4.586 6 1.293 2.707A1 1 0 0 1 2.707 1.293L6 4.586Z" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Validation hint ──────────────────────────────────────────────── */}
      {showValidationHint && (
        <p className="text-xs text-amber-400" role="alert" aria-live="polite">
          Select at least 1 course.
        </p>
      )}
    </div>
  );
}
