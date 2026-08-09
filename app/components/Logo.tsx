import Image from "next/image";

export function LogoSVG() {
  return (
    <Image
      src="/avg-connects-logo.png"
      alt="AVG Connects"
      width={64}
      height={64}
      priority
      className="h-full w-full object-contain"
    />
  );
}
