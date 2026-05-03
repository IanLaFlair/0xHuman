// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BotINFT
 * @notice ERC-7857-inspired Intelligent NFT for 0xHuman AI bot personas.
 *         Each token represents a tradable AI bot whose encrypted system prompt
 *         lives on 0G Storage and whose match-bankroll lives in this contract.
 *
 * @dev Implements the spirit of ERC-7857:
 *      - Encrypted metadata: stores hash + URI on-chain, blob in 0G Storage
 *      - Tradable: extends ERC-721
 *      - Authorized usage: third-party can use bot without ownership transfer
 *      - Dynamic intelligence: memory URI is mutable (resolver-updated)
 *
 *      Full TEE-oracle re-encryption (per ERC-7857 spec) is simplified for
 *      hackathon scope — the seller hands the new owner an off-chain re-encrypted
 *      blob and calls transferWithNewURI() to update the on-chain pointer.
 */
contract BotINFT is ERC721, ReentrancyGuard {
    // ============ Roles ============

    address public admin;
    address public gameContract;   // OxHuman.sol — only contract that can lock/credit vaults
    address public resolver;       // server wallet — updates memory, marks tier graduations

    // ============ Slot economy ============

    uint8 public constant MAX_BOTS_PER_WALLET = 3;
    uint256 public constant MINT_PAID_SLOT_2_FEE = 10 ether;
    uint256 public constant MINT_PAID_SLOT_3_FEE = 25 ether;
    uint256 public constant PROMOTE_FEE = 10 ether;

    // Initial vault deposits required at mint time (skin in the game)
    uint256 public constant MIN_INITIAL_VAULT_FREE = 2 ether;
    uint256 public constant MIN_INITIAL_VAULT_PAID_2 = 5 ether;
    uint256 public constant MIN_INITIAL_VAULT_PAID_3 = 10 ether;

    // ============ Vault rules ============

    uint256 public constant MAX_STAKE_PERCENT = 10;       // bot can stake up to 10% of its vault per match
    uint256 public constant WITHDRAW_DELAY_BLOCKS = 1;    // anti-sandwich delay

    // ============ Tier graduation ============

    enum Tier { Rookie, Verified }

    uint256 public constant AUTO_PROMOTE_MIN_MATCHES = 30;
    uint256 public constant AUTO_PROMOTE_MIN_WIN_RATE_BP = 4500; // 45.00% in basis points
    uint256 public constant AUTO_DEMOTE_MIN_MATCHES = 50;
    uint256 public constant AUTO_DEMOTE_MAX_WIN_RATE_BP = 3000;  // 30.00%

    // ============ Storage ============

    struct Bot {
        // Identity
        bytes32 personalityHash;   // hash of encrypted system prompt blob
        string  personalityURI;    // 0G Storage pointer (immutable after mint)

        // Memory (mutable, resolver-updated)
        bytes32 memoryHash;
        string  memoryURI;

        // Vault
        uint256 vaultBalance;
        uint256 lastDepositBlock;

        // Stats
        uint64  wins;
        uint64  losses;

        // Slot tracking
        uint8   slot;              // 1, 2, or 3
        Tier    tier;
    }

    mapping(uint256 => Bot) public bots;
    mapping(address => uint8) public slotsOwned;
    mapping(uint256 => mapping(address => bool)) public usageAuthorized; // ERC-7857 authorizeUsage

    uint256 public nextTokenId = 1;
    uint256 public totalVaultLocked; // sum of all vaultBalance for accounting/sanity

    // ============ Events ============

    event BotMinted(uint256 indexed tokenId, address indexed owner, uint8 slot, string personalityURI, bytes32 personalityHash);
    event VaultDeposited(uint256 indexed tokenId, uint256 amount, uint256 newBalance);
    event VaultWithdrawn(uint256 indexed tokenId, uint256 amount, uint256 newBalance);
    event BotBurned(uint256 indexed tokenId, address indexed owner, uint256 refunded);
    event MatchLocked(uint256 indexed tokenId, uint256 amount, uint256 indexed matchId);
    event MatchCredited(uint256 indexed tokenId, uint256 amount, bool botWon, uint256 indexed matchId);
    event MemoryUpdated(uint256 indexed tokenId, string memoryURI, bytes32 memoryHash);
    event TierChanged(uint256 indexed tokenId, Tier oldTier, Tier newTier);
    event UsageAuthorized(uint256 indexed tokenId, address indexed user, bool authorized);
    event TransferWithNewURI(uint256 indexed tokenId, address indexed from, address indexed to, string newPersonalityURI);

    // ============ Errors ============

    error NotAdmin();
    error NotGameContract();
    error NotResolver();
    error NotTokenOwnerOrAuthorized();
    error SlotInvalid();
    error SlotAlreadyOwned();
    error SlotsExceeded();
    error WrongFee();
    error InsufficientVault();
    error VaultUnderMin();
    error WithdrawDelayNotMet();
    error TokenNotFound();
    error AlreadyVerified();
    error NotEligibleForAutoPromote();

    // ============ Modifiers ============

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }
    modifier onlyGameContract() {
        if (msg.sender != gameContract) revert NotGameContract();
        _;
    }
    modifier onlyResolver() {
        if (msg.sender != resolver) revert NotResolver();
        _;
    }

    // ============ Constructor ============

    constructor() ERC721("0xHuman Bot Persona", "0xBOT") {
        admin = msg.sender;
        resolver = msg.sender; // start as deployer; admin should set production resolver post-deploy
    }

    // ============ Admin ============

    function setGameContract(address _gameContract) external onlyAdmin {
        require(_gameContract != address(0), "zero addr");
        gameContract = _gameContract;
    }

    function setResolver(address _resolver) external onlyAdmin {
        require(_resolver != address(0), "zero addr");
        resolver = _resolver;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "zero addr");
        admin = newAdmin;
    }

    // ============ Mint ============

    /**
     * @notice Mint Slot 1 (free). Owner must include initial vault deposit.
     * @param personalityURI 0G Storage pointer to encrypted prompt blob.
     * @param personalityHash sha256 / keccak hash committing to the blob contents.
     */
    function mintFreeSlot(string calldata personalityURI, bytes32 personalityHash)
        external
        payable
        nonReentrant
        returns (uint256 tokenId)
    {
        if (msg.value < MIN_INITIAL_VAULT_FREE) revert VaultUnderMin();
        return _mintBot(msg.sender, 1, Tier.Rookie, personalityURI, personalityHash, msg.value);
    }

    /**
     * @notice Mint Slot 2 or Slot 3 (paid). Sends fee to admin treasury,
     *         retains initial vault deposit on the bot.
     */
    function mintPaidSlot(uint8 slot, string calldata personalityURI, bytes32 personalityHash)
        external
        payable
        nonReentrant
        returns (uint256 tokenId)
    {
        if (slot != 2 && slot != 3) revert SlotInvalid();

        uint256 fee = slot == 2 ? MINT_PAID_SLOT_2_FEE : MINT_PAID_SLOT_3_FEE;
        uint256 minDeposit = slot == 2 ? MIN_INITIAL_VAULT_PAID_2 : MIN_INITIAL_VAULT_PAID_3;
        uint256 totalRequired = fee + minDeposit;

        if (msg.value < totalRequired) revert WrongFee();

        // Excess (msg.value - fee) becomes initial vault balance
        uint256 vaultDeposit = msg.value - fee;

        // Forward fee to admin treasury
        (bool ok, ) = payable(admin).call{value: fee}("");
        require(ok, "fee transfer failed");

        return _mintBot(msg.sender, slot, Tier.Verified, personalityURI, personalityHash, vaultDeposit);
    }

    function _mintBot(
        address to,
        uint8 slot,
        Tier tier,
        string calldata personalityURI,
        bytes32 personalityHash,
        uint256 vaultDeposit
    ) internal returns (uint256 tokenId) {
        if (slotsOwned[to] >= MAX_BOTS_PER_WALLET) revert SlotsExceeded();
        // Slot must equal slotsOwned + 1 (slots 1, 2, 3 in order)
        if (slot != slotsOwned[to] + 1) revert SlotAlreadyOwned();

        tokenId = nextTokenId++;
        slotsOwned[to] += 1;

        bots[tokenId] = Bot({
            personalityHash: personalityHash,
            personalityURI: personalityURI,
            memoryHash: bytes32(0),
            memoryURI: "",
            vaultBalance: vaultDeposit,
            lastDepositBlock: block.number,
            wins: 0,
            losses: 0,
            slot: slot,
            tier: tier
        });

        totalVaultLocked += vaultDeposit;
        _safeMint(to, tokenId);

        emit BotMinted(tokenId, to, slot, personalityURI, personalityHash);
        emit VaultDeposited(tokenId, vaultDeposit, vaultDeposit);
    }

    // ============ Vault ============

    function depositToVault(uint256 tokenId) external payable nonReentrant {
        _requireExists(tokenId);
        require(msg.value > 0, "zero deposit");

        Bot storage b = bots[tokenId];
        b.vaultBalance += msg.value;
        b.lastDepositBlock = block.number;
        totalVaultLocked += msg.value;

        emit VaultDeposited(tokenId, msg.value, b.vaultBalance);
    }

    function withdrawFromVault(uint256 tokenId, uint256 amount) external nonReentrant {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwnerOrAuthorized();
        Bot storage b = bots[tokenId];
        if (b.vaultBalance < amount) revert InsufficientVault();
        if (block.number < b.lastDepositBlock + WITHDRAW_DELAY_BLOCKS) revert WithdrawDelayNotMet();

        b.vaultBalance -= amount;
        totalVaultLocked -= amount;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");

        emit VaultWithdrawn(tokenId, amount, b.vaultBalance);
    }

    /**
     * @notice Burn the bot INFT and recover its remaining vault balance.
     *         Mint fees are non-refundable.
     */
    function burnBot(uint256 tokenId) external nonReentrant {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwnerOrAuthorized();
        Bot storage b = bots[tokenId];
        uint256 refund = b.vaultBalance;
        address ownerAddr = msg.sender;

        b.vaultBalance = 0;
        totalVaultLocked -= refund;
        slotsOwned[ownerAddr] -= 1;

        _burn(tokenId);
        delete bots[tokenId];

        if (refund > 0) {
            (bool ok, ) = payable(ownerAddr).call{value: refund}("");
            require(ok, "refund failed");
        }

        emit BotBurned(tokenId, ownerAddr, refund);
    }

    // ============ Match integration (called by OxHuman.sol) ============

    /**
     * @notice Debit the bot's vault to match the player's stake. Sends the locked
     *         amount to the game contract, which holds the full pot in escrow.
     */
    function lockForMatch(uint256 tokenId, uint256 amount, uint256 matchId)
        external
        onlyGameContract
        nonReentrant
    {
        _requireExists(tokenId);
        Bot storage b = bots[tokenId];
        if (amount > maxStakeOf(tokenId)) revert InsufficientVault();
        if (b.vaultBalance < amount) revert InsufficientVault();

        b.vaultBalance -= amount;
        totalVaultLocked -= amount;

        (bool ok, ) = payable(gameContract).call{value: amount}("");
        require(ok, "transfer to game failed");

        emit MatchLocked(tokenId, amount, matchId);
    }

    /**
     * @notice Credit the bot's vault from a match outcome. Game contract sends
     *         the bot's share via msg.value. Stats updated.
     */
    function creditFromMatch(uint256 tokenId, bool botWon, uint256 matchId)
        external
        payable
        onlyGameContract
        nonReentrant
    {
        _requireExists(tokenId);
        Bot storage b = bots[tokenId];

        b.vaultBalance += msg.value;
        totalVaultLocked += msg.value;
        if (botWon) {
            b.wins += 1;
        } else {
            b.losses += 1;
        }

        emit MatchCredited(tokenId, msg.value, botWon, matchId);
    }

    // ============ Memory updates (resolver-controlled) ============

    function updateMemory(uint256 tokenId, string calldata memoryURI, bytes32 memoryHash)
        external
        onlyResolver
    {
        _requireExists(tokenId);
        Bot storage b = bots[tokenId];
        b.memoryURI = memoryURI;
        b.memoryHash = memoryHash;
        emit MemoryUpdated(tokenId, memoryURI, memoryHash);
    }

    // ============ Tier graduation ============

    /**
     * @notice Owner can pay PROMOTE_FEE to skip the grind and move a Rookie
     *         bot directly into the Verified pool.
     */
    function promoteToVerified(uint256 tokenId) external payable nonReentrant {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwnerOrAuthorized();
        Bot storage b = bots[tokenId];
        if (b.tier == Tier.Verified) revert AlreadyVerified();
        if (msg.value != PROMOTE_FEE) revert WrongFee();

        b.tier = Tier.Verified;
        (bool ok, ) = payable(admin).call{value: msg.value}("");
        require(ok, "fee transfer failed");

        emit TierChanged(tokenId, Tier.Rookie, Tier.Verified);
    }

    /**
     * @notice Resolver-callable: auto-promote Rookie bot that's earned its way.
     */
    function autoPromote(uint256 tokenId) external onlyResolver {
        Bot storage b = bots[tokenId];
        if (b.tier == Tier.Verified) revert AlreadyVerified();

        uint256 totalMatches = uint256(b.wins) + uint256(b.losses);
        if (totalMatches < AUTO_PROMOTE_MIN_MATCHES) revert NotEligibleForAutoPromote();

        uint256 winRateBp = (uint256(b.wins) * 10000) / totalMatches;
        if (winRateBp < AUTO_PROMOTE_MIN_WIN_RATE_BP) revert NotEligibleForAutoPromote();

        b.tier = Tier.Verified;
        emit TierChanged(tokenId, Tier.Rookie, Tier.Verified);
    }

    /**
     * @notice Resolver-callable: demote Verified bot whose performance has cratered.
     */
    function autoDemote(uint256 tokenId) external onlyResolver {
        Bot storage b = bots[tokenId];
        require(b.tier == Tier.Verified, "not verified");

        uint256 totalMatches = uint256(b.wins) + uint256(b.losses);
        require(totalMatches >= AUTO_DEMOTE_MIN_MATCHES, "too few matches");

        uint256 winRateBp = (uint256(b.wins) * 10000) / totalMatches;
        require(winRateBp <= AUTO_DEMOTE_MAX_WIN_RATE_BP, "win rate ok");

        b.tier = Tier.Rookie;
        emit TierChanged(tokenId, Tier.Verified, Tier.Rookie);
    }

    // ============ ERC-7857: authorize usage / transfer-with-new-URI ============

    /**
     * @notice ERC-7857 authorizeUsage — grant/revoke a third party permission to
     *         use this bot (e.g. matchmaker rents the bot) without transferring
     *         ownership. Authorization does NOT confer vault-withdraw rights.
     */
    function authorizeUsage(uint256 tokenId, address user, bool allowed) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwnerOrAuthorized();
        usageAuthorized[tokenId][user] = allowed;
        emit UsageAuthorized(tokenId, user, allowed);
    }

    function isUsageAuthorized(uint256 tokenId, address user) external view returns (bool) {
        if (_ownerOfNoRevert(tokenId) == user) return true;
        return usageAuthorized[tokenId][user];
    }

    /**
     * @notice Simplified ERC-7857 transfer with metadata re-encryption.
     *         Caller (current owner) provides the new owner's re-encrypted
     *         personality URI + hash. Off-chain re-encryption is the seller's
     *         responsibility for hackathon scope; full TEE-oracle flow is
     *         future work.
     */
    function transferWithNewURI(
        address to,
        uint256 tokenId,
        string calldata newPersonalityURI,
        bytes32 newPersonalityHash
    ) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwnerOrAuthorized();
        if (slotsOwned[to] >= MAX_BOTS_PER_WALLET) revert SlotsExceeded();

        Bot storage b = bots[tokenId];
        b.personalityURI = newPersonalityURI;
        b.personalityHash = newPersonalityHash;

        slotsOwned[msg.sender] -= 1;
        slotsOwned[to] += 1;

        _transfer(msg.sender, to, tokenId);
        emit TransferWithNewURI(tokenId, msg.sender, to, newPersonalityURI);
    }

    // ============ Views ============

    function maxStakeOf(uint256 tokenId) public view returns (uint256) {
        return (bots[tokenId].vaultBalance * MAX_STAKE_PERCENT) / 100;
    }

    function canCoverStake(uint256 tokenId, uint256 amount) external view returns (bool) {
        return amount <= maxStakeOf(tokenId);
    }

    function eligibleTier(uint256 tokenId, Tier required) external view returns (bool) {
        if (required == Tier.Rookie) return true;
        return bots[tokenId].tier == Tier.Verified;
    }

    function statsOf(uint256 tokenId) external view returns (uint64 wins, uint64 losses, uint256 winRateBp) {
        Bot storage b = bots[tokenId];
        wins = b.wins;
        losses = b.losses;
        uint256 total = uint256(wins) + uint256(losses);
        winRateBp = total == 0 ? 0 : (uint256(wins) * 10000) / total;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireExists(tokenId);
        return bots[tokenId].personalityURI;
    }

    // ============ Internal ============

    function _requireExists(uint256 tokenId) internal view {
        if (_ownerOfNoRevert(tokenId) == address(0)) revert TokenNotFound();
    }

    function _ownerOfNoRevert(uint256 tokenId) internal view returns (address) {
        // OZ v5 _ownerOf is internal and returns address(0) for non-existent
        return _ownerOf(tokenId);
    }

    // ============ Receive ============

    receive() external payable {
        // Accept refunds from game contract or direct funding
    }
}
