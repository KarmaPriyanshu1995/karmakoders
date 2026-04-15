import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import SectionHeader from '../components/ui/SectionHeader'
import ContactCTA from '../components/home/ContactCTA'
import { FiArrowRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'

const milestones = [
  {
    year: '2019',
    title: 'The Beginning',
    desc: 'Karmakoders was founded by two engineers with a mission to build world-class digital products for the Indian startup ecosystem.',
  },
  {
    year: '2020',
    title: 'First 10 Clients',
    desc: 'Despite the pandemic, we doubled down — delivering 15 projects remotely and growing our team to 5 full-stack engineers.',
  },
  {
    year: '2021',
    title: 'Going Global',
    desc: 'Expanded services internationally, working with clients in the US, UK, and UAE. Launched our first blockchain product on Ethereum.',
  },
  {
    year: '2022',
    title: 'AI Division',
    desc: 'Established our dedicated AI/ML division, delivering production-grade machine learning systems for enterprise clients.',
  },
  {
    year: '2023',
    title: 'Team of 15',
    desc: 'Scaled to 15 full-time engineers, designers, and strategists. Crossed 75 projects delivered, ₹5Cr+ in client revenue generated.',
  },
  {
    year: '2024',
    title: 'Industry Recognition',
    desc: 'Featured in top tech publications. Named one of the fastest-growing dev agencies in India. 100+ projects milestone crossed.',
  },
]

const values = [
  {
    emoji: '🎯',
    title: 'Excellence First',
    desc: 'We never ship something we\'re not proud of. Quality is non-negotiable at every layer of the stack.',
  },
  {
    emoji: '🤝',
    title: 'Partnership Mindset',
    desc: 'We treat your product like our own startup. Your success is our success, always.',
  },
  {
    emoji: '🔬',
    title: 'Innovation Driven',
    desc: 'We stay ahead of the curve — constantly learning, experimenting, and adopting better tools and patterns.',
  },
  {
    emoji: '⚡',
    title: 'Speed with Care',
    desc: 'We move fast but never at the cost of stability, security, or user experience.',
  },
]

function TimelineItem({ item, index }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 })
  const isLeft = index % 2 === 0

  return (
    <div ref={ref} className={`flex items-start gap-4 md:gap-8 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="flex-1 glass-card p-6"
      >
        <div className="tag-pill mb-3">{item.year}</div>
        <h3 className="text-white font-display font-bold text-xl mb-2">{item.title}</h3>
        <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
      </motion.div>

      {/* Center line */}
      <div className="hidden md:flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="w-4 h-4 rounded-full border-2 border-brand-500 mt-4"
          style={{ background: '#5b60fa', boxShadow: '0 0 12px rgba(91,96,250,0.6)' }}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1 hidden md:block" />
    </div>
  )
}

export default function About() {
  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-[0.05]"
            style={{ background: '#5b60fa' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl mx-auto text-center"
          >
            <span className="tag-pill mb-6 inline-flex">Our Story</span>
            <h1 className="font-display font-bold text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-6">
              We Are <span className="gradient-text">Karmakoders</span>
            </h1>
            <p className="text-white/50 text-xl leading-relaxed max-w-2xl mx-auto">
              A team of passionate engineers and designers on a mission to build digital products that matter. Since 2019, we've helped over 50 companies turn ideas into reality.
            </p>
          </motion.div>

          {/* Mission statement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 glass-card p-8 md:p-12 max-w-4xl mx-auto text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-5"
              style={{ background: 'linear-gradient(135deg, #5b60fa, #a855f7)' }} />
            <blockquote className="relative z-10">
              <p className="text-white/80 text-xl md:text-2xl font-display font-medium leading-relaxed italic">
                "We don't just write code — we build businesses. Every line we write is an act of creation, every product we ship is a story of transformation."
              </p>
              <footer className="mt-4 text-white/40 text-sm">— Priyanshu Singh, CEO & Founder</footer>
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            tag="Our DNA"
            title='Values That <span class="gradient-text">Drive Us</span>'
            subtitle="These aren't just words on a wall — they shape how we work, hire, and ship."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((val, i) => (
              <motion.div
                key={val.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="glass-card p-6 text-center hover:border-white/15 transition-all duration-300"
              >
                <div className="text-3xl mb-4">{val.emoji}</div>
                <h3 className="text-white font-display font-semibold mb-2">{val.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{val.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            tag="Our Journey"
            title='The <span class="gradient-text">Timeline</span>'
            subtitle="From a two-person founding team to a full-scale digital product studio."
          />

          {/* Vertical line */}
          <div className="relative">
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
              style={{ background: 'linear-gradient(to bottom, transparent, rgba(91,96,250,0.3), transparent)' }} />

            <div className="flex flex-col gap-8">
              {milestones.map((item, i) => (
                <TimelineItem key={item.year} item={item} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team intro */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto mb-12"
          >
            <span className="tag-pill mb-4 inline-flex">The People</span>
            <h2 className="font-display font-bold text-4xl text-white mb-4">
              Built by <span className="gradient-text">Builders</span>
            </h2>
            <p className="text-white/50">
              Our team of 15+ engineers, designers, and strategists brings deep expertise across every technology stack we offer.
            </p>
          </motion.div>
          <Link to="/contact" className="btn-glow px-8 py-4 text-white font-semibold inline-flex items-center gap-2 group">
            Work With Us
            <FiArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      <ContactCTA />
    </div>
  )
}
