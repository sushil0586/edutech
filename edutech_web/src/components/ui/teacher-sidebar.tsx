"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/lib/auth/actions";
import { LogoutButton } from "@/components/ui/logout-button";
import { AccountProfile } from "@/lib/auth/session";

const navItems = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/teacher/exams", label: "Exams", icon: "◫" },
  { href: "/teacher/question-bank", label: "Question Bank", icon: "◌" },
  { href: "/teacher/results", label: "Results", icon: "◎" },
  { href: "/teacher/reviews", label: "Reviews", icon: "◔" },
];

export function TeacherSidebar({ profile }: { profile: AccountProfile }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/teacher/dashboard") {
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
              <small>Teacher Portal</small>
            </span>
          </Link>
          <button
            aria-controls="mobile-teacher-menu"
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
          <div className="mobileWorkspaceNavPanel" id="mobile-teacher-menu">
            <nav className="appSidebarNav" aria-label="Teacher navigation">
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
            <small>Teacher Portal</small>
          </span>
        </Link>

        <nav className="appSidebarNav" aria-label="Teacher navigation">
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
