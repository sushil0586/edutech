import { PasswordResetConfirmForm } from "@/components/auth/password-reset-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const request = Array.isArray(params.request) ? params.request[0] : params.request ?? "";
  const token = Array.isArray(params.token) ? params.token[0] : params.token ?? "";
  return <main className="authPage"><div className="authCard authCardTall"><h1>Set a new password</h1>{request && token ? <PasswordResetConfirmForm request={request} token={token} /> : <p className="authError">This reset link is incomplete. Request a new one.</p>}</div></main>;
}
