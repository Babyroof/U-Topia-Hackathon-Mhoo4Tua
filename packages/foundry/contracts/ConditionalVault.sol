// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ConditionalVault
 * @notice Flow 2: A locks an NFT for B until a set time.
 *         - While locked, nobody (including A) can sell or pledge the NFT elsewhere: the vault holds it.
 *         - From `unlockTime`, anyone can call `release` and the NFT goes to B.
 *         - A can `cancel` before `unlockTime` and get the NFT back.
 */
contract ConditionalVault is ReentrancyGuard {
    enum Status {
        None,
        Locked,
        Released,
        Cancelled
    }

    struct Deal {
        uint256 id;
        address from;
        address to;
        address nft;
        uint256 tokenId;
        uint64 unlockTime;
        Status status;
        uint64 createdAt;
    }

    Deal[] private _deals;

    event DealCreated(
        uint256 indexed id, address indexed from, address indexed to, address nft, uint256 tokenId, uint64 unlockTime
    );
    event Released(uint256 indexed id, address indexed to);
    event Cancelled(uint256 indexed id);

    error BadRecipient();
    error BadTime();
    error NotLocked();
    error NotSender();
    error TooEarly();
    error TooLate();

    /// @dev A must call `nft.approve(vault, tokenId)` first.
    function createDeal(address nft, uint256 tokenId, address to, uint64 unlockTime)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (to == address(0) || to == msg.sender) revert BadRecipient();
        if (unlockTime <= block.timestamp) revert BadTime();

        IERC721(nft).transferFrom(msg.sender, address(this), tokenId);

        id = _deals.length;
        _deals.push(
            Deal({
                id: id,
                from: msg.sender,
                to: to,
                nft: nft,
                tokenId: tokenId,
                unlockTime: unlockTime,
                status: Status.Locked,
                createdAt: uint64(block.timestamp)
            })
        );
        emit DealCreated(id, msg.sender, to, nft, tokenId, unlockTime);
    }

    /// @notice Anyone can trigger once the time is reached; the NFT always goes to B.
    function release(uint256 id) external nonReentrant {
        Deal storage d = _deals[id];
        if (d.status != Status.Locked) revert NotLocked();
        if (block.timestamp < d.unlockTime) revert TooEarly();

        d.status = Status.Released;
        IERC721(d.nft).transferFrom(address(this), d.to, d.tokenId);
        emit Released(id, d.to);
    }

    function cancel(uint256 id) external nonReentrant {
        Deal storage d = _deals[id];
        if (d.status != Status.Locked) revert NotLocked();
        if (msg.sender != d.from) revert NotSender();
        if (block.timestamp >= d.unlockTime) revert TooLate();

        d.status = Status.Cancelled;
        IERC721(d.nft).transferFrom(address(this), d.from, d.tokenId);
        emit Cancelled(id);
    }

    // ---------- Views ----------

    function dealCount() external view returns (uint256) {
        return _deals.length;
    }

    function getDeal(uint256 id) external view returns (Deal memory) {
        return _deals[id];
    }

    function getAllDeals() external view returns (Deal[] memory) {
        return _deals;
    }

    function canRelease(uint256 id) external view returns (bool) {
        Deal storage d = _deals[id];
        return d.status == Status.Locked && block.timestamp >= d.unlockTime;
    }
}
