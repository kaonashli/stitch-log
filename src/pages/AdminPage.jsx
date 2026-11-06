// Admin dashboard (needs the 'admin.access' permission). Tabs:
//   Dashboard     quick numbers: users, who's been active, projects, open reports
//   Users         every user with email, joined / last login / last active dates,
//                 and their roles (tick boxes) + the permissions those roles give
//   Feedback      bug reports and change requests on a mini kanban
//   Roles & permissions  which role has which permission; add roles/permissions
//
// Hiding this page in the UI is just for convenience - the real protection is
// the database RLS policies, which check has_permission() on every request.
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Activity, Inbox, Layers, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { formatDate, timeAgo, toLocalDateString } from '../lib/dates.js'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import FeedbackBoard from '../components/admin/FeedbackBoard.jsx'

const TABS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'users', label: 'Users' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'permissions', label: 'Roles & permissions' },
]

const DAY_MS = 24 * 60 * 60 * 1000

function shortDate(iso) {
  return iso ? formatDate(toLocalDateString(new Date(iso))) : ''
}

function StatTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="card stat-tile">
      <span className="stat-icon"><Icon size={18} /></span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {hint && <small className="muted">{hint}</small>}
    </div>
  )
}

export default function AdminPage() {
  const { user, hasPermission, refreshProfile } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [userRoles, setUserRoles] = useState([]) // [{ user_id, role_id }]
  const [rolePermissions, setRolePermissions] = useState([]) // [{ role_id, permission_id }]
  const [stats, setStats] = useState({ projects: 0, openReports: 0, newReports: 0 })
  const [newPermission, setNewPermission] = useState({ key: '', description: '' })
  const [newRole, setNewRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canManageRoles = hasPermission('roles.manage')
  const canManageFeedback = hasPermission('feedback.manage')

  async function loadUsers() {
    // admin_list_users() adds email + last login (from Supabase's private auth table)
    const { data, error } = await supabase.rpc('admin_list_users')
    if (!error) return data
    // Fallback if migration 009 hasn't been run yet: profiles only
    const fallback = await supabase.from('profiles').select('id, username, display_name, avatar_path, created_at').order('created_at')
    return fallback.data ?? []
  }

  async function load() {
    const [userList, r, perm, ur, rp, projectCount, openCount, newCount] = await Promise.all([
      loadUsers(),
      supabase.from('roles').select('*').order('id'),
      supabase.from('permissions').select('*').order('key'),
      supabase.from('user_roles').select('*'),
      supabase.from('role_permissions').select('*'),
      supabase.from('projects').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('feedback_reports').select('id', { count: 'exact', head: true }).neq('status', 'done'),
      supabase.from('feedback_reports').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ])
    const failed = [r, perm, ur, rp].find((res) => res.error)
    if (failed) setError(failed.error.message)
    setUsers(userList)
    setRoles(r.data ?? [])
    setPermissions(perm.data ?? [])
    setUserRoles(ur.data ?? [])
    setRolePermissions(rp.data ?? [])
    setStats({ projects: projectCount.count ?? 0, openReports: openCount.count ?? 0, newReports: newCount.count ?? 0 })
    setLoading(false)
  }

  useEffect(() => {
    if (hasPermission('admin.access')) load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasPermission('admin.access')) return <Navigate to="/" replace />
  if (loading) return <Spinner />

  // Run a database change, then reload everything
  async function run(request) {
    setError('')
    const { error } = await request
    if (error) setError(error.message)
    await load()
  }

  // ----- Roles for users -----
  function hasRole(userId, roleId) {
    return userRoles.some((ur) => ur.user_id === userId && ur.role_id === roleId)
  }

  function toggleUserRole(userId, role) {
    if (hasRole(userId, role.id)) {
      // Safety: don't let an admin lock themselves out
      if (userId === user.id && role.name === 'admin') {
        return setError("You can't remove your own admin role.")
      }
      run(supabase.from('user_roles').delete().eq('user_id', userId).eq('role_id', role.id))
    } else {
      run(supabase.from('user_roles').insert({ user_id: userId, role_id: role.id }))
    }
  }

  // Everything a user is allowed to do, through all their roles
  function permissionsOf(userId) {
    const roleIds = userRoles.filter((ur) => ur.user_id === userId).map((ur) => ur.role_id)
    const permissionIds = new Set(rolePermissions.filter((rp) => roleIds.includes(rp.role_id)).map((rp) => rp.permission_id))
    return permissions.filter((p) => permissionIds.has(p.id))
  }

  // ----- Permissions for roles -----
  function roleHasPermission(roleId, permissionId) {
    return rolePermissions.some((rp) => rp.role_id === roleId && rp.permission_id === permissionId)
  }

  async function toggleRolePermission(roleId, permissionId) {
    if (roleHasPermission(roleId, permissionId)) {
      await run(supabase.from('role_permissions').delete().eq('role_id', roleId).eq('permission_id', permissionId))
    } else {
      await run(supabase.from('role_permissions').insert({ role_id: roleId, permission_id: permissionId }))
    }
    refreshProfile() // our own permissions may have changed
  }

  function addPermission(event) {
    event.preventDefault()
    const key = newPermission.key.trim().toLowerCase()
    if (!/^[a-z0-9_.]+$/.test(key)) return setError('Permission keys use lowercase letters, numbers, dots, and underscores (e.g. photos.upload).')
    run(supabase.from('permissions').insert({ key, description: newPermission.description.trim() || null }))
    setNewPermission({ key: '', description: '' })
  }

  function addRole(event) {
    event.preventDefault()
    const name = newRole.trim().toLowerCase()
    if (!name) return
    run(supabase.from('roles').insert({ name }))
    setNewRole('')
  }

  // ----- Dashboard numbers -----
  const now = Date.now()
  const activeThisWeek = users.filter((u) => u.last_seen_at && now - new Date(u.last_seen_at) < 7 * DAY_MS).length
  const joinedThisMonth = users.filter((u) => now - new Date(u.created_at) < 30 * DAY_MS).length
  const recentlyActive = [...users]
    .filter((u) => u.last_seen_at)
    .sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at))
    .slice(0, 5)

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Admin</h1>
      </div>

      <div className="chips">
        {TABS.filter((t) => t.value !== 'feedback' || canManageFeedback).map((t) => (
          <button key={t.value} className={`chip ${tab === t.value ? 'chip-active' : ''}`} onClick={() => setTab(t.value)}>
            {t.label}
            {t.value === 'users' && ` (${users.length})`}
            {t.value === 'feedback' && stats.newReports > 0 && <span className="count-pill">{stats.newReports}</span>}
          </button>
        ))}
      </div>

      <ErrorMessage message={error} />

      {/* ---------- Dashboard ---------- */}
      {tab === 'dashboard' && (
        <div className="stack">
          <div className="stat-grid">
            <StatTile icon={Users} label="Users" value={users.length} />
            <StatTile icon={Activity} label="Active this week" value={activeThisWeek} hint="Opened the app in the last 7 days" />
            <StatTile icon={UserPlus} label="New this month" value={joinedThisMonth} hint="Joined in the last 30 days" />
            <StatTile icon={Layers} label="Projects" value={stats.projects} />
            {canManageFeedback && (
              <StatTile icon={Inbox} label="Open reports" value={stats.openReports} hint={`${stats.newReports} new`} />
            )}
          </div>

          <div className="card stack-sm">
            <h2>Recently active</h2>
            {recentlyActive.length === 0 && <p className="muted">No activity recorded yet.</p>}
            <ul className="person-list">
              {recentlyActive.map((u) => (
                <li key={u.id} className="person-row">
                  <span className="person-link">
                    <Avatar profile={u} size={34} />
                    <span className="person-names">
                      <strong>{u.display_name}</strong>
                      <small className="muted">@{u.username}</small>
                    </span>
                  </span>
                  <small className="muted">{timeAgo(u.last_seen_at)}</small>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ---------- Users ---------- */}
      {tab === 'users' && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Joined</th>
                <th>Last login</th>
                <th>Last active</th>
                {roles.map((r) => <th key={r.id}>{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const perms = permissionsOf(u.id)
                return (
                  <tr key={u.id}>
                    <td>
                      <span className="row admin-user">
                        <Avatar profile={u} size={30} />
                        <span className="person-names">
                          <strong>{u.display_name} <span className="muted">@{u.username}</span></strong>
                          {u.email && <small className="muted">{u.email}</small>}
                          <small className="muted" title={perms.map((p) => p.key).join(', ')}>
                            {perms.length ? `${perms.length} permission${perms.length === 1 ? '' : 's'}` : 'No extra permissions'}
                          </small>
                        </span>
                      </span>
                    </td>
                    <td className="muted nowrap">{shortDate(u.created_at)}</td>
                    <td className="muted nowrap" title={u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : ''}>
                      {u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : 'Never'}
                    </td>
                    <td className="muted nowrap" title={u.last_seen_at ? new Date(u.last_seen_at).toLocaleString() : ''}>
                      {u.last_seen_at ? timeAgo(u.last_seen_at) : 'Not yet'}
                    </td>
                    {roles.map((r) => (
                      <td key={r.id}>
                        <input
                          type="checkbox"
                          checked={hasRole(u.id, r.id)}
                          disabled={!canManageRoles}
                          onChange={() => toggleUserRole(u.id, r)}
                          aria-label={`${r.name} role for ${u.username}`}
                        />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Feedback ---------- */}
      {tab === 'feedback' && canManageFeedback && <FeedbackBoard onChange={load} />}

      {/* ---------- Roles & permissions ---------- */}
      {tab === 'permissions' && (
        <>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Permission</th>
                  {roles.map((r) => <th key={r.id}>{r.name}</th>)}
                  {canManageRoles && <th />}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr key={perm.id}>
                    <td>
                      <code>{perm.key}</code>
                      {perm.description && <div className="muted small">{perm.description}</div>}
                    </td>
                    {roles.map((r) => (
                      <td key={r.id}>
                        <input
                          type="checkbox"
                          checked={roleHasPermission(r.id, perm.id)}
                          disabled={!canManageRoles}
                          onChange={() => toggleRolePermission(r.id, perm.id)}
                          aria-label={`${perm.key} for ${r.name}`}
                        />
                      </td>
                    ))}
                    {canManageRoles && (
                      <td>
                        <button
                          className="icon-btn"
                          aria-label={`Delete ${perm.key}`}
                          onClick={() => window.confirm(`Delete permission "${perm.key}"?`) && run(supabase.from('permissions').delete().eq('id', perm.id))}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canManageRoles && (
            <div className="admin-forms">
              <form onSubmit={addPermission} className="card stack">
                <h2>New permission</h2>
                <label className="field">
                  <span>Key</span>
                  <input required placeholder="e.g. photos.upload" value={newPermission.key} onChange={(e) => setNewPermission({ ...newPermission, key: e.target.value })} />
                </label>
                <label className="field">
                  <span>Description</span>
                  <input value={newPermission.description} onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })} />
                </label>
                <button className="btn btn-primary"><Plus size={16} /> Add permission</button>
              </form>
              <form onSubmit={addRole} className="card stack">
                <h2>New role</h2>
                <label className="field">
                  <span>Name</span>
                  <input required placeholder="e.g. moderator" value={newRole} onChange={(e) => setNewRole(e.target.value)} />
                </label>
                <button className="btn btn-primary"><Plus size={16} /> Add role</button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
