import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
  MdPhoneIphone, MdWeb, MdMemory, MdLink, MdRocketLaunch,
} from 'react-icons/md'
import { FiCheck, FiArrowRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import SectionHeader from '../components/ui/SectionHeader'
import ContactCTA from '../components/home/ContactCTA'

const services = [
  {
    icon: MdPhoneIphone,
    color: '#00d4ff',
    gradient: 'from-cyan-500/20 to-blue-500/20',
    title: 'Mobile Development',
    tagline: 'Apps your users will love',
    description:
      'We build native and cross-platform mobile applications that combine beautiful UX with robust engineering. From concept to App Store — we handle everything.',
    features: [
      'React Native & Flutter development',
      'iOS & Android native apps',
      'App Store & Play Store submission',
      'Push notifications & offline support',
      'Payment gateway integration',
      'Real-time features with WebSockets',
      'Analytics & crash reporting',
      'Performance optimization',
    ],
    process: ['Discovery & Wireframing', 'UI/UX Design', 'Development', 'QA Testing', 'Launch & Support'],
  },
  {
    icon: MdWeb,
    color: '#5b60fa',
    gradient: 'from-indigo-500/20 to-violet-500/20',
    title: 'Web Development',
    tagline: 'Fast, beautiful, and conversion-optimized',
    description:
      'Full-stack web solutions that combine stunning design with rock-solid engineering. From marketing sites to complex SaaS platforms.',
    features: [
      'React, Next.js, Vue.js frontends',
      'Node.js, Python, Go backends',
      'RESTful & GraphQL APIs',
      'Database design & optimization',
      'Cloud deployment (AWS/GCP/Azure)',
      'CI/CD pipeline setup',
      'SEO optimization',
      'Performance & Core Web Vitals',
    ],
    process: ['Planning & Architecture', 'Design System', 'Frontend & Backend', 'Testing & QA', 'Deployment'],
  },
  {
    icon: MdMemory,
    color: '#a855f7',
    gradient: 'from-purple-500/20 to-pink-500/20',
    title: 'AI & Machine Learning',
    tagline: 'Intelligence that drives results',
    description:
      'Production-grade AI systems that solve real problems. From LLM integrations to custom ML models trained on your data.',
    features: [
      'LLM & ChatGPT integrations',
      'Custom ML model training',
      'Computer vision solutions',
      'NLP & text analysis',
      'Recommendation engines',
      'Predictive analytics',
      'AI chatbot development',
      'MLOps & model deployment',
    ],
    process: ['Data Analysis', 'Model Selection', 'Training & Evaluation', 'Integration', 'Monitoring'],
  },
  {
    icon: MdLink,
    color: '#f59e0b',
    gradient: 'from-amber-500/20 to-orange-500/20',
    title: 'Blockchain Development',
    tagline: 'Decentralized for a trustless world',
    description:
      'Smart contracts, DeFi protocols, and Web3 applications built with security and scalability at the forefront.',
    features: [
      'Smart contract development',
      'DeFi protocol engineering',
      'NFT & marketplace platforms',
      'Token creation & tokenomics',
      'Web3 wallet integration',
      'Smart contract auditing',
      'Cross-chain bridge development',
      'DAO governance systems',
    ],
    process: ['Tokenomics Design', 'Smart Contract Dev', 'Security Audit', 'Frontend dApp', 'Mainnet Launch'],
  },
  {
    icon: MdRocketLaunch,
    color: '#ec4899',
    gradient: 'from-rose-500/20 to-pink-500/20',
    title: 'SaaS Development',
    tagline: 'From zero to recurring revenue',
    description:
      'End-to-end SaaS product development — multi-tenant architecture, billing, onboarding, and everything in between.',
    features: [
      'Multi-tenant architecture',
      'Subscription billing (Stripe)',
      'Admin & user dashboards',
      'Onboarding flows',
      'Feature flagging & A/B testing',
      'Email & notification systems',
      'API rate limiting & security',
      'Analytics & reporting',
    ],
    process: ['Product Strategy', 'Architecture Design', 'Core Feature Build', 'Billing & Auth', 'Growth Setup'],
  },
]

function ServiceSection({ service, index }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })
  const Icon = service.icon
  const isReverse = index % 2 !== 0

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7 }}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-start py-16 border-b border-white/[0.06] ${
        isReverse ? 'lg:flex lg:flex-row-reverse' : ''
      }`}
    >
      {/* Content */}
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center`}
            style={{ border: `1px solid ${service.color}30` }}>
            <Icon size={26} style={{ color: service.color }} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: service.color }}>
              Service
            </p>
            <h2 className="text-white font-display font-bold text-2xl md:text-3xl">{service.title}</h2>
          </div>
        </div>
        <p className="text-xl font-display font-medium text-white/80 mb-4">{service.tagline}</p>
        <p className="text-white/50 leading-relaxed mb-8">{service.description}</p>

        {/* Process */}
        <div>
          <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Our Process</p>
          <div className="flex flex-wrap gap-2">
            {service.process.map((step, i) => (
              <span key={step} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-white/30">{String(i + 1).padStart(2, '0')}</span>
                {step}
              </span>
            ))}
          </div>
        </div>

        <Link to="/contact"
          className="btn-glow mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm text-white font-medium group">
          Get a Quote
          <FiArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Features */}
      <div className="glass-card p-6 lg:p-8">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-5">What's Included</p>
        <ul className="grid grid-cols-1 gap-3">
          {service.features.map(feature => (
            <li key={feature} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${service.color}20`, border: `1px solid ${service.color}40` }}>
                <FiCheck size={10} style={{ color: service.color }} />
              </div>
              <span className="text-white/60 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

export default function ServicesPage() {
  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-[0.05]"
          style={{ background: '#5b60fa' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="tag-pill mb-6 inline-flex">What We Build</span>
            <h1 className="font-display font-bold text-5xl md:text-6xl text-white leading-tight mb-6">
              Services Built for
              <br />
              <span className="gradient-text">Modern Businesses</span>
            </h1>
            <p className="text-white/50 text-xl max-w-2xl mx-auto leading-relaxed">
              From mobile apps to AI systems — we deliver complete digital solutions that drive measurable business outcomes.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services list */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {services.map((service, i) => (
            <ServiceSection key={service.title} service={service} index={i} />
          ))}
        </div>
      </section>

      <ContactCTA />
    </div>
  )
}
