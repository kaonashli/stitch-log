// AuthContext keeps track of who is logged in and shares it with every page.
// Any component can call useAuth() to get { user, profile, hasPermission, ... }.
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { uploadPendingAvatar } from '../lib/images.js'
import { purgeExpiredProjects } from '../lib/trash.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false) // true once Supabase told us if we're logged in
  const [profile, setProfile] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [loadedFor, setLoadedFor] = useState(null) // which user id profile/permissions belong to

  // 1. Listen for login / logout. Supabase calls this right away with the saved
  //    session (if any), and again whenever it changes.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Only set state here. Supabase recommends not calling other Supabase
      // functions directly inside this callback.
      setSession(newSession)
      setAuthReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const user = session?.user ?? null
  const userId = user?.id ?? null

  async function loadUserData(id) {
    const [profileResult, permissionsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.rpc('my_permissions'),
    ])
    if (profileResult.error) console.error('Could not load profile', profileResult.error)
    if (permissionsResult.error) console.error('Could not load permissions', permissionsResult.error)
    setProfile(profileResult.data ?? null)
    setPermissions(permissionsResult.data ?? [])
    setLoadedFor(id)
    return profileResult.data
  }

  // 2. Whenever the logged-in user changes, load their profile and permissions.
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setPermissions([])
      setLoadedFor(null)
      return
    }
    let cancelled = false
    // Remember when this person last opened the app (shown to admins).
    // Errors are ignored: it's not something the user needs to know about.
    supabase.rpc('touch_last_seen').then(() => {}, () => {})
    // Delete for good any of your projects that have been in "Recently deleted"
    // for 30+ days (photos included). Runs quietly in the background.
    purgeExpiredProjects(userId).catch(() => {})
    loadUserData(userId).then(async (loadedProfile) => {
      if (cancelled || !loadedProfile) return
      // Upload an avatar picked during signup (see images.js for why).
      const newPath = await uploadPendingAvatar(user, loadedProfile)
      if (newPath && !cancelled) setProfile({ ...loadedProfile, avatar_path: newPath })
    })
    return () => { cancelled = true }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    session,
    user,
    profile,
    permissions,
    // Still working out who is logged in (show a spinner instead of the page)
    loading: !authReady || (userId !== null && loadedFor !== userId),
    hasPermission: (key) => permissions.includes(key),
    refreshProfile: () => (userId ? loadUserData(userId) : null),
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
