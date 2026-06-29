import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-ink-200 px-4 py-6 text-center text-xs text-ink-400">
      <Link href="/privacy" className="text-ink-600 hover:text-brand-600 hover:underline">
        Privacy Policy
      </Link>
      <span className="mx-2">·</span>
      <Link href="/terms" className="text-ink-600 hover:text-brand-600 hover:underline">
        Terms of Service
      </Link>
      <span className="mx-2">·</span>
      <span>© 2026 BoroDesk</span>
    </footer>
  );
}
