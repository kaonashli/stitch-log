// Notifications for the whole app:
//   - unreadCount: notifications you haven't seen yet (the badge on the bell)
//   - requestCount: friend requests waiting for you (the badge on Friends)
//   - toasts: pop-up messages that slide in at the top of the screen
//
// It listens to the database live (Supabase Realtime), so when someone hearts
// or comments on your project, or sends/accepts a friend request, you see it
// right away without refreshing. The database creates the notification rows
// itself (supabase/migrations/008), and removes them if the heart, comment,
// or request is taken back.
//
// Any component can call useNotifications() to:
//   - read unreadCount / requestCount
//   - call markAllRead() (the Notifications page does this when you open it)
//   - watch notificationsVersion / friendshipsVersion (they change whenever
//     notifications / friendships change) to know when to reload a list
//   - call refreshRequests() after accepting/declining a request
//   - call showToast({ title, message, link }) to pop up a message
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { describeNotification, loadNotification } from '../lib/notifications.js'
import { useAuth } from './AuthContext.jsx'

const NotificationsContext = createContext(null)
const TOAST_MS = 5000 // how long a pop-up stays on screen

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [unreadCount, setUnreadCount] = useState(0)
  const [requestCount, setRequestCount] = useState(0)
  const [toasts, setToasts] = useState([])
  const nextToastId = useRef(1)
  const [notificationsVersion, setNotificationsVersion] = useState(0)
  const [friendshipsVersion, setFriendshipsVersion] = useState(0)

  // ----- Pop-up messages -----
  const dismissToast = useCallback((id) => {
    setToasts((all) => all.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((toast) => {
    const id = nextToastId.current++
    // Keep at most 3 on screen; newest at the top
    setToasts((all) => [{ ...toast, id }, ...all].slice(0, 3))
    setTimeout(() => dismissToast(id), TOAST_MS)
  }, [dismissToast])

  // ----- Counts -----
  const refreshUnread = useCallback(async () => {
    if (!userId) return
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true }) // head = just count, don't download rows
      .eq('recipient_id', userId)
      .is('read_at', null)
    if (!error) setUnreadCount(count ?? 0)
  }, [userId])

  const refreshRequests = useCallback(async () => {
    if (!userId) return
    const { count, error } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('addressee_id', userId)
      .eq('status', 'pending')
    if (!error) setRequestCount(count ?? 0)
  }, [userId])

  // Seen = badge goes away (the notifications themselves stay)
  const markAllRead = useCallback(async () => {
    if (!userId) return
    setUnreadCount(0)
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .is('read_at', null)
  }, [userId])

  const markRead = useCallback(async (notificationId) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId)
    refreshUnread()
  }, [refreshUnread])

  // ----- Live updates -----
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0)
      setRequestCount(0)
      return
    }
    refreshUnread()
    refreshRequests()

    const channel = supabase
      .channel(`notifications-${userId}`)
      // A new notification for me: pop it up and update the badge
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        async (payload) => {
          refreshUnread()
          setNotificationsVersion((v) => v + 1)
          const notification = await loadNotification(payload.new.id)
          if (!notification) return
          const { title, text, link } = describeNotification(notification)
          showToast({ title, message: text, link, notificationId: notification.id })
        })
      // A notification was removed (e.g. someone took back a heart): recount
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        () => {
          refreshUnread()
          setNotificationsVersion((v) => v + 1)
        })
      // Any change to friendships: update the Friends badge and friend lists
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          refreshRequests()
          setFriendshipsVersion((v) => v + 1)
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, refreshUnread, refreshRequests, showToast])

  // Installed as an app (Add to Home Screen)? Show the unread count on the app icon too.
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return
    if (unreadCount > 0) navigator.setAppBadge(unreadCount).catch(() => {})
    else navigator.clearAppBadge().catch(() => {})
  }, [unreadCount])

  const value = {
    unreadCount, markAllRead, markRead, notificationsVersion,
    requestCount, refreshRequests, friendshipsVersion,
    toasts, showToast, dismissToast,
  }
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
