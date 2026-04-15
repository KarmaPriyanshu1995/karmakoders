import Hero from '../components/home/Hero'
import Services from '../components/home/Services'
import TechStack from '../components/home/TechStack'
import Portfolio from '../components/home/Portfolio'
import Stats from '../components/home/Stats'
import Team from '../components/home/Team'
import Testimonials from '../components/home/Testimonials'
import ContactCTA from '../components/home/ContactCTA'

export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <TechStack />
      <Portfolio />
      <Stats />
      <Team />
      <Testimonials />
      <ContactCTA />
    </>
  )
}
