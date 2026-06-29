import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Protoface + VideoSDK Starter',
  description: 'A realtime Protoface avatar starter for VideoSDK AI agents.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
