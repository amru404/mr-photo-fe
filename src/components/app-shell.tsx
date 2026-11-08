"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, LogOut, Menu, Plus, UserRound, X } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Skeleton } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useRequireUser, useSetUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { initial } from "@/lib/format";
import type { User } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Overview", match: (path: string) => path === "/dashboard" },
  { href: "/projects", label: "Projects", match: (path: string) => path.startsWith("/projects") && path !== "/projects/new" },
  { href: "/activity", label: "Activity", match: (path: string) => path.startsWith("/activity") },
];

function useLogout() {
  const router = useRouter();
  const setUser = useSetUser();
  return async () => {
    await api.post("/auth/logout");
    setUser(null);
    router.replace("/login");
  };
}

/** Avatar button with a small menu: who is signed in, profile, log out. */
function AccountMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const logout = useLogout();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 items-center gap-1.5 rounded-full ps-0.5 pe-2 text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-ground">{initial(user.name)}</span>
        <ChevronDown className="size-3.5" />
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div role="menu" className="absolute end-0 top-11 z-50 w-64 rounded-card border border-line bg-surface p-1.5 shadow-float">
          <div className="px-2.5 pb-2.5 pt-2">
            <p className="truncate text-sm font-semibold text-ink">{user.brand_name || user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="border-t border-rule pt-1.5">
            <Link role="menuitem" href="/profile" className="flex h-9 items-center gap-2.5 rounded-control px-2.5 text-sm text-ink hover:bg-raised">
              <UserRound className="size-4 text-muted" />
              Profile &amp; password
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={logout}
              className="flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-sm text-ink hover:bg-raised"
            >
              <LogOut className="size-4 text-muted" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Top-bar shell: the wordmark, the three sections as text tabs with an
 * underline in the safelight, and the account on the right. On a phone the
 * tabs fold into a full-screen sheet.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: user } = useRequireUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const logout = useLogout();

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 bg-ground/85 backdrop-blur supports-[backdrop-filter]:bg-ground/70">
        <div className="relative flex h-16 items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Wordmark />

          {/* Section chips, centred like a control deck. */}
          <nav aria-label="Main" className="absolute left-1/2 hidden -translate-x-1/2 md:block">
            <ul className="flex items-center gap-1 rounded-[12px] border border-line bg-surface p-1">
              {NAV.map(({ href, label, match }) => {
                const active = match(pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-8 items-center rounded-[8px] px-4 text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors",
                        active ? "bg-ink text-ground" : "text-muted hover:bg-raised hover:text-ink",
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <ButtonLink href="/projects/new" variant="primary" size="sm" icon={<Plus className="size-4" />} className="hidden sm:inline-flex">
              New project
            </ButtonLink>
            <ThemeToggle className="hidden size-9 rounded-[10px] border border-line bg-surface md:inline-flex" />
            <div className="hidden md:block">{user ? <AccountMenu user={user} /> : <Skeleton className="size-9 rounded-full" />}</div>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="-me-2 flex size-10 items-center justify-center rounded-control text-ink hover:bg-raised md:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ground px-4 pb-6 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-16 items-center justify-between">
            <Wordmark />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="-me-2 flex size-10 items-center justify-center rounded-control text-ink hover:bg-raised"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav aria-label="Main" className="mt-6 flex-1">
            <ul className="space-y-1">
              {[...NAV, { href: "/projects/new", label: "New project", match: (path: string) => path === "/projects/new" }, { href: "/profile", label: "Profile", match: (path: string) => path === "/profile" }].map(
                ({ href, label, match }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={match(pathname) ? "page" : undefined}
                      className={cn("flex h-12 items-center rounded-control px-3 text-lg", match(pathname) ? "bg-surface font-semibold text-ink" : "text-muted")}
                    >
                      {label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
          {user && (
            <div className="flex items-center gap-3 border-t border-line pt-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-ground">{initial(user.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="block truncate text-xs text-muted">{user.email}</span>
              </span>
              <ThemeToggle />
              <button type="button" onClick={logout} aria-label="Log out" className="flex size-9 items-center justify-center rounded-control text-muted hover:bg-raised">
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <main className="min-w-0">{user ? children : <ShellLoading />}</main>
    </div>
  );
}

function ShellLoading() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-72" />
      <Skeleton className="mt-8 h-64 w-full" />
    </div>
  );
}

/** Title row: an eyebrow, the noun as the h1, one grey line under it, actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        {eyebrow && <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.08em] text-faint">{eyebrow}</p>}
        <h1 className="text-[1.5rem] font-semibold leading-8 tracking-[-0.025em] text-ink sm:text-title">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageBody({ children, width = "wide" }: { children: ReactNode; width?: "wide" | "narrow" | "form" }) {
  return (
    <div
      className={cn(
        "mx-auto px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-10",
        width === "wide" && "max-w-none",
        width === "narrow" && "max-w-[960px]",
        width === "form" && "max-w-[760px]",
      )}
    >
      {children}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
      <span aria-hidden="true">←</span> {children}
    </Link>
  );
}
