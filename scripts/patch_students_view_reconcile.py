# -*- coding: utf-8 -*-
with open("src/components/modules/students/StudentsView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace reconciliationItems and add handlePruneDuplicates
old_reconcile_block = """  // Reconciliation Comparison Items
  const reconciliationItems: PrototypeComparisonItem[] = useMemo(() => {
    return prototypeRecords.map((proto) => {
      const dbMatch = students.find(
        (s) =>
          s.prn.trim().toLowerCase() === proto.prn.trim().toLowerCase() ||
          s.email.trim().toLowerCase() === proto.email.trim().toLowerCase()
      );

      if (dbMatch) {
        const isConflict =
          dbMatch.fullName.trim().toLowerCase() !== proto.fullName.trim().toLowerCase();
        if (isConflict) {
          return {
            id: proto.id,
            primaryKey: proto.prn,
            name: proto.fullName,
            email: proto.email,
            secondaryInfo: proto.programmeName,
            status: "conflict",
            statusReason: `Conflict: PRN matches database record for "${dbMatch.fullName}"`,
            rawRecord: proto,
          };
        }
        return {
          id: proto.id,
          primaryKey: proto.prn,
          name: proto.fullName,
          email: proto.email,
          secondaryInfo: proto.programmeName,
          status: "duplicate",
          statusReason: "Already present in SQLite database",
          rawRecord: proto,
        };
      }

      return {
        id: proto.id,
        primaryKey: proto.prn,
        name: proto.fullName,
        email: proto.email,
        secondaryInfo: proto.programmeName,
        status: "importable",
        statusReason: "New prototype student ready to import into database",
        rawRecord: proto,
      };
    });
  }, [prototypeRecords, students]);"""

new_reconcile_block = """  // Reconciliation Comparison Items with Field-Level Difference Analysis
  const reconciliationItems: PrototypeComparisonItem[] = useMemo(() => {
    return prototypeRecords.map((proto) => {
      const cleanProtoPrn = proto.prn ? proto.prn.trim().toLowerCase() : "";
      const cleanProtoRoll = proto.rollNumber ? proto.rollNumber.trim().toLowerCase() : "";
      const cleanProtoEmail = proto.email ? proto.email.trim().toLowerCase() : "";

      // Check matches against live database records
      const prnMatches = students.filter(
        (s) =>
          (s.prn && s.prn.trim().toLowerCase() === cleanProtoPrn) ||
          (s.rollNumber && s.rollNumber.trim().toLowerCase() === cleanProtoPrn) ||
          (cleanProtoRoll && s.prn && s.prn.trim().toLowerCase() === cleanProtoRoll) ||
          (cleanProtoRoll && s.rollNumber && s.rollNumber.trim().toLowerCase() === cleanProtoRoll)
      );

      const emailMatches = students.filter(
        (s) => cleanProtoEmail !== "" && s.email && s.email.trim().toLowerCase() === cleanProtoEmail
      );

      // Ambiguous identity check (PRN matches Student A, Email matches Student B)
      const prnMatch = prnMatches[0];
      const emailMatch = emailMatches[0];

      if (prnMatch && emailMatch && prnMatch.id !== emailMatch.id) {
        return {
          id: proto.id,
          primaryKey: proto.prn,
          name: proto.fullName,
          email: proto.email,
          secondaryInfo: proto.programmeName,
          status: "conflict",
          statusReason: `Ambiguous identity: PRN matches "${prnMatch.fullName}" (${prnMatch.prn}) but email matches "${emailMatch.fullName}" (${emailMatch.email})`,
          fieldDiffs: [
            {
              fieldName: "Identity Conflict",
              prototypeValue: `PRN: ${proto.prn}, Email: ${proto.email}`,
              dbValue: `DB Records: ${prnMatch.prn} vs ${emailMatch.email}`,
            },
          ],
          rawRecord: proto,
          matchedDbRecord: prnMatch,
        };
      }

      const dbMatch = prnMatch || emailMatch;

      if (dbMatch) {
        // Detailed Field-by-Field Comparison
        const diffs: Array<{ fieldName: string; prototypeValue: string; dbValue: string }> = [];

        if (proto.fullName.trim().toLowerCase() !== dbMatch.fullName.trim().toLowerCase()) {
          diffs.push({ fieldName: "Full Name", prototypeValue: proto.fullName, dbValue: dbMatch.fullName });
        }
        if (cleanProtoEmail && dbMatch.email && cleanProtoEmail !== dbMatch.email.trim().toLowerCase()) {
          diffs.push({ fieldName: "Email", prototypeValue: proto.email, dbValue: dbMatch.email });
        }
        if (proto.phone && dbMatch.phone) {
          const p1 = proto.phone.replace(/[\\s\\-()]/g, "");
          const p2 = dbMatch.phone.replace(/[\\s\\-()]/g, "");
          if (p1 !== p2) {
            diffs.push({ fieldName: "Phone", prototypeValue: proto.phone, dbValue: dbMatch.phone });
          }
        }
        if (proto.programmeName && dbMatch.programmeName && proto.programmeName.trim().toLowerCase() !== dbMatch.programmeName.trim().toLowerCase()) {
          diffs.push({ fieldName: "Programme", prototypeValue: proto.programmeName, dbValue: dbMatch.programmeName });
        }
        if (proto.semester && dbMatch.semester && Number(proto.semester) !== Number(dbMatch.semester)) {
          diffs.push({ fieldName: "Semester", prototypeValue: String(proto.semester), dbValue: String(dbMatch.semester) });
        }
        if (proto.division && dbMatch.division && proto.division.trim().toLowerCase() !== dbMatch.division.trim().toLowerCase()) {
          diffs.push({ fieldName: "Division", prototypeValue: proto.division, dbValue: dbMatch.division });
        }
        if (proto.enrollmentStatus && dbMatch.enrollmentStatus && proto.enrollmentStatus.trim().toLowerCase() !== dbMatch.enrollmentStatus.trim().toLowerCase()) {
          diffs.push({ fieldName: "Status", prototypeValue: proto.enrollmentStatus, dbValue: dbMatch.enrollmentStatus });
        }
        if (proto.feeStatus && dbMatch.feeStatus && proto.feeStatus.trim().toLowerCase() !== dbMatch.feeStatus.trim().toLowerCase()) {
          diffs.push({ fieldName: "Fee Status", prototypeValue: proto.feeStatus, dbValue: dbMatch.feeStatus });
        }

        if (diffs.length > 0) {
          return {
            id: proto.id,
            primaryKey: proto.prn,
            name: proto.fullName,
            email: proto.email,
            secondaryInfo: proto.programmeName,
            status: "conflict",
            statusReason: `Matching DB record for "${dbMatch.fullName}" (${dbMatch.prn}) has ${diffs.length} field difference(s)`,
            fieldDiffs: diffs,
            rawRecord: proto,
            matchedDbRecord: dbMatch,
          };
        }

        return {
          id: proto.id,
          primaryKey: proto.prn,
          name: proto.fullName,
          email: proto.email,
          secondaryInfo: proto.programmeName,
          status: "duplicate",
          statusReason: `Confirmed duplicate: matches database record for "${dbMatch.fullName}" (${dbMatch.prn})`,
          rawRecord: proto,
          matchedDbRecord: dbMatch,
        };
      }

      return {
        id: proto.id,
        primaryKey: proto.prn,
        name: proto.fullName,
        email: proto.email,
        secondaryInfo: proto.programmeName,
        status: "importable",
        statusReason: "New prototype student ready to import into database",
        rawRecord: proto,
      };
    });
  }, [prototypeRecords, students]);

  // Safe and Recoverable Pruning of Confirmed Duplicates
  const handlePruneDuplicates = async (duplicateIds: string[]) => {
    try {
      const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(prototypeRecords));
      sessionStorage.setItem("last_reconciliation_backup", backupKey);

      const remaining = prototypeRecords.filter((p) => !duplicateIds.includes(p.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      setPrototypeRecords(remaining);
      showToast(`Pruned ${duplicateIds.length} confirmed duplicate(s) from browser storage. Backup created.`);
      return { pruned: duplicateIds.length, backupKey };
    } catch {
      return { pruned: 0, backupKey: "" };
    }
  };"""

assert old_reconcile_block in content, "old_reconcile_block not found"
content = content.replace(old_reconcile_block, new_reconcile_block)

# 2. Update PrototypeReconciliationModal render to pass onPruneDuplicates
old_modal_render = """      {/* Prototype Data Reconciliation Modal */}
      <PrototypeReconciliationModal
        isOpen={reconcileModalOpen}
        entityName="Student"
        storageKey={STORAGE_KEY}
        items={reconciliationItems}
        onClose={() => setReconcileModalOpen(false)}
        onImport={handleReconcileImport}
      />"""

new_modal_render = """      {/* Prototype Data Reconciliation Modal */}
      <PrototypeReconciliationModal
        isOpen={reconcileModalOpen}
        entityName="Student"
        storageKey={STORAGE_KEY}
        items={reconciliationItems}
        onClose={() => setReconcileModalOpen(false)}
        onImport={handleReconcileImport}
        onPruneDuplicates={handlePruneDuplicates}
      />"""

assert old_modal_render in content, "old_modal_render not found"
content = content.replace(old_modal_render, new_modal_render)

# 3. Update StudentFormModal key
content = content.replace(
    'key={formStudent?.id || (formModalOpen ? "add" : "none")}',
    'key={formStudent?.id || formStudent?.prn || (formModalOpen ? "add" : "none")}'
)

with open("src/components/modules/students/StudentsView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully patched StudentsView.tsx")
