interface EventCardProps {
  event: {
    id: string
    event_type?: string
    title: string
    metadata: Record<string, any>
    created_at: string
  }
}

export default function EventCard({ event }: EventCardProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'github.push':
        return '🔄'
      case 'vercel.deploy':
        return '🚀'
      default:
        return '📝'
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'github.push':
        return 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700'
      case 'vercel.deploy':
        return 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
      default:
        return 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700'
    }
  }

  return (
    <div className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="flex items-start gap-4">
        <div className="text-2xl flex-shrink-0">{getEventIcon(event.event_type || 'unknown')}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
              {event.title}
            </h3>
            <span className={`px-2 py-1 text-xs rounded-full border ${getEventColor(event.event_type || 'unknown')} flex-shrink-0`}>
              {(event.event_type || 'unknown').replace('.', ' ')}
            </span>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {formatTimestamp(event.created_at)}
          </p>
          
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(event.metadata).map(([key, value]) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sm:w-20 flex-shrink-0">
                      {key}:
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-mono break-all">
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}