interface AppLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: number;
}

export default function AppLogo({ name, logoUrl, size = 40 }: AppLogoProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className="shrink-0 rounded-xl border border-border object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl border border-border bg-muted font-semibold text-muted-foreground"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
