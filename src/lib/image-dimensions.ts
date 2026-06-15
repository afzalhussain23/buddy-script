import { imageSize } from "image-size";

export type ImageDimensions = { width: number; height: number };

export function getImageDimensions(bytes: Uint8Array): ImageDimensions | null {
  let result: ReturnType<typeof imageSize>;
  try {
    result = imageSize(bytes);
  } catch {
    return null;
  }

  const { width, height, orientation } = result;
  if (!width || !height) return null;

  // EXIF orientations 5-8 rotate the image 90°, so its displayed dimensions are
  // the encoded width/height swapped; image-size reports the raw encoded values.
  return orientation && orientation >= 5 && orientation <= 8
    ? { width: height, height: width }
    : { width, height };
}
