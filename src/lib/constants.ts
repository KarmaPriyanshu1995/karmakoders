
export interface PostData {
  title: string;
  slug: string;
  category: string;
  date: string;
  author: string;
  image: string;
  content: string;
  excerpt: string;
}

export const DEFAULT_POSTS: PostData[] = [
  {
    title: "The Future of Web Design in an AI-Driven World",
    slug: "future-of-web-design",
    category: "Design",
    date: "May 12, 2026",
    author: "Maya Patel",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
    excerpt: "Explore how artificial intelligence is reshaping the landscape of digital design and user experience.",
    content: `Artificial intelligence is no longer just a buzzword; it's a transformative force in web design. From generative layouts to automated accessibility testing, AI is empowering designers to create more personalized and inclusive experiences.

In this article, we'll explore the key trends:
1. Generative Design Systems: How algorithms are helping create consistent, scalable design languages.
2. AI-Powered Personalization: Moving beyond simple cookies to truly adaptive interfaces.
3. Accessibility at Scale: Using machine learning to ensure every user has a first-class experience.

The role of the designer is evolving from a pixel-pusher to a curator of intelligent systems. Stay ahead of the curve by embracing these tools today.`
  },
  {
    title: "Scaling Modern Applications with Next.js 16",
    slug: "scaling-modern-applications",
    category: "Development",
    date: "May 08, 2026",
    author: "Leo Zhang",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800",
    excerpt: "A deep dive into the latest features of Next.js and how they help build robust, high-performance applications.",
    content: `Next.js 16 introduces groundbreaking features that make scaling applications easier than ever. With improved server components, advanced caching strategies, and seamless integration with edge functions, the platform continues to lead the way in web development.

Key highlights include:
- Enhanced Partial Prerendering: Achieve even faster initial load times.
- Optimized Turbopack Build Engine: Drastically reduced development wait times.
- Improved Server Actions: Simplified data mutations with better type safety.

Whether you're building a small blog or a global enterprise platform, these updates provide the foundation for success.`
  },
  {
    title: "How to Leverage 3D Experiences for User Engagement",
    slug: "leverage-3d-experiences",
    category: "Creative",
    date: "May 05, 2026",
    author: "Alex Rivera",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=800",
    excerpt: "Learn how to integrate immersive 3D elements into your web projects to capture user attention.",
    content: `3D elements are no longer restricted to gaming or specialized applications. Today, web-based 3D is becoming a mainstream tool for enhancing storytelling and product visualization.

Why use 3D?
- Immersive Engagement: Users spend more time on pages with interactive 3D content.
- Product Visualization: Let customers see every angle of what they're buying.
- Brand Distinction: Stand out from the flat design crowd.

We recommend using libraries like Three.js and React Three Fiber to start your journey into the third dimension.`
  },
];

export interface ProjectData {
  title: string;
  slug: string;
  category: string;
  description: string;
  image: string;
  content: string;
  link?: string;
  tags: string;
}

export const DEFAULT_PROJECTS: ProjectData[] = [
  {
    title: "Quantum Pay",
    slug: "quantum-pay",
    category: "Fintech",
    description: "A secure, blockchain-powered payment gateway for modern e-commerce.",
    image: "https://images.unsplash.com/photo-1551288049-bbbda536339a?auto=format&fit=crop&q=80&w=800",
    tags: "Next.js, TailwindCSS, Solidity, Ethers.js",
    link: "https://quantum-pay.example.com",
    content: "Quantum Pay is a next-generation payment gateway that leverages blockchain technology to provide near-instant, low-fee transactions for merchants worldwide. Our platform features enterprise-grade security, a customizable checkout experience, and a robust API for developers.\n\nKey Features:\n- Instant Settlement: Get paid in seconds, not days.\n- Fraud Protection: Advanced AI-driven monitoring to prevent fraudulent transactions.\n- Global Reach: Support for over 150 currencies and major cryptocurrencies."
  },
  {
    title: "Nova Health",
    slug: "nova-health",
    category: "Healthcare",
    description: "An AI-driven telemedicine platform connecting patients with specialists instantly.",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800",
    tags: "React Native, Node.js, WebRTC, TensorFlow",
    link: "https://nova-health.example.com",
    content: "Nova Health is redefining the healthcare experience by providing a seamless, secure, and intelligent platform for remote consultations. Our AI symptoms checker helps guide patients to the right specialist, while our encrypted video engine ensures complete privacy during consultations.\n\nKey Features:\n- AI Triage: Get instant guidance on the urgency of your symptoms.\n- Secure Health Records: Store and share your medical history with ease.\n- Pharmacy Integration: Get prescriptions delivered directly to your door."
  },
  {
    title: "Evo Stream",
    slug: "evo-stream",
    category: "Entertainment",
    description: "A high-fidelity music and video streaming service with spatial audio support.",
    image: "https://images.unsplash.com/photo-1593784991095-a205039475fe?auto=format&fit=crop&q=80&w=800",
    tags: "Next.js, AWS S3, CloudFront, Dolby Atmos",
    link: "https://evo-stream.example.com",
    content: "Evo Stream delivers studio-quality audio and 4K video to any device. Our proprietary compression algorithm ensures a buffer-free experience even on limited bandwidth, while our support for spatial audio provides an immersive listening experience like no other.\n\nKey Features:\n- Lossless Audio: Hear every detail exactly as the artist intended.\n- Multi-Device Sync: Start watching on your phone and continue on your TV.\n- Social Listening: Listen along with friends in real-time."
  },
  {
    title: "Aura Home",
    slug: "aura-home",
    category: "Real Estate",
    description: "Immersive 3D virtual tours and property management for luxury real estate.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
    tags: "Three.js, React Three Fiber, Firebase, Google Maps API",
    link: "https://aura-home.example.com",
    content: "Aura Home makes finding your dream home an interactive experience. Our platform provides hyper-realistic 3D walkthroughs of luxury properties, allowing potential buyers to explore every corner from the comfort of their own home.\n\nKey Features:\n- Interactive 3D Tours: Walk through properties in high-definition 3D.\n- Mortgage Calculator: Real-time estimates based on current market rates.\n- Agent Portal: Powerful tools for realtors to manage listings and leads."
  },
];
