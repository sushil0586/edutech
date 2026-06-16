"use client";

import { ReactNode, MouseEvent, startTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmAttemptQuestionNavigation } from "@/components/ui/attempt-question-navigation";

export function AttemptQuestionLink({
  children,
  className,
  formId,
  href,
}: {
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

    startTransition(() => router.push(href));
  }

  return (
    <a className={className} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
