export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".heic") || name.endsWith(".heif")) return true;
  const mime = (file.type || "").toLowerCase();
  return mime === "image/heic" || mime === "image/heif";
}
