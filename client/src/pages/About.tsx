import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { Link } from "react-router-dom";
import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  Check,
  Goal,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const VALUES = [
  {
    icon: CalendarCheck,
    title: "Simple booking",
    text: "See real availability and choose your booking hours in seconds — no calls, no back-and-forth.",
  },
  {
    icon: UsersRound,
    title: "Community first",
    text: "Friends and teams live next to your bookings, so the next match is easy to organise.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted reviews",
    text: "Ratings and reviews come from players who actually played on the pitch.",
  },
  {
    icon: Building2,
    title: "Owner tools",
    text: "Courts, opening hours, bookings and promotions managed from one clear dashboard.",
  },
];

const PLAYER_POINTS = [
  "Search courts by city and sport",
  "Request or cancel a court booking online",
  "Create teams and add friends",
  "Leave a review after you play",
];

const OWNER_POINTS = [
  "List your courts and set opening hours",
  "Confirm or cancel incoming bookings",
  "Publish tournaments, discounts and price changes",
  "Keep an eye on every booking in one place",
];

export function About() {
  useLanguage();
  return (
    <div className="min-h-screen pb-4">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-emerald-600 to-teal-700 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-14 text-center sm:py-16">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Goal className="h-3.5 w-3.5" /> {t("About FootballMatch")} </span>
          </FadeIn>
          <FadeIn delay={0.06}>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl"> {t("Booking a pitch should be the easy part")} </h1>
          </FadeIn>
          <FadeIn delay={0.12}>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 sm:text-lg"> {t("FootballMatch brings court discovery, online bookings, teams and reviews together — so players spend less time organising and more time playing.")} </p>
          </FadeIn>
          <FadeIn delay={0.18}>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="rounded-full bg-white text-primary hover:bg-white/90"
              >
                <Link to="/"> {t("Find a court")} <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link to="/contact">{t("Contact us")}</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </div>
      {/* Story + mission */}
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          <FadeIn>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{t("Why we built FootballMatch")}</h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                <p> {t("It started with a familiar frustration: finding an open pitch and confirming a time took more calls than the match itself.")} </p>
                <p> {t("FootballMatch puts court discovery, bookings, teams, friends, events and reviews in one place — for players who just want to play, and for owners who want their courts full.")} </p>
                <p> {t("We are not trying to replace the local game. We want to remove the admin around it so more people get on the pitch.")} </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <Card className="panel-accent border-transparent">
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary"> {t("Our mission")} </p>
                <p className="mt-2 text-lg font-semibold text-foreground"> {t("Make organising a football match as easy as sending a message — for every player and every court.")} </p>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t("No phone calls to check availability")} </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t("One place for bookings, teams and friends")} </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t("Owner tools that stay out of the way")} </li>
                </ul>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>

      {/* Values */}
      <div className="mx-auto max-w-5xl px-4 pb-4">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold text-foreground">{t("What we care about")}</h2>
          <p className="text-sm text-muted-foreground"> {t("The principles behind every screen we build")} </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {VALUES.map((value, i) => (
            <FadeIn key={value.title} delay={i * 0.06}>
              <Card className="h-full">
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <value.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t(value.title)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t(value.text)}</p>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* Built for players and owners */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold text-foreground">{t("Built for both sides of the game")}</h2>
          <p className="text-sm text-muted-foreground"> {t("Whether you play every week or run the pitch")} </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FadeIn>
            <Card className="h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <UsersRound className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{t("For players")}</h3>
                </div>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {PLAYER_POINTS.map((point) => (
                    <li key={point} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {t(point)}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 w-full rounded-full sm:w-auto">
                  <Link to="/"> {t("Find a court")} <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.08}>
            <Card className="h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Building2 className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{t("For court owners")}</h3>
                </div>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {OWNER_POINTS.map((point) => (
                    <li key={point} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {t(point)}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-6 w-full rounded-full sm:w-auto">
                  <Link to="/owner/courts/create"> {t("List your court")} <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto max-w-5xl px-4 pb-8">
        <Card className="border-transparent bg-gradient-to-br from-primary via-emerald-600 to-teal-700 text-white">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h2 className="text-xl font-bold">{t("Ready to get on the pitch?")}</h2>
              <p className="mt-1 text-sm text-white/85"> {t("Find a court near you, or list your own in minutes.")} </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                asChild
                variant="secondary"
                className="rounded-full bg-white text-primary hover:bg-white/90"
              >
                <Link to="/">{t("Browse courts")}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link to="/contact">{t("Contact us")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
