import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import CustomCursor from './components/layout/CustomCursor'
import Loader from './components/layout/Loader'
import Home from './pages/Home'
import About from './pages/About'
import ServicesPage from './pages/Services'
import PortfolioPage from './pages/Portfolio'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'

export default function App() {
  const [loading, setLoading] = useState(true)

  const handleLoaded = useCallback(() => {
    setLoading(false)
  }, [])

  return (
    <>
      <CustomCursor />
      {loading && <Loader onComplete={handleLoaded} />}
      {!loading && (
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </Layout>
      )}
    </>
  )
}
