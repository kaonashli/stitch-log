// Admin area (needs the 'admin.access' permission).
//   Users tab:       see every user and give/take roles
//   Permissions tab: which role has which permission, add new roles/permissions
//
// Hiding this page in the UI is just for convenience - the real protection is
// the database RLS policies, which check has_permission() on every request.
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { formatDate, toLocalDateString } from '../lib/dates.js'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import Spinner from '../components/Spinner.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'

export default function AdminPage() {
  const { user, hasPermission, refreshProfile } = useAuth()
  const [tab, setTab] = useState('users')
  const [profiles, setProfiles] = useState([])
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [userRoles, setUserRoles] = useState([]) // [{ user_id, role_id }]
  const [rolePermissions, setRolePermissions] = useState([]) // [{ role_id, permission_id }]
  const [newPermission, setNewPermission] = useState({ key: '', description: '' })
  const [newRole, setNewRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canManageRoles = hasPermission('roles.manage')

  async function load() {
    const [p, r, perm, ur, rp] = await Promise.all([
      supabase.from('profiles').select('id, username, display_name, avatar_path, created_at').order('created_at'),
      supabase.from('roles').select('*').order('id'),
      supabase.from('permissions').select('*').order('key'),
      supabase.from('user_roles').select('*'),
      supabase.from('role_permissions').select('*'),
    ])
    const failed = [p, r, perm, ur, rp].find((res) => res.error)
    if (failed) setError(failed.error.message)
    setProfiles(p.data ?? [])
    setRoles(r.data ?? [])
    setPermissions(perm.data ?? [])
    setUserRoles(ur.data ?? [])
    setRolePermissions(rp.data ?? [])
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

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Admin</h1>
      </div>

      <div className="chips">
        <button className={`chip ${tab === 'users' ? 'chip-active' : ''}`} onClick={() => setTab('users')}>Users ({profiles.length})</button>
        <button className={`chip ${tab === 'permissions' ? 'chip-active' : ''}`} onClick={() => setTab('permissions')}>Roles &amp; permissions</button>
      </div>

      <ErrorMessage message={error} />

      {tab === 'users' && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Joined</th>
                {roles.map((r) => <th key={r.id}>{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="row">
                      <Avatar profile={p} size={28} />
                      <span>{p.display_name} <span className="muted">@{p.username}</span></span>
                    </span>
                  </td>
                  <td className="muted">{formatDate(toLocalDateString(new Date(p.created_at)))}</td>
                  {roles.map((r) => (
                    <td key={r.id}>
                      <input
                        type="checkbox"
                        checked={hasRole(p.id, r.id)}
                        disabled={!canManageRoles}
                        onChange={() => toggleUserRole(p.id, r)}
                        aria-label={`${r.name} role for ${p.username}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
