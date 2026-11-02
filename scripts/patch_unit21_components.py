# -*- coding: utf-8 -*-

# 1. Update PrototypeReconciliationModal.tsx imports
with open("src/components/common/PrototypeReconciliationModal.tsx", "r", encoding="utf-8") as f:
    modal_content = f.read()

old_decl = """export interface PrototypeComparisonFieldDiff {
  fieldName: string;
  prototypeValue: string;
  dbValue: string;
}

export interface PrototypeComparisonItem {
  id: string;
  primaryKey: string; // PRN or StaffId
  name: string;
  email: string;
  secondaryInfo: string;
  status: "duplicate" | "conflict" | "importable";
  statusReason: string;
  fieldDiffs?: PrototypeComparisonFieldDiff[];
  rawRecord: unknown;
  matchedDbRecord?: unknown;
}"""

new_decl = """import {
  PrototypeComparisonFieldDiff,
  PrototypeComparisonItem,
} from "@/lib/utils/reconciliationEngine";

export type { PrototypeComparisonFieldDiff, PrototypeComparisonItem };"""

if old_decl in modal_content:
    modal_content = modal_content.replace(old_decl, new_decl)
    with open("src/components/common/PrototypeReconciliationModal.tsx", "w", encoding="utf-8") as f:
        f.write(modal_content)
    print("Updated PrototypeReconciliationModal.tsx")
else:
    print("Warning: old_decl not found in PrototypeReconciliationModal.tsx")

# 2. Update StudentsView.tsx
with open("src/components/modules/students/StudentsView.tsx", "r", encoding="utf-8") as f:
    s_content = f.read()

# Replace imports
old_s_import = 'import { PrototypeReconciliationModal, PrototypeComparisonItem } from "@/components/common/PrototypeReconciliationModal";'
new_s_import = '''import { PrototypeReconciliationModal } from "@/components/common/PrototypeReconciliationModal";
import {
  evaluateStudentReconciliation,
  executeSafePruning,
  PrototypeComparisonItem,
} from "@/lib/utils/reconciliationEngine";'''

if old_s_import in s_content:
    s_content = s_content.replace(old_s_import, new_s_import)

# Find and replace reconciliation items & pruning
start_marker = "  // Reconciliation Comparison Items with Field-Level Difference Analysis"
end_marker = "  // Safe Prototype Reconciliation Import Handler"
start_idx = s_content.find(start_marker)
end_idx = s_content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_s_block = """  // Reconciliation Comparison Items with Field-Level Difference Analysis
  const reconciliationItems: PrototypeComparisonItem[] = useMemo(() => {
    return prototypeRecords.map((proto) => evaluateStudentReconciliation(proto, students));
  }, [prototypeRecords, students]);

  // Safe and Recoverable Pruning of Confirmed Duplicates
  const handlePruneDuplicates = async (duplicateIds: string[]) => {
    const result = executeSafePruning<StudentRecord>({
      storageKey: STORAGE_KEY,
      requestedIds: duplicateIds,
      rawStorageContent: null,
      currentDbRecords: students,
      evaluator: evaluateStudentReconciliation,
    });

    if (result.success) {
      setPrototypeRecords(result.remainingRecords);
      if (result.prunedCount > 0) {
        showToast(
          `Pruned ${result.prunedCount} confirmed duplicate(s) from browser storage. Backup created.`
        );
      } else {
        showToast("No eligible confirmed duplicates were found to prune.");
      }
      return { pruned: result.prunedCount, backupKey: result.backupKey };
    } else {
      showToast(`Pruning error: ${result.error || "Storage write failed"}`);
      return { pruned: 0, backupKey: "" };
    }
  };

"""
    s_content = s_content[:start_idx] + new_s_block + s_content[end_idx:]
    with open("src/components/modules/students/StudentsView.tsx", "w", encoding="utf-8") as f:
        f.write(s_content)
    print("Updated StudentsView.tsx")
else:
    print("Warning: markers not found in StudentsView.tsx")

# 3. Update FacultyView.tsx
with open("src/components/modules/faculty/FacultyView.tsx", "r", encoding="utf-8") as f:
    f_content = f.read()

# Replace imports
old_f_import = 'import { PrototypeReconciliationModal, PrototypeComparisonItem } from "@/components/common/PrototypeReconciliationModal";'
new_f_import = '''import { PrototypeReconciliationModal } from "@/components/common/PrototypeReconciliationModal";
import {
  evaluateFacultyReconciliation,
  executeSafePruning,
  PrototypeComparisonItem,
} from "@/lib/utils/reconciliationEngine";'''

if old_f_import in f_content:
    f_content = f_content.replace(old_f_import, new_f_import)

start_idx_f = f_content.find(start_marker)
end_idx_f = f_content.find(end_marker)

if start_idx_f != -1 and end_idx_f != -1:
    new_f_block = """  // Reconciliation Comparison Items with Field-Level Difference Analysis
  const reconciliationItems: PrototypeComparisonItem[] = useMemo(() => {
    return prototypeRecords.map((proto) => evaluateFacultyReconciliation(proto, facultyList));
  }, [prototypeRecords, facultyList]);

  // Safe and Recoverable Pruning of Confirmed Duplicates
  const handlePruneDuplicates = async (duplicateIds: string[]) => {
    const result = executeSafePruning<FacultyRecord>({
      storageKey: STORAGE_KEY,
      requestedIds: duplicateIds,
      rawStorageContent: null,
      currentDbRecords: facultyList,
      evaluator: evaluateFacultyReconciliation,
    });

    if (result.success) {
      setPrototypeRecords(result.remainingRecords);
      if (result.prunedCount > 0) {
        showToast(
          `Pruned ${result.prunedCount} confirmed duplicate(s) from browser storage. Backup created.`
        );
      } else {
        showToast("No eligible confirmed duplicates were found to prune.");
      }
      return { pruned: result.prunedCount, backupKey: result.backupKey };
    } else {
      showToast(`Pruning error: ${result.error || "Storage write failed"}`);
      return { pruned: 0, backupKey: "" };
    }
  };

"""
    f_content = f_content[:start_idx_f] + new_f_block + f_content[end_idx_f:]
    with open("src/components/modules/faculty/FacultyView.tsx", "w", encoding="utf-8") as f:
        f.write(f_content)
    print("Updated FacultyView.tsx")
else:
    print("Warning: markers not found in FacultyView.tsx")
