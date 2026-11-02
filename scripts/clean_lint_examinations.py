# Clean unused imports in examinations.ts
with open("src/lib/actions/examinations.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
'''import {
  ExamRepository,
  CreateExamSessionDTO,
  CreateAssessmentComponentDTO,
  MarkEntryDTO,
  RecordMarksDTO,
  ModerateMarksDTO,
  AmendPublishedMarkDTO,
} from "@/lib/dal/examRepository";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";
import prisma from "@/lib/db";''',
'''import {
  ExamRepository,
  CreateExamSessionDTO,
  CreateAssessmentComponentDTO,
  MarkEntryDTO,
} from "@/lib/dal/examRepository";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { Result } from "@/lib/dal/types";'''
)

with open("src/lib/actions/examinations.ts", "w", encoding="utf-8") as f:
    f.write(c)

# Clean unused import in session.ts
with open("src/lib/auth/session.ts", "r", encoding="utf-8") as f:
    s = f.read()

s = s.replace('import { connection } from "next/server";\n', '')

with open("src/lib/auth/session.ts", "w", encoding="utf-8") as f:
    f.write(s)

print("Cleaned unused imports in examinations.ts and session.ts")
