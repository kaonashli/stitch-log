// useTouchDrag: drag and drop with a finger (phones/tablets).
//
// Browsers only support built-in drag and drop with a mouse, so for touch we
// do it ourselves. Used by the kanban board and the materials editor.
//
// How to use it:
//   const touch = useTouchDrag({ onDrop: (item, target) => ..., holdMs: 300 })
//   - Put data-drop-target="some-name" on each place things can be dropped.
//   - On the thing being dragged: onTouchStart={(e) => touch.handleTouchStart(e, item)}
//   - touch.ghost is { item, x, y } while dragging (draw a floating copy there),
//     touch.overTarget is the drop target under the finger (to highlight it).
//   - onDrop(item, target) is called when the finger is lifted over a target.
//
// holdMs: how long the finger must stay still before dragging starts. Use it on
// things people also scroll past (so a normal swipe still scrolls). Use 0 for a
// dedicated drag handle that has CSS `touch-action: none`.
import { useEffect, useRef, useState } from 'react'

const MOVE_TOLERANCE = 10 // moving more than this (px) during the hold = scrolling, not dragging
const EDGE_SIZE = 70      // this close (px) to the top/bottom edge while dragging = auto-scroll
const MAX_SCROLL_SPEED = 14

// Which drop target is at this screen position?
function targetAt(x, y) {
  const element = document.elementFromPoint(x, y)
  return element?.closest('[data-drop-target]')?.dataset.dropTarget ?? null
}

export function useTouchDrag({ onDrop, holdMs = 300 }) {
  // The in-progress touch. A ref (not state) because it changes on every
  // finger movement and doesn't need to re-render anything by itself.
  const touchRef = useRef(null) // { item, startX, startY, x, y, timer, dragging, scroller }
  const [ghost, setGhost] = useState(null)
  const [overTarget, setOverTarget] = useState(null)
  const suppressClickRef = useRef(false)
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop // always call the latest version

  function beginDrag(state) {
    state.dragging = true
    navigator.vibrate?.(15) // small buzz on Android so you know it picked up
    setGhost({ item: state.item, x: state.x, y: state.y })
    setOverTarget(targetAt(state.x, state.y))
  }

  function handleTouchStart(event, item) {
    if (event.touches.length !== 1) return
    const touch = event.touches[0]
    const state = {
      item,
      startX: touch.clientX,
      startY: touch.clientY,
      x: touch.clientX,
      y: touch.clientY,
      dragging: false,
      scroller: event.currentTarget.closest('.page-scroll'), // the part of the page that scrolls
    }
    touchRef.current = state
    if (holdMs <= 0) beginDrag(state)
    else state.timer = setTimeout(() => beginDrag(state), holdMs)
  }

  // Track the finger on the whole document. { passive: false } is needed so we
  // can call preventDefault(), which stops the page scrolling while dragging.
  useEffect(() => {
    function handleMove(event) {
      const state = touchRef.current
      if (!state) return
      const touch = event.touches[0]
      state.x = touch.clientX
      state.y = touch.clientY

      if (!state.dragging) {
        // Finger moved before the hold finished: it's a scroll, cancel
        if (Math.hypot(state.x - state.startX, state.y - state.startY) > MOVE_TOLERANCE) {
          clearTimeout(state.timer)
          touchRef.current = null
        }
        return
      }

      event.preventDefault()
      setGhost((g) => g && { ...g, x: state.x, y: state.y })
      setOverTarget(targetAt(state.x, state.y))
    }

    function handleEnd(event) {
      const state = touchRef.current
      if (!state) return
      clearTimeout(state.timer)
      touchRef.current = null
      if (!state.dragging) return // a normal tap

      const touch = event.changedTouches[0]
      const target = touch ? targetAt(touch.clientX, touch.clientY) : null
      setGhost(null)
      setOverTarget(null)
      // The tap that ends a drag shouldn't also click/open what's under it
      suppressClickRef.current = true
      setTimeout(() => { suppressClickRef.current = false }, 400)
      if (target) onDropRef.current(state.item, target)
    }

    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
    document.addEventListener('touchcancel', handleEnd)
    return () => {
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
      document.removeEventListener('touchcancel', handleEnd)
    }
  }, [])

  // While dragging, holding the finger near the top or bottom edge scrolls the
  // page, so you can reach drop targets that are off screen.
  const dragging = ghost !== null
  useEffect(() => {
    if (!dragging) return
    let frame
    function step() {
      const state = touchRef.current
      if (state?.dragging && state.scroller) {
        const rect = state.scroller.getBoundingClientRect()
        let speed = 0
        if (state.y < rect.top + EDGE_SIZE) speed = -((rect.top + EDGE_SIZE - state.y) / EDGE_SIZE) * MAX_SCROLL_SPEED
        else if (state.y > rect.bottom - EDGE_SIZE) speed = ((state.y - (rect.bottom - EDGE_SIZE)) / EDGE_SIZE) * MAX_SCROLL_SPEED
        if (speed) {
          state.scroller.scrollTop += speed
          setOverTarget(targetAt(state.x, state.y)) // what's under the finger changed
        }
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [dragging])

  return {
    ghost,
    overTarget,
    handleTouchStart,
    // true right after a drag ends: use it to ignore the click that follows
    justDragged: () => suppressClickRef.current,
  }
}
