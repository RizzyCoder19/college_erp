// scripts/seed.js - Phase 1 Relational Seed Script
// Populates foundational academic and administrative demo records for RPIHM CampusOS

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting RPIHM CampusOS Phase 1 seed...');

  // 1. Academic Year & Term
  const ay = await prisma.academicYear.upsert({
    where: { code: '2026-27' },
    update: {},
    create: {
      code: '2026-27',
      name: 'Academic Year 2026-2027',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    },
  });
  console.log('  + Academic Year:', ay.code);

  await prisma.academicTerm.deleteMany({ where: { academicYearId: ay.id } });

  const termOdd = await prisma.academicTerm.create({
    data: {
      academicYearId: ay.id,
      termType: 'ODD',
      name: 'Odd Semester Term (Autumn 2026)',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31'),
      isCurrent: true,
    },
  });

  const termEven = await prisma.academicTerm.create({
    data: {
      academicYearId: ay.id,
      termType: 'EVEN',
      name: 'Even Semester Term (Spring 2027)',
      startDate: new Date('2027-01-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: false,
    },
  });
  console.log('  + Academic Terms: ODD & EVEN created');

  // 2. Departments
  const deptCul = await prisma.department.upsert({
    where: { code: 'CUL' },
    update: {},
    create: {
      code: 'CUL',
      name: 'Hospitality & Culinary Arts',
    },
  });

  const deptTC = await prisma.department.upsert({
    where: { code: 'TC' },
    update: {},
    create: {
      code: 'TC',
      name: 'Technology & Computing',
    },
  });

  const deptAdm = await prisma.department.upsert({
    where: { code: 'ADM' },
    update: {},
    create: {
      code: 'ADM',
      name: 'Administrative & Student Affairs',
    },
  });
  console.log('  + Departments: CUL, TC, ADM created/verified');

  // 3. Programmes
  const programmesData = [
    { code: 'BSC-HS', name: 'B.Sc. Hospitality Studies', degreeLevel: 'UNDERGRADUATE', durationYears: 3, deptId: deptCul.id },
    { code: 'BA-CUL', name: 'B.A. Culinary Arts', degreeLevel: 'UNDERGRADUATE', durationYears: 3, deptId: deptCul.id },
    { code: 'BSCDS-AI', name: 'B.Sc. Data Science with AI', degreeLevel: 'UNDERGRADUATE', durationYears: 3, deptId: deptTC.id },
    { code: 'BSCIT', name: 'B.Sc. Information Technology', degreeLevel: 'UNDERGRADUATE', durationYears: 3, deptId: deptTC.id },
    { code: 'BSCCS', name: 'B.Sc. Computer Science', degreeLevel: 'UNDERGRADUATE', durationYears: 3, deptId: deptTC.id },
    { code: 'DIP-FP', name: 'Diploma in Food Production', degreeLevel: 'DIPLOMA', durationYears: 1, deptId: deptCul.id },
    { code: 'DIP-BC', name: 'Diploma in Bakery & Confectionery', degreeLevel: 'DIPLOMA', durationYears: 1, deptId: deptCul.id },
  ];

  const progMap = {};
  for (const p of programmesData) {
    const prog = await prisma.programme.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        name: p.name,
        degreeLevel: p.degreeLevel,
        durationYears: p.durationYears,
        departmentId: p.deptId,
      },
    });
    progMap[p.code] = prog;
  }
  console.log('  + Programmes: 7 programmes created/verified');

  // 4. Semesters and Divisions
  const semMap = {};
  const divMap = {};

  for (const [code, prog] of Object.entries(progMap)) {
    const totalSems = prog.durationYears * 2;
    for (let s = 1; s <= totalSems; s++) {
      const semKey = code + '-S' + s;
      const sem = await prisma.semester.upsert({
        where: {
          programmeId_semesterNumber: {
            programmeId: prog.id,
            semesterNumber: s,
          },
        },
        update: {},
        create: {
          programmeId: prog.id,
          semesterNumber: s,
          termType: s % 2 === 1 ? 'ODD' : 'EVEN',
        },
      });
      semMap[semKey] = sem;

      if (s === 1) {
        for (const divName of ['Div A', 'Div B']) {
          const div = await prisma.division.upsert({
            where: {
              semesterId_name: {
                semesterId: sem.id,
                name: divName,
              },
            },
            update: {},
            create: {
              name: divName,
              semesterId: sem.id,
              maxCapacity: 60,
            },
          });
          divMap[semKey + '-' + divName] = div;
        }
      }
    }
  }
  console.log('  + Semesters & Divisions created for all programmes');

  // 5. Subjects
  const subjectsData = [
    { code: 'FP-101', title: 'Classical Culinary Foundation', credits: 4.0, subjectType: 'PRACTICAL_KITCHEN', semKey: 'BA-CUL-S1' },
    { code: 'FBM-101', title: 'F&B Service Techniques', credits: 4.0, subjectType: 'PRACTICAL_KITCHEN', semKey: 'BSC-HS-S1' },
    { code: 'HYG-101', title: 'Kitchen Hygiene & HACCP', credits: 2.0, subjectType: 'THEORY', semKey: 'BSC-HS-S1' },
    { code: 'AI-101', title: 'Python for AI & Data Science', credits: 4.0, subjectType: 'THEORY', semKey: 'BSCDS-AI-S1' },
    { code: 'IT-101', title: 'Foundations of Information Technology', credits: 4.0, subjectType: 'THEORY', semKey: 'BSCIT-S1' },
    { code: 'CS-101', title: 'Imperative Programming & C', credits: 4.0, subjectType: 'THEORY', semKey: 'BSCCS-S1' },
    { code: 'BAK-101', title: 'French Viennoiserie & Artisan Breads', credits: 4.0, subjectType: 'PRACTICAL_KITCHEN', semKey: 'DIP-BC-S1' },
  ];

  const subjMap = {};
  for (const sub of subjectsData) {
    const sem = semMap[sub.semKey];
    if (sem) {
      const subject = await prisma.subject.upsert({
        where: { code: sub.code },
        update: {},
        create: {
          code: sub.code,
          title: sub.title,
          credits: sub.credits,
          subjectType: sub.subjectType,
          semesterId: sem.id,
        },
      });
      subjMap[sub.code] = subject;
    }
  }
  console.log('  + Subjects: 7 foundational subjects created');

  // 6. Staff / Faculty
  const staffData = [
    { employeeId: 'RPIHM-FAC-012', fullName: 'Chef Vikramaditya Kapoor', email: 'v.kapoor@sample.rpihm.ac.in', phone: '+91 98201 44551', designation: 'Executive Chef Instructor', category: 'TEACHING', deptId: deptCul.id, doj: new Date('2018-06-15') },
    { employeeId: 'RPIHM-FAC-031', fullName: 'Dr. Rajesh V. Nair', email: 'r.nair@sample.rpihm.ac.in', phone: '+91 98334 11220', designation: 'Professor & Head of Department', category: 'TEACHING', deptId: deptTC.id, doj: new Date('2016-07-01') },
    { employeeId: 'RPIHM-FAC-024', fullName: 'Prof. Sneha Pillai', email: 's.pillai@sample.rpihm.ac.in', phone: '+91 98212 99881', designation: 'Associate Professor & HOD', category: 'TEACHING', deptId: deptCul.id, doj: new Date('2019-09-10') },
    { employeeId: 'RPIHM-FAC-045', fullName: 'Prof. Snehal Kulkarni', email: 's.kulkarni@sample.rpihm.ac.in', phone: '+91 97665 44332', designation: 'Assistant Professor', category: 'TEACHING', deptId: deptTC.id, doj: new Date('2021-01-05') },
    { employeeId: 'RPIHM-FAC-059', fullName: 'Chef Laurent Deschanel', email: 'l.deschanel@sample.rpihm.ac.in', phone: '+91 98190 22334', designation: 'Master Patissier Instructor', category: 'TEACHING', deptId: deptCul.id, doj: new Date('2020-03-01') },
    { employeeId: 'RPIHM-FAC-068', fullName: 'Prof. Ananya Sen', email: 'a.sen@sample.rpihm.ac.in', phone: '+91 98310 77665', designation: 'Assistant Professor', category: 'TEACHING', deptId: deptCul.id, doj: new Date('2022-07-15') },
    { employeeId: 'RPIHM-FAC-082', fullName: 'Er. Manoj Jadhav', email: 'm.jadhav@sample.rpihm.ac.in', phone: '+91 99200 88771', designation: 'Senior Technical Lab Officer', category: 'TECHNICAL', deptId: deptTC.id, doj: new Date('2017-11-20') },
    { employeeId: 'RPIHM-FAC-094', fullName: 'Mrs. Meenakshi Iyer', email: 'm.iyer@sample.rpihm.ac.in', phone: '+91 98205 66778', designation: 'Registrar & Academic Affairs Officer', category: 'ADMINISTRATIVE', deptId: deptAdm.id, doj: new Date('2015-04-10') },
    { employeeId: 'RPIHM-FAC-105', fullName: 'Chef Tariq Mansoor', email: 't.mansoor@sample.rpihm.ac.in', phone: '+91 98450 33221', designation: 'Senior Sous-Chef Instructor', category: 'TEACHING', deptId: deptCul.id, doj: new Date('2021-08-01') },
    { employeeId: 'RPIHM-FAC-118', fullName: 'Prof. Deepak Chawla', email: 'd.chawla@sample.rpihm.ac.in', phone: '+91 99100 55443', designation: 'Adjunct Professor of Industry Practice', category: 'TEACHING', deptId: deptCul.id, doj: new Date('2023-01-15') },
  ];

  const staffMap = {};
  for (const st of staffData) {
    const member = await prisma.staff.upsert({
      where: { employeeId: st.employeeId },
      update: {},
      create: {
        employeeId: st.employeeId,
        fullName: st.fullName,
        email: st.email,
        phone: st.phone,
        designation: st.designation,
        category: st.category,
        departmentId: st.deptId,
        dateOfJoining: st.doj,
        status: 'ACTIVE',
      },
    });
    staffMap[st.employeeId] = member;
  }
  console.log('  + Staff: 10 staff records created/verified');

  // 7. Students
  const studentsData = [
    { roll: 'RPIHM-2026-001', prn: '2026DS041', name: 'Aarav Sharma', email: 'aarav.sharma.26@rpihm.ac.in', phone: '+91 98201 44521', dob: new Date('2006-04-12'), gender: 'MALE', blood: 'B+', progCode: 'BSCDS-AI', divName: 'Div A' },
    { roll: 'RPIHM-2026-002', prn: '2026HS088', name: 'Nandini Swaminathan', email: 'nandini.swami.26@rpihm.ac.in', phone: '+91 98221 66810', dob: new Date('2006-08-25'), gender: 'FEMALE', blood: 'O+', progCode: 'BSC-HS', divName: 'Div B' },
    { roll: 'RPIHM-2026-003', prn: '2025IT112', name: 'Rohan K. Verma', email: 'rohan.verma.25@rpihm.ac.in', phone: '+91 97180 33412', dob: new Date('2005-11-14'), gender: 'MALE', blood: 'A+', progCode: 'BSCIT', divName: 'Div A' },
    { roll: 'RPIHM-2026-004', prn: '2025CA024', name: 'Ananya Deshmukh', email: 'ananya.deshmukh.25@rpihm.ac.in', phone: '+91 99400 78219', dob: new Date('2005-02-19'), gender: 'FEMALE', blood: 'AB+', progCode: 'BA-CUL', divName: 'Div A' },
    { roll: 'RPIHM-2026-005', prn: '2024CS091', name: 'Tanmay Patil', email: 'tanmay.patil.24@rpihm.ac.in', phone: '+91 98332 55410', dob: new Date('2004-06-30'), gender: 'MALE', blood: 'B+', progCode: 'BSCCS', divName: 'Div A' },
    { roll: 'RPIHM-2026-006', prn: '2026HS019', name: 'Zoya Alvi', email: 'zoya.alvi.26@rpihm.ac.in', phone: '+91 98112 43219', dob: new Date('2006-09-08'), gender: 'FEMALE', blood: 'O-', progCode: 'BSC-HS', divName: 'Div A' },
    { roll: 'RPIHM-2026-007', prn: '2025DS052', name: 'Devansh Chokshi', email: 'devansh.c.25@rpihm.ac.in', phone: '+91 97230 45892', dob: new Date('2005-01-15'), gender: 'MALE', blood: 'A-', progCode: 'BSCDS-AI', divName: 'Div B' },
    { roll: 'RPIHM-2026-008', prn: '2024CA011', name: 'Ishaan Mukherjee', email: 'ishaan.m.24@rpihm.ac.in', phone: '+91 98310 99420', dob: new Date('2004-10-04'), gender: 'MALE', blood: 'O+', progCode: 'BA-CUL', divName: 'Div B' },
    { roll: 'RPIHM-2026-009', prn: '2026BP007', name: 'Priya Nair', email: 'priya.nair.26@rpihm.ac.in', phone: '+91 98450 67123', dob: new Date('2006-03-22'), gender: 'FEMALE', blood: 'B+', progCode: 'DIP-BC', divName: 'Div A' },
    { roll: 'RPIHM-2026-010', prn: '2023IT089', name: 'Karan Johar Patel', email: 'karan.patel.23@rpihm.ac.in', phone: '+91 98210 55123', dob: new Date('2003-12-11'), gender: 'MALE', blood: 'AB+', progCode: 'BSCIT', divName: 'Div A' },
  ];

  for (const s of studentsData) {
    const student = await prisma.student.upsert({
      where: { rollNumber: s.roll },
      update: {},
      create: {
        rollNumber: s.roll,
        prn: s.prn,
        fullName: s.name,
        email: s.email,
        phone: s.phone,
        dob: s.dob,
        gender: s.gender,
        bloodGroup: s.blood,
        status: 'ACTIVE',
        currentSemester: 1,
      },
    });

    const prog = progMap[s.progCode];
    const sem = semMap[s.progCode + '-S1'];
    const div = divMap[s.progCode + '-S1-' + s.divName];

    if (prog && sem && div) {
      await prisma.enrolment.upsert({
        where: {
          studentId_academicYearId_semesterId: {
            studentId: student.id,
            academicYearId: ay.id,
            semesterId: sem.id,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          academicYearId: ay.id,
          programmeId: prog.id,
          semesterId: sem.id,
          divisionId: div.id,
          status: 'ENROLLED',
        },
      });
    }
  }
  console.log('  + Students & Enrolments: 10 student records & enrolments created');

  // 8. Teaching Assignments
  const assignmentsData = [
    { empId: 'RPIHM-FAC-012', subCode: 'FP-101', divKey: 'BA-CUL-S1-Div A', hours: 6 },
    { empId: 'RPIHM-FAC-024', subCode: 'FBM-101', divKey: 'BSC-HS-S1-Div B', hours: 4 },
    { empId: 'RPIHM-FAC-045', subCode: 'AI-101', divKey: 'BSCDS-AI-S1-Div A', hours: 4 },
    { empId: 'RPIHM-FAC-059', subCode: 'BAK-101', divKey: 'DIP-BC-S1-Div A', hours: 6 },
  ];

  for (const a of assignmentsData) {
    const staff = staffMap[a.empId];
    const subj = subjMap[a.subCode];
    const div = divMap[a.divKey];

    if (staff && subj && div) {
      await prisma.teachingAssignment.upsert({
        where: {
          staffId_subjectId_divisionId: {
            staffId: staff.id,
            subjectId: subj.id,
            divisionId: div.id,
          },
        },
        update: {},
        create: {
          staffId: staff.id,
          subjectId: subj.id,
          divisionId: div.id,
          weeklyHours: a.hours,
        },
      });
    }
  }
  console.log('  + Teaching Assignments: 4 teaching assignments created');

  console.log('[Seed] Phase 1 relational seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
