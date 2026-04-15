import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiSend, FiPhone, FiMail, FiMapPin, FiCheck } from 'react-icons/fi'
import { FiTwitter, FiLinkedin, FiGithub, FiInstagram } from 'react-icons/fi'

const services = [
  'Web Development',
  'Mobile App',
  'AI & ML',
  'Blockchain',
  'SaaS Development',
  'UI/UX Design',
  'Other',
]

const budgets = [
  'Under ₹1 Lakh',
  '₹1L – ₹5L',
  '₹5L – ₹15L',
  '₹15L – ₹50L',
  '₹50L+',
]

const contactInfo = [
  {
    icon: FiPhone,
    label: 'Phone',
    value: '+91 7627056875',
    href: 'tel:7627056875',
    color: '#00d4ff',
  },
  {
    icon: FiMail,
    label: 'Email',
    value: 'karmakoders@gmail.com',
    href: 'mailto:karmakoders@gmail.com',
    color: '#5b60fa',
  },
  {
    icon: FiMapPin,
    label: 'Location',
    value: 'India · Remote Worldwide',
    href: null,
    color: '#a855f7',
  },
]

export default function Contact() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    service: '', budget: '', message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1500)
  }

  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-[0.05]"
          style={{ background: '#5b60fa' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="tag-pill mb-6 inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Open for Projects
            </span>
            <h1 className="font-display font-bold text-5xl md:text-6xl text-white leading-tight mb-6">
              Let's Build Something
              <br />
              <span className="gradient-text">Amazing Together</span>
            </h1>
            <p className="text-white/50 text-xl max-w-xl mx-auto leading-relaxed">
              Tell us about your project and we'll get back to you within 24 hours with a detailed proposal.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main content */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact info */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="font-display font-bold text-2xl text-white mb-2">Get in Touch</h2>
                <p className="text-white/40 text-sm leading-relaxed">
                  We respond to every inquiry within 24 hours. For urgent projects, call us directly.
                </p>
              </motion.div>

              <div className="space-y-4">
                {contactInfo.map(({ icon: Icon, label, value, href, color }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 * i }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                      <Icon size={17} style={{ color }} />
                    </div>
                    <div>
                      <p className="text-white/30 text-xs mb-1">{label}</p>
                      {href ? (
                        <a href={href} className="text-white font-medium text-sm hover:text-brand-400 transition-colors">
                          {value}
                        </a>
                      ) : (
                        <p className="text-white font-medium text-sm">{value}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Socials */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="pt-4"
              >
                <p className="text-white/30 text-xs mb-3 uppercase tracking-widest">Follow Us</p>
                <div className="flex gap-3">
                  {[FiTwitter, FiLinkedin, FiGithub, FiInstagram].map((Icon, i) => (
                    <a key={i} href="#"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-all duration-300 hover:scale-110"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Icon size={15} />
                    </a>
                  ))}
                </div>
              </motion.div>

              {/* Why us */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-card p-5 space-y-3 mt-4"
              >
                <p className="text-white/40 text-xs uppercase tracking-widest mb-3">What to Expect</p>
                {[
                  'Response within 24 hours',
                  'Free consultation call',
                  'Detailed project proposal',
                  'Transparent pricing',
                  'NDA on request',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-white/60 text-sm">
                    <FiCheck size={13} className="text-brand-400 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-2"
            >
              {submitted ? (
                <div className="glass-card p-12 text-center h-full flex flex-col items-center justify-center gap-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #5b60fa, #a855f7)' }}
                  >
                    <FiCheck size={32} className="text-white" />
                  </motion.div>
                  <div>
                    <h3 className="font-display font-bold text-2xl text-white mb-2">Message Sent!</h3>
                    <p className="text-white/50 text-sm">
                      Thanks for reaching out. We'll review your project and get back to you within 24 hours.
                    </p>
                  </div>
                  <button
                    onClick={() => { setSubmitted(false); setForm({ name:'',email:'',phone:'',company:'',service:'',budget:'',message:'' }) }}
                    className="btn-outline px-6 py-2.5 text-sm text-white font-medium"
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[
                      { name: 'name', label: 'Full Name', placeholder: 'Your name', required: true },
                      { name: 'email', label: 'Email', placeholder: 'you@company.com', type: 'email', required: true },
                      { name: 'phone', label: 'Phone', placeholder: '+91 XXXXX XXXXX' },
                      { name: 'company', label: 'Company', placeholder: 'Your company' },
                    ].map(field => (
                      <div key={field.name}>
                        <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">{field.label}</label>
                        <input
                          type={field.type || 'text'}
                          name={field.name}
                          value={form[field.name]}
                          onChange={handleChange}
                          placeholder={field.placeholder}
                          required={field.required}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all duration-200 focus:ring-1 focus:ring-brand-500/50"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">Service Needed</label>
                      <select
                        name="service"
                        value={form.service}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all duration-200 focus:ring-1 focus:ring-brand-500/50"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <option value="" style={{ background: '#0a1628' }}>Select service...</option>
                        {services.map(s => (
                          <option key={s} value={s} style={{ background: '#0a1628' }}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">Budget Range</label>
                      <select
                        name="budget"
                        value={form.budget}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all duration-200 focus:ring-1 focus:ring-brand-500/50"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <option value="" style={{ background: '#0a1628' }}>Select budget...</option>
                        {budgets.map(b => (
                          <option key={b} value={b} style={{ background: '#0a1628' }}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/50 text-xs mb-2 uppercase tracking-wider">Project Details</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Tell us about your project — what are you building, what problem does it solve, and what's your timeline?"
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all duration-200 focus:ring-1 focus:ring-brand-500/50 resize-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-glow w-full py-4 text-base text-white font-semibold flex items-center justify-center gap-2 group disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message
                        <FiSend size={16} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-white/25 text-xs">
                    By submitting, you agree to our privacy policy. We never share your data.
                  </p>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl overflow-hidden h-72 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(91,96,250,0.1), rgba(168,85,247,0.1))',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <FiMapPin size={32} className="text-brand-400" />
              <p className="text-white/50 text-sm">India · Remote Worldwide</p>
              <p className="text-white/25 text-xs">Available for on-site work anywhere in the world</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
