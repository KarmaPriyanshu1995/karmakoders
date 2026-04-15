import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { FiTwitter, FiLinkedin, FiGithub } from 'react-icons/fi'
import SectionHeader from '../ui/SectionHeader'

const team = [
  {
    name: 'Priyanshu Singh',
    role: 'CEO & Founder',
    bio: 'Visionary leader and full-stack architect driving Karmakoders\' mission to build world-class digital products.',
    gradient: 'from-blue-500 to-cyan-500',
    initials: 'PS',
    socials: { twitter: '#', linkedin: '#', github: '#' },
  },
  {
    name: 'Lucky',
    role: 'CTO',
    bio: 'Technical powerhouse overseeing architecture, engineering standards, and cutting-edge R&D across all platforms.',
    gradient: 'from-purple-500 to-pink-500',
    initials: 'LK',
    socials: { twitter: '#', linkedin: '#', github: '#' },
  },
  {
    name: 'Umesh',
    role: 'CFO',
    bio: 'Financial strategist ensuring sustainable growth, investor relations, and fiscal health of the company.',
    gradient: 'from-emerald-500 to-teal-500',
    initials: 'UM',
    socials: { twitter: '#', linkedin: '#', github: '#' },
  },
  {
    name: 'Adit',
    role: 'CMO',
    bio: 'Creative marketing mind behind Karmakoders\' brand, growth campaigns, and client acquisition strategy.',
    gradient: 'from-amber-500 to-orange-500',
    initials: 'AD',
    socials: { twitter: '#', linkedin: '#', github: '#' },
  },
]

function TeamCard({ member, index }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className="group glass-card p-6 text-center hover:border-white/15 transition-all duration-500"
    >
      {/* Avatar */}
      <div className="relative mx-auto w-20 h-20 mb-4">
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center`}>
          <span className="text-white font-display font-bold text-xl">{member.initials}</span>
        </div>
        {/* Online dot */}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2"
          style={{ borderColor: '#0a1628' }} />
      </div>

      <h3 className="text-white font-display font-semibold text-base mb-0.5">{member.name}</h3>
      <p className="text-brand-400 text-xs font-medium mb-3">{member.role}</p>
      <p className="text-white/40 text-xs leading-relaxed mb-5">{member.bio}</p>

      {/* Social links — reveal on hover */}
      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
        {member.socials.twitter && (
          <a href={member.socials.twitter}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <FiTwitter size={13} />
          </a>
        )}
        {member.socials.linkedin && (
          <a href={member.socials.linkedin}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <FiLinkedin size={13} />
          </a>
        )}
        {member.socials.github && (
          <a href={member.socials.github}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <FiGithub size={13} />
          </a>
        )}
      </div>
    </motion.div>
  )
}

export default function Team() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" id="team">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-1/4 bottom-1/4 w-72 h-72 rounded-full blur-3xl opacity-[0.04]"
          style={{ background: '#a855f7' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="The Team"
          title='Meet the <span class="gradient-text">Builders</span>'
          subtitle="A talented team of engineers, designers, and strategists dedicated to your success."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {team.map((member, i) => (
            <TeamCard key={member.name} member={member} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
