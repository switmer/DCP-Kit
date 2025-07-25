"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";

export const CSVSampleDownload: React.FC = () => {
  const generateSampleCSV = () => {
    const sampleData = [
      {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "555-0123",
        city: "Los Angeles",
        state: "CA",
        department: "Camera",
        position: "Director of Photography",
        note: "Available weekdays"
      },
      {
        name: "Jane Smith", 
        email: "jane.smith@example.com",
        phone: "555-0456",
        city: "Atlanta",
        state: "GA", 
        department: "Sound",
        position: "Sound Mixer",
        note: "Owns equipment"
      },
      {
        name: "Mike Johnson",
        email: "mike.johnson@example.com", 
        phone: "555-0789",
        city: "New York",
        state: "NY",
        department: "Lighting",
        position: "Gaffer",
        note: ""
      }
    ];

    // Convert to CSV format
    const headers = Object.keys(sampleData[0]);
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Wrap in quotes if contains comma or is empty
          return value.includes(',') || value === '' ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'crew_import_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <p className="text-sm text-neutral-400 mb-4">
        Download a sample CSV file with the required format and column headers.
      </p>
      <div
        role="button"
        tabIndex={0}
        onClick={generateSampleCSV}
        className="w-full flex flex-col items-center justify-center gap-4 rounded-xl p-6 text-center bg-[#23281a] transition-colors"
        style={{ transition: 'background 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#2d3320';
          e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(214,255,90,0.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#23281a';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        <Download className="w-8 h-8 text-[#e6ff5a]" />
        <span className="text-base font-medium text-[#e6ff5a]">Download Template</span>
      </div>
    </>
  );
};

