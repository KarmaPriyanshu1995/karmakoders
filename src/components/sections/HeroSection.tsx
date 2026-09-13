"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { motion } from "framer-motion";
import Link from "next/link";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/useThemeStore";
import { usePathname } from "next/navigation";

function AnimatedSphere() {
  const primaryColor = "#FFC300";
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.15;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.25;
      // Add slight interactive float based on mouse
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1.4, 32, 32]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color={primaryColor}
          emissive={primaryColor}
          emissiveIntensity={0.4}
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
          wireframe={true}
        />
      </Sphere>
    </Float>
  );
}

interface HeroProps {
  badge?: string;
  headline?: string;
  highlight?: string;
  subheadline?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryLink?: string;
}

export function HeroSection({
  badge = "Trusted Development Partner",
  headline = "Enterprise Software Engineering",
  highlight = "Built for the US Market.",
  subheadline = "We design, engineer, and scale high-performance web, mobile, and AI solutions. Full timezone overlap, NDA-friendly collaboration, and transparent USD pricing.",
  ctaPrimary = "Book Discovery Call",
  ctaSecondary = "Get Free Estimate",
  ctaPrimaryLink = "/contact",
  ctaSecondaryLink = "/contact?type=estimate",
}: HeroProps) {
  const pathname = usePathname();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const primaryColor = "#FFC300";

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section id="hero" className={`${pathname === "/" ? "pt-12" : "pt-0"} relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-slate-950`}>
      {/* 3D Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.2} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} color={primaryColor} />
          <pointLight position={[-10, -10, -10]} intensity={1} color={primaryColor} />
          <Sparkles count={150} scale={10} size={1} speed={0.4} opacity={0.3} color={primaryColor} />
          <group rotation={[mousePosition.y * 0.1, mousePosition.x * 0.1, 0]}>
            <AnimatedSphere />
          </group>
        </Canvas>
      </div>

      {/* Cyberpunk Grid Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/20 via-slate-950/80 to-slate-950" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pt-28 sm:pt-32 pb-16 text-center md:text-left flex flex-col items-center md:items-start">

        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-indigo-500 text-sm font-bold tracking-wide mb-8 shadow-indigo-500/10 shadow-[0_0_20px_var(--color-indigo-500)]/15"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_var(--color-indigo-500)]" />
          {badge}
        </motion.div>

        <motion.h1
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-6 leading-[1.05]"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          {headline}<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-500 text-glow leading-[1.2] pb-2 block">{highlight}</span>
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-[#D6D6D6] mb-8 max-w-2xl leading-relaxed md:leading-normal font-medium"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          {subheadline}
        </motion.p>

        {/* Small trust indicators/badges strip */}
        <motion.div 
          className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 mb-10 text-xs font-bold text-slate-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          {["✔ NDA Friendly", "✔ Agile Delivery", "✔ AI Powered", "✔ USA Time Zone Support", "✔ Dedicated Team"].map((item) => (
            <span key={item} className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors cursor-default">
              {item}
            </span>
          ))}
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row gap-5 w-full md:w-auto"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          <Link href={ctaPrimaryLink} className="px-10 py-5 bg-indigo-500 hover:bg-indigo-500/90 text-slate-950 text-lg font-black rounded-xl transition-all duration-300 shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:-translate-y-1 w-full sm:w-auto text-center">
            {ctaPrimary}
          </Link>
          <Link href={ctaSecondaryLink} className="px-10 py-5 bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 text-lg font-bold rounded-xl transition-all duration-300 hover:border-indigo-500/30 hover:shadow-indigo-500/10 hover:-translate-y-1 w-full sm:w-auto text-center">
            {ctaSecondary}
          </Link>
        </motion.div>


      </div>
    </section>
  );
}
