import type { AnchorHTMLAttributes, ReactNode } from "react";

type StudentPassiveNavLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
};

export function StudentPassiveNavLink({
  children,
  href,
  ...props
}: StudentPassiveNavLinkProps) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
