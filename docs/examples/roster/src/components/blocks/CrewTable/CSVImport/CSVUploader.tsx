"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

export interface ImportResult {
  success: boolean;
  message: string;
  imported?: number;
  errors?: string[];
}

interface CSVUploaderProps {
  file: File | null;
  setFile: (file: File | null) => void;
  uploading: boolean;
  result: ImportResult | null;
  onClearResult: () => void;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({ file, setFile, uploading, result, onClearResult }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      onClearResult();
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const clearFile = () => {
    setFile(null);
    onClearResult();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      {!file ? (
        <div
          className="border-2 border-dashed border-lime-400/80 rounded-xl p-6 text-center transition-colors cursor-pointer group w-full flex flex-col items-center justify-center gap-4 hover:bg-[#23281a]"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer block w-full flex flex-col items-center justify-center gap-4"
          >
            <Upload className="w-8 h-8 text-[#e6ff5a] transition-colors" />
            <p className="text-sm font-medium text-[#e6ff5a] transition-colors">
              Select a csv to import
            </p>
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 max-w-full bg-[#3a4222] rounded-xl px-6 py-4 text-[#e6ff5a]">
          <span className="text-sm font-bold max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap block">{file.name}</span>
          <Button
            variant="ghost"
            size="small"
            onClick={clearFile}
            className="p-1 h-auto text-[#e6ff5a] hover:bg-[#e6ff5a]/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

