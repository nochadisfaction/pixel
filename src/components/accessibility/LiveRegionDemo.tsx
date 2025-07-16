import { useState } from 'react'
import {
  LiveRegionProvider,
  useLiveRegion,
  useStatusAnnouncer,
} from './LiveRegionContext'

// Demo component that shows using the individual hooks
function StatusButton() {
  const announceStatus = useStatusAnnouncer()
  const [count, setCount] = useState(0)

  const handleClick = () => {
    const newCount = count + 1
    setCount(newCount)
    announceStatus(
      `Button clicked ${newCount} ${newCount === 1 ? 'time' : 'times'}`,
    )
  }

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md mr-3"
    >
      Status Hook: Click Me ({count})
    </button>
  )
}

// Demo component that shows using the combined hook
function AlertButton() {
  const { announceAlert } = useLiveRegion()
  const [severity, setSeverity] = useState('low')

  const handleClick = () => {
    // Rotate through severity levels
    const nextSeverity =
      severity === 'low' ? 'medium' : severity === 'medium' ? 'high' : 'low'
    setSeverity(nextSeverity)
    announceAlert(`Alert severity changed to ${nextSeverity}`)
  }

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
    >
      Alert Hook: Severity ({severity})
    </button>
  )
}

// Main demo wrapper
export function LiveRegionDemoReact() {
  return (
    <LiveRegionProvider>
<LiveRegionProvider>
  <div className="p-4 border rounded-lg bg-gray-50">
    <h3 className="text-lg font-semibold mb-2">Live Region Demo</h3>
    <p className="text-sm text-gray-600 mb-4">
      Demonstrates live region announcements using React hooks
    </p>
    <div className="flex gap-3">
      <StatusButton />
      <AlertButton />
    </div>
  </div>
</LiveRegionProvider>
    </LiveRegionProvider>
  )
}

export default LiveRegionDemoReact
