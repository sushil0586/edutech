import Link from "next/link";

export function StudentAppFooter() {
  return (
    <footer className="studentAppFooter">
      <div className="studentAppFooterInner">
        <p className="studentAppFooterTrust">
          Nexora keeps your student workspace calm, consistent, and aligned with real backend learning data.
        </p>
        <div className="studentAppFooterLinks">
          <Link href="/app/notifications" prefetch={false}>Notifications</Link>
          <Link href="/app/settings" prefetch={false}>Settings</Link>
        </div>
      </div>
    </footer>
  );
}
