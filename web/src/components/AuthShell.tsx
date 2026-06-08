import Link from 'next/link';

/** Centered glass-card layout shared by the auth pages. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="app-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 block text-center text-sm font-medium text-white/60 hover:text-white"
        >
          ← StellarX NFT
        </Link>
        <div className="glass-card rounded-2xl p-7">
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-white/60">{footer}</div>}
      </div>
    </main>
  );
}
