import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, Autoplay } from 'swiper/modules'
import { FiStar } from 'react-icons/fi'
import SectionHeader from '../ui/SectionHeader'
import 'swiper/css'
import 'swiper/css/pagination'

const testimonials = [
  {
    name: 'Rohan Gupta',
    role: 'Founder, FinTrack',
    text: "Karmakoders delivered our fintech dashboard in 6 weeks — on time, on budget, and exceeding every expectation. The quality of code and UX is world-class. I've worked with agencies in the US and UK, and these guys are better.",
    rating: 5,
    initials: 'RG',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Meera Iyer',
    role: 'CTO, HealthSync',
    text: "We needed a complex React Native app built from scratch. Karmakoders not only delivered a beautiful app but also helped us architect the backend for scale. The team is incredibly talented and communication is transparent throughout.",
    rating: 5,
    initials: 'MI',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Vikram Shah',
    role: 'CEO, CryptoVault',
    text: "Their blockchain expertise is unmatched. They built our DeFi protocol from scratch, conducted security audits, and shipped the product 2 weeks ahead of schedule. Our users love the interface. Highly recommend!",
    rating: 5,
    initials: 'VS',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    name: 'Aisha Khan',
    role: 'Product Manager, LogiBot',
    text: "The AI chatbot they built for us handles 10,000+ queries daily with 97% accuracy. The team understood our domain deeply and iterated rapidly. They felt less like a vendor and more like a co-founder.",
    rating: 5,
    initials: 'AK',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Deepak Nair',
    role: 'Founder, ShipFast',
    text: "From wireframes to a production SaaS in 10 weeks — Karmakoders made it happen. Our MRR hit ₹5L within 3 months of launch. The codebase is clean and the architecture is solid. Would build with them again in a heartbeat.",
    rating: 5,
    initials: 'DN',
    gradient: 'from-rose-500 to-red-500',
  },
]

function Stars({ count }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <FiStar key={i} size={12} className="text-amber-400 fill-amber-400" style={{ fill: '#f59e0b' }} />
      ))}
    </div>
  )
}

export default function Testimonials() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" id="testimonials">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/3 top-1/2 w-96 h-96 rounded-full blur-3xl opacity-[0.05]"
          style={{ background: '#5b60fa' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Client Voices"
          title='What Our <span class="gradient-text">Clients Say</span>'
          subtitle="Don't just take our word for it — here's what founders and teams say about working with us."
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={20}
          slidesPerView={1}
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          breakpoints={{
            640: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          className="pb-12"
        >
          {testimonials.map((t, i) => (
            <SwiperSlide key={t.name}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="glass-card p-6 h-full"
              >
                {/* Stars */}
                <Stars count={t.rating} />

                {/* Quote */}
                <p className="text-white/60 text-sm leading-relaxed my-5">"{t.text}"</p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-xs font-bold font-display">{t.initials}</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-white/40 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  )
}
