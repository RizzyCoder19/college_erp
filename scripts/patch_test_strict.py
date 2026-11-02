with open("scripts/test_milestone5_examinations.ts", "r", encoding="utf-8") as f:
    test = f.read()

# Add non-null assertions where data is verified by assert
test = test.replace("componentId = componentRes.data.id;", "componentId = componentRes.data!.id;")
test = test.replace("sessionId = sessionRes.data.id;", "sessionId = sessionRes.data!.id;")
test = test.replace("const rosterRes = await ExamRepository.getExamRosterForComponent(componentId);", "const rosterRes = await ExamRepository.getExamRosterForComponent(componentId!);\n  if (!rosterRes.success || !rosterRes.data) throw new Error('Failed to load roster');")
test = test.replace("rosterRes.data.roster", "rosterRes.data!.roster")
test = test.replace("rosterAfterEntry.data.roster", "rosterAfterEntry.data!.roster")
test = test.replace("calcRes.data.studentsCalculated", "calcRes.data!.studentsCalculated")
test = test.replace("calcRes.data.summaries", "calcRes.data!.summaries")
test = test.replace("componentId: componentId,", "componentId: componentId!,")
test = test.replace("examSessionId: sessionId,", "examSessionId: sessionId!,")
test = test.replace("await ExamRepository.getExamRosterForComponent(componentId);", "await ExamRepository.getExamRosterForComponent(componentId!);")
test = test.replace("await ExamRepository.calculateSessionResults(sessionId, semester.id);", "await ExamRepository.calculateSessionResults(sessionId!, semester.id);")
test = test.replace("await ExamRepository.publishSessionResults(sessionId, semester.id, adminAccount.id);", "await ExamRepository.publishSessionResults(sessionId!, semester.id, adminAccount.id);")
test = test.replace("examSessionId: sessionId,", "examSessionId: sessionId!,")
test = test.replace("entryId: entryA.entryId,", "entryId: entryA!.entryId!,")
test = test.replace("where: { entryId: entryA.entryId },", "where: { entryId: entryA!.entryId! },")

with open("scripts/test_milestone5_examinations.ts", "w", encoding="utf-8") as f:
    f.write(test)
print("Updated test_milestone5_examinations.ts with strict non-null assertions")
