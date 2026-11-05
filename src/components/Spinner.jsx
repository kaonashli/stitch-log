// A CSS loading spinner. fullPage centers it on the screen.
export default function Spinner({ fullPage = false }) {
  const spinner = <span className="spinner" role="status" aria-label="Loading" />
  return fullPage ? <div className="spinner-page">{spinner}</div> : spinner
}
