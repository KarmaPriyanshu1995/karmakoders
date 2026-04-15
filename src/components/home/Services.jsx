import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FiArrowRight, FiChevronDown } from 'react-icons/fi'
import {
  MdPhoneIphone, MdWeb, MdMemory, MdLink, MdRocketLaunch,
} from 'react-icons/md'
import SectionHeader from '../ui/SectionHeader'
import { Link } from 'react-router-dom'

const services = [
  {
    icon: MdPhoneIphone,
    color: '#00d4ff',
    title: 'Mobile Development',
    short: 'Native & cross-platform apps that users love.',
    description:
      'We craft pixel-perfect iOS and Android applications using React Native and Flutter. From MVP to production-grade apps, our mobile solutions are fast, reliable, and beautifully designed. We handle everything from architecture to App Store submission.',
    tech: ['React Native', 'Flutter', 'iOS', 'Android', 'Firebase'],
    link: '/services',
  },
  {
    icon: MdWeb,
    color: '#5b60fa',
    title: 'Web Development',
    short: 'Fast, secure, and stunning web experiences.',
    description:
      'Full-stack web solutions built with modern frameworks. We create everything from landing pages and SaaS dashboards to complex enterprise portals. Our stack includes React, Next.js, Node.js, and cloud-native architecture.',
    tech: ['React', 'Next.js', 'Node.js', 'TypeScript', 'AWS'],
    link: '/services',
  },
  {
    icon: MdMemory,
    color: '#a855f7',
    title: 'AI & Machine Learning',
    short: 'Intelligent systems that transform your business.',
    description:
      'From chatbots and recommendation engines to predictive analytics and computer vision — we build AI products that deliver real business value. We leverage LLMs, custom ML models, and cutting-edge AI frameworks.',
    tech: ['Python', 'TensorFlow', 'OpenAI', 'LangChain', 'PyTorch'],
    link: '/services',
  },
  {
    icon: MdLink,
    color: '#f59e0b',
    title: 'Blockchain',
    short: 'Decentralized solutions built for trust.',
    description:
      'Smart contracts, DeFi protocols, NFT platforms, and Web3 integrations. We\'ve built on Ethereum, Solana, and Polygon. Our blockchain engineers bring deep expertise in decentralized architecture and tokenomics.',
    tech: ['Solidity', 'Ethereum', 'Solana', 'Web3.js', 'Hardhat'],
    link: '/services',
  },
  {
    icon: MdRocketLaunch,
    color: '#ec4899',
    title: 'SaaS Development',
    short: 'End-to-end SaaS platforms built to scale.',
    description:
      'We help founders and enterprises build and launch SaaS products from scratch. Multi-tenant architecture, payment integrations, admin dashboards, onboarding flows — everything needed to go from zero to revenue.',
    tech: ['React', 'Node.js', 'Stripe', 'PostgreSQL', 'Redis'],
    link: '/services',
  },
]

function ServiceCard({ service, index, isOpen, onToggle }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })
  const Icon = service.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`glass-card overflow-hidden transition-all duration-500 cursor-pointer ${
        isOpen ? 'ring-1 ring-brand-500/30' : 'hover:border-white/15'
      }`}
      onClick={onToggle}
    >
      <div className="p-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${service.color}20`, border: `1px solid ${service.color}30` }}
          >
            <Icon size={22} style={{ color: service.color }} />
          </div>
          <div>
            <h3 className="text-white font-display font-semibold text-lg mb-1">{service.title}</h3>
            <p className="text-white/50 text-sm">{service.short}</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-white/30 flex-shrink-0 mt-1"
        >
          <FiChevronDown size={18} />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <div className="px-6 pb-6 border-t border-white/[0.06] pt-4">
              <p className="text-white/60 text-sm leading-relaxed mb-4">{service.description}</p>
              <div className="flex flex-wrap gap-2 mb-5">
                {service.tech.map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-medium text-white/60"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {t}
                  </span>
                ))}
              </div>
              <Link
                to={service.link}
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-brand-400 text-sm font-medium hover:gap-2.5 transition-all duration-200"
              >
                Learn More <FiArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Services() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i)

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" id="services">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-0 top-1/4 w-72 h-72 rounded-full blur-3xl opacity-5"
          style={{ background: '#5b60fa' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="What We Do"
          title='Our <span class="gradient-text">Services</span>'
          subtitle="From mobile to enterprise — we deliver complete digital solutions with a focus on quality, speed, and business impact."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {services.map((service, i) => (
            <ServiceCard
              key={service.title}
              service={service}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <Link to="/services" className="btn-outline px-8 py-3.5 text-sm text-white font-medium inline-flex items-center gap-2 group">
            View All Services
            <FiArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
