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
  status: "Prototype Stub" | "Ready for Spec" | "Planned Phase 3";
  stats: { label: string; value: string }[];
  plannedFeatures: string[];
  mockRecords: {
    columns: string[];
    rows: (string | number)[][];
  };
}

export interface LabFacility {
  id: string;
  name: string;
  code: string;
  capacity: number;
  currentOccupancy: number;
  status: "In Session" | "Available" | "Sanitization" | "Maintenance";
  activeBatch?: string;
  facultyInCharge?: string;
  nextSessionTime?: string;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  category: "Academics" | "Admissions" | "Facilities" | "Examination" | "Finance";
  actor: string;
  role: string;
  description: string;
}

export interface CampusNotice {
  id: string;
  date: string;
  title: string;
  priority: "High" | "Standard" | "Urgent";
  targetAudience: string;
  excerpt: string;
}

export interface FictionalUserProfile {
  name: string;
  designation: string;
  department: string;
  institution: string;
  employeeId: string;
  email: string;
  academicYear: string;
  permissionsLevel: string;
  lastLogin: string;
}
