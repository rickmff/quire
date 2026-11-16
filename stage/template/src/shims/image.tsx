import * as React from "react";
export default function Image({ src, alt, width, height, fill, priority, quality, placeholder, blurDataURL, unoptimized, loader, style, ...rest }: any) {
  const s = typeof src === "object" ? src.src : src;
  return <img src={s} alt={alt} width={fill ? undefined : width} height={fill ? undefined : height} style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style } : style} {...rest} />;
}
