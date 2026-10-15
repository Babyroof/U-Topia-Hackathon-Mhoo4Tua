import { useEffect, useState } from "react";
import { useBlock } from "wagmi";

/**
 * Current time as the blockchain sees it (seconds).
 * Anchors to the latest block timestamp and keeps ticking every second,
 * so countdowns match what the contract will check (`block.timestamp`).
 */
export const useChainNow = (): number => {
  const { data: block } = useBlock({ watch: true });
  const [anchor, setAnchor] = useState<{ chainTs: number; wallTs: number } | null>(null);
  const [wallNow, setWallNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (block) setAnchor({ chainTs: Number(block.timestamp), wallTs: Math.floor(Date.now() / 1000) });
  }, [block]);

  useEffect(() => {
    const timer = setInterval(() => setWallNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!anchor) return wallNow;
  return anchor.chainTs + Math.max(0, wallNow - anchor.wallTs);
};
