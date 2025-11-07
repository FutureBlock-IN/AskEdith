import React from 'react';

interface DefaultProfilePictureProps {
  type?: 'daisy' | 'tree';
  size?: number;
  className?: string;
}

const DaisyIcon = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="url(#daisyGradient)" />
    {/* Daisy petals */}
    <g transform="translate(20,20)">
      <ellipse cx="0" cy="-8" rx="2" ry="6" fill="white" transform="rotate(0)" />
      <ellipse cx="0" cy="-8" rx="2" ry="6" fill="white" transform="rotate(45)" />
      <ellipse cx="0" cy="-8" rx="2" ry="6" fill="white" transform="rotate(90)" />
      <ellipse cx="0" cy="-8" rx="2" ry="6" fill="white" transform="rotate(135)" />
      <ellipse cx="0" cy="-8" rx="2" ry="6" fill="white" transform="rotate(180)" />
      <ellipse cx="0" cy="-8" rx="2" ry="6" fill="white" transform="rotate(225)" />
      <ellipse cx="0" cy="-8" rx="2" ry="6" fill="white" transform="rotate(270)" />
      <ellipse cx="0" cy="-8" rx="2" ry="6" fill="white" transform="rotate(315)" />
      {/* Center */}
      <circle cx="0" cy="0" r="3" fill="#F4B942" />
    </g>
    <defs>
      <linearGradient id="daisyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: '#E8D5F3'}} />
        <stop offset="100%" style={{stopColor: '#D1C4E9'}} />
      </linearGradient>
    </defs>
  </svg>
);

const TreeIcon = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="url(#treeGradient)" />
    {/* Tree trunk */}
    <rect x="18" y="25" width="4" height="8" fill="#8B4513" rx="2" />
    {/* Tree foliage */}
    <circle cx="20" cy="18" r="8" fill="#7BB46D" />
    <circle cx="16" cy="15" r="6" fill="#8FBC8F" />
    <circle cx="24" cy="15" r="6" fill="#8FBC8F" />
    <circle cx="20" cy="12" r="5" fill="#9ACD32" />
    <defs>
      <linearGradient id="treeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: '#E8F5E8'}} />
        <stop offset="100%" style={{stopColor: '#D4F1D4'}} />
      </linearGradient>
    </defs>
  </svg>
);

export default function DefaultProfilePicture({ 
  type = 'daisy', 
  size = 40, 
  className = '' 
}: DefaultProfilePictureProps) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {type === 'daisy' ? (
        <DaisyIcon size={size} />
      ) : (
        <TreeIcon size={size} />
      )}
    </div>
  );
}