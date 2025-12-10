import type { Metadata, Viewport } from "next";
import ChessTimer from "./components/ChessTimer";

export const metadata: Metadata = {
  title: "Next.js Chess Timer",
  description: "Aplikasi Jam Catur Real-time Local Network",
  icons: {
    icon: "/favicon.ico", // Pastikan ada favicon standar Next.js atau ganti logo Anda
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a", // Warna status bar (sesuai bg-gray-900)
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Mencegah user melakukan cubit (pinch) untuk zoom
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <ChessTimer />
    </main>
  );
}