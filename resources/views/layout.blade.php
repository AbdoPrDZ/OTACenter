@props(['title' => env('APP_NAME', 'OTACenter'), 'app_path'])

<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-app-env="{{ env('APP_ENV') }}" class="dark">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0f1020">
  <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests" />
  <meta name="csrf-token" content="{{ csrf_token() }}">

  <title>{{ $title }}</title>

  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="mask-icon" href="/favicon.svg" color="#6366f1" />

  {{-- Apply the stored theme before first paint to avoid a flash. --}}
  <script>
    (function () {
      try {
        var stored = localStorage.getItem('otacenter-theme') || 'dark';
        var dark = stored === 'dark' || (stored === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', dark);
      } catch (e) {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>

  @fonts
  @viteReactRefresh
  @vite($app_path)
</head>

<body class="min-h-dvh bg-background text-foreground antialiased">
  <div id="root"></div>
</body>

</html>
