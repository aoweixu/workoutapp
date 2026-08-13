// Renders the app icon (an end-on copper plate on iron) to the PNG sizes the
// manifest needs. Run: npm run icons
import sharp from "sharp";
import { mkdirSync } from "node:fs";

function plateSvg({ size, radius, plateScale }) {
  const c = size / 2;
  const r = (size / 2) * 0.73 * plateScale;
  const rim = r * 0.71;
  const hub = r * 0.25;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <radialGradient id="g" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#d07248"/>
      <stop offset="70%" stop-color="#c65a33"/>
      <stop offset="100%" stop-color="#a34a28"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="#15181e"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="url(#g)"/>
  <circle cx="${c}" cy="${c}" r="${r - r * 0.035}" fill="none" stroke="#00000042" stroke-width="${r * 0.07}"/>
  <circle cx="${c}" cy="${c}" r="${rim}" fill="none" stroke="#00000030" stroke-width="${r * 0.13}"/>
  <circle cx="${c}" cy="${c}" r="${hub}" fill="#15181e"/>
  <circle cx="${c}" cy="${c}" r="${hub}" fill="none" stroke="#00000055" stroke-width="${r * 0.03}"/>
</svg>`;
}

mkdirSync("public/icons", { recursive: true });

const jobs = [
  { file: "public/icons/icon-192.png", size: 192, radius: 42, plateScale: 1 },
  { file: "public/icons/icon-512.png", size: 512, radius: 112, plateScale: 1 },
  { file: "public/icons/icon-maskable.png", size: 512, radius: 0, plateScale: 0.82 },
];

for (const j of jobs) {
  await sharp(Buffer.from(plateSvg(j))).png().toFile(j.file);
  console.log("wrote", j.file);
}
