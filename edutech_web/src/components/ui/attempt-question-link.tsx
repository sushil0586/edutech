"use client";

import { ReactNode, MouseEvent, startTransition } from "react";
import { useRouter } from "next/navigation";
import { rememberAttemptViewport } from "@/components/ui/attempt-navigation-guard";
import { confirmAttemptQuestionNavigation } from "@/components/ui/attempt-question-navigation";

export function AttemptQuestionLink({
  attemptId,
  children,
  className,
  formId,
  href,
}: {
  attemptId: string;
  children: ReactNode;
  className?: string;
  formId?: string;
  href: string;
}) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    if (!confirmAttemptQuestionNavigation(formId)) {
      return;
    }

    rememberAttemptViewport(attemptId);
    startTransition(() => router.push(href, { scroll: false }));
  }

  return (
    <a className={className} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
