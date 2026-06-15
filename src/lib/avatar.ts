// Deterministic avatar derived from a stable user key (name or email), so the
// same user shows the same avatar everywhere in the app. Real user images
// aren't uploaded yet (auth.user.image is null), so without this we fell back
// to assorted static placeholders that differed by context — making one user
// look like several. Keyed by the user's name/email instead, each user gets a
// stable pick from the bundled headshot set below. Swap in auth.user.image at
// the call sites once uploads land.
//
// These are the local /public/assets/images/f1..f9.png headshots — no
// third-party service and no network request beyond the app's own assets.
const AVATARS = Array.from(
  { length: 9 },
  (_, i) => `/assets/images/f${i + 1}.png`,
);

// FNV-1a — small, fast, well-distributed string hash. Not cryptographic; we
// only need a stable number from the key to index into AVATARS deterministically.
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function avatarUrl(seed: string | null | undefined): string {
  const key = (seed ?? "").trim().toLowerCase() || "anonymous";
  return AVATARS[hash(key) % AVATARS.length];
}
