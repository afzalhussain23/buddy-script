import Image from "next/image";
import type { CSSProperties } from "react";
import { avatarUrl } from "@/lib/avatar";

export function Avatar({
  name,
  image,
  size,
  className,
  style,
}: {
  name: string;
  image?: string | null;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Image
      src={image ?? avatarUrl(name)}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{
        ...style,
        borderRadius: "50%",
        flexShrink: 0,
        height: size,
        objectFit: "cover",
        width: size,
      }}
    />
  );
}
