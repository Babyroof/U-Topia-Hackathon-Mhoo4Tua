// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DeployHelpers.s.sol";
import { RWAToken } from "../contracts/RWAToken.sol";
import { ConditionalVault } from "../contracts/ConditionalVault.sol";

/**
 * yarn deploy --file DeployRWA.s.sol                          # local
 * yarn deploy --file DeployRWA.s.sol --network avalancheFuji  # Fuji
 */
contract DeployRWA is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // Deployer = platform admin. Admin adds partners; partners cannot add partners.
        RWAToken rwa = new RWAToken(deployer);

        // Demo partner wallet (all chains)
        rwa.setPartner(0xB774b83EDF56CbEEa3E0d3f0f3EE703d79B52A9f, "[Example] Land Office", true);

        // Local chain only: a ready-made demo partner (Anvil test account #2, public test key).
        // On Fuji, the admin adds real partner wallets from the Admin page.
        if (block.chainid == 31337) {
            rwa.setPartner(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, "Siam Custody Bank (demo)", true);
        }

        ConditionalVault vault = new ConditionalVault(address(rwa));
        rwa.setVault(address(vault));
    }
}
