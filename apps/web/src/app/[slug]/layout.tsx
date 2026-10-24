import localFont from 'next/font/local';
import './evening.css';

const sans = localFont({
  src: './fonts/albert-sans.woff2',
  weight: '300 700',
  display: 'swap',
  variable: '--ev-font-sans',
});

const script = localFont({
  src: './fonts/pinyon-script.woff2',
  weight: '400',
  display: 'swap',
  variable: '--ev-font-script',
});

/** Every guest-facing route shares the Evening look; admin and host never pass through here. */
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return <div className={`ev ${sans.variable} ${script.variable}`}>{children}</div>;
}
