"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { Bars3Icon, BugAntIcon } from "@heroicons/react/24/outline";
import { AutoReleaser } from "~~/components/rwa/AutoReleaser";
import { sameAddress } from "~~/components/rwa/utils";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

const OWNER_LINKS: HeaderMenuLink[] = [
  { label: "Home", href: "/" },
  { label: "Tokenize", href: "/tokenize" },
  { label: "My Vault", href: "/vault" },
  { label: "Transfers", href: "/deals" },
];

const PARTNER_LINKS: HeaderMenuLink[] = [
  { label: "Home", href: "/" },
  { label: "Partner desk", href: "/partner" },
  { label: "Transfers", href: "/deals" },
];

const ADMIN_LINKS: HeaderMenuLink[] = [
  { label: "Home", href: "/" },
  { label: "Admin", href: "/admin" },
  { label: "Transfers", href: "/deals" },
];

const DEBUG_LINK: HeaderMenuLink = { label: "Debug", href: "/debug", icon: <BugAntIcon className="h-4 w-4" /> };

/** Admin, partners (custodians) and owners see different menus, based on the connected wallet. */
export const useRole = () => {
  const { address } = useAccount();
  const { data: isPartner } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isPartner",
    args: [address],
  });
  const { data: partnerName } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "partnerName",
    args: [address],
  });
  const { data: admin } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "admin" });
  const isAdmin = sameAddress(admin, address);
  const role: "admin" | "partner" | "owner" = isAdmin ? "admin" : isPartner ? "partner" : "owner";
  return { role, isAdmin, isPartner: !!isPartner, partnerName };
};

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const { role } = useRole();
  const base = role === "admin" ? ADMIN_LINKS : role === "partner" ? PARTNER_LINKS : OWNER_LINKS;
  const links = [...base, DEBUG_LINK];

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
      Partner: {partnerName || "Custodian"}
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
      <div className="navbar-end grow mr-4">
        <RoleBadge />
        <RainbowKitCustomConnectButton />
        {isLocalNetwork && <FaucetButton />}
      </div>
    </div>
  );
};
