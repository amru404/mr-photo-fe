"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown, ClipboardList, LogOut, Menu, UserRound, X } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { ThemeSwitch } from "@/components/ui/theme-toggle";
import { Skeleton } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useRequireUser, useSetUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { initial } from "@/lib/format";
import type { User } from "@/lib/types";
import { useBookingLink, usePendingBookingCount } from "@/features/bookings/use-bookings";

const NAV = [
  { href: "/dashboard", label: "Overview", match: (path: string) => path === "/dashboard" },
  { href: "/schedule", label: "Schedule", match: (path: string) => path.startsWith("/schedule") },
  { href: "/bookings", label: "Bookings", match: (path: string) => path.startsWith("/bookings") },
  { href: "/projects", label: "Projects", match: (path: string) => path.startsWith("/projects") && path !== "/projects/new" },
  { href: "/clients", label: "Clients", match: (path: string) => path.startsWith("/clients") },
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
        className="flex h-10 items-center gap-2.5 rounded-full ps-3 pe-1 text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <span className="max-w-[160px] truncate text-[13px] font-medium text-ink">{user.name}</span>
        <ChevronDown className="size-3.5" />
        <span className="flex size-8 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-ground">{initial(user.name)}</span>
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
            <BookingFormItem enabled={open && !user.must_verify_email} />
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
  // Requests waiting for approval, as a small count on the Bookings tab.
  const pendingBookings = usePendingBookingCount(!!user && !user.must_verify_email);
  const badge = (href: string) => (href === "/bookings" && pendingBookings > 0 ? pendingBookings : null);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 bg-surface shadow-bar">
        <div className="relative flex h-14 items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Wordmark />

          {/* Section tabs, centred: plain text, the active one in ink with a safelight line along the bottom of the bar. */}
          <nav aria-label="Main" className="absolute inset-y-0 left-1/2 hidden -translate-x-1/2 md:block">
            <ul className="flex h-full items-stretch gap-1">
              {NAV.map(({ href, label, match }) => {
                const active = match(pathname);
                return (
                  <li key={href} className="flex">
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center px-3 text-xs font-semibold transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
                        active ? "text-ink after:bg-accent" : "text-muted after:bg-transparent hover:text-ink",
                      )}
                    >
                      {label}
                      {badge(href) !== null && <NavBadge count={badge(href)!} label="booking requests waiting" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <ThemeSwitch className="hidden md:inline-flex" />
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
                      {badge(href) !== null && <NavBadge count={badge(href)!} label="booking requests waiting" />}
                    </Link>
                  </li>
                ),
              )}
              <li>
                <BookingFormItem enabled={!!user && !user.must_verify_email} sheet />
              </li>
            </ul>
          </nav>
          {user && (
            <div className="flex items-center gap-3 border-t border-line pt-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-ground">{initial(user.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="block truncate text-xs text-muted">{user.email}</span>
              </span>
              <ThemeSwitch />
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

/** Opens the public booking form, the page clients fill in, in a new tab. */
function BookingFormItem({ enabled, sheet = false }: { enabled: boolean; sheet?: boolean }) {
  const link = useBookingLink(enabled);
  const url = link.data?.url;
  return (
    <a
      role="menuitem"
      href={url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!url}
      onClick={(event) => {
        if (!url) event.preventDefault();
      }}
      className={cn(
        "flex items-center gap-2.5 rounded-control hover:bg-raised aria-disabled:opacity-60",
        // The phone sheet's rows are bigger and grey; the account menu's are compact and ink.
        sheet ? "h-12 px-3 text-lg text-muted" : "h-9 px-2.5 text-sm text-ink",
      )}
    >
      {!sheet && <ClipboardList className="size-4 text-muted" />}
      <span className="flex-1">Booking form</span>
      <ArrowUpRight className="size-3.5 text-faint" aria-hidden="true" />
    </a>
  );
}

/** A small ink count next to a tab label. */
function NavBadge({ count, label }: { count: number; label: string }) {
  return (
    <span className="ms-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 font-mono text-[10px] font-medium leading-none text-ground tabular">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> {label}</span>
    </span>
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
