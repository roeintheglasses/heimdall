interface ConnectionStatusProps {
  isConnected: boolean
  eventCount: number
}

export default function ConnectionStatus({ isConnected, eventCount }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-4">
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${
        isConnected 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      }`}>
        <div className={`w-2 h-2 rounded-full transition-colors ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {eventCount} events
      </div>
    </div>
  )
}