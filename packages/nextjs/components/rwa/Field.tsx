import { ReactNode } from "react";

/** A labelled form field with optional helper text, an (i) tooltip and an error shown right under it. */
export const Field = ({
  label,
  helper,
  info,
  error,
  children,
  className = "",
}: {
  label: string;
  helper?: ReactNode;
  info?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <span className="label-text font-semibold flex items-center gap-1">
      {label}
      {info && <InfoTip text={info} />}
    </span>
    {children}
    {helper && <span className="text-xs opacity-60">{helper}</span>}
    {error && (
      <span className="text-sm text-error" role="alert">
        {error}
      </span>
    )}
  </div>
);

export const InfoTip = ({ text }: { text: string }) => (
  <span className="tooltip tooltip-right sm:tooltip-top before:max-w-64 before:whitespace-normal" data-tip={text}>
    <span
      tabIndex={0}
      aria-label={text}
      className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-current text-[10px] font-bold opacity-60 cursor-help"
    >
      i
    </span>
  </span>
);
