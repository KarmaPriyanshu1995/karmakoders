import { motion } from 'framer-motion'
import {
  SiReact, SiNodedotjs, SiPython, SiFlutter, SiGo,
  SiLaravel, SiTailwindcss, SiTypescript, SiNextdotjs,
  SiPostgresql, SiMongodb, SiRedis,
  SiDocker, SiKubernetes, SiTensorflow, SiFirebase,
  SiGooglecloud,
} from 'react-icons/si'
import { FaJava, FaAws } from 'react-icons/fa'
import SectionHeader from '../ui/SectionHeader'

const techs = [
  { Icon: SiReact, name: 'React', color: '#61dafb' },
  { Icon: SiNextdotjs, name: 'Next.js', color: '#ffffff' },
  { Icon: SiNodedotjs, name: 'Node.js', color: '#68a063' },
  { Icon: SiTypescript, name: 'TypeScript', color: '#3178c6' },
  { Icon: SiPython, name: 'Python', color: '#f7d44c' },
  { Icon: SiGo, name: 'Golang', color: '#00aed8' },
  { Icon: FaJava, name: 'Java', color: '#e76f00' },
  { Icon: SiLaravel, name: 'Laravel', color: '#ff2d20' },
  { Icon: SiFlutter, name: 'Flutter', color: '#54c5f8' },
  { Icon: SiTailwindcss, name: 'Tailwind', color: '#38bdf8' },
  { Icon: SiPostgresql, name: 'PostgreSQL', color: '#336791' },
  { Icon: SiMongodb, name: 'MongoDB', color: '#47a248' },
  { Icon: SiRedis, name: 'Redis', color: '#ff4438' },
  { Icon: FaAws, name: 'AWS', color: '#ff9900' },
  { Icon: SiDocker, name: 'Docker', color: '#2496ed' },
  { Icon: SiKubernetes, name: 'Kubernetes', color: '#326de6' },
  { Icon: SiTensorflow, name: 'TensorFlow', color: '#ff6f00' },
  { Icon: SiFirebase, name: 'Firebase', color: '#ffca28' },
]

function TechItem({ Icon, name, color }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-2 px-6 py-4 glass-card mx-2 cursor-default"
      style={{ minWidth: 96 }}
    >
      <Icon size={28} style={{ color }} />
      <span className="text-white/50 text-xs font-medium whitespace-nowrap">{name}</span>
    </motion.div>
  )
}

function MarqueeRow({ items, reverse = false }) {
  const duplicated = [...items, ...items]
  return (
    <div className="relative flex overflow-hidden py-2">
      <motion.div
        animate={{ x: reverse ? ['0%', '50%'] : ['0%', '-50%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="flex"
      >
        {duplicated.map((tech, i) => (
          <TechItem key={`${tech.name}-${i}`} {...tech} />
        ))}
      </motion.div>
    </div>
  )
}

export default function TechStack() {
  const row1 = techs.slice(0, 9)
  const row2 = techs.slice(9)

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" id="tech">
      {/* Gradient overlay sides */}
      <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #030711, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #030711, transparent)' }} />

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-[0.04]"
          style={{ background: '#a855f7' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Our Arsenal"
          title='Technology <span class="gradient-text">Stack</span>'
          subtitle="We work with the best-in-class tools and frameworks to build products that last."
        />
      </div>

      <div className="space-y-4">
        <MarqueeRow items={row1} />
        <MarqueeRow items={row2} reverse />
      </div>
    </section>
  )
}
