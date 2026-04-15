import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import SectionHeader from '../ui/SectionHeader'

const stats = [
  { value: 100, suffix: '+', label: 'Projects Delivered', desc: 'Across web, mobile, AI & blockchain' },
  { value: 50, suffix: '+', label: 'Happy Clients', desc: 'From startups to enterprises globally' },
  { value: 5, suffix: '+', label: 'Years Experience', desc: 'Building digital products since 2019' },
  { value: 99, suffix: '%', label: 'Client Retention', desc: 'Clients who come back for more' },
  { value: 15, suffix: '+', label: 'Team Members', desc: 'Expert engineers & designers' },
  { value: 24, suffix: '/7', label: 'Support', desc: 'Always available when you need us' },
]

function AnimatedCounter({ value, suffix, duration = 2000 }) {
  const [count, setCount] = useState(0)
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.5 })
  const startTime = useRef(null)

  useEffect(() => {
    if (!inView) return
    startTime.current = null
    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(animate)
    }
    const id = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(id)
  }, [inView, value, duration])

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  )
}

export default function Stats() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" id="why-us">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(91,96,250,0.05) 0%, transparent 100%)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Why Choose Us"
          title='Numbers That <span class="gradient-text">Speak</span>'
          subtitle="We let our work do the talking. Here's what we've built and delivered."
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-card p-6 text-center group hover:border-brand-500/30 transition-all duration-300"
            >
              <div className="text-4xl md:text-5xl font-display font-bold gradient-text mb-2">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-white font-semibold text-sm mb-1">{stat.label}</div>
              <div className="text-white/40 text-xs leading-relaxed">{stat.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Why choose us features */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { emoji: '⚡', title: 'Fast Delivery', desc: 'We ship MVPs in 4–8 weeks with agile sprints' },
            { emoji: '🔒', title: 'Secure by Default', desc: 'Security-first architecture in every build' },
            { emoji: '📈', title: 'Built to Scale', desc: 'Cloud-native infrastructure from day one' },
            { emoji: '🤝', title: 'Transparent', desc: 'Daily updates, weekly calls, no surprises' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              className="p-5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-2xl mb-3">{item.emoji}</div>
              <div className="text-white font-semibold text-sm mb-1">{item.title}</div>
              <div className="text-white/40 text-xs leading-relaxed">{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
