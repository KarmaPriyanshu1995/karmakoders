"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function AnimatedSphere() {
  const primaryColor = "#FFC300";
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.15;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.25;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1.4, 64, 64]} position={[0, 0, 0]}>
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

interface HeroCanvasProps {
  mousePosition: { x: number; y: number };
}

export function HeroCanvas({ mousePosition }: HeroCanvasProps) {
  const primaryColor = "#FFC300";

  return (
    <div className="absolute inset-0 z-0 opacity-40">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color={primaryColor} />
        <pointLight position={[-10, -10, -10]} intensity={1} color={primaryColor} />
        <Sparkles count={200} scale={10} size={1} speed={0.4} opacity={0.3} color={primaryColor} />
        <group rotation={[mousePosition.y * 0.1, mousePosition.x * 0.1, 0]}>
          <AnimatedSphere />
        </group>
      </Canvas>
    </div>
  );
}
