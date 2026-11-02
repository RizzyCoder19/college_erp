# -*- coding: utf-8 -*-
with open("src/components/modules/faculty/FacultyView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_reconcile_block = """  // Reconciliation Comparison Items
  const reconciliationItems: PrototypeComparisonItem[] = useMemo(() => {
    return prototypeRecords.map((proto) => {
      const dbMatch = facultyList.find(
        (f) =>
          f.staffId.trim().toLowerCase() === proto.staffId.trim().toLowerCase() ||
          f.email.trim().toLowerCase() === proto.email.trim().toLowerCase()
      );

      if (dbMatch) {
        const isConflict =
          dbMatch.fullName.trim().toLowerCase() !== proto.fullName.trim().toLowerCase();
        if (isConflict) {
          return {
            id: proto.id,
            primaryKey: proto.staffId,
            name: proto.fullName,
            email: proto.email,
            secondaryInfo: proto.department,
            status: "conflict",
            statusReason: `Conflict: Staff ID matches database record for "${dbMatch.fullName}"`,
            rawRecord: proto,
          };
        }
        return {
          id: proto.id,
          primaryKey: proto.staffId,
          name: proto.fullName,
          email: proto.email,
          secondaryInfo: proto.department,
          status: "duplicate",
          statusReason: "Already present in SQLite database",
          rawRecord: proto,
        };
      }

      return {
        id: proto.id,
        primaryKey: proto.staffId,
        name: proto.fullName,
        email: proto.email,
        secondaryInfo: proto.department,
        status: "importable",
        statusReason: "New prototype staff record ready to import into database",
        rawRecord: proto,
      };
    });
  }, [prototypeRecords, facultyList]);"""

new_reconcile_block = """  // Reconciliation Comparison Items with Field-Level Difference Analysis
  const reconciliationItems: PrototypeComparisonItem[] = useMemo(() => {
    return prototypeRecords.map((proto) => {
      const cleanProtoStaffId = proto.staffId ? proto.staffId.trim().toLowerCase() : "";
      const cleanProtoEmail = proto.email ? proto.email.trim().toLowerCase() : "";

      const staffIdMatches = facultyList.filter(
        (f) => f.staffId && f.staffId.trim().toLowerCase() === cleanProtoStaffId
      );

      const emailMatches = facultyList.filter(
        (f) => cleanProtoEmail !== "" && f.email && f.email.trim().toLowerCase() === cleanProtoEmail
      );

      // Ambiguous identity check (Staff ID matches Faculty A, Email matches Faculty B)
      const staffIdMatch = staffIdMatches[0];
      const emailMatch = emailMatches[0];

      if (staffIdMatch && emailMatch && staffIdMatch.id !== emailMatch.id) {
        return {
          id: proto.id,
          primaryKey: proto.staffId,
          name: proto.fullName,
          email: proto.email,
          secondaryInfo: proto.department,
          status: "conflict",
          statusReason: `Ambiguous identity: Staff ID matches "${staffIdMatch.fullName}" (${staffIdMatch.staffId}) but email matches "${emailMatch.fullName}" (${emailMatch.email})`,
          fieldDiffs: [
            {
              fieldName: "Identity Conflict",
              prototypeValue: `Staff ID: ${proto.staffId}, Email: ${proto.email}`,
              dbValue: `DB Records: ${staffIdMatch.staffId} vs ${emailMatch.email}`,
            },
          ],
          rawRecord: proto,
          matchedDbRecord: staffIdMatch,
        };
      }

      const dbMatch = staffIdMatch || emailMatch;

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
        if (proto.department && dbMatch.department && proto.department.trim().toLowerCase() !== dbMatch.department.trim().toLowerCase()) {
          diffs.push({ fieldName: "Department", prototypeValue: proto.department, dbValue: dbMatch.department });
        }
        if (proto.designation && dbMatch.designation && proto.designation.trim().toLowerCase() !== dbMatch.designation.trim().toLowerCase()) {
          diffs.push({ fieldName: "Designation", prototypeValue: proto.designation, dbValue: dbMatch.designation });
        }
        if (proto.category && dbMatch.category && proto.category.trim().toLowerCase() !== dbMatch.category.trim().toLowerCase()) {
          diffs.push({ fieldName: "Category", prototypeValue: proto.category, dbValue: dbMatch.category });
        }
        if (proto.employmentType && dbMatch.employmentType && proto.employmentType.trim().toLowerCase() !== dbMatch.employmentType.trim().toLowerCase()) {
          diffs.push({ fieldName: "Employment Type", prototypeValue: proto.employmentType, dbValue: dbMatch.employmentType });
        }
        if (proto.status && dbMatch.status && proto.status.trim().toLowerCase() !== dbMatch.status.trim().toLowerCase()) {
          diffs.push({ fieldName: "Status", prototypeValue: proto.status, dbValue: dbMatch.status });
        }

        if (diffs.length > 0) {
          return {
            id: proto.id,
            primaryKey: proto.staffId,
            name: proto.fullName,
            email: proto.email,
            secondaryInfo: proto.department,
            status: "conflict",
            statusReason: `Matching DB record for "${dbMatch.fullName}" (${dbMatch.staffId}) has ${diffs.length} field difference(s)`,
            fieldDiffs: diffs,
            rawRecord: proto,
            matchedDbRecord: dbMatch,
          };
        }

        return {
          id: proto.id,
          primaryKey: proto.staffId,
          name: proto.fullName,
          email: proto.email,
          secondaryInfo: proto.department,
          status: "duplicate",
          statusReason: `Confirmed duplicate: matches database record for "${dbMatch.fullName}" (${dbMatch.staffId})`,
          rawRecord: proto,
          matchedDbRecord: dbMatch,
        };
      }

      return {
        id: proto.id,
        primaryKey: proto.staffId,
        name: proto.fullName,
        email: proto.email,
        secondaryInfo: proto.department,
        status: "importable",
        statusReason: "New prototype staff record ready to import into database",
        rawRecord: proto,
      };
    });
  }, [prototypeRecords, facultyList]);

  // Safe and Recoverable Pruning of Confirmed Duplicates
  const handlePruneDuplicates = async (duplicateIds: string[]) => {
    try {
      const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(prototypeRecords));
      sessionStorage.setItem("last_faculty_reconciliation_backup", backupKey);

      const remaining = prototypeRecords.filter((p) => !duplicateIds.includes(p.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      setPrototypeRecords(remaining);
      showToast(`Pruned ${duplicateIds.length} confirmed duplicate(s) from browser storage. Backup created.`);
      return { pruned: duplicateIds.length, backupKey };
    } catch {
      return { pruned: 0, backupKey: "" };
    }
  };"""

assert old_reconcile_block in content, "old_reconcile_block not found in FacultyView"
content = content.replace(old_reconcile_block, new_reconcile_block)

# Update PrototypeReconciliationModal render
old_modal_render = """      {/* Prototype Data Reconciliation Modal */}
      <PrototypeReconciliationModal
        isOpen={reconcileModalOpen}
        entityName="Faculty"
        storageKey={STORAGE_KEY}
        items={reconciliationItems}
        onClose={() => setReconcileModalOpen(false)}
        onImport={handleReconcileImport}
      />"""

new_modal_render = """      {/* Prototype Data Reconciliation Modal */}
      <PrototypeReconciliationModal
        isOpen={reconcileModalOpen}
        entityName="Faculty"
        storageKey={STORAGE_KEY}
        items={reconciliationItems}
        onClose={() => setReconcileModalOpen(false)}
        onImport={handleReconcileImport}
        onPruneDuplicates={handlePruneDuplicates}
      />"""

assert old_modal_render in content, "old_modal_render not found in FacultyView"
content = content.replace(old_modal_render, new_modal_render)

# Update FacultyFormModal key
content = content.replace(
    'key={formFaculty?.id || (formModalOpen ? "add" : "none")}',
    'key={formFaculty?.id || formFaculty?.staffId || (formModalOpen ? "add" : "none")}'
)

with open("src/components/modules/faculty/FacultyView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully patched FacultyView.tsx")
