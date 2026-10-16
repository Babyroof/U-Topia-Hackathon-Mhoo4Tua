"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useRole } from "~~/components/Header";
import { Certificate } from "~~/components/rwa/Certificate";

const PROBLEMS = [
  { title: "It gets forged", text: "A convincing fake passes because nobody can check it on the spot." },
  { title: "It gets used twice", text: "The same deed is handed to two people who never meet." },
  {
    title: "It gets falsely reported lost",
    text: "Someone gets a replacement while the original is still in use.",
  },
  {
    title: "It leaves no trail",
    text: "The paper changes hands with no record, so nobody can tell who holds the original.",
  },
];

const STEPS = [
  {
    href: "/tokenize",
    title: "Check & store",
    text: "The Land Office checks your deed against its record and keeps the original.",
  },
  { href: "/partner", title: "Issue one NFT", text: "The Land Office issues one NFT for that deed to your wallet." },
  {
    href: "/deals",
    title: "Transfer",
    text: "Send the NFT to another wallet. The receiver checks it's real before accepting.",
  },
  {
    href: "/vault",
    title: "Redeem",
    text: "The new holder claims the original and registers the transfer at the Land Office.",
  },
];

const Home: NextPage = () => {
  const { role } = useRole();
  return (
    <div className="flex flex-col grow">
      <section className="w-full max-w-6xl mx-auto px-5 pt-10 pb-14 grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center">
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-5xl leading-[1.08] mb-5">One deed. One NFT. Safe to hand over.</h1>
          <p className="text-base md:text-lg leading-relaxed opacity-80 mb-7">
            Your land deed is verified by the Land Office, kept in its vault, and issued as one NFT to your wallet. Send
            it to anyone. They can confirm it&apos;s real before accepting, and the same deed can&apos;t be transferred
            twice.
          </p>
          <div className="flex gap-3 flex-wrap">
            {role === "admin" ? (
              <Link href="/admin/partners" className="btn btn-primary">
                Manage partners
              </Link>
            ) : role === "partner" ? (
              <Link href="/partner" className="btn btn-primary">
                Open partner desk
              </Link>
            ) : (
              <Link href="/tokenize" className="btn btn-primary">
                Tokenize a deed
              </Link>
            )}
            <Link href="/vault" className="btn btn-ghost border-base-300">
              Open my vault
            </Link>
          </div>
        </div>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <Certificate
            tokenId={1}
            assetType="Land Title Deed"
            name="Deed no. 00000, Chang Phueak, Mueang Chiang Mai, Chiang Mai"
            serial="00000"
            issuerName="Land Office"
            issuedAt={Math.floor(new Date("2026-10-16T09:00:00+07:00").getTime() / 1000)}
            locked
            stampClassName="stamp-in"
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm m-0">
              <dt className="opacity-60">Parcel no.</dt>
              <dd className="m-0">0000</dd>
              <dt className="opacity-60">Area</dt>
              <dd className="m-0">2 rai 1 ngan 50 sq. wa</dd>
              <dt className="opacity-60">Locked for</dt>
              <dd className="m-0">0x8f3a…91c2 until 1 Nov 2026</dd>
            </dl>
            <p className="text-xs opacity-60 m-0">Sample certificate with made-up data.</p>
          </Certificate>
        </div>
      </section>

      <section className="bg-base-100 border-y border-base-300">
        <div className="max-w-6xl mx-auto px-5 py-14 grid gap-10 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-3xl leading-tight m-0">What goes wrong with a paper deed</h2>
          <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2 m-0">
            {PROBLEMS.map(p => (
              <div key={p.title} className="border-t-2 border-primary pt-3">
                <dt className="font-semibold text-lg">{p.title}</dt>
                <dd className="m-0 mt-1 opacity-75">{p.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="max-w-6xl mx-auto w-full px-5 py-14">
        <h2 className="text-3xl mb-8">How it works</h2>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 list-none p-0 m-0">
          {STEPS.map((s, i) => (
            <li key={s.href}>
              <Link href={s.href} className="group block h-full rounded-lg p-5 bg-base-100 hover:bg-base-300">
                <span className="font-bold text-4xl text-primary">{i + 1}</span>
                <h3 className="text-xl mt-2 mb-1 group-hover:underline underline-offset-4">{s.title}</h3>
                <p className="m-0 text-sm opacity-75">{s.text}</p>
              </Link>
            </li>
          ))}
        </ol>
        <p className="text-sm opacity-80 mt-10 max-w-2xl border-l-4 border-warning pl-3">
          The NFT controls the paper original, not the land. Ownership changes only by registration at the Land Office
          (Civil and Commercial Code s.456).
        </p>
        <p className="text-sm opacity-60 mt-4 max-w-2xl">
          Partners named in the demo are target partners for a pilot. The Land Office, not the blockchain, vouches that
          the original matches the official record.
        </p>
      </section>
    </div>
  );
};

export default Home;
