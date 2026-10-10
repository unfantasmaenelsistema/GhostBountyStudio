import React from 'react';
import iconoImg from '../assets/icono.png';

interface GhostLogoProps {
  className?: string;
  size?: number;
  withText?: boolean;
}

export const GhostLogo: React.FC<GhostLogoProps> = ({
  className = '',
  size = 40,
  withText = false,
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Container with exact aspect ratio to prevent ANY distortion */}
      <div
        className="relative flex items-center justify-center shrink-0 rounded-xl bg-slate-900/90 p-1 border border-slate-700/60 shadow-[0_0_20px_rgba(239,68,68,0.2)] group transition-transform hover:scale-105"
        style={{ width: size + 8, height: size + 8 }}
      >
        <img
          src={iconoImg}
          alt="Un Fantasma en el Sistema"
          width={size}
          height={size}
          className="object-contain w-full h-full select-none pointer-events-none drop-shadow-md"
          loading="eager"
          decoding="async"
        />
      </div>

      {withText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-bold tracking-tight text-base text-slate-100 font-mono">
              Ghost<span className="text-emerald-400">Bounty</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
              Studio
            </span>
          </div>
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-400 hover:text-emerald-400 font-medium tracking-wide flex items-center gap-1 transition"
          >
            <span>unfantasmaenelsistema.com</span>
            <span>↗</span>
          </a>
        </div>
      )}
    </div>
  );
};
