import Link, { type LinkProps } from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type OperatorWorkspaceLinkProps = LinkProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "prefetch"> & {
    children: ReactNode;
  };

export function OperatorWorkspaceLink({
  children,
  ...props
}: OperatorWorkspaceLinkProps) {
  return (
    <Link {...props} prefetch={false}>
      {children}
    </Link>
  );
}
