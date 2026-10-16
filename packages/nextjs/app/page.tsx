"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useRole } from "~~/components/Header";
import { Certificate } from "~~/components/rwa/Certificate";

const PROBLEMS = [
  { title: "It gets lost", text: "A flood, a fire, a drawer nobody remembers. The paper was the only proof." },
  { title: "It gets faked", text: "Whoever receives it has no way to check the original is real." },
  { title: "It moves slowly", text: "The original has to be handed over in person, every time." },
  { title: "It gets pledged twice", text: "Nobody can see who holds it, so one document backs two loans." },
];

const STEPS = [
  { href: "/tokenize", title: "Request", text: "Tell a partner which land title deed you hold." },
  { href: "/partner", title: "Verify", text: "The partner checks the real thing and issues one token for it." },
  { href: "/vault", title: "Keep", text: "The certificate lives in your wallet. Anyone can check who issued it." },
  { href: "/deals", title: "Pass it on", text: "Lock it for someone. It reaches them on the date you choose." },
];

const Home: NextPage = () => {
  const { role } = useRole();
  return (
    <div className="flex flex-col grow">
      <section className="w-full max-w-6xl mx-auto px-5 pt-10 pb-14 grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center">
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-5xl leading-[1.08] mb-5">One original. One token.</h1>
          <p className="text-base md:text-lg leading-relaxed opacity-80 mb-7">
            Some assets follow one rule: whoever holds the original has the right. We turn that single original into a
            single certificate on-chain, issued by the partner who checked the real thing. It can&apos;t be lost, it
            can&apos;t be copied, and it can&apos;t be pledged twice.
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
            name="Deed no. 00000, [example], [example], [example]"
            serial="00000"
            issuerName="Land Office"
            issuedAt={Math.floor(new Date("2026-10-16T09:00:00+07:00").getTime() / 1000)}
            locked
            stampClassName="stamp-in"
          >
            <p className="text-xs opacity-60 m-0">Sample certificate. Partner name is illustrative.</p>
          </Certificate>
        </div>
      </section>

      <section className="bg-base-100 border-y border-base-300">
        <div className="max-w-6xl mx-auto px-5 py-14 grid gap-10 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-3xl leading-tight m-0">What goes wrong with a paper original</h2>
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
          The NFT is a digital mirror of the deed. It does not replace the Department of Lands register: a legal
          transfer still has to be registered at the land office.
        </p>
        <p className="text-sm opacity-60 mt-4 max-w-2xl">
          Partners named in the demo are target partners for a pilot. A token carries legal weight because its issuer
          accepts it in place of the paper, not because it is on a blockchain.
        </p>
      </section>
    </div>
  );
};

export default Home;
