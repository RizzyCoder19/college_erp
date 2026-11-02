with open("src/components/modules/students/StudentFormModal.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """  // Keep semester bounded to the selected programme's valid range
  useEffect(() => {
    if (semester > maxSemesters) {
      setSemester(1);
      setYearGroup("FY");
    }
  }, [programmeId, maxSemesters, semester]);"""

replacement = """  // Synchronize form state whenever modal opens or target record updates
  useEffect(() => {
    if (isOpen) {
      setFullName(initialData?.fullName || "");
      setPrn(initialData?.prn || "");
      setProgrammeId(
        initialData?.programmeId || (effectiveProgrammes.length > 0 ? effectiveProgrammes[0].id : "prog-ds")
      );
      setSemester(initialData?.semester || 1);
      setYearGroup(initialData?.yearGroup || "FY");
      setDivision(initialData?.division || "Div A");
      setEmail(initialData?.email || "");
      setPhone(initialData?.phone || "+91 ");
      setEnrollmentStatus(initialData?.enrollmentStatus || "Active");
      setAttendanceRate(initialData?.attendanceRate ?? 88);
      setMentorFaculty(initialData?.mentorFaculty || "Prof. Snehal Kulkarni");
      setGuardianName(initialData?.guardianName || "");
      setGuardianRelationship(initialData?.guardianRelationship || "Father");
      setGuardianPhone(initialData?.guardianPhone || "+91 ");
      setDateOfBirth(initialData?.dateOfBirth || "2006-05-15");
      setBloodGroup(initialData?.bloodGroup || "B+");
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, initialData, effectiveProgrammes]);

  // Keep semester bounded to the selected programme's valid range
  useEffect(() => {
    if (semester > maxSemesters) {
      setSemester(1);
      setYearGroup("FY");
    }
  }, [programmeId, maxSemesters, semester]);"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/modules/students/StudentFormModal.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: Added synchronization useEffect to StudentFormModal.tsx")
else:
    print("ERROR: Target block not found in StudentFormModal.tsx")
