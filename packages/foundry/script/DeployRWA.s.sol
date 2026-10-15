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
        RWAToken rwa = new RWAToken(deployer);
        // Deployer acts as the demo partner. Add real partner wallets later via setPartner.
        rwa.setPartner(deployer, "Demo Custody Partner (mock)", true);

        new ConditionalVault();
    }
}
