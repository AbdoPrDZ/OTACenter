<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ config('app.name', 'OTACenter') }}</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  @fonts
  @vite(['resources/css/app.css'])
</head>

<body class="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-6 text-foreground">
  <div class="flex flex-col items-center gap-3 text-center">
    <span class="font-display text-2xl font-semibold tracking-tight">OTACenter</span>
    <p class="max-w-md text-sm text-muted-foreground">
      Over-The-Air application distribution &amp; management platform.
    </p>
  </div>

  <div class="flex items-center gap-3">
    @auth
      <a href="{{ url('/dashboard') }}"
        class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
        Open dashboard
      </a>
    @else
      <a href="{{ route('auth') }}"
        class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
        Sign in
      </a>
    @endauth
  </div>
</body>

</html>
