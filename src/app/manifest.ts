import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StyleScout",
    short_name: "StyleScout",
    description: "Clothing picks that learn your taste",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f2",
    theme_color: "#f7f5f2",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
