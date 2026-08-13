"use client";

import { useCallback } from "react";

/** <video> que se engancha a un MediaStream (autoplay, sin audio propio). */
export default function VideoSurface({
  stream,
  mirror = false,
  contain = false,
}: {
  stream: MediaStream;
  mirror?: boolean;
  contain?: boolean;
}) {
  const attach = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && el.srcObject !== stream) el.srcObject = stream;
    },
    [stream],
  );

  return (
    <video
      ref={attach}
      autoPlay
      playsInline
      muted
      className={`absolute inset-0 h-full w-full ${
        contain ? "object-contain" : "object-cover"
      } ${mirror ? "-scale-x-100" : ""}`}
    />
  );
}
