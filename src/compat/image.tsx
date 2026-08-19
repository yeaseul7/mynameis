import type { ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string; priority?: boolean; fill?: boolean; quality?: number };
export default function Image({ priority, fill, quality, style, ...props }: Props) {
  return <img {...props} style={fill ? { ...style, position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" } : style} loading={priority ? "eager" : "lazy"} />;
}
