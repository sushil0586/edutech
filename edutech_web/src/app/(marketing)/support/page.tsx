import Link from "next/link";
import { SupportRequestForm } from "@/components/auth/support-request-form";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";

export default async function SupportPage() {
  const profile = await fetchCurrentAccountProfile();
  return <main className="container marketingFinalCta"><article><span className="eyebrow">Support</span><h1>Get help with Nexora</h1><p>For exam access or schedule questions, contact your institute first. For account, privacy, export or deletion requests, use the verified form below.</p><h2>Response ownership</h2><p>Institute administrators own roster and academic questions. Platform operations owns security, privacy routing and service incidents. The academic lead owns content-correction escalations.</p>{profile ? <SupportRequestForm /> : <p><Link className="button buttonPrimary" href="/login">Sign in to submit a verified request</Link></p>}<p>Do not include passwords, answer text or another learner’s personal information.</p><p><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></p></article></main>;
}
