import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FiArrowUpRight, FiX } from 'react-icons/fi'
import SectionHeader from '../components/ui/SectionHeader'
import ContactCTA from '../components/home/ContactCTA'

const filters = ['All', 'Web', 'Mobile', 'AI', 'Blockchain', 'SaaS']

const projects = [
  {
    id: 1,
    title: 'NeoBank Dashboard',
    category: 'Web',
    tags: ['React', 'Node.js', 'PostgreSQL', 'Redis'],
    description: 'A next-generation fintech dashboard with real-time analytics, multi-currency support, and AI-powered fraud detection system.',
    challenge: 'The client needed a high-performance dashboard handling 100K+ daily transactions with sub-100ms latency.',
    solution: 'We built a microservices backend with Redis caching and a React frontend with virtual rendering for large datasets.',
    result: '3x user engagement, $2M+ in transactions processed, 99.9% uptime maintained.',
    gradient: 'from-blue-600/20 to-cyan-600/20',
    accent: '#00d4ff',
    featured: true,
    client: 'FinTrack Inc.',
    duration: '3 months',
  },
  {
    id: 2,
    title: 'HealthPulse Mobile',
    category: 'Mobile',
    tags: ['React Native', 'Firebase', 'ML Kit', 'Stripe'],
    description: 'A health & wellness platform with AI symptom checker, telemedicine appointments, and smart wearable integration.',
    challenge: 'Building a HIPAA-compliant mobile app with real-time doctor-patient communication and medical data security.',
    solution: 'React Native with end-to-end encryption, Firebase RTDB for real-time features, and ML Kit for on-device AI.',
    result: '50K+ downloads in 3 months, 4.8★ rating, ₹1.2Cr raised by client post-launch.',
    gradient: 'from-purple-600/20 to-pink-600/20',
    accent: '#a855f7',
    client: 'HealthSync Pvt. Ltd.',
    duration: '4 months',
  },
  {
    id: 3,
    title: 'AetherAI Platform',
    category: 'AI',
    tags: ['Python', 'LangChain', 'OpenAI', 'React', 'FastAPI'],
    description: 'Enterprise knowledge management platform with AI-powered document analysis, smart search, and automated Q&A generation.',
    challenge: 'Processing 10M+ document pages with semantic search across internal enterprise knowledge bases.',
    solution: 'RAG architecture with vector databases, fine-tuned embeddings, and a React interface with streaming responses.',
    result: '80% reduction in document search time, 95% accuracy on domain-specific Q&A tasks.',
    gradient: 'from-violet-600/20 to-indigo-600/20',
    accent: '#8b5cf6',
    client: 'AetherCorp',
    duration: '5 months',
  },
  {
    id: 4,
    title: 'ChainMart NFT Marketplace',
    category: 'Blockchain',
    tags: ['Solidity', 'Ethereum', 'Next.js', 'IPFS', 'Hardhat'],
    description: 'A premium NFT marketplace with lazy minting, on-chain royalties, creator analytics, and cross-chain compatibility.',
    challenge: 'Building a gas-efficient marketplace with complex royalty distribution and a seamless Web2-like UX for Web3.',
    solution: 'EIP-2981 royalty standard, lazy minting pattern, IPFS for metadata, and Next.js for SSR performance.',
    result: '10K+ NFTs minted, $500K+ trading volume in 6 months, 0 security vulnerabilities post-audit.',
    gradient: 'from-amber-600/20 to-orange-600/20',
    accent: '#f59e0b',
    client: 'ChainMart DAO',
    duration: '4 months',
  },
  {
    id: 5,
    title: 'FlowSaaS CRM',
    category: 'SaaS',
    tags: ['Next.js', 'Prisma', 'PostgreSQL', 'Stripe', 'Resend'],
    description: 'Full-featured CRM SaaS with visual pipeline management, email automation sequences, and AI-powered lead scoring.',
    challenge: 'Building a multi-tenant SaaS with complex permission systems, email automation, and real-time collaboration.',
    solution: 'Next.js App Router, Prisma with row-level security, Bull queues for email automation, and Stripe for billing.',
    result: '200+ paying customers, ₹12L MRR, 94% month-over-month retention rate.',
    gradient: 'from-emerald-600/20 to-teal-600/20',
    accent: '#10b981',
    client: 'FlowSaaS Inc.',
    duration: '6 months',
  },
  {
    id: 6,
    title: 'RideX Cab Platform',
    category: 'Mobile',
    tags: ['Flutter', 'Google Maps', 'Node.js', 'Socket.io', 'MongoDB'],
    description: 'Full-stack ride-hailing platform with real-time GPS tracking, dynamic surge pricing, and a driver management portal.',
    challenge: 'Handling concurrent ride matching for 500+ drivers with sub-second response times and live location updates.',
    solution: 'Flutter for cross-platform mobile, Socket.io for real-time tracking, geospatial queries on MongoDB Atlas.',
    result: '1M+ rides completed, expanded to 3 cities, 4.7★ average rating from both drivers and riders.',
    gradient: 'from-rose-600/20 to-pink-600/20',
    accent: '#f43f5e',
    client: 'RideX Technologies',
    duration: '5 months',
  },
  {
    id: 7,
    title: 'EduLearn LMS',
    category: 'Web',
    tags: ['React', 'Django', 'PostgreSQL', 'HLS Video', 'Stripe'],
    description: 'A comprehensive Learning Management System with video courses, live classes, certificate generation, and AI tutoring.',
    challenge: 'Delivering smooth 4K video streaming to 10K+ concurrent students with adaptive bitrate and DRM protection.',
    solution: 'HLS with CDN, video.js player, FFmpeg transcoding pipeline, and Django Channels for live class chat.',
    result: '25K+ enrolled students, ₹3Cr+ in course revenue, NPS score of 72.',
    gradient: 'from-sky-600/20 to-blue-600/20',
    accent: '#0ea5e9',
    client: 'EduLearn EdTech',
    duration: '4 months',
  },
  {
    id: 8,
    title: 'DeFi Yield Protocol',
    category: 'Blockchain',
    tags: ['Solidity', 'Compound', 'Uniswap V3', 'Hardhat', 'TheGraph'],
    description: 'An automated yield optimization protocol that dynamically allocates liquidity across DeFi protocols for maximum APY.',
    challenge: 'Building an autonomous vault system that maximizes yield while managing risk across volatile DeFi markets.',
    solution: 'Strategy contracts with Chainlink price feeds, multi-sig governance, and a comprehensive audit-ready codebase.',
    result: '$10M+ TVL at peak, audited by CertiK, 0 exploits, featured in DeFi Pulse.',
    gradient: 'from-yellow-600/20 to-amber-600/20',
    accent: '#eab308',
    client: 'YieldDAO',
    duration: '3 months',
  },
  {
    id: 9,
    title: 'LogiBot AI Assistant',
    category: 'AI',
    tags: ['Python', 'GPT-4', 'Pinecone', 'FastAPI', 'React'],
    description: 'An intelligent customer support AI that handles 10K+ daily queries with context-aware responses and human escalation.',
    challenge: 'Training a domain-specific AI assistant that maintains accurate, brand-aligned responses across support contexts.',
    solution: 'RAG with fine-tuned embeddings on 5 years of support history, confidence scoring, and seamless human handoff.',
    result: '97% query resolution rate, 65% reduction in support tickets, $200K/year in support cost savings.',
    gradient: 'from-lime-600/20 to-green-600/20',
    accent: '#84cc16',
    client: 'LogiBot AI',
    duration: '3 months',
  },
]

function ProjectCard({ project, index, onClick }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      onClick={() => onClick(project)}
      className="group relative glass-card overflow-hidden cursor-pointer hover:border-white/15 transition-all duration-500"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${project.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      {project.featured && (
        <div className="absolute top-4 right-4 z-10 tag-pill">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: project.accent }} />
          Featured
        </div>
      )}

      <div className="relative z-10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-px" style={{ background: project.accent }} />
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: project.accent }}>
            {project.category}
          </span>
        </div>

        <h3 className="text-white font-display font-bold text-xl mb-2">{project.title}</h3>
        <p className="text-white/50 text-sm leading-relaxed mb-4 line-clamp-2">{project.description}</p>

        <div className="flex flex-wrap gap-2 mb-5">
          {project.tags.slice(0, 4).map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-lg text-xs text-white/50"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {tag}
            </span>
          ))}
        </div>

        <div className="p-3 rounded-xl mb-5"
          style={{ background: `${project.accent}10`, border: `1px solid ${project.accent}20` }}>
          <p className="text-xs font-medium" style={{ color: project.accent }}>📈 {project.result}</p>
        </div>

        <div className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors group/link">
          View Case Study
          <FiArrowUpRight size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
        </div>
      </div>
    </motion.div>
  )
}

function Modal({ project, onClose }) {
  if (!project) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(3,7,17,0.8)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <FiX size={16} />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-px" style={{ background: project.accent }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: project.accent }}>{project.category}</span>
          </div>

          <h2 className="font-display font-bold text-3xl text-white mb-2">{project.title}</h2>
          <p className="text-white/40 text-sm mb-6">
            {project.client} · {project.duration}
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {project.tags.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-lg text-xs text-white/60"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {t}
              </span>
            ))}
          </div>

          <p className="text-white/60 text-sm leading-relaxed mb-6">{project.description}</p>

          <div className="space-y-4">
            {[
              { label: '🔴 Challenge', text: project.challenge },
              { label: '🟢 Solution', text: project.solution },
              { label: '📈 Result', text: project.result },
            ].map(({ label, text }) => (
              <div key={label} className="p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-white/30 text-xs mb-1 font-semibold">{label}</p>
                <p className="text-white/70 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function PortfolioPage() {
  const [active, setActive] = useState('All')
  const [selectedProject, setSelectedProject] = useState(null)

  const filtered = active === 'All' ? projects : projects.filter(p => p.category === active)

  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="tag-pill mb-6 inline-flex">Case Studies</span>
            <h1 className="font-display font-bold text-5xl md:text-6xl text-white leading-tight mb-6">
              Work That
              <br />
              <span className="gradient-text">Speaks for Itself</span>
            </h1>
            <p className="text-white/50 text-xl max-w-2xl mx-auto leading-relaxed">
              Real products built for real businesses. Click any project to see the full case study.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Portfolio grid */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setActive(f)}
                className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300"
                style={active === f ? {
                  background: 'linear-gradient(135deg, #5b60fa, #a855f7)',
                  color: '#fff',
                } : {
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)',
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
                <ProjectCard key={project.id} project={project} index={i} onClick={setSelectedProject} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <Modal project={selectedProject} onClose={() => setSelectedProject(null)} />
      <ContactCTA />
    </div>
  )
}
