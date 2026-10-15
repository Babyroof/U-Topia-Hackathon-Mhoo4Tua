"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { Bars3Icon, BugAntIcon } from "@heroicons/react/24/outline";
import { AutoReleaser } from "~~/components/rwa/AutoReleaser";
import { RequestNotifier } from "~~/components/rwa/RequestNotifier";
import { sameAddress } from "~~/components/rwa/utils";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

const USER_LINKS: HeaderMenuLink[] = [
  { label: "My Vault", href: "/vault" },
  { label: "My requests", href: "/requests" },
  { label: "My deals", href: "/deals" },
];

const PARTNER_LINKS: HeaderMenuLink[] = [
  { label: "Partner desk", href: "/partner" },
  { label: "Pending requests", href: "/partner/requests" },
];

const ADMIN_LINKS: HeaderMenuLink[] = [{ label: "Manage partners", href: "/admin/partners" }];

const DEBUG_LINK: HeaderMenuLink = { label: "Debug", href: "/debug", icon: <BugAntIcon className="h-4 w-4" /> };

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

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const { address } = useAccount();
  const { isPartner, isAdmin } = useRole();
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const pendingForMe = (requests ?? []).filter(r => r.status === 1 && sameAddress(r.partner, address)).length;
  const { targetNetwork } = useTargetNetwork();
  const links = [
    ...USER_LINKS,
    ...(isPartner ? PARTNER_LINKS : []),
    ...(isAdmin ? ADMIN_LINKS : []),
    ...(targetNetwork.id === hardhat.id ? [DEBUG_LINK] : []),
  ];

  return (
    <>
      {links.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href} className="h-full">
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-base-300" : ""
              } hover:bg-base-300 focus:!bg-base-300 h-full px-4 text-sm gap-2 flex items-center whitespace-nowrap`}
            >
              {icon}
              <span>{label}</span>
              {href === "/partner/requests" && pendingForMe > 0 && (
                <span className="badge badge-warning badge-sm">{pendingForMe}</span>
              )}
            </Link>
          </li>
        );
      })}
    </>
  );
};

const RoleBadge = () => {
  const { address } = useAccount();
  const { role, partnerName } = useRole();
  if (!address) return null;
  if (role === "admin") return <span className="badge badge-primary hidden md:inline-flex mr-2">Platform admin</span>;
  return role === "partner" ? (
    <span className="badge badge-secondary hidden md:inline-flex mr-2 whitespace-nowrap">
      Partner: {partnerName || "Partner"}
    </span>
  ) : (
    <span className="badge badge-outline hidden md:inline-flex mr-2">Owner</span>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky top-0 navbar bg-base-100/95 backdrop-blur min-h-14 shrink-0 justify-between z-20 border-b border-base-300 p-0 sm:px-2">
      <div className="navbar-start w-auto self-stretch">
        <details className="dropdown" ref={burgerMenuRef}>
          <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
            <Bars3Icon className="h-1/2" />
          </summary>
          <ul
            className="menu menu-compact dropdown-content mt-3 p-2 shadow-lg bg-base-100 w-52"
            onClick={() => {
              burgerMenuRef?.current?.removeAttribute("open");
            }}
          >
            <HeaderMenuLinks />
          </ul>
        </details>
        <Link href="/" passHref className="hidden lg:flex items-center gap-2 ml-4 mr-6 shrink-0">
          <div className="seal" style={{ width: "2.5rem", height: "2.5rem" }} aria-hidden>
            <span style={{ fontSize: "0.8rem" }}>RV</span>
          </div>
          <span className="font-display text-xl leading-tight">RWA Vault</span>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap h-full m-0 p-0 list-none">
          <HeaderMenuLinks />
        </ul>
      </div>
      <AutoReleaser />
      <RequestNotifier />
      <div className="navbar-end grow mr-4">
        <RoleBadge />
        <RainbowKitCustomConnectButton />
        {isLocalNetwork && <FaucetButton />}
      </div>
    </div>
  );
};
