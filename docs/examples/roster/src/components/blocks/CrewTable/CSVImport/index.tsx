"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Upload, Download, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { CSVUploader, ImportResult } from "./CSVUploader";
import { CSVSampleDownload } from "./CSVSampleDownload";
import { StepCard } from "./StepCard";
import { StepHeader } from "./StepHeader";
import { StepProgress } from "./StepProgress";
import { ProcessingStep } from "./ProcessingStep";
import { ReviewData } from "./ReviewData";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { createClient } from '@/lib/supabase/client';

interface CSVImportProps {
  companyId?: string;
  onUpdate?: () => void;
}

type Step = 'upload' | 'review' | 'processing' | 'success';

export const CSVImport: React.FC<CSVImportProps> = ({ companyId, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preflight, setPreflight] = useState<null | { existing: any[]; newCrew: any[] }>(null);
  const [overwriteMode, setOverwriteMode] = useState<'skip' | 'overwrite'>('skip');
  const [showExtraColumnsDialog, setShowExtraColumnsDialog] = useState(false);
  const [extraColumns, setExtraColumns] = useState<string[]>([]);
  const [extraPreview, setExtraPreview] = useState<string[]>([]);
  const [preflighting, setPreflighting] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [showOverwritePrompt, setShowOverwritePrompt] = useState(false);
  const [existingCount, setExistingCount] = useState(0);

  const parseCSVFile = async (csvFile: File) => {
    const text = await csvFile.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { 
          values.push(current.trim()); 
          current = ''; 
        }
        else current += char;
      }
      values.push(current.trim());

      if (values.length !== headers.length) continue;

      const row: any = {};
      headers.forEach((header, idx) => { 
        row[header] = values[idx] || ''; 
      });

      if (!row.name || (!row.email && !row.phone)) continue;
      rows.push(row);
    }

    return rows;
  };

  const handleNext = async () => {
    if (step === 'upload' && file) {
      setPreflighting(true);
      try {
        const rows = await parseCSVFile(file);
        setParsedData(rows);

        // Check for existing records (simulate with a fetch or local check)
        // For demo, assume a function checkExistingCrew returns count
        const existing = await checkExistingCrew(rows, companyId);
        setExistingCount(existing);
        if (existing > 0) {
          setShowOverwritePrompt(true);
          setPreflighting(false);
          return;
        }

        // Add delay for better UX
        const start = Date.now();
        const minDuration = 2000;
        await new Promise(resolve => setTimeout(resolve, minDuration));
        setStep('review');
      } catch (error) {
        console.error('Error parsing CSV:', error);
      } finally {
        setPreflighting(false);
      }
    } else if (step === 'review') {
      setStep('processing');
      handleImport();
    }
  };

  const handleImport = async () => {
    if (!file || !companyId) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', companyId);
      formData.append('overwriteMode', overwriteMode);
      
      const start = Date.now();
      const response = await fetch('/api/crew/bulk-import', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      // Ensure minimum loading time for better UX
      const elapsed = Date.now() - start;
      const minDuration = 3000;
      if (elapsed < minDuration) {
        await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
      }

      if (response.ok) {
        setResult({
          success: true,
          message: `Successfully imported ${data.imported} crew members`,
          imported: data.imported,
        });
        setFile(null);
        onUpdate?.();
        setStep('success');
      } else {
        setResult({
          success: false,
          message: data.error || 'Import failed',
          errors: data.errors,
        });
        setStep('success');
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error occurred during import',
      });
      setStep('success');
    } finally {
      setUploading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setResult(null);
    setPreflight(null);
    setExtraColumns([]);
    setExtraPreview([]);
    setParsedData([]);
    setStep('upload');
  };

  const closeModal = () => { 
    setIsOpen(false); 
    resetModal(); 
  };

  const getStepNumber = () => {
    switch (step) {
      case 'upload': return 1;
      case 'review': return 2;
      case 'processing':
      case 'success': return 3;
      default: return 1;
    }
  };

  // Add a function to check for existing crew (stub for now)
  async function checkExistingCrew(rows: any[], companyId: string | undefined) {
    // TODO: Replace with real API call to check for existing crew by email/phone
    // For now, simulate: return number of rows with email ending in 'example.com'
    return rows.filter((r: any) => r.email && r.email.endsWith('example.com')).length;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="compact"
          className="w-[150px] h-[42px] text-white text-sm text-opacity-70 font-bold gap-2 px-2 hover:bg-white hover:bg-opacity-5 duration-100 rounded-xl inline-flex items-center justify-center whitespace-nowrap"
        >
          <Upload className="w-6 h-6" />
          Import CSV
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Crew from CSV
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-8">
          <StepProgress currentStep={getStepNumber()} />
          
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <StepCard>
                  <StepHeader n={1} title="Download Template" />
                  <CSVSampleDownload />
                </StepCard>

                <StepCard>
                  <StepHeader n={2} title="Upload CSV" />
                  <p className="text-sm text-neutral-400 mb-4">
                    Upload your completed CSV file with crew data.
                  </p>
                  <CSVUploader 
                    file={file}
                    setFile={setFile}
                    uploading={false}
                    result={null}
                    onClearResult={() => {}}
                  />
                </StepCard>
              </div>

              <StepCard className="bg-zinc-800/50">
                <p className="font-medium text-white mb-2">Required CSV format:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-neutral-400">
                  <li>Columns: name, email, phone, city, state, department, position, note</li>
                  <li>Headers must match exactly (case-sensitive)</li>
                  <li>At least name and either email or phone are required</li>
                </ul>
              </StepCard>
            </div>
          )}

          {step === 'review' && (
            <>
              {/* Show summary and prompt only if there are existing records */}
              {existingCount > 0 && showOverwritePrompt && (
                <div className="mb-4 text-center">
                  <p className="text-yellow-300 font-semibold">
                    {existingCount} out of {parsedData.length} records already exist in your crew list.
                  </p>
                </div>
              )}
              <ReviewData
                fileName={file?.name || 'unknown.csv'}
                recordCount={parsedData.length}
                previewData={parsedData.slice(0, 2)}
                showMoreCount={Math.max(0, parsedData.length - 2)}
                existingRecords={preflight?.existing || []}
              />
              {/* Overwrite warning prompt only if there are existing records */}
              {existingCount > 0 && showOverwritePrompt && (
                <div className="p-6 bg-zinc-800/80 rounded-xl border border-white/10 mb-6 text-center">
                  <p className="text-white font-semibold mb-2">Some records already exist in your crew list.</p>
                  <p className="text-neutral-400 mb-4">Do you want to skip existing records or overwrite them?</p>
                  <div className="flex justify-center gap-4">
                    <div className="flex flex-col items-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setOverwriteMode('skip');
                          setShowOverwritePrompt(false);
                          setStep('review');
                        }}
                        className="h-[46px]"
                      >
                        Skip Existing
                      </Button>
                      <span className="text-xs text-neutral-400 mt-1 max-w-[120px]">Only new records will be imported. Existing records will not be changed.</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Button
                        onClick={() => {
                          setOverwriteMode('overwrite');
                          setShowOverwritePrompt(false);
                          setStep('review');
                        }}
                        className="h-[46px]"
                      >
                        Overwrite Existing
                      </Button>
                      <span className="text-xs text-neutral-400 mt-1 max-w-[120px]">Existing records will be updated with the new data.</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {(step === 'processing' || step === 'success') && (
            <ProcessingStep
              isProcessing={step === 'processing'}
              isSuccess={step === 'success' && result?.success === true}
              successMessage={result?.message}
              onClose={closeModal}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-900 flex flex-col-reverse p-6 sm:flex-row sm:justify-end sm:space-x-2 bg-background/50 rounded-b-3xl">
          {step === 'upload' && (
            <>
              <Button
                variant="outline"
                onClick={closeModal}
                className="h-[46px]"
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                onClick={handleNext}
                disabled={!file || preflighting}
                className="h-[46px]"
              >
                {preflighting ? (
                  <span className="flex items-center gap-2">
                    <LoadingIndicator size="small" accent /> 
                    Checking...
                  </span>
                ) : (
                  'Next'
                )}
              </Button>
            </>
          )}

          {step === 'review' && (
            <>
              <Button
                variant="outline"
                className="h-[46px] px-4"
                onClick={() => setStep('upload')}
              >
                Back
              </Button>
              <Button
                variant="accent"
                className="h-[46px] px-4"
                onClick={handleNext}
              >
                Import Crew
              </Button>
            </>
          )}

          {step === 'processing' && (
            <Button
              variant="outline"
              onClick={closeModal}
              className="h-[46px]"
            >
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

