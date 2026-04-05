/**
 * ROOT LAYOUT (layout.tsx)
 * -----------------------
 * Functionality: The high-level wrapper for the entire application.
 * Connection: Provides the font, CSS, and global UI providers (Toast, Tooltip) to every page.
 */
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * PROJECT METADATA
 * Functionality: Sets the browser tab title and description for SEO.
 */
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
