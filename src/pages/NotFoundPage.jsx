import { Link } from 'react-router-dom'
import AuthCard from '../components/AuthCard.jsx'

export default function NotFoundPage() {
  return (
    <AuthCard title="Page not found" subtitle="This page dropped a stitch.">
      <Link to="/" className="btn btn-primary btn-block">Go home</Link>
    </AuthCard>
  )
}
