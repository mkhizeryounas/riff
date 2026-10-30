import './globals.css';

export const metadata = {
  title: 'Riff · Shared code pads',
  description: 'A code pad you share with a link. Edit the same file together in real time and run it in 11 languages. No accounts.',
  icons: { icon: '/logo.svg' },
};

// Applies the saved (or system) theme before first paint, so there's no flash.
const themeScript = `try{const t=localStorage.getItem('riff:theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t}catch{}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
