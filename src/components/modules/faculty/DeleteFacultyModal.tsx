"use client";

import React, { useEffect } from "react";
import { Icon } from "@/components/common/Icon";
import { FacultyRecord } from "@/types/faculty";

interface DeleteFacultyModalProps {
  faculty: FacultyRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export const DeleteFacultyModal: React.FC<DeleteFacultyModalProps> = ({
  faculty,
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

  if (!isOpen || !faculty) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-faculty-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
              <Icon name="trash" className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-faculty-title" className="text-lg font-bold text-slate-900">
                Confirm Staff Deletion
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Prototype Sample Record Removal
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Are you sure you want to remove{" "}
            <span className="font-semibold text-slate-900">{faculty.fullName}</span> (
            <span className="font-mono text-xs text-red-600 font-bold">{faculty.staffId}</span>
            ) from the institutional faculty and staff roster?
          </p>

          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-xs text-amber-800 space-y-1">
            <div className="font-semibold flex items-center space-x-1.5 text-amber-900">
              <Icon name="academic-cap" className="w-4 h-4 text-amber-600" />
              <span>Institutional Safety Notice</span>
            </div>
            <p className="leading-normal">
              This action operates on the client-side demo state. Real institutional records require Human Resources authorization and permanent archival.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(faculty.id)}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
            >
              Confirm Deletion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
