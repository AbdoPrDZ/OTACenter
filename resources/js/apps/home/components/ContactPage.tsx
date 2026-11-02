import { useEffect, useMemo, useState } from "react";
import { BookOpen, Bug, ChevronDown, Lightbulb, Mail, Send, type LucideIcon } from "lucide-react";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import GithubIcon from "@/components/site/GithubIcon";
import { AUTHOR, AUTHOR_URL, ISSUES_URL, REPO_URL, contactEmail } from "@/components/site/site";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldError, FieldLabel, Input, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const TOPICS = [
  { value: "question", label: "General question", icon: Mail },
  { value: "bug", label: "Bug report", icon: Bug },
  { value: "feature", label: "Feature request", icon: Lightbulb },
] as const;

type Topic = (typeof TOPICS)[number]["value"];

const FAQ = [
  {
    q: "Where do I download an app?",
    a: "Public apps are in the App Store. Apps limited to your organization are in the dashboard's store once you sign in — or through a download link / QR code shared with you.",
  },
  {
    q: "I can't see an app I need.",
    a: "Access is granted per domain. Ask your OTACenter administrator to add you (or the app) to the right domain.",
  },
  {
    q: "How do I integrate the OTA client in my app?",
    a: "Follow the client SDK guide in the documentation — it covers install, the update check and bundle rollback.",
  },
];

export default function ContactPage() {
  const email = useMemo(() => contactEmail(), []);
  const [topic, setTopic] = useState<Topic>("question");
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "Contact — OTACenter";
  }, []);

  const channels: { icon: LucideIcon | typeof GithubIcon; title: string; text: string; href: string; cta: string }[] = [
    ...(email
      ? [{ icon: Mail, title: "E-mail", text: "Write to the team directly.", href: `mailto:${email}`, cta: email }]
      : []),
    { icon: Bug, title: "Report a bug", text: "Something broken? Open an issue with the steps to reproduce.", href: `${ISSUES_URL}/new`, cta: "Open an issue" },
    { icon: BookOpen, title: "Documentation", text: "Guides for the dashboard, the API and the client SDK.", href: "/docs", cta: "Read the docs" },
    { icon: GithubIcon, title: "GitHub", text: `Follow ${AUTHOR} and the project on GitHub.`, href: AUTHOR_URL, cta: `@${AUTHOR}` },
  ];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Please tell us your name.";
    if (from.trim() && !/^\S+@\S+\.\S+$/.test(from.trim())) next.from = "That doesn't look like an e-mail address.";
    if (!subject.trim()) next.subject = "Add a short subject.";
    if (message.trim().length < 10) next.message = "Please write at least a couple of words.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const topicLabel = TOPICS.find((item) => item.value === topic)!.label;
    const body = [message.trim(), "", "—", `${name.trim()}${from.trim() ? ` <${from.trim()}>` : ""}`, `Topic: ${topicLabel}`].join("\n");

    const url = email
      ? `mailto:${email}?subject=${encodeURIComponent(`[OTACenter] ${subject.trim()}`)}&body=${encodeURIComponent(body)}`
      : `${ISSUES_URL}/new?title=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body)}${
          topic === "bug" ? "&labels=bug" : topic === "feature" ? "&labels=enhancement" : ""
        }`;

    if (email) window.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
    setSent(true);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader active="contact" />

      <main className="flex-1 animate-page-in">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center md:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary" />
              We usually reply within a few days
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Get in touch</h1>
            <p className="max-w-xl text-base/relaxed text-muted-foreground">
              Questions, bug reports or ideas for OTACenter — pick the channel that suits you, or use the form.
            </p>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-14 lg:grid-cols-[1fr_1.25fr]">
          {/* Channels + FAQ */}
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {channels.map((channel, index) => {
                const Icon = channel.icon;
                const external = channel.href.startsWith("http");
                return (
                  <a
                    key={channel.title}
                    href={channel.href}
                    {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                    style={{ animationDelay: `${index * 60}ms` }}
                    className="group flex animate-slide-up items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="size-4.5" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold">{channel.title}</span>
                      <span className="text-xs/relaxed text-muted-foreground">{channel.text}</span>
                      <span className="mt-1 truncate text-xs font-medium text-primary group-hover:underline">{channel.cta}</span>
                    </span>
                  </a>
                );
              })}
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Frequently asked</h2>
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-border bg-card px-4 py-3 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                    {item.q}
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm/relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={submit}
            noValidate
            className="flex h-fit flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8"
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-tight">Send a message</h2>
              <p className="text-xs/relaxed text-muted-foreground">
                {email
                  ? "Sending opens your e-mail app with the message ready to go."
                  : "Sending opens a pre-filled GitHub issue in a new tab — review it there and submit."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Topic">
              {TOPICS.map((item) => {
                const Icon = item.icon;
                const selected = topic === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTopic(item.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="contact-name">Name</FieldLabel>
                <FieldContent>
                  <Input id="contact-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
                  <FieldError>{errors.name}</FieldError>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="contact-email">E-mail (optional)</FieldLabel>
                <FieldContent>
                  <Input
                    id="contact-email"
                    type="email"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    autoComplete="email"
                    placeholder="So we can reply"
                  />
                  <FieldError>{errors.from}</FieldError>
                </FieldContent>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="contact-subject">Subject</FieldLabel>
              <FieldContent>
                <Input id="contact-subject" value={subject} maxLength={120} onChange={(event) => setSubject(event.target.value)} />
                <FieldError>{errors.subject}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="contact-message">Message</FieldLabel>
              <FieldContent>
                <Textarea
                  id="contact-message"
                  rows={6}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={topic === "bug" ? "What happened, what you expected, and the steps to reproduce it." : "How can we help?"}
                />
                <FieldError>{errors.message}</FieldError>
              </FieldContent>
            </Field>

            <Button type="submit" size="lg" className="w-full">
              {email ? <Send /> : <GithubIcon />} {email ? "Send message" : "Continue on GitHub"}
            </Button>

            {sent ? (
              <p className="animate-fade-in text-center text-xs text-success">
                {email ? "Your e-mail app should open now." : "The issue form opened in a new tab."} Thanks for reaching out!
              </p>
            ) : (
              <p className="text-center text-[0.6875rem] text-muted-foreground">
                Or browse existing{" "}
                <a href={ISSUES_URL} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  issues
                </a>{" "}
                and the{" "}
                <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  repository
                </a>
                .
              </p>
            )}
          </form>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
