// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { RWAToken } from "../contracts/RWAToken.sol";
import { ConditionalVault } from "../contracts/ConditionalVault.sol";

contract RWAVaultTest is Test {
    RWAToken rwa;
    ConditionalVault vault;

    address admin = makeAddr("admin");
    address partner = makeAddr("partner");
    address alice = makeAddr("alice"); // A: owner
    address bob = makeAddr("bob"); // B: receiver / buyer
    address eve = makeAddr("eve");

    function setUp() public {
        vm.warp(1_000_000);
        rwa = new RWAToken(admin);
        vault = new ConditionalVault();

        vm.prank(admin);
        rwa.setPartner(partner, "Bank Vault (mock)", true);
    }

    function _issueToAlice(string memory serial) internal returns (uint256 id) {
        vm.prank(partner);
        id = rwa.issue(alice, "Luxury Watch", "Submariner", serial, "ipfs://img");
    }

    function _lock(uint256 tokenId, uint64 unlockIn) internal returns (uint256 dealId) {
        vm.startPrank(alice);
        rwa.approve(address(vault), tokenId);
        dealId = vault.createDeal(address(rwa), tokenId, bob, uint64(block.timestamp) + unlockIn);
        vm.stopPrank();
    }

    // ---------------- Flow 1: request -> partner approves ----------------

    function testRequestApproveMintsToRequester() public {
        vm.prank(alice);
        uint256 reqId = rwa.requestTokenize(partner, "Luxury Watch", "Submariner", "SN-777", "ipfs://img");
        assertEq(uint256(rwa.getRequest(reqId).status), uint256(RWAToken.RequestStatus.Pending));

        vm.prank(eve);
        vm.expectRevert(RWAToken.NotRequestPartner.selector);
        rwa.approveRequest(reqId);

        vm.prank(partner);
        uint256 tokenId = rwa.approveRequest(reqId);
        assertEq(rwa.ownerOf(tokenId), alice);
        assertEq(rwa.getAsset(tokenId).issuer, partner);
        assertEq(rwa.getRequest(reqId).tokenId, tokenId);

        vm.prank(partner);
        vm.expectRevert(RWAToken.RequestNotPending.selector);
        rwa.approveRequest(reqId);
    }

    function testRequestRejected() public {
        vm.prank(alice);
        uint256 reqId = rwa.requestTokenize(partner, "Luxury Watch", "Fake?", "SN-888", "");
        vm.prank(partner);
        rwa.rejectRequest(reqId, "not genuine");
        assertEq(uint256(rwa.getRequest(reqId).status), uint256(RWAToken.RequestStatus.Rejected));
        assertEq(rwa.tokensOf(alice).length, 0);
    }

    function testRequestToNonPartnerReverts() public {
        vm.prank(alice);
        vm.expectRevert(RWAToken.NotPartner.selector);
        rwa.requestTokenize(eve, "Luxury Watch", "Submariner", "SN-999", "");
    }

    function testDuplicateSerialBlockedAtApproval() public {
        // two people request the same serial; only the first approval can mint
        vm.prank(alice);
        uint256 r1 = rwa.requestTokenize(partner, "Luxury Watch", "Submariner", "SN-DUP", "");
        vm.prank(eve);
        uint256 r2 = rwa.requestTokenize(partner, "Luxury Watch", "Submariner", "SN-DUP", "");

        vm.startPrank(partner);
        rwa.approveRequest(r1);
        vm.expectRevert(RWAToken.SerialAlreadyTokenized.selector);
        rwa.approveRequest(r2);
        vm.stopPrank();
    }

    // ---------------- RWAToken ----------------

    function testPartnerIssues() public {
        uint256 id = _issueToAlice("SN-001");
        assertEq(rwa.ownerOf(id), alice);
        RWAToken.Asset memory a = rwa.getAsset(id);
        assertEq(a.issuer, partner);
        assertEq(a.serial, "SN-001");
        assertEq(rwa.tokensOf(alice).length, 1);
    }

    function testNonPartnerCannotIssue() public {
        vm.prank(eve);
        vm.expectRevert(RWAToken.NotPartner.selector);
        rwa.issue(eve, "Luxury Watch", "Fake", "SN-X", "");
    }

    function testSameSerialCannotBeTokenizedTwice() public {
        _issueToAlice("SN-001");
        vm.prank(partner);
        vm.expectRevert(RWAToken.SerialAlreadyTokenized.selector);
        rwa.issue(eve, "Luxury Watch", "Submariner", "SN-001", "");
    }

    function testPartnerCannotAddPartner() public {
        vm.prank(partner);
        vm.expectRevert(RWAToken.NotAdmin.selector);
        rwa.setPartner(eve, "sneaky", true);
    }

    function testAdminListsAndDeactivatesPartners() public {
        vm.startPrank(admin);
        rwa.setPartner(eve, "Gold Vault Co", true);
        rwa.setPartner(eve, "Gold Vault Co", false); // deactivate: not listed twice
        vm.stopPrank();
        assertEq(rwa.getPartners().length, 2);
        assertFalse(rwa.isPartner(eve));

        vm.prank(eve);
        vm.expectRevert(RWAToken.NotPartner.selector);
        rwa.issue(eve, "Gold Bar", "1kg bar", "GB-1", "");
    }

    function testAnyAssetTypeButNotEmpty() public {
        vm.prank(alice);
        rwa.requestTokenize(partner, "Vintage Guitar", "1959 Les Paul", "GT-59", "");

        vm.prank(alice);
        vm.expectRevert(RWAToken.EmptyField.selector);
        rwa.requestTokenize(partner, "", "Something", "X-1", "");
    }

    function testOnlyAdminSetsPartner() public {
        vm.prank(eve);
        vm.expectRevert(RWAToken.NotAdmin.selector);
        rwa.setPartner(eve, "x", true);
    }

    function testRedeemNeedsIssuerToConfirm() public {
        uint256 id = _issueToAlice("SN-001");
        vm.prank(eve);
        vm.expectRevert(RWAToken.NotHolder.selector);
        rwa.requestRedeem(id);

        vm.prank(alice);
        uint256 rid = rwa.requestRedeem(id);
        assertEq(rwa.ownerOf(id), address(rwa)); // parked, not burned yet
        assertTrue(rwa.exists(id));

        vm.prank(eve);
        vm.expectRevert(RWAToken.NotIssuer.selector);
        rwa.confirmRedeem(rid);

        vm.prank(partner);
        rwa.confirmRedeem(rid);
        assertFalse(rwa.exists(id));
        assertEq(uint256(rwa.getAllRedemptions()[rid].status), uint256(RWAToken.RedeemStatus.Completed));

        vm.prank(partner);
        vm.expectRevert(RWAToken.RedemptionNotPending.selector);
        rwa.confirmRedeem(rid);
    }

    function testHolderCanCancelRedeem() public {
        uint256 id = _issueToAlice("SN-001");
        vm.prank(alice);
        uint256 rid = rwa.requestRedeem(id);

        vm.prank(partner);
        vm.expectRevert(RWAToken.NotHolder.selector);
        rwa.cancelRedeem(rid);

        vm.prank(alice);
        rwa.cancelRedeem(rid);
        assertEq(rwa.ownerOf(id), alice);
    }

    function testKeeperReleasesDueDealsAutomatically() public {
        uint256 id1 = _issueToAlice("SN-001");
        uint256 id2 = _issueToAlice("SN-002");
        uint256 id3 = _issueToAlice("SN-003");
        _lock(id1, 1 days);
        _lock(id2, 1 days);
        _lock(id3, 10 days);

        (bool needed,) = vault.checkUpkeep("");
        assertFalse(needed);

        vm.warp(block.timestamp + 1 days);
        bytes memory data;
        (needed, data) = vault.checkUpkeep("");
        assertTrue(needed);
        assertEq(vault.releasable().length, 2);

        vm.prank(eve); // any keeper
        vault.performUpkeep(data);
        assertEq(rwa.ownerOf(id1), bob);
        assertEq(rwa.ownerOf(id2), bob);
        assertEq(rwa.ownerOf(id3), address(vault)); // not due yet, untouched

        // replaying stale data is harmless
        vault.performUpkeep(data);
        (needed,) = vault.checkUpkeep("");
        assertFalse(needed);
    }

    // ---------------- Flow 2: lock until time ----------------

    function testReleasesToBAfterTime() public {
        uint256 id = _issueToAlice("SN-001");
        uint256 dealId = _lock(id, 1 days);
        assertEq(rwa.ownerOf(id), address(vault));
        assertFalse(vault.canRelease(dealId));

        vm.expectRevert(ConditionalVault.TooEarly.selector);
        vault.release(dealId);

        vm.warp(block.timestamp + 1 days);
        assertTrue(vault.canRelease(dealId));
        vm.prank(eve); // anyone can trigger, NFT still goes to B
        vault.release(dealId);
        assertEq(rwa.ownerOf(id), bob);
        assertEq(uint256(vault.getDeal(dealId).status), uint256(ConditionalVault.Status.Released));

        vm.expectRevert(ConditionalVault.NotLocked.selector);
        vault.release(dealId);
    }

    function testLockedAssetCannotBeSoldOrPledgedAgain() public {
        uint256 id = _issueToAlice("SN-001");
        _lock(id, 1 days);
        vm.prank(alice);
        vm.expectRevert();
        rwa.transferFrom(alice, eve, id);
    }

    function testCancelBeforeUnlock() public {
        uint256 id = _issueToAlice("SN-001");
        uint256 dealId = _lock(id, 1 days);

        vm.prank(eve);
        vm.expectRevert(ConditionalVault.NotSender.selector);
        vault.cancel(dealId);

        vm.prank(alice);
        vault.cancel(dealId);
        assertEq(rwa.ownerOf(id), alice);
    }

    function testCannotCancelAfterUnlock() public {
        uint256 id = _issueToAlice("SN-001");
        uint256 dealId = _lock(id, 1 days);
        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        vm.expectRevert(ConditionalVault.TooLate.selector);
        vault.cancel(dealId);
    }

    function testBadParamsRevert() public {
        uint256 id = _issueToAlice("SN-001");
        vm.startPrank(alice);
        rwa.approve(address(vault), id);
        uint64 t = uint64(block.timestamp);

        vm.expectRevert(ConditionalVault.BadRecipient.selector);
        vault.createDeal(address(rwa), id, alice, t + 1);

        vm.expectRevert(ConditionalVault.BadTime.selector);
        vault.createDeal(address(rwa), id, bob, t);
        vm.stopPrank();
    }
}
