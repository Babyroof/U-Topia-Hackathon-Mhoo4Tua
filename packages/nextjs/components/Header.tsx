"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import {
  ArrowsRightLeftIcon,
  Bars3Icon,
  BugAntIcon,
  BuildingLibraryIcon,
  ClockIcon,
  DocumentTextIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { AutoReleaser } from "~~/components/rwa/AutoReleaser";
import { NotificationBell } from "~~/components/rwa/NotificationBell";
import { PhaendinLogo } from "~~/components/rwa/PhaendinLogo";
import { RequestNotifier } from "~~/components/rwa/RequestNotifier";
import { Tutorial, openTutorial } from "~~/components/rwa/Tutorial";
import { sameAddress } from "~~/components/rwa/utils";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

type NavLink = { label: string; short?: string; href: string; icon: React.ElementType };

/** Everyone: what I own and what I asked for. */
const USER_LINKS: NavLink[] = [
  { label: "My vault", short: "Vault", href: "/vault", icon: HomeIcon },
  { label: "My requests", short: "Requests", href: "/requests", icon: DocumentTextIcon },
  { label: "My deals", short: "Deals", href: "/deals", icon: ArrowsRightLeftIcon },
  { label: "History", href: "/history", icon: ClockIcon },
];

/** Partners only: the desk where deeds are checked. */
const PARTNER_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/partner", icon: BuildingLibraryIcon },
  { label: "Pending requests", href: "/partner/requests", icon: DocumentTextIcon },
  { label: "Waiting for registration", href: "/partner/registrations", icon: ShieldCheckIcon },
];

const ADMIN_LINK: NavLink = { label: "Manage partners", href: "/admin/partners", icon: ShieldCheckIcon };
const DEBUG_LINK: NavLink = { label: "Debug", href: "/debug", icon: BugAntIcon };

/** What the connected wallet may do: everyone is a user; partners and the admin get extra pages. */
export const useRole = () => {
  const { address } = useAccount();
  const { data: isPartner, isLoading: partnerLoading } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isPartner",
    args: [address],
  });
  const { data: partnerName } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "partnerName",
    args: [address],
  });
  const { data: admin, isLoading: adminLoading } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "admin",
  });
  const isAdmin = sameAddress(admin, address);
  const role: "admin" | "partner" | "owner" = isAdmin ? "admin" : isPartner ? "partner" : "owner";
  return { role, isAdmin, isPartner: !!isPartner, partnerName, isLoading: partnerLoading || adminLoading };
};

/** Counts shown next to partner links. */
const usePartnerBadges = () => {
  const { address } = useAccount();
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const { data: registrations } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "pendingRegistrations",
    args: [address],
  });
  const badges: Record<string, number> = {
    "/partner/requests": (requests ?? []).filter(r => r.status === 1 && sameAddress(r.partner, address)).length,
    "/partner/registrations": registrations?.length ?? 0,
  };
  return { badges, total: Object.values(badges).reduce((a, b) => a + b, 0) };
};

const useExtraLinks = () => {
  const { isPartner, isAdmin } = useRole();
  const { targetNetwork } = useTargetNetwork();
  return {
    partnerLinks: isPartner ? PARTNER_LINKS : [],
    adminLinks: isAdmin ? [ADMIN_LINK] : [],
    debugLinks: targetNetwork.id === hardhat.id ? [DEBUG_LINK] : [],
  };
};

const isActive = (pathname: string, href: string) =>
  href === "/partner" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

const Badge = ({ n }: { n?: number }) =>
  n ? <span className="badge badge-error badge-xs text-white">{n}</span> : null;

/** Desktop: one row of pills, partner tools grouped under a dropdown. */
const DesktopNav = () => {
  const pathname = usePathname();
  const { partnerLinks, adminLinks, debugLinks } = useExtraLinks();
  const { badges, total } = usePartnerBadges();

  const pill = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-colors ${
      active ? "bg-primary text-primary-content" : "hover:bg-base-200"
    }`;

  return (
    <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
      {USER_LINKS.map(l => (
        <Link key={l.href} href={l.href} className={pill(isActive(pathname, l.href))}>
          {l.label}
        </Link>
      ))}
      {partnerLinks.length > 0 && (
        <div className="dropdown dropdown-hover">
          <div tabIndex={0} role="button" className={pill(pathname.startsWith("/partner"))}>
            Partner desk <Badge n={total} />
          </div>
          <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-30 w-64 p-2 shadow-lg">
            {partnerLinks.map(l => (
              <li key={l.href}>
                <Link href={l.href} className={isActive(pathname, l.href) ? "menu-active" : ""}>
                  <l.icon className="h-4 w-4" /> {l.label} <Badge n={badges[l.href]} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {[...adminLinks, ...debugLinks].map(l => (
        <Link key={l.href} href={l.href} className={pill(isActive(pathname, l.href))}>
          {l.label}
        </Link>
      ))}
      <button onClick={openTutorial} className={pill(false)}>
        <QuestionMarkCircleIcon className="h-4 w-4" /> How it works
      </button>
    </nav>
  );
};

/** Below desktop width: one menu button in the header, grouped the same way as the desktop nav. */
const CompactMenu = () => {
  const pathname = usePathname();
  const { partnerLinks, adminLinks, debugLinks } = useExtraLinks();
  const { badges, total } = usePartnerBadges();
  const menuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(menuRef, () => menuRef.current?.removeAttribute("open"));
  const item = (l: NavLink) => (
    <li key={l.href}>
      <Link href={l.href} className={isActive(pathname, l.href) ? "menu-active" : ""}>
        <l.icon className="h-5 w-5" /> {l.label} <Badge n={badges[l.href]} />
      </Link>
    </li>
  );

  return (
    <details ref={menuRef} className="dropdown lg:hidden">
      <summary className="btn btn-circle bg-base-100 border-0 shadow-sm list-none relative" aria-label="Menu">
        <Bars3Icon className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1">
            <Badge n={total} />
          </span>
        )}
      </summary>
      <ul
        className="dropdown-content menu menu-lg bg-base-100 rounded-box z-30 w-72 p-2 mt-2 shadow-lg"
        onClick={() => menuRef.current?.removeAttribute("open")}
      >
        {USER_LINKS.map(item)}
        {partnerLinks.length > 0 && <li className="menu-title">Partner desk</li>}
        {partnerLinks.map(item)}
        {adminLinks.length + debugLinks.length > 0 && <li className="menu-title">Admin</li>}
        {[...adminLinks, ...debugLinks].map(item)}
        <li className="menu-title">Help</li>
        <li>
          <button onClick={openTutorial}>
            <QuestionMarkCircleIcon className="h-5 w-5" /> How it works
          </button>
        </li>
      </ul>
    </details>
  );
};

const RoleBadge = () => {
  const { address } = useAccount();
  const { role, partnerName } = useRole();
  if (!address) return null;
  const label =
    role === "admin" ? "Platform admin" : role === "partner" ? `Partner: ${partnerName || "Partner"}` : "Owner";
  return (
    <span className="badge badge-ghost bg-base-200 border-0 hidden xl:inline-flex whitespace-nowrap max-w-56 truncate">
      {label}
    </span>
  );
};

export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  return (
    <>
      <header className="sticky top-0 z-20 bg-base-200/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CompactMenu />
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="seal" style={{ width: "2.25rem", height: "2.25rem", transform: "none" }} aria-hidden>
                <span style={{ fontSize: "0.85rem" }}>P</span>
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:inline">Phaendin</span>
            </Link>
          </div>
          <DesktopNav />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <RoleBadge />
            <RainbowKitCustomConnectButton />
            {isLocalNetwork && (
              <span className="hidden sm:inline-flex">
                <FaucetButton />
              </span>
            )}
          </div>
        </div>
      </header>
      <AutoReleaser />
      <RequestNotifier />
      <Tutorial />
    </>
  );
};
