import Link, { type LinkProps } from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type StudentWorkspaceLinkProps = LinkProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "prefetch"> & {
    children: ReactNode;
  };

export function StudentWorkspaceLink({
  children,
  ...props
}: StudentWorkspaceLinkProps) {
  return (
    <Link {...props} prefetch={false}>
      {children}
    </Link>
  );
}
