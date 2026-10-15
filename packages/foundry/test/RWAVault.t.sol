// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { RWAToken } from "../contracts/RWAToken.sol";
import { ConditionalVault } from "../contracts/ConditionalVault.sol";

contract FakeDeed is ERC721 {
    constructor() ERC721("Fake", "FAKE") { }

    function mint(address to, uint256 id) external {
        _mint(to, id);
    }
}

contract RWAVaultTest is Test {
    RWAToken rwa;
    ConditionalVault vault;

    string constant LAND = "Land Title Deed";
    string constant DETAILS = '{"landNo":"0","tambon":"[example]"}';

    address admin = makeAddr("admin");
    address partner = makeAddr("partner");
    address alice = makeAddr("alice"); // A: owner
    address bob = makeAddr("bob"); // B: receiver / buyer
    address eve = makeAddr("eve");

    function setUp() public {
        vm.warp(1_000_000);
        rwa = new RWAToken(admin);
        vault = new ConditionalVault(address(rwa));

        vm.startPrank(admin);
        rwa.setPartner(partner, "Land office (mock)", true);
        rwa.setVault(address(vault));
        vm.stopPrank();
    }

    function _request(address who, string memory serial) internal returns (uint256 reqId) {
        vm.prank(who);
        reqId = rwa.requestTokenize(partner, LAND, "Deed", serial, DETAILS);
    }

    function _issueToAlice(string memory serial) internal returns (uint256 id) {
        uint256 reqId = _request(alice, serial);
        vm.prank(partner);
        id = rwa.approveRequest(reqId);
    }

    function _lock(uint256 tokenId, uint64 unlockIn) internal returns (uint256 dealId) {
        vm.startPrank(alice);
        rwa.approve(address(vault), tokenId);
        dealId = vault.createDeal(tokenId, bob, uint64(block.timestamp) + unlockIn);
        vm.stopPrank();
    }

    // ---------------- Flow 1: request -> partner approves ----------------

    function testRequestApproveMintsToRequester() public {
        uint256 reqId = _request(alice, "00001");
        assertEq(uint256(rwa.getRequest(reqId).status), uint256(RWAToken.RequestStatus.Pending));
        assertEq(rwa.getRequest(reqId).details, DETAILS);

        vm.prank(eve);
        vm.expectRevert(RWAToken.NotRequestPartner.selector);
        rwa.approveRequest(reqId);

        vm.prank(partner);
        uint256 tokenId = rwa.approveRequest(reqId);
        assertEq(rwa.ownerOf(tokenId), alice);
        assertEq(rwa.getAsset(tokenId).issuer, partner);
        assertEq(rwa.getAsset(tokenId).details, DETAILS);
        assertEq(rwa.getRequest(reqId).tokenId, tokenId);
        assertEq(rwa.registeredOwner(tokenId), alice);
        assertFalse(rwa.needsRegistration(tokenId));

        vm.prank(partner);
        vm.expectRevert(RWAToken.RequestNotPending.selector);
        rwa.approveRequest(reqId);
    }

    function testManyRequestsAtOnce() public {
        uint256 r1 = _request(alice, "00001");
        uint256 r2 = _request(alice, "00002");
        uint256 r3 = _request(alice, "00003");
        vm.startPrank(partner);
        rwa.approveRequest(r3);
        rwa.approveRequest(r1);
        rwa.rejectRequest(r2, "blurry photo");
        vm.stopPrank();
        assertEq(rwa.tokensOf(alice).length, 2);
    }

    function testRejectStoresReason() public {
        uint256 reqId = _request(alice, "00008");
        vm.prank(eve);
        vm.expectRevert(RWAToken.NotRequestPartner.selector);
        rwa.rejectRequest(reqId, "nope");

        vm.prank(partner);
        vm.expectRevert(RWAToken.EmptyField.selector);
        rwa.rejectRequest(reqId, "");

        vm.prank(partner);
        rwa.rejectRequest(reqId, "deed is mortgaged");
        RWAToken.Request memory r = rwa.getRequest(reqId);
        assertEq(uint256(r.status), uint256(RWAToken.RequestStatus.Rejected));
        assertEq(r.rejectReason, "deed is mortgaged");
        assertEq(rwa.tokensOf(alice).length, 0);
    }

    function testDeactivatedPartnerCannotApproveOrReject() public {
        uint256 r1 = _request(alice, "00001");
        vm.prank(admin);
        rwa.setPartner(partner, "Land office (mock)", false);

        vm.startPrank(partner);
        vm.expectRevert(RWAToken.NotPartner.selector);
        rwa.approveRequest(r1);
        vm.expectRevert(RWAToken.NotPartner.selector);
        rwa.rejectRequest(r1, "x");
        vm.stopPrank();
    }

    function testRequestToNonPartnerReverts() public {
        vm.prank(alice);
        vm.expectRevert(RWAToken.NotPartner.selector);
        rwa.requestTokenize(eve, LAND, "Deed", "00009", "");
    }

    function testDuplicateSerialBlockedAtApproval() public {
        // two people request the same serial; only the first approval can mint
        uint256 r1 = _request(alice, "DUP");
        uint256 r2 = _request(eve, "DUP");

        vm.startPrank(partner);
        rwa.approveRequest(r1);
        vm.expectRevert(RWAToken.SerialAlreadyTokenized.selector);
        rwa.approveRequest(r2);
        vm.stopPrank();
    }

    function testSameSerialCannotBeRequestedAfterIssue() public {
        _issueToAlice("00001");
        vm.prank(eve);
        vm.expectRevert(RWAToken.SerialAlreadyTokenized.selector);
        rwa.requestTokenize(partner, LAND, "Deed", "00001", "");
    }

    function testEmptyFieldsRevert() public {
        vm.prank(alice);
        vm.expectRevert(RWAToken.EmptyField.selector);
        rwa.requestTokenize(partner, "", "Deed", "X-1", "");
        vm.prank(alice);
        vm.expectRevert(RWAToken.EmptyField.selector);
        rwa.requestTokenize(partner, LAND, "Deed", "", "");
    }

    // ---------------- Admin ----------------

    function testPartnerCannotAddPartner() public {
        vm.prank(partner);
        vm.expectRevert(RWAToken.NotAdmin.selector);
        rwa.setPartner(eve, "sneaky", true);
    }

    function testOnlyAdminSetsPartner() public {
        vm.prank(eve);
        vm.expectRevert(RWAToken.NotAdmin.selector);
        rwa.setPartner(eve, "x", true);
    }

    function testAdminListsAndDeactivatesPartners() public {
        vm.startPrank(admin);
        rwa.setPartner(eve, "Other office", true);
        rwa.setPartner(eve, "Other office", false); // deactivate: not listed twice
        vm.stopPrank();
        assertEq(rwa.getPartners().length, 2);
        assertFalse(rwa.isPartner(eve));
    }

    function testVaultSetOnceByAdmin() public {
        vm.prank(eve);
        vm.expectRevert(RWAToken.NotAdmin.selector);
        rwa.setVault(eve);
        vm.prank(admin);
        vm.expectRevert(RWAToken.VaultAlreadySet.selector);
        rwa.setVault(eve);
    }

    // ---------------- Withdraw from the system (redeem) ----------------

    function testRedeemNeedsIssuerToConfirm() public {
        uint256 id = _issueToAlice("00001");
        vm.prank(eve);
        vm.expectRevert(RWAToken.NotHolder.selector);
        rwa.requestRedeem(id);

        vm.prank(alice);
        uint256 rid = rwa.requestRedeem(id);
        assertEq(rwa.ownerOf(id), address(rwa)); // parked, not burned yet
        assertTrue(rwa.exists(id));
        assertFalse(rwa.needsRegistration(id));

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
        uint256 id = _issueToAlice("00001");
        vm.prank(alice);
        uint256 rid = rwa.requestRedeem(id);

        vm.prank(partner);
        vm.expectRevert(RWAToken.NotHolder.selector);
        rwa.cancelRedeem(rid);

        vm.prank(alice);
        rwa.cancelRedeem(rid);
        assertEq(rwa.ownerOf(id), alice);
    }

    function testCannotRedeemWhileLockedInDeal() public {
        uint256 id = _issueToAlice("00001");
        _lock(id, 1 days);
        vm.prank(alice);
        vm.expectRevert(RWAToken.NotHolder.selector);
        rwa.requestRedeem(id);
    }

    // ---------------- Flow 2: lock until time ----------------

    function testReleasesToBAfterTime() public {
        uint256 id = _issueToAlice("00001");
        uint256 dealId = _lock(id, 1 days);
        assertEq(rwa.ownerOf(id), address(vault));
        assertFalse(vault.canRelease(dealId));
        assertFalse(rwa.needsRegistration(id)); // locked is not a change of owner

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

    function testOnlyHolderCanCreateDeal() public {
        uint256 id = _issueToAlice("00001");
        vm.prank(alice);
        rwa.approve(address(vault), id);

        // even with the vault approved, someone else cannot lock (and so cannot move) Alice's deed
        vm.prank(eve);
        vm.expectRevert();
        vault.createDeal(id, eve, uint64(block.timestamp) + 60);
        assertEq(rwa.ownerOf(id), alice);
    }

    function testVaultOnlyAcceptsRWAToken() public {
        FakeDeed fake = new FakeDeed();
        uint256 id = _issueToAlice("00001");
        fake.mint(eve, id); // same token id on a look-alike contract
        vm.startPrank(eve);
        fake.approve(address(vault), id);
        vm.expectRevert(); // vault pulls from RWAToken, where eve owns nothing
        vault.createDeal(id, bob, uint64(block.timestamp) + 60);
        vm.stopPrank();
        assertEq(address(vault.nft()), address(rwa));
    }

    function testLockedAssetCannotBeSoldOrDealtAgain() public {
        uint256 id = _issueToAlice("00001");
        _lock(id, 1 days);

        vm.startPrank(alice);
        vm.expectRevert();
        rwa.transferFrom(alice, eve, id);
        vm.expectRevert();
        vault.createDeal(id, eve, uint64(block.timestamp) + 60);
        vm.stopPrank();
    }

    function testCancelBeforeUnlock() public {
        uint256 id = _issueToAlice("00001");
        uint256 dealId = _lock(id, 1 days);

        vm.prank(eve);
        vm.expectRevert(ConditionalVault.NotSender.selector);
        vault.cancel(dealId);

        vm.prank(alice);
        vault.cancel(dealId);
        assertEq(rwa.ownerOf(id), alice);
        assertFalse(rwa.needsRegistration(id)); // back with the registered owner
    }

    function testCannotCancelAfterUnlock() public {
        uint256 id = _issueToAlice("00001");
        uint256 dealId = _lock(id, 1 days);
        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        vm.expectRevert(ConditionalVault.TooLate.selector);
        vault.cancel(dealId);
    }

    function testBadParamsRevert() public {
        uint256 id = _issueToAlice("00001");
        vm.startPrank(alice);
        rwa.approve(address(vault), id);
        uint64 t = uint64(block.timestamp);

        vm.expectRevert(ConditionalVault.BadRecipient.selector);
        vault.createDeal(id, alice, t + 1);

        vm.expectRevert(ConditionalVault.BadRecipient.selector);
        vault.createDeal(id, address(0), t + 1);

        vm.expectRevert(ConditionalVault.BadTime.selector);
        vault.createDeal(id, bob, t);
        vm.stopPrank();
    }

    function testKeeperReleasesDueDealsAutomatically() public {
        uint256 id1 = _issueToAlice("00001");
        uint256 id2 = _issueToAlice("00002");
        uint256 id3 = _issueToAlice("00003");
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

    // ---------------- Land registration after transfer ----------------

    function testReleasedDeedWaitsForRegistration() public {
        uint256 id = _issueToAlice("00001");
        uint256 dealId = _lock(id, 1 days);
        vm.warp(block.timestamp + 1 days);
        vault.release(dealId);

        assertTrue(rwa.needsRegistration(id));
        uint256[] memory pending = rwa.pendingRegistrations(partner);
        assertEq(pending.length, 1);
        assertEq(pending[0], id);

        vm.prank(eve);
        vm.expectRevert(RWAToken.NotIssuer.selector);
        rwa.confirmRegistration(id);

        vm.prank(partner);
        rwa.confirmRegistration(id);
        assertEq(rwa.registeredOwner(id), bob);
        assertFalse(rwa.needsRegistration(id));
        assertEq(rwa.pendingRegistrations(partner).length, 0);

        vm.prank(partner);
        vm.expectRevert(RWAToken.NothingToRegister.selector);
        rwa.confirmRegistration(id);
    }
}
