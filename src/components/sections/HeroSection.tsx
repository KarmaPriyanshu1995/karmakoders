"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, Stars } from "@react-three/drei";
import { motion } from "framer-motion";
import Link from "next/link";
import * as THREE from "three";

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.15;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.25;
    }
  });
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere ref={meshRef} args={[1.6, 64, 64]}>
        <MeshDistortMaterial color="#4f46e5" attach="material" distort={0.45} speed={2} roughness={0.1} metalness={0.9} />
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
}

export function HeroSection({
  badge = "AI-Powered Web Experiences",
  headline = "Design the",
  highlight = "Future",
  subheadline = "We build premium, scalable, and immersive web platforms powered by advanced AI and cutting-edge 3D technologies.",
  ctaPrimary = "Explore Portfolio",
  ctaSecondary = "Our Services",
}: HeroProps) {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0 opacity-60">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#06b6d4" />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <AnimatedSphere />
        </Canvas>
      </div>
      {/* Gradient overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />

      <div className="relative z-10 w-full px-8 md:px-24 py-32">
        <motion.div className="max-w-3xl" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            {badge}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-[1.1]">
            {headline}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{highlight}</span>
            {" "}of Your Brand
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-xl leading-relaxed">{subheadline}</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/portfolio" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-base font-bold rounded-full transition-all shadow-[0_0_25px_rgba(79,70,229,0.5)] hover:shadow-[0_0_35px_rgba(79,70,229,0.7)]">Explore Portfolio</Link>
            <Link href="/services" className="px-8 py-4 bg-white/5 backdrop-blur border border-white/10 text-white hover:bg-white/10 text-base font-bold rounded-full transition-colors">Our Services</Link>
          </div>
          {/* Stats row */}
          <div className="flex flex-wrap gap-8 mt-16 pt-8 border-t border-white/10">
            {[["150+", "Projects Delivered"], ["12+", "Years Experience"], ["98%", "Client Satisfaction"], ["40+", "Team Members"]].map(([num, label]) => (
              <div key={label}>
                <p className="text-3xl font-bold text-white">{num}</p>
                <p className="text-sm text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
