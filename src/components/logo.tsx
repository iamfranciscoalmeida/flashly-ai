import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 64, className = "" }: LogoProps) {
  return (
    <Image 
      src="/logo_no_background.png" 
      alt="StudyWithAI Logo" 
      width={size} 
      height={size} 
      className={className}
    />
  );
} 