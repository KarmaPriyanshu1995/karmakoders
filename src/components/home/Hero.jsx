import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiPlay } from 'react-icons/fi'
import {
  SiReact, SiNodedotjs, SiPython, SiFlutter,
} from 'react-icons/si'
import { TbBrain, TbCube3dSphere } from 'react-icons/tb'

/* ── Animated words ── */
const words = ['Scalable', 'High-Performance', 'Future-Ready', 'AI-Powered']

function AnimatedWord() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % words.length), 2500)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="relative inline-block overflow-hidden h-[1.2em] align-bottom">
      <motion.span
        key={index}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        exit={{ y: '-100%', opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="block gradient-text"
      >
        {words[index]}
      </motion.span>
    </span>
  )
}

/* ── Floating tech icons ── */
const floatingIcons = [
  { Icon: SiReact, label: 'React', color: '#61dafb', x: '8%', y: '25%', delay: 0 },
  { Icon: SiNodedotjs, label: 'Node.js', color: '#68a063', x: '88%', y: '20%', delay: 0.8 },
  { Icon: SiPython, label: 'Python', color: '#f7d44c', x: '5%', y: '68%', delay: 1.6 },
  { Icon: SiFlutter, label: 'Flutter', color: '#54c5f8', x: '90%', y: '65%', delay: 0.4 },
  { Icon: TbBrain, label: 'AI', color: '#a855f7', x: '80%', y: '45%', delay: 1.2 },
  { Icon: TbCube3dSphere, label: 'Blockchain', color: '#f59e0b', x: '15%', y: '45%', delay: 2.0 },
]

/* ── Canvas particle background ── */
function ParticleCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight
    let animId

    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(91,96,250,${p.alpha})`
        ctx.fill()
      })
      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(91,96,250,${0.06 * (1 - dist / 100)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }

    draw()
    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  )
}

/* ── Main Hero ── */
export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #030711 0%, #0a1628 40%, #1a0a3e 70%, #030711 100%)' }}>

      {/* Particle canvas */}
      <ParticleCanvas />

      {/* Gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="orb w-[600px] h-[600px] -top-40 -left-40 opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #5b60fa 0%, transparent 70%)' }} />
        <div className="orb w-[500px] h-[500px] -bottom-40 -right-40 opacity-[0.10]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)', animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full blur-3xl opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #00d4ff 0%, transparent 70%)' }} />
      </div>

      {/* Floating tech icons */}
      {floatingIcons.map(({ Icon, label, color, x, y, delay }) => (
        <motion.div
          key={label}
          className="absolute hidden lg:flex flex-col items-center gap-1.5"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 1.2, duration: 0.5, ease: 'easeOut' }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut' }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center glass-card"
          >
            <Icon size={22} style={{ color }} />
          </motion.div>
          <span className="text-xs text-white/30 font-medium">{label}</span>
        </motion.div>
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 mb-8"
        >
          <span className="tag-pill">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Now Accepting New Projects for 2025
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] text-white mb-6"
        >
          We Build{' '}
          <br className="hidden sm:block" />
          <AnimatedWord />
          <br className="hidden sm:block" />
          Digital Products
        </motion.h1>

        {/* Sub heading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="text-white/50 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          From idea to execution — we engineer high-performance apps and systems
          that scale with your ambitions.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link
            to="/contact"
            className="btn-glow px-8 py-4 text-base text-white font-semibold flex items-center gap-2 group"
          >
            Start a Project
            <FiArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/portfolio"
            className="btn-outline px-8 py-4 text-base text-white font-semibold flex items-center gap-2 group"
          >
            <FiPlay size={16} className="text-brand-400" />
            View Our Work
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-white/10"
        >
          {[
            { value: '100+', label: 'Projects Delivered' },
            { value: '50+', label: 'Happy Clients' },
            { value: '5+', label: 'Years Experience' },
            { value: '99%', label: 'Client Retention' },
          ].map(({ value, label }) => (
            <div key={label} className="px-8 py-3 text-center">
              <div className="text-2xl font-bold gradient-text font-display">{value}</div>
              <div className="text-white/40 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-white/25 text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent"
        />
      </motion.div>
    </section>
  )
}
