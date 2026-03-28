import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "PMO Equipment Booking & Monitoring System | FSUU",
  description:
    "Property Management Office Equipment Booking & Monitoring System for Father Saturnino Urios University",
  keywords: ["PMO", "FSUU", "equipment booking", "university"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
