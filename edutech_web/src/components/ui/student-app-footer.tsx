import Link from "next/link";

export function StudentAppFooter() {
  return (
    <footer className="studentAppFooter">
      <div className="studentAppFooterInner">
        <p className="studentAppFooterTrust">
          Nexora keeps your student workspace clear, steady, and focused on your next learning step.
        </p>
        <div className="studentAppFooterLinks">
          <Link href="/app/notifications" prefetch={false}>Notifications</Link>
          <Link href="/app/settings" prefetch={false}>Settings</Link>
          <Link href="/privacy" prefetch={false}>Privacy</Link>
          <Link href="/terms" prefetch={false}>Terms</Link>
          <Link href="/support" prefetch={false}>Support</Link>
        </div>
      </div>
    </footer>
  );
}
