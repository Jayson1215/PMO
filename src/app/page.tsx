import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Calendar,
  Shield,
  Bell,
  ArrowRight,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";

/**
 * LANDING PAGE (page.tsx)
 * -----------------------
 * Functionality: The first page users see (Hero section, features, and login links).
 * Connection: Links to /login and /register pages.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-fsuu-blue-900 via-fsuu-blue-800 to-fsuu-blue-700">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fsuu-gold-400">
              <Monitor className="h-5 w-5 text-fsuu-blue-900" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">PMO FSUU</h1>
              <p className="text-xs text-fsuu-gold-300">Equipment Booking System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="gold">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center rounded-full border border-fsuu-gold-400/30 bg-fsuu-gold-400/10 px-4 py-1.5 text-sm text-fsuu-gold-300">
            <Shield className="mr-2 h-4 w-4" />
            Father Saturnino Urios University
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            PMO Equipment{" "}
            <span className="text-fsuu-gold-400">Booking & Monitoring</span>{" "}
            System
          </h1>
          <p className="mb-10 text-lg text-fsuu-blue-200">
            A centralized web system for the Property Management Office that
            allows Faculty, Staff, and Students to borrow and
            reserve university equipment with ease.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" variant="gold" className="gap-2 text-base">
                Start Booking
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="ghost"
                className="gap-2 border border-white/20 text-base text-white hover:bg-white/10 hover:text-white"
              >
                Sign In to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Monitor,
              title: "Equipment Catalog",
              description:
                "Browse projectors, microphones, HDMI cables, speakers, and more available for borrowing.",
            },
            {
              icon: Calendar,
              title: "Smart Scheduling",
              description:
                "Select equipment, quantity, date and time. System prevents overbooking automatically.",
            },
            {
              icon: Bell,
              title: "Email Reminders",
              description:
                "Automatic email notifications 2 hours and 30 minutes before return deadline.",
            },
            {
              icon: Clock,
              title: "Real-time Tracking",
              description:
                "Track booking status from pending to return with real-time dashboard updates.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-fsuu-gold-400/30 hover:bg-white/10"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fsuu-gold-400/10 transition-colors group-hover:bg-fsuu-gold-400/20">
                <feature.icon className="h-6 w-6 text-fsuu-gold-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-fsuu-blue-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/10 bg-white/5 py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-white">
            How It Works
          </h2>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Browse & Select",
                description:
                  "Browse available equipment, check availability, and select what you need.",
              },
              {
                step: "2",
                title: "Book & Submit",
                description:
                  "Fill in booking details, choose dates, and submit your request for approval.",
              },
              {
                step: "3",
                title: "Collect & Return",
                description:
                  "Once approved, collect the equipment and return on time. Get reminders via email.",
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fsuu-gold-400 font-bold text-fsuu-blue-900 text-xl">
                  {step.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="text-sm text-fsuu-blue-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-fsuu-blue-400">
            &copy; {new Date().getFullYear()} Property Management Office — Father
            Saturnino Urios University. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
