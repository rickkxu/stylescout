// Browser-side helpers.

export async function api<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: json !== undefined ? { "content-type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 401) {
    // Full reload so the proxy can redirect cleanly.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
    throw new Error("Please log in");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

// Shrink photos on the device before upload so they stay small and fast.
export async function resizeImage(file: File, maxSide = 1400): Promise<Blob> {
  const bitmap = await decodeImage(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo"))), "image/jpeg", 0.85),
  );
}

// Most browsers can't decode iPhone HEIC photos, so fall back to a WebAssembly decoder,
// loaded only when needed.
async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch (err) {
    const { isHeic, heicTo } = await import("heic-to/next");
    const heic = /\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/i.test(file.type) || (await isHeic(file).catch(() => false));
    if (!heic) throw err;
    try {
      return await heicTo({ blob: file, type: "bitmap" });
    } catch {
      throw new Error("Couldn't read that HEIC photo. Try exporting it as a JPEG.");
    }
  }
}

export function formatPrice(price: number | null, currency: string | null) {
  if (price == null) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: price % 1 ? 2 : 0 }).format(price);
  } catch {
    return `$${price}`;
  }
}

export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
