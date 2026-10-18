"use client";

import React, { useEffect } from "react";
import { Icon } from "@/components/common/Icon";
import { StudentRecord } from "@/types/student";

interface DeleteConfirmModalProps {
  student: StudentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  student,
  isOpen,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm Deletion"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center space-x-3 text-[#D92534] mb-3">
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-100">
              <Icon name="x-mark" className="h-6 w-6 text-[#D92534]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Confirm Record Deletion
              </h3>
              <p className="text-xs text-slate-500">
                Student Administration • Prototype Action
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to remove the sample student record for{" "}
            <strong className="text-slate-900 font-semibold">{student.fullName}</strong>{" "}
            (PRN: <span className="font-mono font-bold text-[#1657D9]">{student.prn}</span>)?
          </p>

          <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800 flex items-start space-x-2">
            <Icon name="question-mark-circle" className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              This is a prototype sample record. Deleting will update the in-memory/local session state. You can restore default sample records at any time.
            </span>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(student.id);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#D92534] hover:bg-[#B91C2C] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Delete Record
          </button>
        </div>
      </div>
    </div>
  );
};
