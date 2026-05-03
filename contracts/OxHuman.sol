// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title IBotINFT
 * @notice Minimal interface for BotINFT.sol — used to lock/credit per-bot vaults
 *         during PvE matches. The full BotINFT contract owns the vault accounting.
 */
interface IBotINFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function maxStakeOf(uint256 tokenId) external view returns (uint256);
    function canCoverStake(uint256 tokenId, uint256 amount) external view returns (bool);
    function lockForMatch(uint256 tokenId, uint256 amount, uint256 matchId) external;
    function creditFromMatch(uint256 tokenId, bool botWon, uint256 matchId) external payable;
}

/**
 * @title OxHuman
 * @notice Match escrow + verdict resolution for the 0xHuman game on 0G Chain.
 *         PvE matches are backed by per-bot vaults inside BotINFT (no global
 *         HouseVault). PvP unchanged from Mantle: zero-sum between two humans.
 */
contract OxHuman {
    enum GameStatus { Open, Active, Resolved }
    enum GameMode { PvP, PvE }

    struct Game {
        address player1;
        address player2;          // for PvE: BotINFT contract address
        uint256 botTokenId;       // PvE only — the INFT id matched against
        uint256 stake;
        GameStatus status;
        GameMode mode;
        address winner;
        uint256 timestamp;
        bool isPlayer2Bot;
        bool player1GuessedBot;
        bool player1Submitted;
        bool player2GuessedBot;
        bool player2Submitted;
        // 0G integration: storage anchors
        bytes32 chatLogHash;
        string  chatLogURI;
    }

    mapping(uint256 => Game) public games;
    mapping(address => uint256) public winnings;
    uint256 public gameCount;

    address public oracle;        // admin
    address public resolver;      // server wallet that submits signed votes
    IBotINFT public botINFT;      // 0G-side replacement for HouseVault

    // Fee schedule (matches docs/economy)
    uint256 public constant PAYOUT_NUMERATOR = 190;       // 1.9x payout to winning player
    uint256 public constant PAYOUT_DENOMINATOR = 100;
    uint256 public constant PROTOCOL_FEE_PERCENT = 5;     // 5% of stake to treasury
    uint256 public constant PERFORMANCE_FEE_PERCENT = 10; // 10% of net to treasury (PvE bot wins)
    uint256 public constant BOT_OWNER_SHARE_PERCENT = 0;  // bot owner share is implicit:
    // when bot wins, the credit goes to bot vault (owner-controlled). Treasury takes
    // protocol fee (5%) + performance fee (10%) of stake. Remaining 85% returns to vault.
    // (Owner withdraws via BotINFT.withdrawFromVault.)

    // ============ Events ============

    event GameCreated(uint256 indexed gameId, address indexed player1, uint256 stake, GameMode mode);
    event GameJoined(uint256 indexed gameId, address indexed player2, uint256 botTokenId);
    event VerdictSubmitted(uint256 indexed gameId, address indexed player, bool guessedBot);
    event GameResolved(uint256 indexed gameId, address indexed winner, uint256 payout);
    event GameDraw(uint256 indexed gameId, uint256 refundAmount);
    event WinningsClaimed(address indexed player, uint256 amount);
    event ChatLogAnchored(uint256 indexed gameId, bytes32 chatLogHash, string chatLogURI);

    // ============ Modifiers ============

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    modifier onlyResolver() {
        require(msg.sender == resolver, "Not resolver");
        _;
    }

    // ============ Constructor ============

    constructor() {
        oracle = msg.sender;
        resolver = msg.sender;
    }

    // ============ Admin ============

    function setResolver(address _resolver) external onlyOracle {
        require(_resolver != address(0), "zero addr");
        resolver = _resolver;
    }

    function setBotINFT(address _botINFT) external onlyOracle {
        require(_botINFT != address(0), "zero addr");
        botINFT = IBotINFT(_botINFT);
    }

    function transferOracle(address newOracle) external onlyOracle {
        require(newOracle != address(0), "zero addr");
        oracle = newOracle;
    }

    // ============ PvP ============

    /**
     * @notice Create a PvP game. Anyone can join via joinGame.
     */
    function createGame() external payable {
        require(msg.value > 0, "Stake required");
        uint256 id = gameCount;
        games[id] = Game({
            player1: msg.sender,
            player2: address(0),
            botTokenId: 0,
            stake: msg.value,
            status: GameStatus.Open,
            mode: GameMode.PvP,
            winner: address(0),
            timestamp: block.timestamp,
            isPlayer2Bot: false,
            player1GuessedBot: false,
            player1Submitted: false,
            player2GuessedBot: false,
            player2Submitted: false,
            chatLogHash: bytes32(0),
            chatLogURI: ""
        });
        emit GameCreated(id, msg.sender, msg.value, GameMode.PvP);
        gameCount++;
    }

    /**
     * @notice Join an Open PvP game.
     */
    function joinGame(uint256 gameId) external payable {
        Game storage g = games[gameId];
        require(g.status == GameStatus.Open, "Not open");
        require(msg.value == g.stake, "Wrong stake");
        require(msg.sender != g.player1, "Self");

        g.player2 = msg.sender;
        g.status = GameStatus.Active;
        g.timestamp = block.timestamp;
        emit GameJoined(gameId, msg.sender, 0);
    }

    // ============ PvE (vs INFT bot) ============

    /**
     * @notice Create a PvE game backed by a specific bot's vault.
     *         Player stake is matched 1:1 from the bot's vault via BotINFT.
     *
     * @param botTokenId  The BotINFT tokenId chosen by matchmaker.
     */
    function createGamePvE(uint256 botTokenId) external payable {
        require(msg.value > 0, "Stake required");
        require(address(botINFT) != address(0), "BotINFT not set");
        require(botINFT.canCoverStake(botTokenId, msg.value), "Bot vault too small");

        uint256 id = gameCount;
        games[id] = Game({
            player1: msg.sender,
            player2: address(botINFT),
            botTokenId: botTokenId,
            stake: msg.value,
            status: GameStatus.Active,
            mode: GameMode.PvE,
            winner: address(0),
            timestamp: block.timestamp,
            isPlayer2Bot: true,
            player1GuessedBot: false,
            player1Submitted: false,
            player2GuessedBot: false,
            player2Submitted: false,
            chatLogHash: bytes32(0),
            chatLogURI: ""
        });
        gameCount++;

        // Lock the bot's matching stake into this contract's escrow
        botINFT.lockForMatch(botTokenId, msg.value, id);

        emit GameCreated(id, msg.sender, msg.value, GameMode.PvE);
        emit GameJoined(id, address(botINFT), botTokenId);
    }

    // ============ Verdict submission ============

    /**
     * @notice Submit verdict directly on-chain (alternative to signed-vote path).
     */
    function submitVerdict(uint256 gameId, bool guessedBot) external {
        Game storage g = games[gameId];
        require(g.status == GameStatus.Active, "Not active");

        if (msg.sender == g.player1) {
            require(!g.player1Submitted, "P1 already voted");
            g.player1GuessedBot = guessedBot;
            g.player1Submitted = true;
            emit VerdictSubmitted(gameId, msg.sender, guessedBot);
        } else if (g.mode == GameMode.PvP && msg.sender == g.player2) {
            require(!g.player2Submitted, "P2 already voted");
            g.player2GuessedBot = guessedBot;
            g.player2Submitted = true;
            emit VerdictSubmitted(gameId, msg.sender, guessedBot);
        } else {
            revert("Not a player");
        }

        _tryResolve(gameId);
    }

    /**
     * @notice Resolver submits both players' off-chain signed votes for on-chain
     *         verification + atomic resolution. PvE: P2 sig is from resolver
     *         (bots can't sign).
     */
    function resolveWithSignatures(
        uint256 gameId,
        bool p1GuessedBot,
        bytes calldata p1Signature,
        bool p2GuessedBot,
        bytes calldata p2Signature
    ) external onlyResolver {
        Game storage g = games[gameId];
        require(g.status == GameStatus.Active, "Not active");
        require(!g.player1Submitted && !g.player2Submitted, "Already voted");

        // Verify P1 signature
        require(
            ECDSA.recover(
                MessageHashUtils.toEthSignedMessageHash(keccak256(abi.encodePacked(gameId, p1GuessedBot, "VOTE"))),
                p1Signature
            ) == g.player1,
            "Invalid P1 sig"
        );

        // P2 signature: PvP must be from g.player2; PvE can be from resolver
        address p2Signer = ECDSA.recover(
            MessageHashUtils.toEthSignedMessageHash(keccak256(abi.encodePacked(gameId, p2GuessedBot, "VOTE"))),
            p2Signature
        );
        require(
            p2Signer == g.player2 || (g.mode == GameMode.PvE && p2Signer == resolver),
            "Invalid P2 sig"
        );

        g.player1GuessedBot = p1GuessedBot;
        g.player1Submitted = true;
        g.player2GuessedBot = p2GuessedBot;
        g.player2Submitted = true;

        emit VerdictSubmitted(gameId, g.player1, p1GuessedBot);
        emit VerdictSubmitted(gameId, g.player2, p2GuessedBot);

        if (g.mode == GameMode.PvE) {
            _resolveVsBot(gameId);
        } else {
            _resolveVsHuman(gameId);
        }
    }

    /**
     * @notice Anchor the post-match chat log hash + 0G Storage URI on-chain.
     *         Resolver-only (server uploads transcript + calls this).
     */
    function anchorChatLog(uint256 gameId, bytes32 hash, string calldata uri) external onlyResolver {
        Game storage g = games[gameId];
        require(g.status == GameStatus.Resolved, "Not resolved");
        g.chatLogHash = hash;
        g.chatLogURI = uri;
        emit ChatLogAnchored(gameId, hash, uri);
    }

    // ============ Resolution ============

    function _tryResolve(uint256 gameId) internal {
        Game storage g = games[gameId];
        if (g.mode == GameMode.PvE && g.player1Submitted) {
            _resolveVsBot(gameId);
        } else if (g.mode == GameMode.PvP && g.player1Submitted && g.player2Submitted) {
            _resolveVsHuman(gameId);
        }
    }

    /**
     * PvE resolution. Pot = 2 * stake (player + bot's matching stake).
     * - Bot wins  (player guessed HUMAN): treasury 5%+10% of stake; bot vault gets 1.85x stake credited
     * - Player wins (player guessed BOT): treasury 5% of stake; player gets 1.85x stake; bot vault refunded 0.10x
     */
    function _resolveVsBot(uint256 gameId) internal {
        Game storage g = games[gameId];
        uint256 stake = g.stake;
        uint256 protocolFee = (stake * PROTOCOL_FEE_PERCENT) / 100;

        // In PvE the player is always asking "is opponent a bot?". Bot truly is bot,
        // so player is correct iff guessedBot == true.
        bool playerWins = g.player1GuessedBot;

        if (playerWins) {
            // Player gets 1.85x stake net (1.9x gross - 5% protocol)
            uint256 grossPayout = (stake * PAYOUT_NUMERATOR) / PAYOUT_DENOMINATOR; // 1.9x
            uint256 netPayout = grossPayout - protocolFee; // 1.85x
            // Bot vault refund: 0.10x stake (kept in escrow from the original 2x pot
            // after paying out player + treasury)
            uint256 botRefund = (stake * 2) - netPayout - protocolFee;

            winnings[g.player1] += netPayout;
            g.winner = g.player1;

            // Send treasury fee
            (bool okFee, ) = payable(oracle).call{value: protocolFee}("");
            require(okFee, "fee transfer failed");

            // Refund bot vault
            botINFT.creditFromMatch{value: botRefund}(g.botTokenId, false, gameId);

            g.status = GameStatus.Resolved;
            emit GameResolved(gameId, g.winner, netPayout);
        } else {
            // Bot wins: bot vault gets credited with 0.85x stake net profit + bot's
            // original stake back (0.85x + 1.0x = 1.85x of stake).
            // Treasury keeps protocol fee (0.05x) + performance fee (0.10x) = 0.15x.
            uint256 perfFee = (stake * PERFORMANCE_FEE_PERCENT) / 100;
            uint256 totalFee = protocolFee + perfFee;
            uint256 botCredit = (stake * 2) - totalFee; // 1.85x

            (bool okFee, ) = payable(oracle).call{value: totalFee}("");
            require(okFee, "fee transfer failed");

            botINFT.creditFromMatch{value: botCredit}(g.botTokenId, true, gameId);
            g.winner = address(botINFT);

            g.status = GameStatus.Resolved;
            emit GameResolved(gameId, g.winner, botCredit);
        }
    }

    /**
     * PvP resolution: zero-sum. Both players are humans.
     * - Both correct (both vote HUMAN) OR both wrong (both vote BOT) → DRAW (stakes refunded minus fee split)
     * - Otherwise: correct guesser takes the pot
     */
    function _resolveVsHuman(uint256 gameId) internal {
        Game storage g = games[gameId];
        uint256 stake = g.stake;
        uint256 totalPot = stake * 2;
        uint256 fee = (totalPot * PROTOCOL_FEE_PERCENT) / 100;
        uint256 payout = totalPot - fee;

        // P1 and P2 are both humans. "Correct" guess = guessedBot == false.
        bool p1Correct = (g.player1GuessedBot == false);
        bool p2Correct = (g.player2GuessedBot == false);

        if (p1Correct == p2Correct) {
            // Draw — split refund between both
            uint256 perPlayer = (totalPot - fee) / 2;
            winnings[g.player1] += perPlayer;
            winnings[g.player2] += perPlayer;
            g.winner = address(0);
            (bool okFee, ) = payable(oracle).call{value: fee}("");
            require(okFee, "fee transfer failed");
            g.status = GameStatus.Resolved;
            emit GameDraw(gameId, perPlayer);
        } else if (p1Correct) {
            winnings[g.player1] += payout;
            g.winner = g.player1;
            (bool okFee, ) = payable(oracle).call{value: fee}("");
            require(okFee, "fee transfer failed");
            g.status = GameStatus.Resolved;
            emit GameResolved(gameId, g.winner, payout);
        } else {
            winnings[g.player2] += payout;
            g.winner = g.player2;
            (bool okFee, ) = payable(oracle).call{value: fee}("");
            require(okFee, "fee transfer failed");
            g.status = GameStatus.Resolved;
            emit GameResolved(gameId, g.winner, payout);
        }
    }

    // ============ Claim ============

    function claimWinnings() external {
        uint256 amount = winnings[msg.sender];
        require(amount > 0, "Nothing to claim");
        winnings[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
        emit WinningsClaimed(msg.sender, amount);
    }

    // ============ Receive ============

    receive() external payable {}
}
