import Image from 'next/image';

interface MatchkooLogoProps {
  height?: number;
  className?: string;
}

export default function MatchkooLogo({ height = 32, className = "" }: MatchkooLogoProps) {
  // Cropped PNG: 896×137px → aspect ratio 6.54:1
  const width = Math.round(height * 6.54);

  return (
    <Image
      src="/matchkoo-logo-cropped.png"
      alt="Matchkoo"
      width={width}
      height={height}
      priority
      className={className}
      style={{ height, width, objectFit: 'contain' }}
    />
  );
}
