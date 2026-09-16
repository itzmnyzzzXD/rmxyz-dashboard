import './globals.css';

export const metadata = { title: 'RMXYZ Dashboard', description: 'Discord server management for RMXYZ' };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
