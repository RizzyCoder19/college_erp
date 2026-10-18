export interface MetricCardData {
  id: string;
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  caption: string;
  icon: string;
  category: "academic" | "operations" | "finance" | "campus";
}

export interface ModuleData {
  slug: string;
  title: string;
  department: string;
  description: string;
  icon: string;
  category: "main" | "system";
  status: "Prototype Stub" | "Ready for Spec" | "Active Preview";
  stats: { label: string; value: string }[];
  plannedFeatures: string[];
  mockRecords: {
    columns: string[];
    rows: (string | number)[][];
  };
}

export interface AcademicProgramme {
  id: string;
  code: string;
  name: string;
  department: "Technology & Computing" | "Hospitality & Culinary Arts";
  degreeType: "Undergraduate (UG)" | "Diploma" | "Certificate";
  duration: string;
  currentEnrollment: number;
  affiliatedBody: string;
}

export interface LabFacility {
  id: string;
  name: string;
  code: string;
  category: "Culinary" | "Bakery" | "F&B Service" | "Accommodation" | "Computing & AI";
  capacity: number;
  currentOccupancy: number;
  status: "In Session" | "Available" | "Sanitization" | "Maintenance";
  activeBatch?: string;
  facultyInCharge?: string;
  nextSessionTime?: string;
}

export interface AcademicActivityItem {
  id: string;
  time: string;
  title: string;
  category: string;
  details: string;
  status: "Ongoing" | "Completed" | "Scheduled";
}

export interface TodayScheduleItem {
  id: string;
  timeRange: string;
  title: string;
  location: string;
  cohort: string;
  type: "Lab Session" | "Meeting" | "Examination" | "Event" | "Class";
}

export interface CampusNoticeItem {
  id: string;
  date: string;
  title: string;
  excerpt: string;
  priority?: "High" | "Standard" | "Urgent";
  linkText?: string;
}

export interface FictionalUserProfile {
  name: string;
  designation: string;
  department: string;
  office: string;
  institution: string;
  employeeId?: string;
  email?: string;
  academicYear: string;
  permissionsLevel?: string;
  lastLogin?: string;
}

