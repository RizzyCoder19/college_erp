"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/common/Icon";

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Cursor tracking coordinates in SVG coordinate space (600 x 470)
  const [cursorSvg, setCursorSvg] = useState<{ x: number; y: number }>({ x: 300, y: 350 });

  // Animation timeline states
  const [isLightOn, setIsLightOn] = useState(false);
  const [mouthPhase, setMouthPhase] = useState<1 | 2 | 4>(1);
  const [chinY, setChinY] = useState(0);
  const [shakeArmX, setShakeArmX] = useState(0);
  const [armRTransform, setArmRTransform] = useState({ x: 0, y: 0, rot: 0 });
  const [eyeScale, setEyeScale] = useState(1);
  const [tooth1Y, setTooth1Y] = useState(0);

  // Mouth path morph shapes from original yeti script
  const mouthShape1 =
    "M149 115.7c-4.6 3.7-6.6 9.8-5 15.6.1.5.3 1.1.5 1.6.6 1.5 2.4 2.3 3.9 1.7l11.2-4.4 11.2-4.4c1.5-.6 2.3-2.4 1.7-3.9-.2-.5-.4-1-.7-1.5-2.8-5.2-8.4-8.3-14.1-7.9-3.7.2-5.9 1.1-8.7 3.2z";
  const mouthShape2 =
    "M161.2 118.9c0 2.2-1.8 4-4 4s-4-1.8-4-4c0-1 .4-2 1.1-2.7.7-.8 1.8-1.3 2.9-1.3 2.2 0 4 1.7 4 4z";
  const mouthShape4 =
    "M149.2 116.7c-4.6 3.7-6.7 8.8-5.2 14.6.1.3.1.5.2.8.6 1.5 2.4 2.3 3.9 1.7l11.2-4.4 11.2-4.4c1.5-.6 2.3-2.4 1.7-3.9-.1-.3-.2-.5-.4-.7-2.8-5.2-8.2-7.2-14-6.9-3.6.2-5.9 1.1-8.6 3.2z";

  const currentMouthPath = mouthPhase === 2 ? mouthShape2 : mouthPhase === 4 ? mouthShape4 : mouthShape1;

  // Timeline loop matching the original yeti animation
  useEffect(() => {
    const startTime = performance.now();
    let animFrame: number;

    const loopDuration = 13000; // 13 seconds full cycle

    const tick = (now: number) => {
      const elapsed = (now - startTime) % loopDuration;
      const t = elapsed / 1000; // seconds

      // 1. Teeth chatter (0s -> 2.5s and 9.25s -> 11.5s)
      const isChattering = (t >= 0 && t < 2.5) || (t >= 9.25 && t < 11.5);
      if (isChattering) {
        const chatterStep = Math.sin(t * 30);
        setMouthPhase(chatterStep > 0 ? 4 : 1);
        setChinY(chatterStep > 0 ? 1.5 : 0);
      } else if (t >= 5 && t < 8) {
        // Scared open mouth
        setMouthPhase(2);
        setChinY(0);
      } else {
        setMouthPhase(1);
        setChinY(0);
      }

      // 2. Flashlight shake jitter (2.5s -> 2.875s and 11.5s -> 11.875s)
      const isShaking = (t >= 2.5 && t < 2.875) || (t >= 11.5 && t < 11.875);
      if (isShaking) {
        const shakeStep = Math.sin(t * 80);
        setShakeArmX(shakeStep > 0 ? 7 : 0);
      } else {
        setShakeArmX(0);
      }

      // 3. Torch light flickers and turns on
      // Light is ON from:
      // 3.2 -> 3.3 (on), 3.3 -> 3.4 (off), 3.4 -> 8.0 (on),
      // 8.1 -> 8.3 (on), 8.4 -> 8.6 (on), else off
      const lightOn =
        (t >= 3.2 && t < 3.3) ||
        (t >= 3.4 && t < 8.0) ||
        (t >= 8.1 && t < 8.3) ||
        (t >= 8.4 && t < 8.6);
      setIsLightOn(lightOn);

      // 4. Scared pose: Right arm moves up and eyes dilate (4.0s -> 8.5s)
      if (t >= 4.0 && t < 5.0) {
        const p = (t - 4.0) / 1.0;
        setArmRTransform({ x: 10 * p, y: 30 * p, rot: 10 * p });
      } else if (t >= 5.0 && t < 8.5) {
        setArmRTransform({ x: 10, y: 30, rot: 10 });
      } else if (t >= 8.5 && t < 9.0) {
        const p = 1 - (t - 8.5) / 0.5;
        setArmRTransform({ x: 10 * p, y: 30 * p, rot: 10 * p });
      } else {
        setArmRTransform({ x: 0, y: 0, rot: 0 });
      }

      // 5. Eyes scale up during scared moment (5.0s -> 8.5s)
      if (t >= 5.0 && t < 8.5) {
        setEyeScale(1.4);
        setTooth1Y(-5);
      } else {
        setEyeScale(1);
        setTooth1Y(0);
      }

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  // Track cursor position and map to SVG coordinate system (600 x 470)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 600;
    const y = ((e.clientY - rect.top) / rect.height) * 470;
    setCursorSvg({ x, y });
  };

  const handleMouseLeave = () => {
    // Smoothly return eyes and flashlight towards the 404 letters
    setCursorSvg({ x: 300, y: 350 });
  };

  // 1. Math for Yeti Eyes following cursor:
  // Left eye pupil origin: (133.7, 103.5), Right eye pupil origin: (160.9, 94.5)
  const leftEyeDx = cursorSvg.x - 135.9;
  const leftEyeDy = cursorSvg.y - 105.3;
  const distL = Math.hypot(leftEyeDx, leftEyeDy) || 1;
  const pupilLX = Math.min(3.2, Math.max(-3.2, (leftEyeDx / distL) * 3.2));
  const pupilLY = Math.min(2.8, Math.max(-2.8, (leftEyeDy / distL) * 2.8));

  const rightEyeDx = cursorSvg.x - 163.2;
  const rightEyeDy = cursorSvg.y - 96.3;
  const distR = Math.hypot(rightEyeDx, rightEyeDy) || 1;
  const pupilRX = Math.min(3.2, Math.max(-3.2, (rightEyeDx / distR) * 3.2));
  const pupilRY = Math.min(2.8, Math.max(-2.8, (rightEyeDy / distR) * 2.8));

  // 2. Math for Flash of torch following cursor:
  // Flashlight tip position in SVG: around (105, 195)
  const torchAngleRad = Math.atan2(cursorSvg.y - 195, cursorSvg.x - 105);
  const torchAngleDeg = (torchAngleRad * 180) / Math.PI;
  // Default beam angle in original SVG is pointing at approx 68 degrees (down-right toward the 404 letters)
  const beamDeltaAngle = Math.min(45, Math.max(-45, torchAngleDeg - 68));

  // Arm subtle tilt towards cursor:
  const armTilt = beamDeltaAngle * 0.35;

  // Colors when light is on vs off (matching original script goLight / goDark)
  const furColor = isLightOn ? "#FFF" : "#67b1e0";
  const skinColor = isLightOn ? "#ddf1fa" : "#88c9f2";
  const lettersSide = isLightOn ? "#3A7199" : "#051d2c";
  const lettersFront = isLightOn ? "#67B1E0" : "#051d2c";
  const lettersStroke = isLightOn ? "#265D85" : "#031219";
  const lettersShadowOpacity = isLightOn ? 0.2 : 0.05;

  return (
    <div
      className="min-h-screen bg-[#09334F] text-white flex flex-col justify-between selection:bg-[#67B1E0] selection:text-[#09334F] overflow-x-hidden font-sans"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Header: RPIHM Branding & Institutional Context */}
      <header className="w-full border-b border-[#164366] bg-[#07253B]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between z-30 sticky top-0 shadow-md">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link href="/" className="flex items-center space-x-3 group" title="Return to Dashboard">
            <div className="p-1.5 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
              <Image
                src="/images/rpihm-logo-transparent.webp"
                alt="R. P. Institute of Hospitality & Management Logo"
                width={160}
                height={36}
                className="h-8 w-auto object-contain filter drop-shadow-xs"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-white tracking-wide block uppercase">
                RPIHM CampusOS
              </span>
              <span className="text-[11px] text-[#A6CBE4] block">
                Academic & Administrative ERP
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-xs bg-[#0F3B5A] px-3 py-1.5 rounded-lg border border-[#1E5279] text-[#CFE4F3]">
            <Icon name="academic" className="h-3.5 w-3.5 text-[#67B1E0]" />
            <span>Academic Session 2026 – 27</span>
          </div>

          <Link
            href="/"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#1657D9] hover:bg-[#1248B8] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Icon name="arrow-left" className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-10 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 relative z-10">
        
        {/* Left: Yeti & 404 Flashlight Stage */}
        <div
          ref={containerRef}
          className="relative w-full max-w-[600px] aspect-[600/470] rounded-2xl overflow-visible select-none shadow-2xl bg-[#09334F] border border-[#194C72]"
        >
          {/* Real-time Cursor Torch Spotlight Accent on Background */}
          {isLightOn && (
            <div
              className="absolute pointer-events-none rounded-full blur-3xl opacity-40 transition-opacity duration-150"
              style={{
                width: "280px",
                height: "280px",
                background: "radial-gradient(circle, rgba(248, 255, 232, 0.7) 0%, rgba(103, 177, 224, 0.3) 50%, transparent 80%)",
                left: `${(cursorSvg.x / 600) * 100}%`,
                top: `${(cursorSvg.y / 470) * 100}%`,
                transform: "translate(-50%, -50%)",
                zIndex: 4,
              }}
            />
          )}

          {/* SVG 1: Yeti Character, Bed, Pillow and Blanket */}
          <svg
            id="yetiSVG"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 600 470"
            className="absolute inset-0 w-full h-full overflow-hidden"
            role="img"
            aria-label="Yeti 404 searching with flashlight"
          >
            <linearGradient
              id="flashlightGrad"
              x1="126.5842"
              x2="90.5842"
              y1="176.5625"
              y2="213.5625"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#333" />
              <stop offset=".076" stopColor="#414141" />
              <stop offset=".2213" stopColor="#555" />
              <stop offset=".3651" stopColor="#626262" />
              <stop offset=".5043" stopColor="#666" />
              <stop offset=".6323" stopColor="#606060" />
              <stop offset=".8063" stopColor="#4e4e4e" />
              <stop offset="1" stopColor="#333" />
            </linearGradient>

            <path fill="#24658F" d="M0 0h600v470H0z" />

            {/* Pillow */}
            <g id="pillow">
              <path
                fill="#09334F"
                d="M241.3 124.6c-52.9 28.6-112.6 48-181.8 54.4-40.9 6.8-64.6-82.3-31.9-106.6C84 43.8 144.8 26.2 209.4 18c32.8 13 48.5 75.3 31.9 106.6z"
              />
              <path
                fill="none"
                stroke="#001726"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M52.8 91.3c10 7.4 25.4 50.7 16.1 65.8M241.3 124.6c-52.9 28.6-112.6 48-181.8 54.4-40.9 6.8-64.6-82.3-31.9-106.6C84 43.8 144.8 26.2 209.4 18c32.8 13 48.5 75.3 31.9 106.6z"
              />
              <path
                fill="#09334F"
                stroke="#001726"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M201.9 21.9c4.9-8 14.1-11.3 20.6-7.3s7.7 13.7 2.8 21.7"
              />
              <path
                fill="#09334F"
                stroke="#001726"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M242.1 103.1c1.8.3 3.6.9 5.3 1.8 8.4 4.1 12.6 13 9.3 19.8s-12.9 9-21.3 4.9c-1.9-.9-3.6-2.1-5-3.4"
              />
              <path
                fill="#09334F"
                stroke="#001726"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M70.3 172c.2 1.4.2 2.8.1 4.3-.8 9.4-8.3 16.4-16.7 15.6S39.2 183 40 173.7c.1-1.6.5-3.1 1-4.5"
              />
              <path
                fill="#09334F"
                stroke="#001726"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M20.9 85.1c-4.1-5-5.1-11.6-2.1-16.9 4.1-7.2 14-9.2 22.1-4.6 3.7 2.1 6.4 5.2 7.9 8.6"
              />
            </g>

            {/* Yeti Character */}
            <g id="yeti">
              <path
                id="bodyBG"
                fill="#67B1E0"
                d="M80.9 291.4l-17.1-72.8c-6.3-27 10.4-54 37.4-60.3l93.1-29.6c26.5-8.1 54.6 6.8 62.7 33.3l21.9 71.5"
              />
              <path
                className="hlFur transition-colors duration-150"
                id="hlBody"
                fill={furColor}
                d="M67.1 232.7c15.6-8.7 27.7-23.7 38-38.7 5.5-8 10.9-16.4 18.3-22.7 13.1-11.2 31.3-14.8 48.6-15 4.9 0 9.9.1 14.5-1.7 3.6-1.5 6.5-4.1 9.3-6.9 6.5-6.5 12-14 18-21-6.4-.6-12.9 0-19.4 2l-93.1 29.6c-27 6.3-43.7 33.4-37.4 60.3l3.2 14.1z"
              />
              <path
                id="bodyOutline"
                fill="none"
                stroke="#265D85"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M80.9 291.4l-17.1-72.8c-6.3-27 10.4-54 37.4-60.3l93.1-29.6c26.5-8.1 54.6 6.8 62.7 33.3l21.9 71.5"
              />
              <path
                fill="#67B1E0"
                d="M197.5 132.4l-11.2-47.9c-6.3-26.7-32.7-44.1-59.5-38.2-27.4 6-44.5 33.1-38.1 60.3l13.6 56.2"
              />
              <path
                className="hlFur transition-colors duration-150"
                id="hlHead"
                fill={furColor}
                d="M100.4 132.3l7.4 29.8 89.7-28.8-11.4-48.9c-1.6-6.8-4.5-12.9-8.4-18.3-9.6-7.9-28.5-12.9-46.9-8.5-24.9 5.9-34.5 23.6-38.1 37.9-.8.8-3.8 3-5.1 5.4.2 1.9.5 3.7 1 5.6l7 28.8 4.8-3z"
              />
              <path
                fill="#67B1E0"
                stroke="#265D85"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M182.1 71.6c3.8 3.6 7 7.7 9.5 12-1.8.4-3.6.9-5.3 1.6 3.2 2.9 5.7 6.3 7.6 9.9-1.1.3-2.2.7-3.3 1.1 2.5 3.5 4.3 7.4 5.4 11.5-.8-.5-2.2-.8-3.3-1"
              />
              <path
                fill="none"
                stroke="#265D85"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M197.5 132.4l-11.2-47.9c-6.3-26.7-32.7-44.1-59.5-38.2-27.4 6-44.5 33.1-38.1 60.3l13.6 56.2"
              />

              {/* Ears */}
              <g>
                <ellipse
                  cx="85.8"
                  cy="120.4"
                  fill="#88C9F2"
                  rx="11.5"
                  ry="11.5"
                  transform="rotate(-66.265 85.7992 120.4318)"
                />
                <path
                  className="hlSkin transition-colors duration-150"
                  id="hlEar"
                  fill={skinColor}
                  d="M80.4 122.2c-1.3-5.5 1.6-11.1 6.6-13.2-1.3-.1-2.6-.1-3.9.3-6.2 1.5-10 7.7-8.5 13.9s7.7 10 13.9 8.5c.7-.2 1.3-.4 1.9-.6-4.7-.6-8.9-4-10-8.9z"
                />
                <path
                  fill="#88C9F2"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M84.2 116.6c-2.2.5-3.6 2.8-3 5 .5 2.2 2.8 3.6 5 3"
                />
                <ellipse
                  cx="85.8"
                  cy="120.4"
                  fill="none"
                  stroke="#265D85"
                  strokeWidth="2.5"
                  rx="11.5"
                  ry="11.5"
                  transform="rotate(-66.265 85.7992 120.4318)"
                />
                <path className="hlFur" fill={furColor} d="M106 130.3l-12 3.6 1.2-11.4-6.3-.1 6-12h-5.4l9.6-8.4z" />
                <path
                  className="hlFur"
                  fill={furColor}
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M92.1 96.4c-5.1 5.9-8.4 11.7-10 17 4.2-1.2 8.5-2.2 12.8-3-4.2 4.8-6.7 9.5-7.6 13.8 2.7-.7 5.4-1.3 8-1.7-2.3 4.8-2.8 9.2-1.7 13.3 1.4-1 4-2.4 6.1-3.4"
                />
              </g>

              {/* Face & Chin */}
              <path
                className="hlSkin transition-colors duration-150"
                id="face"
                fill={skinColor}
                d="M169.1 70.4l7.3 23.4c9.4 26.8-1.8 45-20 50.7s-37.8-5.1-45.8-30.1L103.3 91"
              />
              <path
                id="chin"
                fill="none"
                stroke="#265D85"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                transform={`translate(0, ${chinY})`}
                d="M152.4 147.5c3.8 1 8 1.4 12.3 1.1-.5-1.4-1-2.9-1.6-4.3 3.8.6 7.9.7 12.1.1l-3.3-4.8c3.1-.6 6.3-1.6 9.5-3.1-1.4-1.6-2.8-3.1-4.2-4.6"
              />
              <path
                className="hlFur"
                id="eyebrow"
                fill={furColor}
                stroke="#265D85"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M100.9 89.8c7.6 3.5 15.9 6.1 24.7 7.7 1.1-3.3 2.1-6.6 3-9.9 5.5 2.3 11.3 4.1 17.5 5.4.2-3.3.4-6.5.4-9.7 4.5.7 9.2 1.1 14 1.1-.5-3.4-1.1-6.7-1.7-10 4.5-1.9 9-4.2 13.3-6.9"
              />

              {/* EYE L (Follows Cursor + Widens on Scared Phase) */}
              <g
                id="eyeL"
                style={{
                  transform: `scale(${eyeScale})`,
                  transformOrigin: "135.9px 105.3px",
                  transition: "transform 0.25s ease-out",
                }}
              >
                <circle cx="135.9" cy="105.3" r="3.5" fill="#265D85" />
                {/* Pupil follows cursor */}
                <circle
                  cx={133.7 + pupilLX}
                  cy={103.5 + pupilLY}
                  r="1.2"
                  fill="#FFF"
                />
              </g>

              {/* EYE R (Follows Cursor + Widens on Scared Phase) */}
              <g
                id="eyeR"
                style={{
                  transform: `scale(${eyeScale})`,
                  transformOrigin: "163.2px 96.3px",
                  transition: "transform 0.25s ease-out",
                }}
              >
                <circle cx="163.2" cy="96.3" r="3.5" fill="#265D85" />
                {/* Pupil follows cursor */}
                <circle
                  cx={160.9 + pupilRX}
                  cy={94.5 + pupilRY}
                  r="1.2"
                  fill="#FFF"
                />
              </g>

              {/* Nose */}
              <path
                id="nose"
                fill="#265D85"
                d="M149.3 101.2l4.4-1.6c1.8-.6 3.6 1 3.1 2.9l-1.1 3.9c-.4 1.6-2.3 2.2-3.6 1.3l-3.3-2.3c-1.7-1.1-1.3-3.5.5-4.2z"
              />
              <path
                fill="#67B1E0"
                stroke="#265D85"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M112.4 55.9c.9-4.3 3.8-9.2 8.8-13.7 1.4 2.3 2.8 4.7 4.1 7.1 2.3-4.8 6.9-9.8 13.8-14.1-.1 3.4-.3 6.8-.6 10.1 4.4-3 10.2-5.7 17.3-7.6-1.7 3.6-3.7 7.2-5.9 10.8"
              />

              {/* Mouth & Teeth */}
              <g id="mouth">
                <path id="mouthBG" fill="#265D85" d={currentMouthPath} />
                <g>
                  <defs>
                    <path id="mouthPath" d={currentMouthPath} />
                  </defs>
                  <clipPath id="mouthClipPath">
                    <use overflow="visible" xlinkHref="#mouthPath" />
                  </clipPath>
                  <g clipPath="url(#mouthClipPath)">
                    <ellipse
                      cx="160.8"
                      cy="133.2"
                      fill="#CC4A6C"
                      rx="13"
                      ry="8"
                      transform="rotate(-21.685 160.775 133.1613)"
                    />
                    <ellipse
                      cx="158.4"
                      cy="127.1"
                      fill="#FFF"
                      opacity=".1"
                      rx="5"
                      ry="1.5"
                      transform="rotate(-21.685 158.3808 127.126)"
                    />
                    <path
                      id="tooth1"
                      fill="#FFF"
                      style={{
                        transform: `translate(0, ${tooth1Y}px)`,
                        transition: "transform 0.15s ease",
                      }}
                      d="M161.5 116.1l-3.7 1.5c-1 .4-2.2-.1-2.6-1.1l-1.5-3.7 7.4-3 1.5 3.7c.5 1 0 2.2-1.1 2.6z"
                    />
                    <path
                      id="tooth2"
                      fill="#FFF"
                      d="M151.8 128.9l-1.9.7c-1 .4-1.5 1.6-1.1 2.6l1.1 2.8 5.6-2.2-1.1-2.8c-.5-1-1.6-1.5-2.6-1.1z"
                    />
                    <path
                      id="tooth3"
                      fill="#FFF"
                      d="M158.3 126.3l-1.9.7c-1 .4-1.5 1.6-1.1 2.6l1.1 2.8 5.6-2.2-1.1-2.8c-.5-1-1.6-1.5-2.6-1.1z"
                    />
                  </g>
                </g>
                <path
                  id="mouthOutline"
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d={currentMouthPath}
                />
              </g>

              {/* Right Arm (Raises in Scared phase) */}
              <g
                id="armR"
                style={{
                  transform: `translate(${armRTransform.x}px, ${armRTransform.y}px) rotate(${armRTransform.rot}deg)`,
                  transformOrigin: "185px 165px",
                  transition: "transform 0.4s ease-out",
                }}
              >
                <path
                  className="hlSkin"
                  fill={skinColor}
                  d="M158.4 116.9l-.7.3c-3.7 1.5-5.5 5.7-4.1 9.4l1.2 2.9c1.7 4.4 6.7 6.5 11.1 4.8l1.4-.5"
                />
                <path
                  fill="#A9DDF3"
                  d="M154.8 129.1l.7 1.8c1 2.5 5.4 3.1 5.4 3.1l-2-5.1c-.3-.7-1.1-1.1-1.8-.8l-2.3 1z"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10"
                  strokeWidth="2.5"
                  d="M158.4 116.9l-.7.3c-3.7 1.5-5.5 5.7-4.1 9.4l1.2 2.9c1.7 4.4 6.7 6.5 11.1 4.8l1.4-.5"
                />
                <path
                  className="hlSkin"
                  fill={skinColor}
                  stroke="#265D85"
                  strokeWidth="2.5"
                  d="M167.7 113.2l-.7.3c-3.7 1.5-5.5 5.7-4.1 9.4l1.2 2.9c1.7 4.4 6.7 6.5 11.1 4.8l1.4-.5"
                />
                <path
                  className="hlSkin"
                  fill={skinColor}
                  stroke="#265D85"
                  strokeWidth="2.5"
                  d="M177 109.4l-.7.3c-3.7 1.5-5.5 5.7-4.1 9.4l1.2 2.9c1.7 4.4 6.7 6.5 11.1 4.8l1.4-.5"
                />
                <path fill="#88C9F2" d="M162.3 128.6l18.6 46.7 37.2-14.8-17.9-44.8" />
                <path
                  className="hlSkin"
                  fill={skinColor}
                  d="M206.5 130.7l-5.9-15.1-37.9 13 6.4 17.4c10 1.6 34.6-6.3 37.4-15.3z"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10"
                  strokeWidth="2.5"
                  d="M162.3 128.6l18.6 46.7 37.2-14.8-15.3-38.3"
                />
                <path className="hlSkin" fill={skinColor} d="M190.8 119l-1.5-3.7c-2-5.1-7.9-7.6-13-5.6l5.2 12.9" />
                <path className="hlSkin" fill={skinColor} d="M203.5 123.8l-1.5-3.7c-2-5.1-7.9-7.6-13-5.6l5.2 12.9" />
                <path
                  fill="#A9DDF3"
                  d="M200.4 119.4l-.7-1.8c-1-2.5-5.4-3.1-5.4-3.1l1.9 4.8c.3.8 1.3 1.3 2.1.9l2.1-.8z"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10"
                  strokeWidth="2.5"
                  d="M203.5 123.8l-1.5-3.7c-2-5.1-7.9-7.6-13-5.6"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10"
                  strokeWidth="2.5"
                  d="M193.7 126.4l-4.4-11.1c-2-5.1-7.9-7.6-13-5.6"
                />
                <path
                  fill="#67B1E0"
                  d="M219.6 160.1c-1.5-6.2-3.2-13.2-5.1-21.1-2.8 2.1-5.6 4.5-8.3 7.4-2-1.8-4.1-3.7-6.2-5.7-2.4 3.6-4.6 7.7-6.7 12.1-3-1.9-6-3.9-9.2-6-1.4 2.9-2.7 6-4 9.2-4.7-.6-9.4-1.1-14.2-1.7 5.4 8 10.3 15.2 14.7 21.5"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M219.6 160.1c-1.5-6.2-3.2-13.2-5.1-21.1-2.8 2.1-5.6 4.5-8.3 7.4-2-1.8-4.1-3.7-6.2-5.7-2.4 3.6-4.6 7.7-6.7 12.1-3-1.9-6-3.9-9.2-6-1.4 2.9-2.7 6-4 9.2-4.7-.6-9.4-1.1-14.2-1.7 5.4 8 10.3 15.2 14.7 21.5"
                />
                <path
                  fill="none"
                  stroke="#3A5E77"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10"
                  strokeWidth="2.5"
                  d="M160.9 125l2 5.1"
                />
                <path className="hlSkin" fill={skinColor} d="M172.2 126.4l-1.5-3.7c-2-5.1-7.9-7.6-13-5.6l5.2 12.9" />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10"
                  strokeWidth="2.5"
                  d="M160.5 124l2.4 6.1"
                />
                <path className="hlSkin" fill={skinColor} d="M181.5 122.7L180 119c-2-5.1-7.9-7.6-13-5.6l5.2 12.9" />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10"
                  strokeWidth="2.5"
                  d="M181.5 122.7L180 119c-2-5.1-7.9-7.6-13-5.6"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10"
                  strokeWidth="2.5"
                  d="M172.2 126.4l-1.5-3.7c-2-5.1-7.9-7.6-13-5.6"
                />
              </g>

              {/* Left Arm Holding Flashlight (Tilts & Follows Cursor + Shakes on Jitter) */}
              <g
                id="armL"
                style={{
                  transform: `translate(${shakeArmX}px, 0) rotate(${armTilt}deg)`,
                  transformOrigin: "70px 180px",
                  transition: "transform 0.08s ease-out",
                }}
              >
                <path
                  fill="#67B1E0"
                  d="M50.9 156.7c-12 35.8-7.8 69.6 8.3 101.9 12.1 22.7 37 14.1 39.5-11.8v-65l-47.8-25.1z"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M50.9 156.7c-12 35.8-7.8 69.6 8.3 101.9 10 22.3 37.3 15.1 39.5-11.8v-65l-47.8-25.1z"
                />
                <path
                  fill="none"
                  stroke="#262626"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit="10"
                  strokeWidth="20"
                  d="M59.3 143.8l34.3 33.9"
                />
                <path fill="#4D4D4D" d="M58.4 133.9l15.9 15.9-.9.9-16.5-16.5c.5-.2 1-.3 1.5-.3z" />
                <path fill="#1A1A1A" d="M71.2 169.6l-20.1-20c-2.4-3.7-2.5-8.1.1-11.7l23.1 22.2" />
                <path fill="#4D4D4D" d="M80.5 156.4l16 15.9-.9.9-16.5-16.5c.5-.1 1-.2 1.4-.3z" />
                <path fill="#1A1A1A" d="M74.2 160.1L86 171.4l-2 11-10.2-10.1c-2.4-4.4-2.5-8.5.4-12.2z" />
                <path
                  fill="#88C9F2"
                  d="M65.9 164.8c-1.9-5.5.8-11.8 6.1-14.1 4.9-2.2 10.4-.6 13.5 3.4 1.3 1.6 3.5 2.1 5.4 1.4 3-1.2 3.9-4.9 1.9-7.4-5.8-7.2-16.1-9.9-25-5.7-9.4 4.4-14.1 15.3-10.9 25.2"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M67.9 168.3c-1.1-1.2-2-3.6-2-3.6-1.9-5.5.8-11.8 6.1-14.1 4.9-2.2 10.4-.6 13.5 3.4 1.3 1.6 3.5 2.1 5.4 1.4 3-1.2 3.9-4.9 1.9-7.4-5.8-7.2-16.1-9.9-25-5.7-9.4 4.4-14.1 15.3-10.9 25.2"
                />
                <path
                  fill="#88C9F2"
                  d="M69.9 168.7c-1.9-5.5.8-11.8 6.1-14.1 4.9-2.2 10.4-.6 13.5 3.4 1.3 1.6 3.5 2.1 5.4 1.4 3-1.2 3.9-4.9 1.9-7.4-5.8-7.2-16.1-9.9-25-5.7-9.4 4.4-14.1 15.3-10.9 25.2"
                />
                <path
                  fill="#67B1E0"
                  d="M49.9 155l2.7 12.7.2 11.8 5 8.6 9.5-1.8 2-8.7-6.9.6 1.7-11.7-6.6 2.8 1-13.8-4.6 2.9z"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M71.9 172.3c-1.1-1.2-2-3.6-2-3.6-1.9-5.5.8-11.8 6.1-14.1 4.9-2.2 10.4-.6 13.5 3.4 1.3 1.6 3.5 2.1 5.4 1.4 3-1.2 3.9-4.9 1.9-7.4-5.8-7.2-16.1-9.9-25-5.7"
                />
                <path
                  className="hlSkin"
                  id="hlHandL"
                  fill={skinColor}
                  d="M101.7 156.9c-5.8-7.2-16.1-9.9-25-5.7-5.9 2.8-9.9 8.1-11.3 14.1l-1-.9-6.2 4.2c5.5 18.1 19.3 25.4 30.4 21l1.2-9.1c-6 2.4-12.7-.7-14.9-6.8-1.9-5.5.8-11.8 6.1-14.1 4.9-2.2 10.4-.6 13.5 3.4 1.3 1.6 3.5 2.1 5.4 1.4 2.9-1.3 3.8-5 1.8-7.5z"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M89.7 180.5c-6 2.4-12.7-.7-14.9-6.8"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M76.9 177.3c-1.1-1.2-2-3.6-2-3.6-1.9-5.5.8-11.8 6.1-14.1 4.9-2.2 10.4-.6 13.5 3.4 1.3 1.6 3.5 2.1 5.4 1.4 3-1.2 3.9-4.9 1.9-7.4-5.8-7.2-16.1-9.9-25-5.7"
                />
                <path
                  className="hlFur"
                  id="hlArmL"
                  fill={furColor}
                  d="M98.8 202.8l-1.4-8.7-5.2.7-7.2-11.5-6.8 9-3.9-9.3-7.5 4.8 3.5-11.4-7.1 1.9 2.7-13.5-7.8 4.9c-11.7 26.5-3.6 52.5 1.7 66.6 15.5-6.4 30.3-21.9 39-33.5z"
                />
                <path fill="#A9DDF3" d="M101 161.2l-2.4-2.2c.2-1.6-.2-2.7-.8-3.9l2.6 2.5c.8.8 1 2.2.6 3.6z" />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M66.9 187.8l3.5-11.4-7.2 1.9 2.6-13.9-7.5 4.5 1.2-15.5-5.5 4.2"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M54 157.6l-5.6-5.6 2.7 14.7"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M67.1 188l7.3-5 3.8 9.3"
                />
                <path
                  fill="none"
                  stroke="#265D85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M78.2 192.3l6.8-9 7.1 11.5"
                />
              </g>
            </g>

            {/* Blanket */}
            <g id="blanket">
              <path
                d="M1.2 271.4C6.6 262 13 253.1 22.4 248c10.3-5.5 22.5-5.5 33.7-8.8 21.8-6.5 37.5-25.2 50.3-43.9 5.5-8 10.9-16.4 18.3-22.7 13.1-11.2 31.3-14.8 48.6-15 4.9 0 9.9.1 14.5-1.7 3.6-1.5 6.5-4.1 9.3-6.9 10.1-10.2 17.9-22.8 29-32 7.9-6.6 18.7-14.7 29.5-13.7 13.9 1.2 25 5.8 38.5-1.5 28.1-15.2 27.8-60.6 56.2-75.1 16.2-8.3 36.9-3.6 52.6-12.7 5.4-3.2 9.8-7.7 13.9-12.5h128.5l-350.8 209L1.3 363l-.1-91.6z"
                opacity=".1"
              />
              <path
                fill="#09334F"
                d="M0 281.6c5.3-9.2 11.5-17.9 20.7-22.8 10.3-5.5 22.5-5.5 33.7-8.8 21.8-6.5 37.5-25.2 50.3-43.9 5.5-8 10.9-16.4 18.3-22.7 13.1-11.2 31.3-14.8 48.6-15 4.9 0 9.9.1 14.5-1.7 3.6-1.5 6.5-4.1 9.3-6.9 10.1-10.2 17.9-22.8 29-32 7.9-6.6 18.7-14.7 29.5-13.7 13.9 1.2 25 5.8 38.5-1.5 28.1-15.2 27.8-60.6 56.2-75.1 16.2-8.3 36.9-3.6 52.6-12.7C411 19.1 417.1 8.4 424.9.3H700v570H0V281.6z"
              />
              <path
                fill="#072A40"
                d="M0 281.6c5.3-9.2 11.6-17.9 20.8-22.8 10.3-5.5 22.5-5.5 33.7-8.8 21.8-6.5 37.5-25.2 50.3-43.9 5.5-8 10.9-16.4 18.3-22.7 13.1-11.2 31.3-14.8 48.6-15 4.9 0 9.9.1 14.5-1.7 3.6-1.5 6.5-4.1 9.3-6.9 10.1-10.2 17.9-22.8 29-32 7.9-6.6 18.7-14.7 29.5-13.7 13.9 1.2 25 5.8 38.5-1.5 28.1-15.2 27.8-60.6 56.2-75.1 16.2-8.3 36.9-3.6 52.6-12.7 9.8-5.7 15.9-16.4 23.7-24.6h100.4c-3.5 2.8-7.3 5.3-11.4 7.2-11.6 5.4-23 6.6-34.9 1.9-10.5-4.2-22.3 2.4-30.1 10.6-7.8 8.2-14 18.3-23.7 24-15.7 9.1-36.4 4.4-52.6 12.7-28.4 14.6-28.2 60-56.2 75.1-13.5 7.3-24.6 2.8-38.5 1.5-10.8-1-21.5 7.1-29.5 13.7-11.2 9.2-18.9 21.8-29 32-2.7 2.7-5.7 5.4-9.3 6.9-4.5 1.9-9.6 1.7-14.5 1.7-17.3.2-35.4 3.8-48.6 15-7.4 6.3-12.8 14.7-18.3 22.7-12.9 18.7-28.6 37.4-50.3 43.9-11.2 3.4-23.4 3.3-33.7 8.8-11.9 6.4-18.9 19-25.2 31-8.2 15.3-11.6 30-19.6 44.7v-72z"
              />
              <path
                fill="none"
                stroke="#001726"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeMiterlimit="10"
                strokeWidth="2.5"
                d="M1.2 283c5.3-9.3 11.8-18 21.1-23 10.3-5.5 22.5-5.5 33.7-8.8 21.8-6.5 37.5-25.2 50.3-43.9 5.5-8 10.9-16.4 18.3-22.7 13.1-11.2 31.3-14.8 48.6-15 4.9 0 9.9.1 14.5-1.7 3.6-1.5 6.5-4.1 9.3-6.9 10.1-10.2 17.9-22.8 29-32 7.9-6.6 18.7-14.7 29.5-13.7 13.9 1.2 25 5.8 38.5-1.5 28.1-15.2 27.8-60.6 56.2-75.1 16.2-8.3 36.9-3.6 52.6-12.7 9.8-5.7 15.9-16.4 23.7-24.5"
              />
              <path
                fill="none"
                stroke="#001726"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeMiterlimit="10"
                strokeWidth="2.5"
                d="M1.2 355c8-14.7 11.7-29.4 19.9-44.9 6.3-11.9 13.3-24.6 25.2-31 10.3-5.5 22.5-5.5 33.7-8.8 21.8-6.5 37.5-25.2 50.3-43.9 5.5-8 10.9-16.4 18.3-22.7 13.1-11.2 31.3-14.8 48.6-15 4.9 0 9.9.1 14.5-1.7 3.6-1.5 6.5-4.1 9.3-6.9 10.1-10.2 17.9-22.8 29-32 7.9-6.6 18.7-14.7 29.5-13.7 13.9 1.2 25 5.8 38.5-1.5 28.1-15.2 27.8-60.6 56.2-75.1 16.2-8.3 36.9-3.6 52.6-12.7 9.8-5.7 15.9-15.8 23.7-24s19.6-14.8 30.1-10.6c11.9 4.8 23.2 3.5 34.9-1.9 4-1.9 7.7-4.4 11.2-7.1"
              />
            </g>

            {/* Flashlight Front (Tilts with arm towards cursor) */}
            <g
              id="flashlightFront"
              style={{
                transform: `translate(${shakeArmX}px, 0) rotate(${armTilt}deg)`,
                transformOrigin: "85px 180px",
                transition: "transform 0.08s ease-out",
              }}
            >
              <path fill="#1A1A1A" d="M83.9 181.4l4.6 26.4 34.6-33.6-24.5-6.2c-8.9-2.6-16.6 3.9-14.7 13.4z" />
              <path fill="#333" d="M91.9 167.8l20.5 7.4-.5 1.2-21.4-8.2c.5-.2 1-.3 1.4-.4z" />
              <path d="M86 171.4c-2 2.5-3 6-2.2 10l4.6 26.4 11.4-11.1L86 171.4z" />
              <path
                fill="url(#flashlightGrad)"
                d="M99.1 183.7c-10.6 9.4-13.4 21.4-9 28.5 4.3 6.8 18 3 28.6-6.4s14.9-23.7 8.8-29c-6.9-6.1-17.8-2.6-28.4 6.9z"
              />
              <path
                fill="#B3B3B3"
                d="M101.6 185.7c-8.2 7.3-11.9 18.2-8.8 23.1 2.6 4.1 13.6-1.1 21.8-8.4s13.6-18.1 9.9-21.6c-4.4-4.2-14.7-.4-22.9 6.9z"
              />
            </g>
          </svg>

          {/* SVG 2: Flashlight Beam + 404 Numbers (Flash Follows Cursor!) */}
          <svg
            id="lightSVG"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 600 470"
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          >
            <defs>
              <filter id="white-glow">
                <feFlood result="flood" floodColor="#ffffff" floodOpacity=".6" />
                <feComposite in="flood" result="mask" in2="SourceGraphic" operator="in" />
                <feMorphology in="mask" result="dilated" operator="dilate" radius="3" />
                <feGaussianBlur in="dilated" result="blurred" stdDeviation="8" />
                <feMerge>
                  <feMergeNode in="blurred" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Flashlight Beam Group: Pivots at (105, 195) to follow cursor! */}
            <g
              id="light"
              style={{
                visibility: isLightOn ? "visible" : "hidden",
                transform: `rotate(${beamDeltaAngle}deg)`,
                transformOrigin: "105px 195px",
                transition: "transform 0.08s ease-out, visibility 0.1s linear",
              }}
            >
              <path
                filter="url(#white-glow)"
                fill="#F8FFE8"
                d="M122.2 177.4c-5.2-1.6-13.6 2.1-20.6 8.3-7.7 6.8-11.4 16.8-9.3 22.1L421 1683h1534V733L122.2 177.4z"
              />
              <path
                opacity="0.7"
                fill="#FFFFFF"
                d="M101.6,185.7c-8.2,7.3-11.9,18.2-8.8,23.1c2.6,4.1,13.6-1.1,21.8-8.4s13.6-18.1,9.9-21.6 C120.1,174.6,109.8,178.4,101.6,185.7z"
              />
            </g>

            {/* 404 Numerical Sculpture */}
            <g id="four04">
              <g opacity={lettersShadowOpacity} id="lettersShadow" className="transition-opacity duration-150">
                <path d="M233.2 408.6l30.6 46.3-51.9 46 22.2 25.8 125.2 37.6 45.1-18.7-45.5-51.9 12.1-18.1-25.3-30.8-26.2-6.5-27.5-37.7z" />
                <path d="M328.9 467.6S391.4 601.5 505 558c88.3-33.8-69.2-108.2-85-116.5-15.8-8.3-76.8 6.9-76.8 6.9l-14.3 19.2z" />
                <path d="M474.2 515.1L505 558l-20.6 50.6 22.3 25.8 162.5 27 48.4-24.3-60.2-42.7 19.1-12.1-38.4-37.4-32.3.6-72-30.3z" />
              </g>

              {/* Number '4' */}
              <path
                className="lettersSide transition-colors duration-150"
                stroke={lettersStroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeMiterlimit="10"
                strokeWidth="2.5"
                fill={lettersSide}
                d="M269.2 316l-17.9 6 15.4.8 19.2-6.4zM220.3 371l12.4 37.8 14 7.4-13.3-40.7zM214.4 317.4c-.3-.8-.5-1.6-.8-2.4-.3-.8-.5-1.7-.8-2.5-.3-.9-.5-1.7-.8-2.6-.3-.9-.6-1.8-.8-2.8-.3-.9-.6-1.9-.8-2.9-.3-1-.6-1.9-.8-2.9-.3-1-.5-1.9-.8-2.9-.3-1-.5-1.9-.8-2.9-.3-1-.5-2-.8-2.9-.3-1-.5-1.9-.8-2.9-.3-1-.5-1.9-.8-2.9-.3-1-.5-1.9-.8-2.9-.3-1-.5-1.9-.8-2.8-.2-.9-.5-1.8-.7-2.7-.2-.9-.5-1.7-.7-2.6l-.6-2.4-10.9 2.8c.2.7.4 1.5.6 2.3l.6 2.4c.2.8.4 1.6.7 2.5s.5 1.7.7 2.6c.2.9.5 1.8.7 2.7.2.9.5 1.8.7 2.7.2.9.5 1.8.7 2.7.2.9.5 1.8.7 2.7.2.9.5 1.8.8 2.7.3.9.5 1.8.8 2.7.3.9.5 1.8.8 2.7.3.9.5 1.8.8 2.7.3.9.5 1.7.8 2.6.3.8.5 1.7.8 2.5.2.8.5 1.6.7 2.3.2.8.5 1.5.7 2.2l6.3 19.3-28.8 9.7 10 2.6 31-10.4-6.8-21zM162.6 243.7l-25 119.5 10.7 32.2 7.6 6.5-11.5-34.7 26.9-128.8z"
              />
              <path
                className="lettersFront transition-colors duration-150"
                stroke={lettersStroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeMiterlimit="10"
                strokeWidth="2.5"
                fill={lettersFront}
                d="M266.7 322.8l19.2-6.5 12.1 37.2-19.2 6.5 13.2 40.6-45.2 15.6-13.3-40.7-77.5 26.4-11.5-34.8 26.9-128.8 61.5-19.9 33.8 104.4zm-62-38.9c-.3-1-.5-1.9-.8-2.8-.2-.9-.5-1.8-.7-2.7-.2-.9-.5-1.7-.7-2.6l-.6-2.4-1.1.4c-.1 1.6-.2 3.2-.4 4.8-.1 1.6-.3 3.2-.4 4.7-.1 1.6-.3 3.1-.5 4.7s-.3 3.1-.5 4.7-.4 3.1-.5 4.7c-.2 1.6-.4 3.2-.6 4.7l-.6 4.8-.6 4.8-6.4 36.8 31-10.4-6.8-20.8c-.3-.8-.5-1.6-.8-2.4-.3-.8-.5-1.7-.8-2.5-.3-.9-.5-1.7-.8-2.6-.3-.9-.6-1.8-.8-2.8-.3-.9-.6-1.9-.8-2.9-.3-1-.6-1.9-.8-2.9-.3-1-.6-1.9-.8-2.9-.3-1-.5-1.9-.8-2.9-.3-1-.5-2-.8-2.9-.3-1-.5-1.9-.8-2.9-.3-1-.5-1.9-.8-2.9-.5-.9-.8-1.9-1-2.8"
              />

              {/* Number '0' */}
              <path
                className="lettersSide transition-colors duration-150"
                stroke={lettersStroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeMiterlimit="10"
                strokeWidth="2.5"
                fill={lettersSide}
                d="M390 347.5c-.1-1.9-.3-3.8-.5-5.5-.2-1.7-.4-3.4-.7-4.9-.3-1.5-.5-2.9-.9-4.3-.3-1.3-.7-2.5-1.1-3.6-.4-1.1-.8-2.1-1.3-3.1-.5-.9-.9-1.8-1.5-2.5-.5-.8-1.1-1.4-1.7-2-.6-.6-1.2-1.1-1.8-1.5-.6-.4-1.3-.7-2-1.1-.7-.3-1.4-.6-2-.8l-2.1-.6c-.7-.2-1.5-.3-2.2-.3h-14.3 1.6l2.1.3c.7.1 1.3.3 2 .5.6.2 1.3.5 1.9.8.6.3 1.2.6 1.8 1 .6.4 1.2.8 1.7 1.3s1.1 1.1 1.5 1.8c.5.7.9 1.5 1.4 2.3.4.9.8 1.8 1.2 2.8.4 1 .7 2.2 1 3.4.3 1.2.6 2.5.8 4 .2 1.4.4 2.9.6 4.5.2 1.6.3 3.3.4 5.1.1 1.8.2 3.8.2 5.8 0 2.1 0 4.3-.1 6.7-.1 2.4-.2 4.9-.4 7.6-.2 2.7-.4 5.5-.7 8.4-.3 2.9-.6 5.7-.9 8.4-.3 2.7-.7 5.2-1 7.5-.4 2.4-.8 4.6-1.2 6.7-.4 2.1-.8 4-1.3 5.8-.5 1.8-.9 3.5-1.4 5.1s-1 3.1-1.5 4.5-1 2.7-1.6 3.9c-.5 1.2-1.1 2.3-1.6 3.3-.3.5-.5.9-.8 1.4-.1.1-.2.3-.3.4-.2.3-.4.6-.6.8-.1.2-.2.3-.3.5-.2.2-.3.5-.5.7-.1.1-.2.3-.4.4-.2.2-.3.4-.5.6l-.4.4-.5.5c-.1.1-.3.2-.4.3-.2.1-.3.3-.5.4-.1.1-.3.2-.4.3-.2.1-.3.2-.5.3-.1.1-.3.2-.4.2-.3.2-.5.3-.8.4-.6.3-1.3.5-2 .7h-.1c-.6.2-1.3.4-1.9.5h-.1c-.6.1-1.3.2-1.9.2H349c-.7-.1-1.3-.2-2-.3h-.1c-.6-.1-1.3-.3-1.9-.5h-.1c-.6-.2-1.2-.5-1.8-.8-.6-.3-1.2-.7-1.8-1.1l11 8.3c.3.2.6.4 1 .6.3.2.6.4 1 .5.3.2.6.3.9.4.3.1.7.3 1 .4h.2l.9.3c.3.1.7.2 1.1.3h.2c.3.1.6.1.9.2.4.1.7.1 1.1.1H363l.9-1.5c.6-1.1 1.2-2.2 1.8-3.5.6-1.3 1.1-2.7 1.7-4.2.5-1.5 1.1-3.1 1.6-4.8.5-1.7 1-3.5 1.5-5.5.5-1.9 1-4 1.4-6.3s.9-4.6 1.3-7.2c.4-2.6.8-5.3 1.1-8.1.4-2.9.7-5.9 1-9 .3-3.2.6-6.2.8-9 .2-2.9.3-5.6.4-8.1.1-2.6.1-5 .1-7.2.1-1.6 0-3.7-.1-5.6zM325.4 293.8c.7-.6 1.3-1.2 2-1.8.2-.2.4-.4.6-.5.8-.7 1.7-1.4 2.6-2.1.2-.1.4-.3.6-.4.7-.5 1.4-1.1 2.2-1.6.3-.2.5-.4.8-.5.8-.5 1.7-1.1 2.5-1.6.1-.1.2-.1.3-.2 1-.6 1.9-1.1 2.9-1.6.2-.1.3-.2.5-.3.9-.5 1.9-.9 2.9-1.3.1-.1.3-.1.4-.2 1-.4 2-.9 3.1-1.2.4-.2.9-.3 1.3-.5.1 0 .2-.1.4-.1.4-.1.8-.3 1.2-.4.1 0 .1 0 .2-.1.5-.1 1-.3 1.5-.4h.1c.5-.1 1-.3 1.5-.4l-11.1 2.7c-.1 0-.3.1-.4.1-.1 0-.3.1-.4.1-.1 0-.3.1-.4.1h-.1c-.1 0-.2.1-.3.1-.3.1-.7.2-1 .3h-.1-.1c-.2.1-.5.1-.7.2-.1 0-.2.1-.4.1-.1 0-.1 0-.2.1-.1 0-.1 0-.2.1-.1 0-.2.1-.3.1-.3.1-.6.2-1 .3-.6.2-1.2.4-1.8.7-.4.2-.7.3-1.1.5-.1.1-.2.1-.4.2-.1 0-.2.1-.3.1-.6.3-1.1.5-1.7.8-.2.1-.5.2-.7.4-.1 0-.2.1-.3.1-.1 0-.1.1-.2.1-.2.1-.3.2-.5.3-.7.4-1.5.8-2.2 1.2-.1.1-.2.1-.3.2-.6.4-1.2.7-1.8 1.1-.2.1-.4.3-.6.4-.1.1-.2.1-.3.2-.1.1-.3.2-.4.3-.7.5-1.3.9-2 1.4-.2.1-.4.3-.5.4-.1.1-.1.1-.2.1-.7.6-1.5 1.2-2.2 1.8-.1 0-.1.1-.2.1-.1.1-.3.2-.4.4-.4.3-.7.6-1.1 1-.3.2-.5.5-.8.7-.2.2-.4.4-.7.6-.8.7-1.5 1.5-2.3 2.3-1.7 1.8-3.2 3.7-4.8 5.7-1.5 2-3 4.2-4.3 6.5-1.4 2.3-2.7 4.7-3.9 7.3-1.2 2.6-2.4 5.3-3.4 8.1-1.1 2.8-2.1 5.8-3 8.9-.9 3.1-1.7 6.3-2.4 9.6s-1.3 6.8-1.9 10.4c-.5 3.6-1 7.3-1.3 11.1-.4 3.8-.6 7.5-.7 11.2-.1 3.6-.2 7.1-.1 10.5.1 3.4.3 6.7.6 9.9s.7 6.3 1.3 9.3c.5 3 1.2 5.9 1.9 8.6.7 2.8 1.5 5.4 2.4 8 .9 2.5 1.9 5 3 7.3s2.3 4.5 3.6 6.6c.4.7.9 1.4 1.3 2.1.4.7.9 1.3 1.4 2s.9 1.3 1.4 1.9l1.5 1.8 8.3 9.9c-.5-.6-1.1-1.3-1.6-2s-1-1.3-1.5-2l-1.5-2.1c-.5-.7-1-1.5-1.4-2.2-1.4-2.3-2.7-4.6-3.9-7.1-1.2-2.5-2.3-5.1-3.2-7.8-1-2.7-1.9-5.6-2.6-8.6-.8-3-1.4-6.1-2-9.3-.6-3.2-1-6.5-1.3-10-.3-3.4-.5-7-.6-10.7-.1-3.7-.1-7.5.1-11.3.1-3.9.4-7.9.8-12s.9-8.1 1.4-12c.6-3.9 1.3-7.6 2-11.2.8-3.6 1.6-7 2.6-10.4 1-3.3 2-6.5 3.2-9.6 1.2-3.1 2.4-6 3.7-8.7 1.3-2.8 2.7-5.4 4.2-7.9s3-4.8 4.7-7c1.6-2.2 3.3-4.2 5.1-6.1.8-.9 1.6-1.7 2.4-2.5.2-.3.4-.5.6-.7z"
              />
              <path
                className="lettersFront transition-colors duration-150"
                stroke={lettersStroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeMiterlimit="10"
                strokeWidth="2.5"
                fill={lettersFront}
                d="M436.1 339.3c.5 3.1 1 6.4 1.3 9.8.3 3.4.5 6.9.6 10.4.1 3.6 0 7.3-.1 11.1-.2 3.8-.4 7.8-.8 11.8-.4 4.1-.9 8-1.5 11.8-.6 3.8-1.3 7.5-2 11-.8 3.5-1.6 6.9-2.6 10.2-1 3.3-2 6.4-3.1 9.5-1.1 3-2.4 5.9-3.6 8.7-1.3 2.8-2.7 5.4-4.1 7.9-1.4 2.5-3 4.9-4.6 7.1-1.6 2.2-3.3 4.3-5 6.3-1.8 2-3.6 3.8-5.5 5.5-1.9 1.7-3.8 3.3-5.8 4.7-2 1.4-4.1 2.7-6.2 3.9-2.1 1.2-4.3 2.2-6.6 3.1-2.3.9-4.6 1.7-6.9 2.3-2.3.6-4.7 1.1-7.2 1.5-2.4.3-4.9.6-7.4.6-2.5.1-5.1 0-7.7-.2-2.6-.2-5.2-.5-7.7-1s-4.9-1.1-7.3-1.8c-2.4-.7-4.6-1.6-6.8-2.6s-4.3-2.1-6.4-3.4c-2.1-1.3-4-2.6-5.9-4.1-1.9-1.5-3.7-3.1-5.4-4.9-1.7-1.8-3.4-3.6-4.9-5.6-1.6-2-3-4.1-4.4-6.4-1.4-2.3-2.7-4.6-3.9-7.1-1.2-2.5-2.3-5.1-3.2-7.8-1-2.7-1.9-5.6-2.6-8.6-.8-3-1.4-6.1-2-9.3-.6-3.2-1-6.5-1.3-10-.3-3.4-.5-7-.6-10.7-.1-3.7-.1-7.5.1-11.3.1-3.9.4-7.9.8-12s.9-8.1 1.4-12c.6-3.9 1.3-7.6 2-11.2.8-3.6 1.6-7 2.6-10.4 1-3.3 2-6.5 3.2-9.6 1.2-3.1 2.4-6 3.7-8.7 1.3-2.8 2.7-5.4 4.2-7.9s3-4.8 4.7-7c1.6-2.2 3.3-4.2 5.1-6.1 1.8-1.9 3.6-3.7 5.5-5.3 1.9-1.6 3.9-3.1 5.9-4.5 2-1.4 4.1-2.6 6.3-3.7 2.1-1.1 4.4-2.1 6.6-2.9 2.3-.8 4.6-1.5 6.9-2.1 2.4-.5 4.8-1 7.2-1.2 2.5-.3 5-.4 7.5-.4 2.6 0 5.2.1 7.8.4 2.6.3 5.1.7 7.6 1.2s4.9 1.2 7.2 1.9c2.3.8 4.6 1.6 6.8 2.7 2.2 1 4.3 2.1 6.4 3.4 2.1 1.3 4 2.6 5.9 4.1 1.9 1.5 3.7 3.1 5.4 4.8 1.7 1.7 3.3 3.6 4.9 5.6 1.5 2 3 4.1 4.3 6.3 1.4 2.2 2.6 4.6 3.8 7 1.2 2.4 2.2 5 3.2 7.7.9 2.7 1.8 5.5 2.5 8.4.5 3 1.1 6 1.7 9.1zm-52 69.5c.5-1.9 1-4 1.4-6.3.4-2.2.9-4.6 1.3-7.2.4-2.6.8-5.3 1.1-8.1.4-2.9.7-5.9 1-9 .3-3.2.6-6.2.8-9 .2-2.9.3-5.6.4-8.1.1-2.6.1-5 .1-7.2 0-2.3-.1-4.3-.2-6.3-.1-1.9-.3-3.8-.5-5.5-.2-1.7-.4-3.4-.7-4.9-.3-1.5-.5-2.9-.9-4.3-.3-1.3-.7-2.5-1.1-3.6-.4-1.1-.8-2.1-1.3-3.1-.5-.9-.9-1.8-1.5-2.5-.5-.8-1.1-1.4-1.7-2-.6-.6-1.2-1.1-1.8-1.5-.6-.4-1.3-.7-2-1.1-.7-.3-1.4-.6-2-.8l-2.1-.6c-.7-.2-1.5-.3-2.2-.3-.8-.1-1.5-.1-2.2-.1-.7 0-1.5.1-2.2.2-.7.1-1.5.2-2.2.4-.7.2-1.4.4-2.1.7-.7.3-1.4.6-2.1 1.1-.7.5-1.4 1-2 1.6-.7.6-1.3 1.4-1.9 2.2-.6.8-1.2 1.7-1.8 2.8-.6 1-1.2 2.1-1.8 3.4-.6 1.2-1.1 2.6-1.7 4-.5 1.5-1.1 3-1.6 4.7-.5 1.7-1 3.5-1.5 5.4-.5 1.9-.9 4-1.4 6.2-.4 2.2-.9 4.6-1.2 7.1-.4 2.5-.8 5.2-1.1 8.1-.3 2.9-.7 5.9-1 9.1-.3 3.2-.6 6.2-.8 9.1-.2 2.9-.3 5.6-.4 8.2-.1 2.6-.1 5-.1 7.3s.1 4.4.2 6.4.3 3.9.4 5.7c.2 1.8.4 3.5.7 5 .3 1.6.5 3 .9 4.4.3 1.4.7 2.6 1.1 3.8.4 1.2.8 2.2 1.3 3.2s.9 1.9 1.5 2.6c.5.8 1.1 1.5 1.6 2.1.6.6 1.2 1.1 1.8 1.6.6.4 1.3.8 2 1.2.7.3 1.3.6 2 .9l2.1.6c.7.2 1.5.3 2.2.3.7.1 1.5.1 2.2 0 .7 0 1.5-.1 2.2-.2.7-.1 1.5-.3 2.2-.5.7-.2 1.4-.5 2.1-.8.7-.3 1.4-.7 2.1-1.2.7-.5 1.4-1.1 2-1.8.7-.7 1.3-1.5 1.9-2.4.6-.9 1.2-1.8 1.8-2.9.6-1.1 1.2-2.2 1.8-3.5.6-1.3 1.1-2.7 1.7-4.2.5-1.5 1.1-3.1 1.6-4.8.6-1.9 1.1-3.7 1.6-5.6"
              />

              {/* Number '4' (Second) */}
              <path
                className="lettersSide transition-colors duration-150"
                stroke={lettersStroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeMiterlimit="10"
                strokeWidth="2.5"
                fill={lettersSide}
                d="M548.6 448.8l-18.7-2.8 13.4 7.7 20.1 2.9zM480.2 475.8l-6 39.3 9.2 13 6.4-42.4zM499.1 425.2c.1-.8.3-1.6.4-2.5.1-.8.3-1.7.4-2.6.1-.9.3-1.8.5-2.7.2-.9.3-1.9.5-2.9s.4-1.9.5-2.9c.2-1 .4-2 .6-2.9l.6-3 .6-3 .6-3 .6-3c.2-1 .4-2 .6-2.9.2-1 .4-2 .6-2.9.2-1 .4-1.9.6-2.8l.6-2.7c.2-.9.4-1.7.6-2.6.2-.8.4-1.7.5-2.5l-10.9-2.4c-.2.7-.3 1.5-.5 2.3-.2.8-.3 1.6-.5 2.4-.2.8-.3 1.7-.5 2.5-.2.9-.4 1.7-.5 2.6l-.6 2.7-.6 2.7-.6 2.7c-.2.9-.4 1.8-.6 2.8-.2.9-.4 1.8-.6 2.8-.2.9-.4 1.8-.5 2.8-.2.9-.3 1.8-.5 2.7-.2.9-.3 1.8-.5 2.7-.2.9-.3 1.8-.5 2.6-.1.9-.3 1.7-.4 2.5-.1.8-.3 1.6-.4 2.4-.1.8-.2 1.5-.4 2.3l-3.1 20.1-30-4.4 7.8 6.9 32.3 4.7 3.3-21.5zM486.2 336.1l-76.3 95.3-5 33.7 3.8 9.2 5.5-36.2 82.1-102.8z"
              />
              <path
                className="lettersFront transition-colors duration-150"
                stroke={lettersStroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeMiterlimit="10"
                strokeWidth="2.5"
                fill={lettersFront}
                d="M543.3 453.7l20.1 2.9-6 38.6-20-2.8-6.5 42.1-47.4-6.5 6.5-42.3-81.1-11.4 5.4-36.2 82.2-102.8 63.8 9.9-17 108.5zm-37.7-62.8c.2-1 .4-1.9.6-2.8l.6-2.7c.2-.9.4-1.7.6-2.6.2-.8.4-1.7.5-2.5l-1.2-.2c-.8 1.4-1.6 2.7-2.5 4.1s-1.7 2.7-2.5 4c-.8 1.3-1.7 2.7-2.5 4-.9 1.3-1.7 2.6-2.6 4-.9 1.3-1.7 2.6-2.6 3.9-.9 1.3-1.8 2.6-2.7 4s-1.8 2.7-2.7 4-1.8 2.7-2.7 4L463.6 442l32.3 4.7 3.3-21.6c.1-.8.3-1.6.4-2.5.1-.8.3-1.7.4-2.6.1-.9.3-1.8.5-2.7.2-.9.3-1.9.5-2.9s.4-1.9.5-2.9c.2-1 .4-2 .6-2.9l.6-3 .6-3 .6-3 .6-3c.2-1 .4-2 .6-2.9.1-.8.3-1.8.5-2.8"
              />
            </g>
          </svg>
        </div>

        {/* Right: Original Content + Academic ERP Navigational Recovery + Authentic College Gate Image */}
        <div className="w-full lg:max-w-xl text-left z-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-[#143B59] text-[#71C5FA] border border-[#235882] mb-4">
            <span className="w-2 h-2 rounded-full bg-[#CC4A6C] animate-pulse"></span>
            <span>HTTP 404 • ROUTE UNRESOLVED</span>
          </div>

          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3">
            Hello?? Is somebody there?!?
          </h3>

          <p className="text-base sm:text-lg text-[#D1E2ED] leading-relaxed mb-6 font-normal">
            We know it’s scary, but the page you’re trying to reach can’t be found. Perhaps it was just a bad{" "}
            <span className="line-through text-[#84A9C0]">link</span> dream?
          </p>

          {/* Interactive Navigation Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#1657D9] hover:bg-[#1248B8] text-white text-sm font-bold shadow-lg shadow-[#1657D9]/25 hover:shadow-[#1657D9]/40 transition-all cursor-pointer"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              <span>Return to Dashboard</span>
            </Link>

            <Link
              href="/#switchboard"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#0D2F47] hover:bg-[#133F5E] text-[#BEE0F8] text-sm font-semibold border border-[#1F547D] transition-all cursor-pointer"
            >
              <Icon name="grid" className="h-4 w-4" />
              <span>Explore All Modules</span>
            </Link>
          </div>

          {/* Authentic College Campus Image Card */}
          <div className="mt-8 p-3 rounded-2xl bg-[#07243A]/80 border border-[#164468] shadow-lg flex items-center space-x-4">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-[#1F537A]">
              <Image
                src="/images/campus-gate.jpeg"
                alt="R. P. Institute of Hospitality & Management Campus Gate, Vasai"
                fill
                sizes="(max-width: 640px) 80px, 96px"
                className="object-cover"
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-[#67B1E0] uppercase tracking-wider block">
                Vasai West Campus
              </span>
              <p className="text-xs font-semibold text-white leading-tight mt-0.5 truncate">
                R. P. Institute of Hospitality & Management
              </p>
              <p className="text-[11px] text-[#93BDD9] leading-normal mt-1">
                Affiliated to University of Mumbai. For syllabus, notices or attendance, navigate via the CampusOS menu.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="w-full border-t border-[#133C5B] bg-[#062135] px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#7BA6C5] gap-2 z-20">
        <div className="flex items-center space-x-2">
          <span>R. P. Institute of Hospitality & Management, Vasai (West)</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Approved by Govt. of Maharashtra</span>
        </div>
        <div className="text-center sm:text-right">
          <span>CampusOS ERP • Academic Session 2026 – 27</span>
        </div>
      </footer>
    </div>
  );
}
