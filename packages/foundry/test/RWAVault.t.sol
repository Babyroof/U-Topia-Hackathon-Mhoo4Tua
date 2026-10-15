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

    function testOnlyAdminSetsPartner() public {
        vm.prank(eve);
        vm.expectRevert(RWAToken.NotAdmin.selector);
        rwa.setPartner(eve, "x", true);
    }

    function testHolderRedeemsAndBurns() public {
        uint256 id = _issueToAlice("SN-001");
        vm.prank(eve);
        vm.expectRevert(RWAToken.NotHolder.selector);
        rwa.redeem(id);

        vm.prank(alice);
        rwa.redeem(id);
        assertFalse(rwa.exists(id));
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
