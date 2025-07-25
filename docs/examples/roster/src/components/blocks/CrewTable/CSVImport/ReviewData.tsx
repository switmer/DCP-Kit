"use client";

import React from "react";
import { FileText, AlertCircle } from "lucide-react";
import { DataCard } from "@/components/ui/DataCard";

interface CrewRecord {
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  note?: string;
  city?: string;
  state?: string;
  department?: string;
}

interface ReviewDataProps {
  fileName: string;
  recordCount: number;
  previewData: CrewRecord[];
  showMoreCount?: number;
  existingRecords?: CrewRecord[];
}

export const ReviewData: React.FC<ReviewDataProps> = ({
  fileName,
  recordCount,
  previewData,
  showMoreCount = 0,
  existingRecords = [],
}) => {
  // Helper to check if a record matches existing (by email or phone)
  const isExisting = (record: CrewRecord) =>
    existingRecords.some(
      (ex) =>
        (ex.email && record.email && ex.email.toLowerCase() === record.email.toLowerCase()) ||
        (ex.phone && record.phone && ex.phone === record.phone)
    );

  return (
    <div className="space-y-6">
      {/* File Info */}
      <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-lg border border-accent/20">
        <FileText className="w-5 h-5 text-accent flex-shrink-0" />
        <div>
          <p className="font-medium text-white">{fileName}</p>
          <p className="text-sm text-neutral-400">{recordCount} records found</p>
        </div>
      </div>

      {/* Data Preview Header */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Data Preview</h3>
        
        {/* Preview Records */}
        <div className="space-y-4">
          {previewData.map((record, index) => {
            const existing = isExisting(record);
            return (
              <div key={index} className="mb-4">
                <DataCard
                  name={record.name}
                  email={record.email || '—'}
                  phone={record.phone || '—'}
                  position={record.position || '—'}
                  note={record.note}
                  data-id={`preview-${index}`}
                />
                {existing && (
                  <div className="flex items-center gap-2 mt-2 text-yellow-400 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    This record matches an existing crew member
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Show more indicator */}
          {showMoreCount > 0 && (
            <div className="text-center py-2">
              <span className="text-sm text-neutral-400 italic">
                ...and {showMoreCount} more records
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 