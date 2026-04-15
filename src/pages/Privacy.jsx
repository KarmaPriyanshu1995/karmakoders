import { motion } from 'framer-motion'

const sections = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide directly to us, such as when you fill out our contact form, request a quote, or communicate with us. This includes:

• Personal identification information (name, email address, phone number)
• Company information (company name, website, job title)
• Project details and requirements
• Communication records and correspondence
• Technical information such as IP addresses, browser type, and device information collected automatically when you visit our website.`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the information we collect to:

• Respond to your inquiries and provide the services you request
• Send you project updates, proposals, and communications related to your work with us
• Improve our website, services, and client experience
• Comply with legal obligations
• Send periodic emails regarding your project or other products/services (you may opt out at any time)
• Analyze usage patterns to improve our website performance`,
  },
  {
    title: '3. Information Sharing',
    content: `We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties without your consent, except:

• To trusted third-party service providers who assist us in operating our website and business (e.g., email providers, analytics tools) — these parties are bound by confidentiality agreements
• When required by law or to protect our rights
• In connection with a business transfer or acquisition

All third-party partners are carefully selected and required to maintain appropriate security standards.`,
  },
  {
    title: '4. Data Security',
    content: `We implement industry-standard security measures to protect your information:

• SSL/TLS encryption for all data transmission
• Secure, access-controlled storage of personal data
• Regular security audits and vulnerability assessments
• Limited access to personal information on a need-to-know basis
• Employee training on data protection and privacy

However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    title: '5. Cookies & Tracking',
    content: `Our website uses cookies and similar tracking technologies to:

• Remember your preferences and settings
• Analyze website traffic and usage patterns
• Improve website functionality
• Serve relevant content

You can control cookie settings through your browser preferences. Disabling cookies may affect some website functionality. We use analytics tools that may collect anonymous usage data.`,
  },
  {
    title: '6. Your Rights',
    content: `Depending on your location, you may have the following rights regarding your personal data:

• Access: Request a copy of the personal information we hold about you
• Correction: Request correction of inaccurate or incomplete information
• Deletion: Request deletion of your personal information (subject to legal obligations)
• Portability: Request transfer of your data in a machine-readable format
• Objection: Object to processing of your data for certain purposes
• Restriction: Request restriction of processing in certain circumstances

To exercise these rights, please contact us at karmakoders@gmail.com.`,
  },
  {
    title: '7. Data Retention',
    content: `We retain your personal information for as long as necessary to:

• Provide the services you have requested
• Comply with legal, regulatory, and contractual obligations
• Resolve disputes and enforce our agreements
• Maintain business records for tax and accounting purposes

Client project data is typically retained for 5 years post-project completion. Contact data is retained until you opt out or request deletion.`,
  },
  {
    title: '8. Third-Party Links',
    content: `Our website may contain links to third-party websites. We are not responsible for the privacy practices of these sites. We encourage you to review the privacy policies of any third-party sites you visit.

We are not responsible for content, privacy practices, or cookies on linked third-party websites.`,
  },
  {
    title: '9. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of any significant changes by:

• Posting the updated policy on this page with a new "Last Updated" date
• Sending an email notification if you are an active client

Your continued use of our website after changes are posted constitutes acceptance of the updated policy.`,
  },
  {
    title: '10. Contact Us',
    content: `If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:

Email: karmakoders@gmail.com
Phone: +91 7627056875

We will respond to your inquiry within 30 days.`,
  },
]

export default function Privacy() {
  return (
    <div className="pt-24">
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <span className="tag-pill mb-6 inline-flex">Legal</span>
            <h1 className="font-display font-bold text-4xl md:text-5xl text-white leading-tight mb-4">
              Privacy <span className="gradient-text">Policy</span>
            </h1>
            <p className="text-white/40 text-sm">
              Last updated: January 1, 2025
            </p>
            <p className="text-white/50 mt-4 max-w-xl mx-auto leading-relaxed">
              At Karmakoders, we are committed to protecting your privacy and ensuring the security of your personal information. This policy explains how we collect, use, and protect your data.
            </p>
          </motion.div>

          <div className="space-y-6">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="glass-card p-6 md:p-8"
              >
                <h2 className="font-display font-semibold text-white text-lg mb-4">{section.title}</h2>
                <p className="text-white/50 text-sm leading-relaxed whitespace-pre-line">{section.content}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 glass-card p-8 text-center"
          >
            <p className="text-white/40 text-sm mb-3">Questions about our privacy practices?</p>
            <a href="mailto:karmakoders@gmail.com"
              className="btn-glow px-6 py-3 text-sm text-white font-medium inline-block">
              Contact Our Team
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
