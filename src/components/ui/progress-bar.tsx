import React from 'react'

interface ProgressBarProps {
  label: string
  value: number
  color: string
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, color }) => {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-base font-medium text-white">{label}</span>
        <span className="text-sm font-medium text-white">{value}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full"
          style={{ width: `${value}%`, backgroundColor: color }}
        ></div>
      </div>
    </div>
  )
}

export default ProgressBar
