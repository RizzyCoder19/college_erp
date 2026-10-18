"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/common/Icon";

export default function NotFound() {
  const [flashlightPos, setFlashlightPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setFlashlightPos({ x, y });
  };

  return (
    <div className="min-h-screen bg-[#0B1528] text-white flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar Branding */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between pb-6 border-b border-[#16243E]">
        <div className="py-1">
          <Image
            src="/images/rpihm-logo-transparent.webp"
            alt="R. P. Institute of Hospitality & Management"
            width={200}
            height={42}
            className="h-auto w-auto max-h-10 object-contain filter drop-shadow-xs"
            priority
          />
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            RPIHM CampusOS
          </span>
          <span className="text-[11px] text-slate-400">
            Institutional ERP Console
          </span>
        </div>
      </div>

      {/* Main 404 Interactive Flashlight Stage (Adapted from Yeti 404) */}
      <div
        className="max-w-3xl mx-auto w-full my-auto py-12 text-center select-none"
        onMouseMove={handleMouseMove}
      >
        {/* Adapted Yeti & Flashlight SVG Scene */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto rounded-3xl bg-[#070E1C] border border-[#16243E] overflow-hidden shadow-2xl flex items-center justify-center">
          {/* Dynamic Flashlight Glow following cursor */}
          <div
            className="absolute pointer-events-none w-48 h-48 rounded-full blur-2xl opacity-60 transition-transform duration-75"
            style={{
              background: "radial-gradient(circle, rgba(22, 87, 217, 0.8) 0%, rgba(217, 37, 52, 0.4) 60%, transparent 100%)",
              left: `${flashlightPos.x}%`,
              top: `${flashlightPos.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          ></div>

          {/* Adapted Yeti Character Vector */}
          <svg
            className="w-56 h-56 relative z-10"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Yeti 404 Searching Animation"
          >
            {/* Ice & Cave Backdrop */}
            <path d="M20 180C40 140 160 140 180 180H20Z" fill="#13223E" />
            
            {/* Yeti Body */}
            <ellipse cx="100" cy="120" rx="55" ry="50" fill="#E2E8F0" />
            
            {/* Yeti Head */}
            <circle cx="100" cy="80" r="40" fill="#F1F5F9" />
            
            {/* Yeti Face Mask in RPIHM Royal Blue */}
            <ellipse cx="100" cy="82" rx="28" ry="22" fill="#0B1528" />
            
            {/* Big Expressive Eyes */}
            <circle cx="88" cy="80" r="7" fill="#FFFFFF" />
            <circle cx="112" cy="80" r="7" fill="#FFFFFF" />
            
            {/* Pupils tracking flashlight direction */}
            <circle
              cx={88 + (flashlightPos.x - 50) * 0.08}
              cy={80 + (flashlightPos.y - 50) * 0.08}
              r="3.5"
              fill="#1657D9"
            />
            <circle
              cx={112 + (flashlightPos.x - 50) * 0.08}
              cy={80 + (flashlightPos.y - 50) * 0.08}
              r="3.5"
              fill="#1657D9"
            />
            
            {/* Cute Surprised Mouth */}
            <ellipse cx="100" cy="94" rx="4" ry="5" fill="#D92534" />

            {/* Little Horns */}
            <path d="M72 58C68 50 64 48 60 52C62 58 68 64 74 65L72 58Z" fill="#94A3B8" />
            <path d="M128 58C132 50 136 48 140 52C138 58 132 64 126 65L128 58Z" fill="#94A3B8" />

            {/* Flashlight Held in Hand */}
            <g transform="translate(130, 115) rotate(-25)">
              <rect x="0" y="0" width="12" height="24" rx="2" fill="#475569" />
              <path d="M-4 24L16 24L12 30L0 30L-4 24Z" fill="#D92534" />
              <polygon points="-20,120 32,120 12,30 0,30" fill="url(#flashlightBeam)" opacity="0.35" />
            </g>

            <defs>
              <linearGradient id="flashlightBeam" x1="6" y1="30" x2="6" y2="120" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60A5FA" stopOpacity="0.8" />
                <stop offset="1" stopColor="#1657D9" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 404 Headline and Context */}
        <div className="mt-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-red-950/60 text-red-300 border border-red-800">
            <span className="w-2 h-2 rounded-full bg-[#D92534] animate-pulse"></span>
            HTTP 404 • ROUTE UNRESOLVED
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-serif">
            Is Somebody There?!
          </h1>

          <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            The page or module you are attempting to access does not exist on this RPIHM CampusOS server, or is staged for a subsequent development milestone.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] text-white text-sm font-bold shadow-lg transition-all cursor-pointer"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>

          <Link
            href="/#switchboard"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#13223E] hover:bg-[#1A2E54] text-slate-200 text-sm font-semibold border border-[#1E3456] transition-all cursor-pointer"
          >
            <span>Explore Modules</span>
          </Link>
        </div>
      </div>

      {/* Institutional Footer */}
      <div className="max-w-6xl mx-auto w-full pt-6 border-t border-[#16243E] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <span>R. P. Institute of Hospitality & Management, Vasai</span>
        <span>CampusOS ERP • Academic Year 2026 – 27</span>
      </div>
    </div>
  );
}
