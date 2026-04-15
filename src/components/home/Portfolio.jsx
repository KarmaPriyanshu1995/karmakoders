import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FiArrowUpRight, FiGithub } from 'react-icons/fi'
import SectionHeader from '../ui/SectionHeader'
import { Link } from 'react-router-dom'

const filters = ['All', 'Web', 'Mobile', 'AI', 'Blockchain']

const projects = [
  {
    id: 1,
    title: 'NeoBank Dashboard',
    category: 'Web',
    tags: ['React', 'Node.js', 'PostgreSQL'],
    description: 'A next-generation fintech dashboard with real-time analytics, multi-currency support, and AI-powered fraud detection.',
    result: '3x user engagement, $2M+ in transactions processed',
    gradient: 'from-blue-600/20 to-cyan-600/20',
    accent: '#00d4ff',
    featured: true,
  },
  {
    id: 2,
    title: 'HealthPulse Mobile',
    category: 'Mobile',
    tags: ['React Native', 'Firebase', 'ML Kit'],
    description: 'A health & wellness app with AI symptom checker, appointment booking, and wearable device integration.',
    result: '50K+ downloads, 4.8★ App Store rating',
    gradient: 'from-purple-600/20 to-pink-600/20',
    accent: '#a855f7',
  },
  {
    id: 3,
    title: 'AetherAI Platform',
    category: 'AI',
    tags: ['Python', 'LangChain', 'OpenAI', 'React'],
    description: 'An enterprise AI platform for automated document processing, knowledge management, and intelligent Q&A.',
    result: '80% reduction in manual document processing time',
    gradient: 'from-violet-600/20 to-indigo-600/20',
    accent: '#8b5cf6',
  },
  {
    id: 4,
    title: 'ChainMart NFT Marketplace',
    category: 'Blockchain',
    tags: ['Solidity', 'Ethereum', 'Next.js', 'IPFS'],
    description: 'A premium NFT marketplace with lazy minting, royalty management, and cross-chain bridge capabilities.',
    result: '10K+ NFTs minted, $500K+ trading volume',
    gradient: 'from-amber-600/20 to-orange-600/20',
    accent: '#f59e0b',
  },
  {
    id: 5,
    title: 'FlowSaaS CRM',
    category: 'Web',
    tags: ['Next.js', 'Prisma', 'Stripe', 'Redis'],
    description: 'A full-featured CRM SaaS platform with pipeline management, email automation, and AI-powered lead scoring.',
    result: '200+ paying customers, $15K MRR in 6 months',
    gradient: 'from-emerald-600/20 to-teal-600/20',
    accent: '#10b981',
  },
  {
    id: 6,
    title: 'RideX Cab App',
    category: 'Mobile',
    tags: ['Flutter', 'Google Maps', 'Node.js', 'Socket.io'],
    description: 'A full-stack ride-hailing application with real-time tracking, surge pricing, and driver management portal.',
    result: '1M+ rides completed across 3 cities',
    gradient: 'from-rose-600/20 to-pink-600/20',
    accent: '#f43f5e',
  },
]

function ProjectCard({ project, index }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className="group relative glass-card overflow-hidden transition-all duration-500 hover:border-white/15"
    >
      {/* Gradient bg */}
      <div className={`absolute inset-0 bg-gradient-to-br ${project.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      {/* Featured badge */}
      {project.featured && (
        <div className="absolute top-4 right-4 z-10 tag-pill">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: project.accent }} />
          Featured
        </div>
      )}

      <div className="relative z-10 p-6">
        {/* Category + accent line */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-px" style={{ background: project.accent }} />
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: project.accent }}>
            {project.category}
          </span>
        </div>

        <h3 className="text-white font-display font-bold text-xl mb-2">{project.title}</h3>
        <p className="text-white/50 text-sm leading-relaxed mb-4">{project.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-5">
          {project.tags.map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-lg text-xs text-white/50"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Result */}
        <div className="p-3 rounded-xl mb-5"
          style={{ background: `${project.accent}10`, border: `1px solid ${project.accent}20` }}>
          <p className="text-xs font-medium" style={{ color: project.accent }}>
            📈 {project.result}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link to="/portfolio"
            className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors group/link">
            View Case Study
            <FiArrowUpRight size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export default function Portfolio() {
  const [active, setActive] = useState('All')

  const filtered = active === 'All'
    ? projects
    : projects.filter(p => p.category === active)

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" id="portfolio">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/4 top-1/2 w-96 h-96 rounded-full blur-3xl opacity-[0.04]"
          style={{ background: '#00d4ff' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Our Work"
          title='Featured <span class="gradient-text">Projects</span>'
          subtitle="Real products, real results. A selection of our most impactful builds across industries."
        />

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                active === f
                  ? 'text-white shadow-glow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
              style={active === f ? {
                background: 'linear-gradient(135deg, #5b60fa, #a855f7)',
              } : {
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link to="/portfolio" className="btn-glow px-8 py-3.5 text-sm text-white font-medium inline-flex items-center gap-2 group">
            View All Projects
            <FiArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
