import Link from "next/link";

export function PublicPolicyLinks() {
  return <nav aria-label="Policies and support" className="studentAppFooterLinks">
    <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link>
  </nav>;
}
