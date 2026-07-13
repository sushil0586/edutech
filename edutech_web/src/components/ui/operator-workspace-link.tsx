import Link, { type LinkProps } from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type OperatorWorkspaceLinkProps = LinkProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "prefetch"> & {
    children: ReactNode;
    prefetch?: boolean;
  };

export function OperatorWorkspaceLink({
  children,
  prefetch = false,
  ...props
}: OperatorWorkspaceLinkProps) {
  return (
    <Link {...props} prefetch={prefetch}>
      {children}
    </Link>
  );
}
