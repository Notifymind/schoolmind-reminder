import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SchoolMind Reminder",
    short_name: "School Rem.",
    description: "Get reminders for your school exams",
    start_url: "/app?default=true",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icon-192x192.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
