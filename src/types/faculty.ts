export type StaffCategory =
  | "Teaching Faculty"
  | "Culinary Instructor"
  | "Administrative Staff"
  | "Technical Lab Staff";

export type StaffStatus =
  | "Active"
  | "In Lab / Kitchen"
  | "On Leave"
  | "Sabbatical";

export type EmploymentType =
  | "Full-Time Permanent"
  | "Visiting / Adjunct"
  | "Industry Expert";

export interface FacultyRecord {
  id: string;
  staffId: string;
  fullName: string;
  designation: string;
  department: string;
  category: StaffCategory;
  employmentType: EmploymentType;
  email: string;
  phone: string;
  officeLocation: string;
  workloadHours: number; // e.g. 18 hrs/wk
  status: StaffStatus;
  qualification: string;
  specialization: string;
  joinedDate: string; // YYYY-MM-DD
  teachingSubjects: string[];
  assignedProgrammes: string[];
  avatarInitial?: string;
  isSampleRecord?: boolean;
}

export interface FacultyFilterState {
  searchQuery: string;
  department: string;
  category: string;
  status: string;
  employmentType: string;
}
