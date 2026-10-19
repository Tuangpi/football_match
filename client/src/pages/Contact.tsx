import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FadeIn } from "@/components/motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Clock, Mail, MessageSquare, Send, UsersRound } from "lucide-react";

const SUPPORT_EMAIL = "contact@footballmatch.app";

const FAQS = [
  {
    q: "How do I book a court?",
    a: "Browse courts from the home page, open the court you like and choose a date and whole-hour start/end times. Bookings start as pending until the court owner confirms.",
  },
  {
    q: "Can I cancel a booking?",
    a: "Yes. Open My bookings from the account menu and cancel your booking. It becomes available to other players again.",
  },
  {
    q: "How do I list my court?",
    a: "Register as a court owner, then go to Manage → My courts → Add a court. Set weekly opening hours and an hourly price. Players choose their own booking times.",
  },
  {
    q: "Can I pay through FootballMatch?",
    a: "Online payments are not supported yet. Arrange payment directly with the court owner when you play.",
  },
  {
    q: "I found a problem with a court. What should I do?",
    a: "Send us the court name and a short description using the form on this page and we will look into it.",
  },
];

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const EMPTY_FORM: FormState = { name: "", email: "", subject: "", message: "" };

export function Contact() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Prefill from the signed-in account without overwriting anything already typed.
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((f) => ({
      ...f,
      name: f.name || user.playerProfile?.fullName || "",
      email: f.email || user.email,
    }));
  }, [user]);

  function update(field: keyof FormState) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = `From: ${form.name} (${form.email})\n\n${form.message}`;
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      form.subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast.success("Opening your email app — just press send.");
  }

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
        <div className="relative mx-auto max-w-5xl px-4 py-12 text-center sm:py-14">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Mail className="h-3.5 w-3.5" /> Contact us
            </span>
          </FadeIn>
          <FadeIn delay={0.06}>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
              We&apos;d love to hear from you
            </h1>
          </FadeIn>
          <FadeIn delay={0.12}>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
              Questions about a booking, your court listing, or something not working? Send us a
              message and we will help you out.
            </p>
          </FadeIn>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Message form */}
          <div className="lg:col-span-3">
            <FadeIn>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-primary" /> Send us a message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name">Your name</Label>
                        <Input
                          id="contact-name"
                          required
                          autoComplete="name"
                          placeholder="Alex Morgan"
                          value={form.name}
                          onChange={update("name")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-email">Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={update("email")}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-subject">Subject</Label>
                      <Input
                        id="contact-subject"
                        required
                        placeholder="How can we help?"
                        value={form.subject}
                        onChange={update("subject")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-message">Message</Label>
                      <Textarea
                        id="contact-message"
                        required
                        rows={6}
                        placeholder="Tell us what's on your mind…"
                        value={form.message}
                        onChange={update("message")}
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        This opens your email app with the message ready to send.
                      </p>
                      <Button type="submit" className="rounded-full">
                        <Send /> Send message
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
          {/* Contact details */}
          <div className="space-y-4 lg:col-span-2">
            <FadeIn delay={0.08}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mail className="h-5 w-5 text-primary" /> Other ways to reach us
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Email</p>
                      <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {SUPPORT_EMAIL}
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Response time</p>
                      <p className="text-sm text-muted-foreground">
                        We usually reply within one business day.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Community</p>
                      <p className="text-sm text-muted-foreground">
                        Questions about teams, friends or bookings are welcome too.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.14}>
              <Card>
                <CardContent className="space-y-2 p-5 text-sm">
                  <p className="font-medium text-foreground">Looking for something specific?</p>
                  <Link
                    to="/"
                    className="block text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Browse courts →
                  </Link>
                  <Link
                    to="/about"
                    className="block text-muted-foreground transition-colors hover:text-foreground"
                  >
                    About FootballMatch →
                  </Link>
                  <Link
                    to="/events"
                    className="block text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Court events →
                  </Link>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-5xl px-4 pb-8">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold text-foreground">Frequently asked questions</h2>
          <p className="text-sm text-muted-foreground">
            Quick answers to the most common questions
          </p>
        </div>
        <Card>
          <CardContent className="divide-y divide-border/60 p-2 sm:p-4">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group px-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-4 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
