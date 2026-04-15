import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiMail, FiPhone } from 'react-icons/fi'

export default function ContactCTA() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl overflow-hidden text-center p-12 md:p-20"
          style={{
            background: 'linear-gradient(135deg, rgba(91,96,250,0.15) 0%, rgba(168,85,247,0.15) 50%, rgba(91,96,250,0.10) 100%)',
            border: '1px solid rgba(91,96,250,0.2)',
          }}
        >
          {/* Background effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-20"
              style={{ background: '#5b60fa' }} />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-15"
              style={{ background: '#a855f7' }} />
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />
          </div>

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex mb-6"
            >
              <span className="tag-pill">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Available for New Projects
              </span>
            </motion.div>

            <h2 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-white mb-6 leading-tight">
              Let's Build Something
              <br />
              <span className="gradient-text">Amazing Together</span>
            </h2>

            <p className="text-white/50 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Whether you have an idea, a problem to solve, or a product to scale — we're ready to make it happen.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link
                to="/contact"
                className="btn-glow px-8 py-4 text-base text-white font-semibold flex items-center gap-2 group"
              >
                Start a Project
                <FiArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="mailto:karmakoders@gmail.com"
                className="btn-outline px-8 py-4 text-base text-white font-semibold flex items-center gap-2"
              >
                <FiMail size={16} />
                Send an Email
              </a>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-white/40 text-sm">
              <a href="tel:7627056875" className="flex items-center gap-2 hover:text-white transition-colors">
                <FiPhone size={14} className="text-brand-400" />
                +91 7627056875
              </a>
              <span className="hidden sm:block w-px h-4 bg-white/20" />
              <a href="mailto:karmakoders@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <FiMail size={14} className="text-brand-400" />
                karmakoders@gmail.com
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
