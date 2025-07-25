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
    <p className="text-white text-sm leading-tight break-words">{value}</p>
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
      className="bg-[#23281a] rounded-xl p-6 w-full"
      data-id={dataId}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-y-4 md:gap-4 mb-4">
        <DataField label="Name" value={name} />
        <DataField label="Email" value={email} />
        <DataField label="Phone" value={phone} />
        <DataField label="Position" value={position} />
      </div>
      {note && (
        <div>
          <span className="text-[10px] uppercase tracking-[0.3px] text-[#86897D] leading-3">
            Note
          </span>
          <div className="mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap text-xs leading-4 text-[#CECFD2]">
            {note}
          </div>
        </div>
      )}
    </div>
  )
} 