with open("src/components/modules/faculty/FacultyFormModal.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);"""

replacement = """  // Synchronize faculty form state whenever modal opens or target record updates
  useEffect(() => {
    if (isOpen) {
      setFullName(initialData?.fullName || "");
      setStaffId(initialData?.staffId || "");
      setDesignation(initialData?.designation || "");
      setDepartment(initialData?.department || defaultDept);
      setCategory(initialData?.category || "Teaching Faculty");
      setEmploymentType(initialData?.employmentType || "Full-Time Permanent");
      setEmail(initialData?.email || "");
      setPhone(initialData?.phone || "+91 ");
      setOfficeLocation(initialData?.officeLocation || "");
      setWorkloadHours(initialData?.workloadHours ?? 18);
      setStatus(initialData?.status || "Active");
      setQualification(initialData?.qualification || "");
      setSpecialization(initialData?.specialization || "");
      setTeachingSubjectsInput(initialData?.teachingSubjects?.join(", ") || "");
      setAssignedProgrammesInput(initialData?.assignedProgrammes?.join(", ") || "B.Sc. Hospitality Management");
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, initialData, defaultDept]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/modules/faculty/FacultyFormModal.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: Added synchronization useEffect to FacultyFormModal.tsx")
else:
    print("ERROR: Target block not found in FacultyFormModal.tsx")
