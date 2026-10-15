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
 *         Automatic release: `checkUpkeep` / `performUpkeep` follow the Chainlink Automation interface,
 *         so a keeper (Chainlink Automation, or our own bot) can release due deals without anyone clicking.
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

    /// @notice The only NFT this vault accepts (RWAToken), so nobody can create look-alike deals with another contract.
    IERC721 public immutable nft;
    Deal[] private _deals;
    uint256 public constant MAX_BATCH = 20;

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

    constructor(address _nft) {
        nft = IERC721(_nft);
    }

    /// @dev A must call `nft.approve(vault, tokenId)` (or `setApprovalForAll`) first. Only the holder can lock.
    function createDeal(uint256 tokenId, address to, uint64 unlockTime)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (to == address(0) || to == msg.sender) revert BadRecipient();
        if (unlockTime <= block.timestamp) revert BadTime();

        nft.transferFrom(msg.sender, address(this), tokenId);

        id = _deals.length;
        _deals.push(
            Deal({
                id: id,
                from: msg.sender,
                to: to,
                nft: address(nft),
                tokenId: tokenId,
                unlockTime: unlockTime,
                status: Status.Locked,
                createdAt: uint64(block.timestamp)
            })
        );
        emit DealCreated(id, msg.sender, to, address(nft), tokenId, unlockTime);
    }

    /// @notice Anyone can trigger once the time is reached; the NFT always goes to B.
    function release(uint256 id) external nonReentrant {
        Deal storage d = _deals[id];
        if (d.status != Status.Locked) revert NotLocked();
        if (block.timestamp < d.unlockTime) revert TooEarly();

        _release(id);
    }

    // ---------- Automatic release (Chainlink Automation compatible) ----------

    /// @notice Ids of locked deals whose time has come (max MAX_BATCH).
    function releasable() public view returns (uint256[] memory ids) {
        uint256 count;
        for (uint256 i = 0; i < _deals.length && count < MAX_BATCH; i++) {
            if (_isDue(i)) count++;
        }
        ids = new uint256[](count);
        uint256 j;
        for (uint256 i = 0; i < _deals.length && j < count; i++) {
            if (_isDue(i)) ids[j++] = i;
        }
    }

    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData) {
        uint256[] memory ids = releasable();
        upkeepNeeded = ids.length > 0;
        performData = abi.encode(ids);
    }

    /// @notice Anyone (a keeper) can call; releases every due deal in `performData`, skips the rest.
    function performUpkeep(bytes calldata performData) external nonReentrant {
        uint256[] memory ids = abi.decode(performData, (uint256[]));
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] < _deals.length && _isDue(ids[i])) _release(ids[i]);
        }
    }

    function _isDue(uint256 id) internal view returns (bool) {
        Deal storage d = _deals[id];
        return d.status == Status.Locked && block.timestamp >= d.unlockTime;
    }

    function _release(uint256 id) internal {
        Deal storage d = _deals[id];
        d.status = Status.Released;
        nft.transferFrom(address(this), d.to, d.tokenId);
        emit Released(id, d.to);
    }

    function cancel(uint256 id) external nonReentrant {
        Deal storage d = _deals[id];
        if (d.status != Status.Locked) revert NotLocked();
        if (msg.sender != d.from) revert NotSender();
        if (block.timestamp >= d.unlockTime) revert TooLate();

        d.status = Status.Cancelled;
        nft.transferFrom(address(this), d.from, d.tokenId);
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
