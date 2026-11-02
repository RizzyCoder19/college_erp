with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """async function AuthenticatedDashboard() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [studentCount, staffCount, programmeCount, divisionCount] = await Promise.all([
    prisma.student.count(),
    prisma.staff.count(),
    prisma.programme.count(),
    prisma.division.count(),
  ]);

  return (
    <AppShell>
      <div className="space-y-8">
        <ExecutiveOverview
          initialMetrics={{
            studentCount,
            staffCount,
            programmeCount,
            divisionCount,
          }}
        />"""

replacement = """import { StudentRepository } from "@/lib/dal/studentRepository";

async function AuthenticatedDashboard() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [studentCount, staffCount, programmeCount, divisionCount, anomaliesRes] = await Promise.all([
    prisma.student.count(),
    prisma.staff.count(),
    prisma.programme.count(),
    prisma.division.count(),
    StudentRepository.diagnoseEnrolmentIntegrity(),
  ]);

  const anomalies = anomaliesRes.success && anomaliesRes.data ? anomaliesRes.data : [];

  return (
    <AppShell>
      <div className="space-y-8">
        <ExecutiveOverview
          initialMetrics={{
            studentCount,
            staffCount,
            programmeCount,
            divisionCount,
          }}
          integrityAnomalies={anomalies}
          currentUser={{
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          }}
        />"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open("src/app/page.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: Updated src/app/page.tsx with anomalies diagnosis")
else:
    print("ERROR: Target not found in src/app/page.tsx")
