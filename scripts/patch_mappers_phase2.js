const fs = require('fs');

// 1. studentMapper.ts
let sMap = fs.readFileSync('G:/rpihm-campusos/src/lib/utils/studentMapper.ts', 'utf8');

sMap = sMap.replace(
  ': " 2006-05-15\;',
 ': \\;'
);

sMap = sMap.replace(
 /attendanceRate: typeof dbStudent\.attendanceRate === \number\ \? dbStudent\.attendanceRate : 88\.5,[\s\S]*?bloodGroup: dbStudent\.bloodGroup \|\| \B\+\,/,
 ttendanceRate: typeof dbStudent.attendanceRate === \number\ ? dbStudent.attendanceRate : 0,
 gpa: undefined,
 mentorFaculty: dbStudent.mentorFaculty || \\,
 guardianName: dbStudent.guardianName || \\,
 guardianRelationship: dbStudent.guardianRelationship || \\,
 guardianPhone: dbStudent.guardianPhone || \\,
 dateOfBirth: formattedDob,
 bloodGroup: dbStudent.bloodGroup || \\,
);

fs.writeFileSync('G:/rpihm-campusos/src/lib/utils/studentMapper.ts', sMap, 'utf8');
console.log('studentMapper.ts updated successfully');

// 2. facultyMapper.ts
let fMap = fs.readFileSync('G:/rpihm-campusos/src/lib/utils/facultyMapper.ts', 'utf8');

fMap = fMap.replace(
 ': \2020-01-01\;',
 ': \\;'
);

fMap = fMap.replace(
 'acc + ta.weeklyHours, 0) || 18;',
 'acc + ta.weeklyHours, 0) || 0;'
);

fMap = fMap.replace(
 /officeLocation: dbStaff\.officeLocation \|\|[\s\S]*?assignedProgrammes: \[dbStaff\.department\?\.name \|\| \Undergraduate Programme\\],/,
 officeLocation: dbStaff.officeLocation || \\,
 workloadHours: typeof dbStaff.workloadHours === \number\
 ? dbStaff.workloadHours
 : totalWeeklyHours,
 status,
 qualification: dbStaff.qualification || \\,
 specialization: dbStaff.specialization || \\,
 joinedDate,
 teachingSubjects,
 assignedProgrammes: dbStaff.department ? [dbStaff.department.name] : [],
);

fs.writeFileSync('G:/rpihm-campusos/src/lib/utils/facultyMapper.ts', fMap, 'utf8');
console.log('facultyMapper.ts updated successfully');
