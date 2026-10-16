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
 *         Optional sale mode (`price > 0`): B must `pay` exactly `price` in AVAX (wei) before `deadline`.
 *         On release the NFT goes to B and the AVAX goes to A in the same tx. Unpaid sales are never
 *         released; after `deadline` A can `reclaim` the NFT.
 *         Automatic release: `checkUpkeep` / `performUpkeep` follow the Chainlink Automation interface,
 *         so a keeper (Chainlink Automation, or our own bot) can release due deals without anyone clicking.
 */
contract ConditionalVault is ReentrancyGuard {
    enum Status {
        None,
        Locked,
        Released,
        Cancelled,
        Reclaimed
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
        uint64 deadline; // sale only: last moment B can pay (0 for free transfers)
        uint256 price; // sale only: price in wei (0 = free transfer)
        bool paid; // sale only: B has paid, AVAX is held by the vault
    }

    /// @notice The only NFT this vault accepts (RWAToken), so nobody can create look-alike deals with another contract.
    IERC721 public immutable nft;
    Deal[] private _deals;
    uint256 public constant MAX_BATCH = 20;

    event DealCreated(
        uint256 indexed id,
        address indexed from,
        address indexed to,
        address nft,
        uint256 tokenId,
        uint64 unlockTime,
        uint256 price,
        uint64 deadline
    );
    event Released(uint256 indexed id, address indexed to);
    event Cancelled(uint256 indexed id);
    event Paid(uint256 indexed id, address indexed payer, uint256 amount);
    event Reclaimed(uint256 indexed id);

    error BadRecipient();
    error BadTime();
    error NotLocked();
    error NotSender();
    error TooEarly();
    error TooLate();
    error BadDeadline();
    error NotSale();
    error NotRecipient();
    error WrongAmount();
    error AlreadyPaid();
    error NotPaid();
    error DeadlineNotPassed();
    error PaymentFailed();

    constructor(address _nft) {
        nft = IERC721(_nft);
    }

    /// @notice Lock `tokenId` for `to` until `unlockTime`. `price` in wei (0 = free transfer, then `deadline` must be 0).
    ///         For a sale, `deadline` (last time B can pay) must be after `unlockTime`.
    /// @dev A must call `nft.approve(vault, tokenId)` (or `setApprovalForAll`) first. Only the holder can lock.
    function createDeal(uint256 tokenId, address to, uint64 unlockTime, uint64 deadline, uint256 price)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (to == address(0) || to == msg.sender) revert BadRecipient();
        if (unlockTime <= block.timestamp) revert BadTime();
        if (price == 0) {
            if (deadline != 0) revert BadDeadline();
        } else if (deadline <= unlockTime || deadline <= block.timestamp) {
            revert BadDeadline();
        }

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
                createdAt: uint64(block.timestamp),
                deadline: deadline,
                price: price,
                paid: false
            })
        );
        emit DealCreated(id, msg.sender, to, address(nft), tokenId, unlockTime, price, deadline);
    }

    /// @notice B pays exactly `price` (wei) for a sale deal, up to `deadline`. If `unlockTime` has passed,
    ///         the NFT and the AVAX swap in this same tx; otherwise the vault holds the AVAX until release.
    function pay(uint256 id) external payable nonReentrant {
        Deal storage d = _deals[id];
        if (msg.sender != d.to) revert NotRecipient();
        if (d.status != Status.Locked) revert NotLocked();
        if (d.price == 0) revert NotSale();
        if (d.paid) revert AlreadyPaid();
        if (block.timestamp > d.deadline) revert TooLate();
        if (msg.value != d.price) revert WrongAmount();

        d.paid = true;
        emit Paid(id, msg.sender, msg.value);

        if (block.timestamp >= d.unlockTime) _release(id);
    }

    /// @notice Anyone can trigger once the time is reached (and a sale is paid); the NFT always goes to B.
    function release(uint256 id) external nonReentrant {
        Deal storage d = _deals[id];
        if (d.status != Status.Locked) revert NotLocked();
        if (block.timestamp < d.unlockTime) revert TooEarly();
        if (d.price > 0 && !d.paid) revert NotPaid();

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
        return d.status == Status.Locked && block.timestamp >= d.unlockTime && (d.price == 0 || d.paid);
    }

    /// @dev Effects first, then NFT to B, then (for a paid sale) AVAX to A.
    function _release(uint256 id) internal {
        Deal storage d = _deals[id];
        d.status = Status.Released;
        nft.transferFrom(address(this), d.to, d.tokenId);
        emit Released(id, d.to);
        if (d.paid) {
            (bool ok,) = payable(d.from).call{ value: d.price }("");
            if (!ok) revert PaymentFailed();
        }
    }

    /// @notice A takes the NFT back before `unlockTime` (not possible once B has paid).
    function cancel(uint256 id) external nonReentrant {
        Deal storage d = _deals[id];
        if (d.status != Status.Locked) revert NotLocked();
        if (msg.sender != d.from) revert NotSender();
        if (d.paid) revert AlreadyPaid();
        if (block.timestamp >= d.unlockTime) revert TooLate();

        d.status = Status.Cancelled;
        nft.transferFrom(address(this), d.from, d.tokenId);
        emit Cancelled(id);
    }

    /// @notice A takes the NFT back from an unpaid sale once `deadline` has passed.
    function reclaim(uint256 id) external nonReentrant {
        Deal storage d = _deals[id];
        if (d.status != Status.Locked) revert NotLocked();
        if (msg.sender != d.from) revert NotSender();
        if (d.price == 0) revert NotSale();
        if (d.paid) revert AlreadyPaid();
        if (block.timestamp <= d.deadline) revert DeadlineNotPassed();

        d.status = Status.Reclaimed;
        nft.transferFrom(address(this), d.from, d.tokenId);
        emit Reclaimed(id);
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

    /// @notice True when `release` would succeed now (time reached and, for a sale, paid).
    function canRelease(uint256 id) external view returns (bool) {
        return _isDue(id);
    }
}
