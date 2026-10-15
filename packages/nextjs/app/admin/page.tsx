"use client";

import { useState } from "react";
import { Address, AddressInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const PartnerRow = ({ partner, onToggle, busy }: { partner: string; onToggle: () => void; busy: boolean }) => {
  const { targetNetwork } = useTargetNetwork();
  const { data: active } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isPartner",
    args: [partner],
  });
  const { data: name } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "partnerName",
    args: [partner],
  });

  return (
    <tr>
      <td className="font-semibold">{name || "Unnamed partner"}</td>
      <td>
        <Address address={partner} chain={targetNetwork} size="sm" />
      </td>
      <td>
        <span className={`badge ${active ? "badge-success" : "badge-ghost"}`}>{active ? "Active" : "Inactive"}</span>
      </td>
      <td className="text-right">
        <button className="btn btn-xs btn-ghost border-base-300" disabled={busy} onClick={onToggle}>
          {active ? "Deactivate" : "Reactivate"}
        </button>
      </td>
    </tr>
  );
};

const AdminPage: NextPage = () => {
  const { address } = useAccount();
  const { data: admin } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "admin" });
  const { data: partners } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getPartners" });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  const [newPartner, setNewPartner] = useState("");
  const [newName, setNewName] = useState("");

  const isAdmin = sameAddress(admin, address);

  const setPartner = async (partner: string, name: string, active: boolean) => {
    if (!isAddress(partner, { strict: false })) return;
    try {
      await writeContractAsync({ functionName: "setPartner", args: [partner, name, active] });
      return true;
    } catch (e) {
      console.error("setPartner failed", e);
      return false;
    }
  };

  const alreadyListed = (partners ?? []).some(p => sameAddress(p, newPartner));
  const addHint = !newPartner
    ? ""
    : !isAddress(newPartner, { strict: false })
      ? "That isn't a valid wallet address"
      : sameAddress(newPartner, admin)
        ? "The admin wallet can't also be a partner"
        : newName.trim() === ""
          ? "Add the partner's name"
          : alreadyListed
            ? "Already listed below (saving updates its name)"
            : "";

  const addPartner = async () => {
    const ok = await setPartner(newPartner, newName.trim(), true);
    if (ok) {
      setNewPartner("");
      setNewName("");
    }
  };

  // to deactivate/reactivate we keep the current name: read it inside the row would need another call,
  // so we pass an empty-name guard: the contract stores whatever name we send, so we re-send it from the row.
  const ToggleRow = ({ partner }: { partner: string }) => {
    const { data: active } = useScaffoldReadContract({
      contractName: "RWAToken",
      functionName: "isPartner",
      args: [partner],
    });
    const { data: name } = useScaffoldReadContract({
      contractName: "RWAToken",
      functionName: "partnerName",
      args: [partner],
    });
    return <PartnerRow partner={partner} busy={isMining} onToggle={() => setPartner(partner, name ?? "", !active)} />;
  };

  if (address && admin && !isAdmin) {
    return (
      <div className="flex flex-col items-center grow px-4 py-16">
        <div className="w-full max-w-xl card bg-base-100 border border-base-300">
          <div className="card-body">
            <h1 className="text-3xl m-0">Admin</h1>
            <p className="opacity-80">
              Only the platform admin can add or remove partners. This wallet isn&apos;t the admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-8">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl mb-2">Platform admin</h1>
        <p className="opacity-80">
          Decide who can verify assets and issue tokens. Partners can approve requests and confirm handovers, but they
          can&apos;t add other partners. Only this wallet can.
        </p>
      </div>

      <div className="card bg-base-100 border border-base-300 w-full max-w-3xl">
        <div className="card-body gap-3">
          <h2 className="text-2xl m-0">Add a partner</h2>
          <AddressInput value={newPartner} onChange={setNewPartner} placeholder="Partner wallet address" />
          <input
            className="input input-bordered w-full"
            placeholder="Partner name, e.g. Siam Custody Bank"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <p className="text-xs opacity-60 m-0">In the pitch, call these target partners until a pilot is signed.</p>
          <div className="flex items-center justify-end gap-3">
            {addHint && <span className="text-xs text-warning">{addHint}</span>}
            <button
              className="btn btn-primary btn-sm"
              disabled={!newPartner || (!!addHint && !alreadyListed) || isMining}
              onClick={addPartner}
            >
              Add partner
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl">
        <h2 className="text-2xl mb-3">Partners ({partners?.length ?? 0})</h2>
        {!partners || partners.length === 0 ? (
          <p className="opacity-60">No partners yet. Add the first one above.</p>
        ) : (
          <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Wallet</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <ToggleRow key={p} partner={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
