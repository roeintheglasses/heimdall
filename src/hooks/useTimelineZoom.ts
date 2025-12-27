'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

export type TimelineZoomLevel = 'hour' | 'day' | 'week'

interface UseTimelineZoomOptions {
  initialZoom?: TimelineZoomLevel
  onZoomChange?: (zoom: TimelineZoomLevel) => void
  onOffsetChange?: (offset: number) => void
}

interface TimelineZoomState {
  zoomLevel: TimelineZoomLevel
  offset: number // Offset in milliseconds from current time
}

// Time intervals for each zoom level
export const ZOOM_INTERVALS = {
  hour: {
    duration: 60 * 60 * 1000, // 1 hour in ms
    tickInterval: 5 * 60 * 1000, // 5 minutes
    tickCount: 12,
    format: (date: Date) => date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  },
  day: {
    duration: 24 * 60 * 60 * 1000, // 24 hours in ms
    tickInterval: 60 * 60 * 1000, // 1 hour
    tickCount: 24,
    format: (date: Date) => date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      hour12: false
    }) + ':00'
  },
  week: {
    duration: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    tickInterval: 24 * 60 * 60 * 1000, // 1 day
    tickCount: 7,
    format: (date: Date) => date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }
}

export function useTimelineZoom(options: UseTimelineZoomOptions = {}) {
  const {
    initialZoom = 'hour',
    onZoomChange,
    onOffsetChange
  } = options

  const [state, setState] = useState<TimelineZoomState>({
    zoomLevel: initialZoom,
    offset: 0
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const lastX = useRef(0)

  // Get current zoom configuration
  const zoomConfig = useMemo(() => ZOOM_INTERVALS[state.zoomLevel], [state.zoomLevel])

  // Change zoom level
  const setZoomLevel = useCallback((level: TimelineZoomLevel) => {
    setState(prev => ({ ...prev, zoomLevel: level }))
    onZoomChange?.(level)
  }, [onZoomChange])

  // Pan by a certain amount (in pixels, converted to time)
  const pan = useCallback((deltaPixels: number, containerWidth: number) => {
    const pxPerMs = containerWidth / zoomConfig.duration
    const deltaMs = deltaPixels / pxPerMs

    setState(prev => ({
      ...prev,
      offset: prev.offset + deltaMs
    }))
  }, [zoomConfig.duration])

  // Pan to a specific offset
  const setOffset = useCallback((offset: number) => {
    setState(prev => ({ ...prev, offset }))
    onOffsetChange?.(offset)
  }, [onOffsetChange])

  // Go to now (reset offset)
  const goToNow = useCallback(() => {
    setOffset(0)
  }, [setOffset])

  // Go forward/backward by one interval
  const stepForward = useCallback(() => {
    setState(prev => ({
      ...prev,
      offset: prev.offset - zoomConfig.tickInterval
    }))
  }, [zoomConfig.tickInterval])

  const stepBackward = useCallback(() => {
    setState(prev => ({
      ...prev,
      offset: prev.offset + zoomConfig.tickInterval
    }))
  }, [zoomConfig.tickInterval])

  // Get visible time range
  const getVisibleTimeRange = useCallback(() => {
    const now = Date.now()
    const end = now - state.offset
    const start = end - zoomConfig.duration

    return { start, end }
  }, [state.offset, zoomConfig.duration])

  // Get time ticks for the visible range
  const getTimeTicks = useCallback(() => {
    const { start, end } = getVisibleTimeRange()
    const ticks: { time: number; label: string; position: number }[] = []

    // Align to tick interval
    const firstTick = Math.ceil(start / zoomConfig.tickInterval) * zoomConfig.tickInterval

    for (let time = firstTick; time <= end; time += zoomConfig.tickInterval) {
      const position = (time - start) / zoomConfig.duration
      const date = new Date(time)
      ticks.push({
        time,
        label: zoomConfig.format(date),
        position
      })
    }

    return ticks
  }, [getVisibleTimeRange, zoomConfig])

  // Convert time to position (0-1)
  const timeToPosition = useCallback((time: number) => {
    const { start, end } = getVisibleTimeRange()
    return (time - start) / (end - start)
  }, [getVisibleTimeRange])

  // Check if time is in visible range
  const isTimeVisible = useCallback((time: number) => {
    const { start, end } = getVisibleTimeRange()
    return time >= start && time <= end
  }, [getVisibleTimeRange])

  // Mouse/touch drag handlers for panning
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    lastX.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return

    const deltaX = e.clientX - lastX.current
    lastX.current = e.clientX

    const containerWidth = containerRef.current.offsetWidth
    pan(deltaX, containerWidth)
  }, [pan])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  // Wheel handler for zooming
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()

    // Zoom in/out based on scroll direction
    if (e.deltaY < 0) {
      // Zoom in (more detail)
      if (state.zoomLevel === 'week') setZoomLevel('day')
      else if (state.zoomLevel === 'day') setZoomLevel('hour')
    } else {
      // Zoom out (less detail)
      if (state.zoomLevel === 'hour') setZoomLevel('day')
      else if (state.zoomLevel === 'day') setZoomLevel('week')
    }
  }, [state.zoomLevel, setZoomLevel])

  // Attach wheel listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  return {
    // State
    zoomLevel: state.zoomLevel,
    offset: state.offset,
    zoomConfig,

    // Actions
    setZoomLevel,
    setOffset,
    goToNow,
    stepForward,
    stepBackward,
    pan,

    // Position calculations
    getVisibleTimeRange,
    getTimeTicks,
    timeToPosition,
    isTimeVisible,

    // Event handlers for panning
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  }
}
