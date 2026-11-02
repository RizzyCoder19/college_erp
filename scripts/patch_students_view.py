with open("src/components/modules/students/StudentsView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """  const handleEditStudent = async (record: StudentRecord) => {
    try {
      let targetProgId = record.programmeId;
      if (!targetProgId && programmes.length > 0) {
        targetProgId = programmes[0].id;
      }

      let semesterId = "";
      let divisionId = "";
      if (targetProgId) {
        const progRes = await getProgrammeDetailsAction(targetProgId);
        if (progRes.success && progRes.data && progRes.data.semesters?.length > 0) {
          const sem = progRes.data.semesters.find((s) => s.semesterNumber === Number(record.semester));
          if (!sem) {
            return {
              success: false,
              error: `Semester ${record.semester} is not offered in programme "${progRes.data.name}".`,
            };
          }
          semesterId = sem.id;
          const div = sem.divisions?.find((d) => d.name === record.division) || sem.divisions?.[0];
          if (!div) {
            return {
              success: false,
              error: `Division "${record.division}" is not configured for Semester ${sem.semesterNumber}.`,
            };
          }
          divisionId = div.id;
        }
      }

      const cleanPrn = record.prn.trim().toUpperCase();
      const rollNumber = cleanPrn.startsWith("RPIHM-") ? cleanPrn : `RPIHM-${cleanPrn}`;

      let dbStatus = "ACTIVE";
      if (record.enrollmentStatus === "On Leave") dbStatus = "ON_LEAVE";
      else if (record.enrollmentStatus === "Graduated") dbStatus = "GRADUATED";
      else if (record.enrollmentStatus === "Pending Verification") dbStatus = "PENDING_VERIFICATION";

      const res = await updateStudentAction(record.id, {
        fullName: record.fullName.trim(),
        prn: cleanPrn,
        rollNumber,
        phone: record.phone.trim(),
        email: record.email.trim().toLowerCase(),
        bloodGroup: record.bloodGroup,
        dob: record.dateOfBirth ? new Date(record.dateOfBirth) : undefined,
        status: dbStatus,
        programmeId: targetProgId,
        semesterId,
        divisionId,
      });"""

replacement = """  const handleEditStudent = async (record: StudentRecord) => {
    try {
      // Differentiate Identity-Only edits from Academic Placement transitions
      const original = formStudent;
      const placementChanged =
        !original ||
        original.programmeId !== record.programmeId ||
        Number(original.semester) !== Number(record.semester) ||
        original.division !== record.division;

      let targetProgId: string | undefined = undefined;
      let semesterId: string | undefined = undefined;
      let divisionId: string | undefined = undefined;

      if (placementChanged) {
        targetProgId = record.programmeId;
        if (!targetProgId && programmes.length > 0) {
          targetProgId = programmes[0].id;
        }

        if (targetProgId) {
          const progRes = await getProgrammeDetailsAction(targetProgId);
          if (progRes.success && progRes.data && progRes.data.semesters?.length > 0) {
            const sem = progRes.data.semesters.find((s) => s.semesterNumber === Number(record.semester));
            if (!sem) {
              return {
                success: false,
                error: `Semester ${record.semester} is not offered in programme "${progRes.data.name}".`,
              };
            }
            semesterId = sem.id;
            const div = sem.divisions?.find((d) => d.name === record.division) || sem.divisions?.[0];
            if (!div) {
              return {
                success: false,
                error: `Division "${record.division}" is not configured for Semester ${sem.semesterNumber}.`,
              };
            }
            divisionId = div.id;
          }
        }
      }

      const cleanPrn = record.prn.trim().toUpperCase();
      const rollNumber = cleanPrn.startsWith("RPIHM-") ? cleanPrn : `RPIHM-${cleanPrn}`;

      let dbStatus = "ACTIVE";
      if (record.enrollmentStatus === "On Leave") dbStatus = "ON_LEAVE";
      else if (record.enrollmentStatus === "Graduated") dbStatus = "GRADUATED";
      else if (record.enrollmentStatus === "Pending Verification") dbStatus = "PENDING_VERIFICATION";

      const res = await updateStudentAction(record.id, {
        fullName: record.fullName.trim(),
        prn: cleanPrn,
        rollNumber,
        phone: record.phone.trim(),
        email: record.email.trim().toLowerCase(),
        bloodGroup: record.bloodGroup,
        dob: record.dateOfBirth ? new Date(record.dateOfBirth) : undefined,
        status: dbStatus,
        programmeId: placementChanged ? targetProgId : undefined,
        semesterId: placementChanged ? semesterId : undefined,
        divisionId: placementChanged ? divisionId : undefined,
      });"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/modules/students/StudentsView.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: Patched handleEditStudent in StudentsView.tsx")
else:
    print("ERROR: Target block not found")
