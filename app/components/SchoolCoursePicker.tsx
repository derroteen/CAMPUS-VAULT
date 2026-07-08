"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type School = {
  id: string;
  name: string;
};

type Course = {
  id: string;
  name: string;
  code: string | null;
};

export type SchoolCoursePickerValue = {
  schoolId: string | null;
  courseId: string | null;
};

type SchoolCoursePickerProps = {
  universityId: string;
  value: SchoolCoursePickerValue;
  onChange: (value: SchoolCoursePickerValue) => void;
  required?: boolean;
  showCourseDropdown?: boolean;
};

const selectClassName =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-500";

export default function SchoolCoursePicker({
  universityId,
  value,
  onChange,
  required = false,
  showCourseDropdown = true,
}: SchoolCoursePickerProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSchools = async () => {
      setSchools([]);
      setCourses([]);

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

      if (!isActive) {
        return;
      }

      setSchools(!error && data ? data : []);
      setSchoolsLoading(false);
    };

    loadSchools();

    return () => {
      isActive = false;
    };
  }, [universityId]);

  useEffect(() => {
    let isActive = true;

    const loadCourses = async () => {
      setCourses([]);

      if (!universityId || !value.schoolId) {
        setCoursesLoading(false);
        return;
      }

      setCoursesLoading(true);

      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("university_id", universityId)
        .eq("school_id", value.schoolId)
        .order("name", { ascending: true });

      if (!isActive) {
        return;
      }

      setCourses(!error && data ? data : []);
      setCoursesLoading(false);
    };

    loadCourses();

    return () => {
      isActive = false;
    };
  }, [universityId, value.schoolId]);

  const handleSchoolChange = (schoolId: string) => {
    onChange({
      schoolId: schoolId || null,
      courseId: null,
    });
  };

  const handleCourseChange = (courseId: string) => {
    onChange({
      schoolId: value.schoolId,
      courseId: courseId || null,
    });
  };

  const courseDisabled = !value.schoolId || coursesLoading;

  return (
    <div className={showCourseDropdown ? "grid gap-4 md:grid-cols-2" : "grid gap-4 md:grid-cols-1"}>
      <div>
        <label htmlFor="school" className="mb-2 block text-sm text-slate-300">
          School
        </label>
        <select
          id="school"
          value={value.schoolId ?? ""}
          onChange={(event) => handleSchoolChange(event.target.value)}
          className={selectClassName}
          disabled={schoolsLoading}
          required={required}
        >
          <option value="">
            {schoolsLoading ? "Loading schools..." : "Select a school"}
          </option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </div>

      {showCourseDropdown ? (
        <div>
          <label htmlFor="course" className="mb-2 block text-sm text-slate-300">
            Course
          </label>
          <select
            id="course"
            value={value.courseId ?? ""}
            onChange={(event) => handleCourseChange(event.target.value)}
            className={selectClassName}
            disabled={courseDisabled}
            required={required}
          >
            <option value="">
              {!value.schoolId
                ? "Select a school first"
                : coursesLoading
                  ? "Loading courses..."
                  : "Select a course"}
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code ? `${course.code} - ${course.name}` : course.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
