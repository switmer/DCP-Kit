import React from 'react'
export interface DataCardProps {
  name: string
  email: string
  phone: string
  position: string
  note?: string
  'data-id'?: string
}
const DataField: React.FC<{
  label: string
  value: string
  className?: string
}> = ({ label, value, className = '' }) => (
  <div className={className}>
    <span className="text-[10px] uppercase tracking-[0.3px] text-[#86897D] leading-none block">
      {label}
    </span>
    <p className="text-white text-sm leading-tight truncate overflow-hidden whitespace-nowrap">{value}</p>
  </div>
)
export const DataCard: React.FC<DataCardProps> = ({
  name,
  email,
  phone,
  position,
  note,
  'data-id': dataId,
}) => {
  return (
    <div
      className="bg-[rgba(30,31,33,0.5)] border border-[rgba(255,255,255,0.05)] rounded-xl p-3 w-full"
      data-id={dataId}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 md:gap-2 mb-2">
        <DataField label="Name" value={name} className="md:col-span-2" />
        <DataField label="Email" value={email} className="md:col-span-4 max-w-[350px]" />
        <DataField label="Phone" value={phone} className="md:col-span-3" />
        <DataField label="Position" value={position} className="md:col-span-3" />
      </div>
      {note && (
        <div>
          <span className="text-[10px] uppercase tracking-[0.3px] text-[#86897D] leading-3">
            Note
          </span>
          <div className="mt-0.5 max-h-16 overflow-y-auto whitespace-pre-wrap text-xs leading-4 text-[#CECFD2]">
            {note}
          </div>
        </div>
      )}
    </div>
  )
} 