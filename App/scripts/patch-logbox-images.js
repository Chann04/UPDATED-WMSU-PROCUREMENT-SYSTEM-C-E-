#!/usr/bin/env node
/**
 * Patches react-native's LogBox by adding missing LogBoxImages (chevron-left.png, etc.)
 * so Metro can resolve them. The npm package sometimes omits these assets.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const logBoxImagesDir = path.join(
  root,
  "node_modules",
  "react-native",
  "Libraries",
  "LogBox",
  "UI",
  "LogBoxImages"
);

// Minimal valid 1x1 transparent PNG (67 bytes)
const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFeQGNT8xVggAAAABJRU5ErkJggg==",
  "base64"
);

const IMAGES = [
  "chevron-left.png",
  "chevron-right.png",
  "close.png",
  "alert-triangle.png",
  "loader.png",
];

try {
  if (!fs.existsSync(logBoxImagesDir)) {
    fs.mkdirSync(logBoxImagesDir, { recursive: true });
  }
  for (const name of IMAGES) {
    const filePath = path.join(logBoxImagesDir, name);
    fs.writeFileSync(filePath, MINIMAL_PNG);
  }
  console.log("Patched LogBoxImages for react-native.");
} catch (err) {
  console.warn("patch-logbox-images: Could not patch (run after npm install):", err.message);
}
