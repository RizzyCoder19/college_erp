export type StudentStatus = "Active" | "On Leave" | "Graduated" | "Pending Verification";
export type FeeStatus = "Paid" | "Partial" | "Pending";

export interface StudentRecord {
  id: string;
  prn: string; // Permanent Registration Number / Roll No
  fullName: string;
  email: string;
  phone: string;
  programmeId: string;
  programmeName: string;
  department: string;
  semester: number;
  yearGroup: "FY" | "SY" | "TY";
  division: "Div A" | "Div B" | "Div C";
  admissionDate: string;
  enrollmentStatus: StudentStatus;
  feeStatus: FeeStatus;
  attendanceRate: number; // e.g. 88.5%
  gpa?: number; // e.g. 8.4 / 10
  mentorFaculty: string;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  isFictionalSample: boolean;
}

export interface StudentFilterState {
  searchQuery: string;
  programme: string;
  semester: string;
  status: string;
  feeStatus: string;
}
