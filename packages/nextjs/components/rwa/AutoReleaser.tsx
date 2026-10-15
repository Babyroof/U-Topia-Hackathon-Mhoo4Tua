"use client";

import { useEffect, useRef } from "react";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

/** Watches the vault and asks the keeper to release transfers as soon as they are due. Renders nothing. */
export const AutoReleaser = () => {
  const { data } = useScaffoldReadContract({
    contractName: "ConditionalVault",
    functionName: "checkUpkeep",
    args: ["0x"],
  });
  const busy = useRef(false);
  const needed = data?.[0];

  useEffect(() => {
    if (!needed || busy.current) return;
    busy.current = true;
    fetch("/api/keeper", { method: "POST" })
      .then(res => res.json())
      .then(res => {
        if (res.released) notification.success("A locked asset reached its receiver");
      })
      .catch(e => console.error("auto-release failed", e))
      .finally(() => {
        busy.current = false;
      });
  }, [needed, data]);

  return null;
};
