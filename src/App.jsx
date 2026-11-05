// All the app's pages (routes) in one place.
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Spinner from './components/Spinner.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import HomePage from './pages/HomePage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import ProjectFormPage from './pages/ProjectFormPage.jsx'
import ProjectDetailPage from './pages/ProjectDetailPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

// Only for logged-in users. Everyone else is sent to /login.
function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner fullPage />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

// Login / signup pages: if you're already logged in, go home instead.
function PublicOnly() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner fullPage />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<ProjectFormPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/u/:username" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
