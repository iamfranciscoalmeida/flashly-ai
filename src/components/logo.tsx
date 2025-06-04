import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <Image 
      src="/logo.png" 
      alt="StudyWithAI Logo" 
      width={size} 
      height={size} 
      className={className}
    />
  );
} 