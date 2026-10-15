import { ReactNode } from "react";
import { assetIcon, formatTime } from "~~/components/rwa/utils";

const initials = (name?: string) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join("") || "P";

type CertificateProps = {
  tokenId?: bigint | number;
  assetType?: string;
  name?: string;
  serial?: string;
  issuerName?: string;
  issuer?: ReactNode;
  issuedAt?: bigint | number;
  locked?: boolean;
  stampText?: string;
  stampClassName?: string;
  children?: ReactNode;
};

/** A tokenized asset shown as the certificate it replaces. */
export const Certificate = ({
  tokenId,
  assetType,
  name,
  serial,
  issuerName,
  issuer,
  issuedAt,
  locked,
  stampText,
  stampClassName = "",
  children,
}: CertificateProps) => (
  <article className="certificate h-full">
    <div className="certificate-inner flex flex-col gap-4">
      {(locked || stampText) && <div className={`stamp ${stampClassName}`}>{stampText ?? "Locked in vault"}</div>}

      <header className="flex items-start gap-3 pr-24">
        <div className="text-3xl leading-none" aria-hidden>
          {assetIcon(assetType)}
        </div>
        <div className="min-w-0">
          <p className="m-0 text-sm opacity-70">{assetType ?? "Asset"}</p>
          <h3 className="text-2xl leading-tight m-0 break-words">{name ?? "Loading…"}</h3>
        </div>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm m-0">
        <dt className="opacity-60">Number</dt>
        <dd className="serial m-0 break-all">{serial ?? "–"}</dd>
        <dt className="opacity-60">Token</dt>
        <dd className="serial m-0">{tokenId !== undefined ? `#${tokenId.toString()}` : "–"}</dd>
        {issuedAt !== undefined && (
          <>
            <dt className="opacity-60">Issued</dt>
            <dd className="m-0">{formatTime(issuedAt)}</dd>
          </>
        )}
      </dl>

      <footer className="flex items-center gap-3 border-t border-base-300 pt-3 mt-auto">
        <div className="seal" aria-hidden>
          <span>{initials(issuerName)}</span>
        </div>
        <div className="min-w-0 text-sm">
          <p className="m-0 opacity-60">Verified and issued by</p>
          <p className="m-0 font-semibold">{issuerName || "Partner"}</p>
          {issuer}
        </div>
      </footer>

      {children}
    </div>
  </article>
);
