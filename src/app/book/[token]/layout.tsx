import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a shoot",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-ground">{children}</div>;
}
