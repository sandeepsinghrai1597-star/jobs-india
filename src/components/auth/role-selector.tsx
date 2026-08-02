"use client";

import { Briefcase, Users } from "lucide-react";

interface RoleSelectorProps {
  value: "candidate" | "employer";
  onChange: (value: "candidate" | "employer") => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-slate-900">Account Type</label>
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => onChange("candidate")}
          className={`flex items-center justify-center gap-2 rounded-md px-4 py-3 font-semibold transition-all duration-200 ${
            value === "candidate"
              ? "bg-white text-blue-600 shadow-md shadow-blue-500/20 border border-blue-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-500"
          }`}
        >
          <Users className="h-4 w-4" />
          <span className="text-sm">Candidate</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("employer")}
          className={`flex items-center justify-center gap-2 rounded-md px-4 py-3 font-semibold transition-all duration-200 ${
            value === "employer"
              ? "bg-white text-blue-600 shadow-md shadow-blue-500/20 border border-blue-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-500"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span className="text-sm">Employer</span>
        </button>
      </div>
    </div>
  );
}
