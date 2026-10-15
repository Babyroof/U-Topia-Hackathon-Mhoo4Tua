// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title RWAToken
 * @notice One NFT = one real-world asset or single-original document (1:1).
 *
 *  Flow 1 (tokenize):
 *    1. A calls `requestTokenize(partner, ...)` with the asset details.
 *    2. The partner checks the real item/document off-chain (and voids/stamps the paper original),
 *       then calls `approveRequest` -> NFT is minted to A. Or `rejectRequest`.
 *  Rules enforced on-chain:
 *    - Only approved partners can issue; each NFT records which partner issued it.
 *    - The same serial / document number can be tokenized only once (no duplicates).
 *  Redeem (get the real item back):
 *    1. Holder calls `requestRedeem` -> NFT is parked in this contract (can't be sold meanwhile).
 *    2. The issuing partner hands over the item and calls `confirmRedeem` -> NFT is burned.
 *       Before that, the holder can `cancelRedeem` and get the NFT back.
 *
 * @dev The token's legal effect comes from the issuer accepting it in place of the paper,
 *      not from the blockchain itself.
 */
contract RWAToken is ERC721 {
    struct Asset {
        string assetType; // e.g. "Luxury Watch", "Warehouse Receipt"
        string name; // e.g. "Rolex Submariner 126610LN"
        string serial; // serial number / document number
        string imageURI; // photo / scan / metadata link
        address issuer; // partner that verified it
        uint64 issuedAt;
    }

    enum RequestStatus {
        None,
        Pending,
        Approved,
        Rejected
    }

    struct Request {
        uint256 id;
        address requester;
        address partner;
        string assetType;
        string name;
        string serial;
        string imageURI;
        RequestStatus status;
        uint256 tokenId; // set when approved
        uint64 createdAt;
    }

    enum RedeemStatus {
        None,
        Requested,
        Completed,
        Cancelled
    }

    struct Redemption {
        uint256 id;
        uint256 tokenId;
        address holder;
        address issuer;
        RedeemStatus status;
        uint64 requestedAt;
    }

    address public admin;
    uint256 public nextTokenId = 1;

    mapping(address => bool) public isPartner;
    mapping(address => string) public partnerName;
    mapping(uint256 => Asset) private _assets;
    mapping(bytes32 => bool) public serialUsed; // keccak256(serial) => already tokenized?
    Request[] private _requests;
    Redemption[] private _redemptions;
    address[] private _partnerList;
    mapping(address => bool) private _listed;

    event PartnerSet(address indexed partner, string name, bool active);
    event TokenizeRequested(uint256 indexed requestId, address indexed requester, address indexed partner);
    event RequestApproved(uint256 indexed requestId, uint256 indexed tokenId);
    event RequestRejected(uint256 indexed requestId, string reason);
    event AssetIssued(uint256 indexed tokenId, address indexed issuer, address indexed to, string serial);
    event RedeemRequested(uint256 indexed redemptionId, uint256 indexed tokenId, address indexed holder);
    event RedeemCancelled(uint256 indexed redemptionId, uint256 indexed tokenId);
    event Redeemed(uint256 indexed tokenId, address indexed holder, address indexed issuer);

    error NotAdmin();
    error NotPartner();
    error NotRequestPartner();
    error RequestNotPending();
    error SerialAlreadyTokenized();
    error NotHolder();
    error EmptyField();
    error NotIssuer();
    error RedemptionNotPending();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address _admin) ERC721("Vaulted Real-World Asset", "vRWA") {
        admin = _admin;
    }

    // ---------- Admin (platform) ----------

    /// @notice Only the platform admin can add, rename or deactivate partners. Partners cannot add partners.
    function setPartner(address partner, string calldata name, bool active) external onlyAdmin {
        if (partner == address(0)) revert EmptyField();
        if (!_listed[partner]) {
            _listed[partner] = true;
            _partnerList.push(partner);
        }
        isPartner[partner] = active;
        partnerName[partner] = name;
        emit PartnerSet(partner, name, active);
    }

    // ---------- Flow 1: A requests, partner approves ----------

    function requestTokenize(
        address partner,
        string calldata assetType,
        string calldata name,
        string calldata serial,
        string calldata imageURI
    ) external returns (uint256 requestId) {
        if (!isPartner[partner]) revert NotPartner();
        if (bytes(serial).length == 0 || bytes(name).length == 0 || bytes(assetType).length == 0) revert EmptyField();
        if (serialUsed[keccak256(bytes(serial))]) revert SerialAlreadyTokenized();

        requestId = _requests.length;
        _requests.push(
            Request({
                id: requestId,
                requester: msg.sender,
                partner: partner,
                assetType: assetType,
                name: name,
                serial: serial,
                imageURI: imageURI,
                status: RequestStatus.Pending,
                tokenId: 0,
                createdAt: uint64(block.timestamp)
            })
        );
        emit TokenizeRequested(requestId, msg.sender, partner);
    }

    function approveRequest(uint256 requestId) external returns (uint256 tokenId) {
        Request storage r = _requests[requestId];
        if (r.status != RequestStatus.Pending) revert RequestNotPending();
        if (msg.sender != r.partner) revert NotRequestPartner();
        if (!isPartner[msg.sender]) revert NotPartner();

        r.status = RequestStatus.Approved;
        tokenId = _mintAsset(r.requester, r.assetType, r.name, r.serial, r.imageURI, msg.sender);
        r.tokenId = tokenId;
        emit RequestApproved(requestId, tokenId);
    }

    function rejectRequest(uint256 requestId, string calldata reason) external {
        Request storage r = _requests[requestId];
        if (r.status != RequestStatus.Pending) revert RequestNotPending();
        if (msg.sender != r.partner) revert NotRequestPartner();

        r.status = RequestStatus.Rejected;
        emit RequestRejected(requestId, reason);
    }

    // ---------- Partner: direct issue (e.g. partner onboarding an item at the counter) ----------

    function issue(
        address to,
        string calldata assetType,
        string calldata name,
        string calldata serial,
        string calldata imageURI
    ) external returns (uint256 tokenId) {
        if (!isPartner[msg.sender]) revert NotPartner();
        tokenId = _mintAsset(to, assetType, name, serial, imageURI, msg.sender);
    }

    // ---------- Redeem: holder requests, issuing partner confirms handover + burns ----------

    function requestRedeem(uint256 tokenId) external returns (uint256 redemptionId) {
        if (ownerOf(tokenId) != msg.sender) revert NotHolder();
        address issuer = _assets[tokenId].issuer;

        // park the NFT here so it can't be sold or pledged while the handover happens
        _transfer(msg.sender, address(this), tokenId);

        redemptionId = _redemptions.length;
        _redemptions.push(
            Redemption({
                id: redemptionId,
                tokenId: tokenId,
                holder: msg.sender,
                issuer: issuer,
                status: RedeemStatus.Requested,
                requestedAt: uint64(block.timestamp)
            })
        );
        emit RedeemRequested(redemptionId, tokenId, msg.sender);
    }

    function confirmRedeem(uint256 redemptionId) external {
        Redemption storage r = _redemptions[redemptionId];
        if (r.status != RedeemStatus.Requested) revert RedemptionNotPending();
        if (msg.sender != r.issuer) revert NotIssuer();

        r.status = RedeemStatus.Completed;
        _burn(r.tokenId);
        // serial stays "used" so the same item cannot be silently re-tokenized
        emit Redeemed(r.tokenId, r.holder, r.issuer);
    }

    function cancelRedeem(uint256 redemptionId) external {
        Redemption storage r = _redemptions[redemptionId];
        if (r.status != RedeemStatus.Requested) revert RedemptionNotPending();
        if (msg.sender != r.holder) revert NotHolder();

        r.status = RedeemStatus.Cancelled;
        _transfer(address(this), r.holder, r.tokenId);
        emit RedeemCancelled(redemptionId, r.tokenId);
    }

    // ---------- Internal ----------

    function _mintAsset(
        address to,
        string memory assetType,
        string memory name,
        string memory serial,
        string memory imageURI,
        address issuer
    ) internal returns (uint256 tokenId) {
        if (bytes(serial).length == 0 || bytes(name).length == 0 || bytes(assetType).length == 0) revert EmptyField();
        bytes32 key = keccak256(bytes(serial));
        if (serialUsed[key]) revert SerialAlreadyTokenized();
        serialUsed[key] = true;

        tokenId = nextTokenId++;
        _assets[tokenId] = Asset({
            assetType: assetType,
            name: name,
            serial: serial,
            imageURI: imageURI,
            issuer: issuer,
            issuedAt: uint64(block.timestamp)
        });
        _safeMint(to, tokenId);
        emit AssetIssued(tokenId, issuer, to, serial);
    }

    // ---------- Views ----------

    function getAsset(uint256 tokenId) external view returns (Asset memory) {
        _requireOwned(tokenId);
        return _assets[tokenId];
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /// @notice All live token ids owned by `user` (simple loop, fine for demo scale).
    function tokensOf(address user) external view returns (uint256[] memory ids) {
        uint256 count;
        for (uint256 i = 1; i < nextTokenId; i++) {
            if (_ownerOf(i) == user) count++;
        }
        ids = new uint256[](count);
        uint256 j;
        for (uint256 i = 1; i < nextTokenId; i++) {
            if (_ownerOf(i) == user) ids[j++] = i;
        }
    }

    function requestCount() external view returns (uint256) {
        return _requests.length;
    }

    function getRequest(uint256 requestId) external view returns (Request memory) {
        return _requests[requestId];
    }

    function getAllRequests() external view returns (Request[] memory) {
        return _requests;
    }

    /// @notice Every address the admin has ever set (check `isPartner` for current status).
    function getPartners() external view returns (address[] memory) {
        return _partnerList;
    }

    function getAllRedemptions() external view returns (Redemption[] memory) {
        return _redemptions;
    }
}
