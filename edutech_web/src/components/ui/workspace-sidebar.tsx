"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/lib/auth/actions";
import { LogoutButton } from "@/components/ui/logout-button";
import type { AccountProfile } from "@/lib/auth/session";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: string;
};

export function WorkspaceSidebar({
  profile,
  portalLabel,
  ariaLabel,
  navItems,
  footerContent,
}: {
  profile: AccountProfile;
  portalLabel: string;
  ariaLabel: string;
  navItems: WorkspaceNavItem[];
  footerContent?: ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function isActive(href: string) {
    if (href.endsWith("/dashboard")) {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <div className="mobileWorkspaceNav">
        <div className="mobileWorkspaceNavBar">
          <Link className="brand" href="/">
            <span className="brandMark">N</span>
            <span className="brandText">
              <strong>Nexora</strong>
              <small>{portalLabel}</small>
            </span>
          </Link>
          <button
            aria-controls="mobile-workspace-menu"
            aria-expanded={isMobileMenuOpen}
            className="mobileWorkspaceNavToggle"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            type="button"
          >
            <span aria-hidden="true">{isMobileMenuOpen ? "×" : "☰"}</span>
            <span>{isMobileMenuOpen ? "Close" : "Menu"}</span>
          </button>
        </div>

        {isMobileMenuOpen ? (
          <div className="mobileWorkspaceNavPanel" id="mobile-workspace-menu">
            <nav className="appSidebarNav" aria-label={ariaLabel}>
              {navItems.map((item) => (
                <Link
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`appSidebarLink ${isActive(item.href) ? "appSidebarLinkActive" : ""}`}
                  href={item.href}
                  key={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="appSidebarIcon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="appSidebarFooter">
              {footerContent}
              <div className="sidebarProfile">
                <strong>{profile.username}</strong>
                <span>{profile.role.replaceAll("_", " ")}</span>
              </div>
              <form action={logoutAction}>
                <LogoutButton />
              </form>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="appSidebar appSidebarDesktop">
        <Link className="brand" href="/">
          <span className="brandMark">N</span>
          <span className="brandText">
            <strong>Nexora</strong>
            <small>{portalLabel}</small>
          </span>
        </Link>

        <nav className="appSidebarNav" aria-label={ariaLabel}>
          {navItems.map((item) => (
            <Link
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`appSidebarLink ${isActive(item.href) ? "appSidebarLinkActive" : ""}`}
              href={item.href}
              key={item.href}
            >
              <span className="appSidebarIcon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="appSidebarFooter">
          {footerContent}
          <div className="sidebarProfile">
            <strong>{profile.username}</strong>
            <span>{profile.role.replaceAll("_", " ")}</span>
          </div>
          <form action={logoutAction}>
            <LogoutButton />
          </form>
        </div>
      </aside>
    </>
  );
}
