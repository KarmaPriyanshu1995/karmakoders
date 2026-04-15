import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiTwitter, FiGithub, FiLinkedin, FiInstagram, FiArrowUpRight } from 'react-icons/fi'
import { MdEmail, MdPhone } from 'react-icons/md'

const footerLinks = {
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Services', href: '/services' },
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'Contact', href: '/contact' },
  ],
  Services: [
    { label: 'Web Development', href: '/services' },
    { label: 'Mobile Apps', href: '/services' },
    { label: 'AI & ML', href: '/services' },
    { label: 'Blockchain', href: '/services' },
    { label: 'SaaS Development', href: '/services' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/privacy' },
  ],
}

const socials = [
  { icon: FiTwitter, href: '#', label: 'Twitter' },
  { icon: FiGithub, href: '#', label: 'GitHub' },
  { icon: FiLinkedin, href: '#', label: 'LinkedIn' },
  { icon: FiInstagram, href: '#', label: 'Instagram' },
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06]" style={{ background: '#060d1f' }}>
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-5 pointer-events-none"
        style={{ background: '#5b60fa' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #5b60fa, #a855f7)' }}>
                <span className="text-white font-bold text-base font-display">K</span>
              </div>
              <span className="text-white font-display font-bold text-lg">
                Karma<span className="gradient-text">koders</span>
              </span>
            </Link>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs mb-6">
              Code That Builds the Future. We engineer high-performance digital products for ambitious startups and enterprises.
            </p>
            <div className="flex flex-col gap-2 mb-6">
              <a href="tel:7627056875" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
                <MdPhone size={14} className="text-brand-500" />
                +91 7627056875
              </a>
              <a href="mailto:karmakoders@gmail.com" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
                <MdEmail size={14} className="text-brand-500" />
                karmakoders@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-3">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-all duration-300 hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white font-semibold text-sm mb-4 tracking-wide">{title}</h4>
              <ul className="flex flex-col gap-2">
                {links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-white/40 hover:text-white text-sm transition-colors duration-200 flex items-center gap-1 group"
                    >
                      {link.label}
                      <FiArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} Karmakoders. All rights reserved.
          </p>
          <p className="text-white/20 text-xs">
            Crafted with ❤️ for the future
          </p>
        </div>
      </div>
    </footer>
  )
}
