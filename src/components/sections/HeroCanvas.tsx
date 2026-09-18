"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function AnimatedSphere() {
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
      <Sphere ref={meshRef} args={[1.4, 32, 32]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color="#FFC300"
          emissive="#FFC300"
          emissiveIntensity={0.4}
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
          wireframe
        />
      </Sphere>
    </Float>
  );
}

export function HeroCanvas({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#FFC300" />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#FFC300" />
      <Sparkles count={150} scale={10} size={1} speed={0.4} opacity={0.3} color="#FFC300" />
      <group rotation={[mouseY * 0.1, mouseX * 0.1, 0]}>
        <AnimatedSphere />
      </group>
    </Canvas>
  );
}
