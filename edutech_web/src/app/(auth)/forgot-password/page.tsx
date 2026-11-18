import Link from "next/link";
import { PasswordResetRequestForm } from "@/components/auth/password-reset-form";

export default function ForgotPasswordPage() {
  return <main className="authPage"><div className="authCard authCardTall"><h1>Recover your account</h1><p>Enter your username or email. We’ll send instructions if an active account matches.</p><PasswordResetRequestForm /><p className="authSupportText">Pilot users can also contact their institute administrator through the established support route.</p><Link href="/">Home</Link></div></main>;
}
