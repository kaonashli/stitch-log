// Light / dark mode. The actual colors live in index.css under
// [data-theme="light"] and [data-theme="dark"]. This just flips that attribute
// on <html> and remembers the choice in localStorage.
import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  // index.html already picked a starting theme before React loaded
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'light')

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    // Match the phone's status bar color to the top bar (same values as index.html)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.content = next === 'dark' ? '#221e1c' : '#ffffff'
    try { localStorage.setItem('theme', next) } catch { /* private mode: just don't remember */ }
    setTheme(next)
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
