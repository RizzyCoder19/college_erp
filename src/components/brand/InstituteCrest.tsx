import React from "react";

interface InstituteCrestProps {
  className?: string;
  size?: number;
}

export const InstituteCrest: React.FC<InstituteCrestProps> = ({
  className = "",
  size = 40,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="RPIHM Institutional Crest"
      role="img"
    >
      {/* Outer Golden Shield Outline */}
      <path
        d="M50 4L88 18V50C88 74 50 96 50 96C50 96 12 74 12 50V18L50 4Z"
        fill="#0A192F"
        stroke="#C5A059"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Inner Shield Accent */}
      <path
        d="M50 11L81 22.5V48C81 68 50 88 50 88C50 88 19 68 19 48V22.5L50 11Z"
        fill="#0F233D"
        stroke="#DFB15B"
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />

      {/* Central Division line */}
      <line
        x1="50"
        y1="16"
        x2="50"
        y2="82"
        stroke="#C5A059"
        strokeWidth="1.5"
        strokeDasharray="2 2"
        strokeOpacity="0.4"
      />

      {/* Hospitality Key & Torch Motifs */}
      {/* Torch of Knowledge (Left) */}
      <path
        d="M34 56L37 38H41L44 56H34Z"
        fill="#C5A059"
      />
      <circle cx="39" cy="32" r="4.5" fill="#DFB15B" />
      <path
        d="M39 24C37 27 35 29 39 31C43 29 41 27 39 24Z"
        fill="#E5C378"
      />

      {/* Hospitality Crossed Key (Right) */}
      <circle
        cx="63"
        cy="36"
        r="5.5"
        stroke="#C5A059"
        strokeWidth="2"
        fill="none"
      />
      <rect
        x="62"
        y="41"
        width="2"
        height="18"
        fill="#C5A059"
      />
      <rect
        x="64"
        y="50"
        width="4"
        height="2.5"
        fill="#C5A059"
      />
      <rect
        x="64"
        y="55"
        width="5"
        height="2.5"
        fill="#C5A059"
      />

      {/* Culinary & Hospitality Laurel Ribbon Arc */}
      <path
        d="M28 72C33 76 41 78 50 78C59 78 67 76 72 72"
        stroke="#DFB15B"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Academic Star at Base */}
      <polygon
        points="50,71 51.5,75 55.5,75 52,77.5 53.5,81.5 50,79 46.5,81.5 48,77.5 44.5,75 48.5,75"
        fill="#DFB15B"
      />
    </svg>
  );
};
