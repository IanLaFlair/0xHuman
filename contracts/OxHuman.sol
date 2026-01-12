// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

// Interface for HouseVault
interface IHouseVault {
    function recordWin() external payable; // Now payable - receives MNT
    function recordLoss(uint256 amount) external returns (bool);
    function canCoverBet(uint256 amount) external view returns (bool);
    function maxBet() external view returns (uint256);
}

contract OxHuman {
    enum GameStatus { Open, Active, Resolved }
    enum GameMode { PvP, PvE } // NEW: Game mode enum
    enum Role { Human, Bot }

    struct Game {
        address player1;
        address player2;
        uint256 stake;
        GameStatus status;
        GameMode mode; // NEW: PvP or PvE
        address winner;
        uint256 timestamp;
        bool isPlayer2Bot; // True if P2 is a bot, false if human
        // Player 1 verdict
        bool player1GuessedBot; // True if P1 guessed P2 is a bot
        bool player1Submitted;
        // Player 2 verdict (for PvP)
        bool player2GuessedBot; // True if P2 guessed P1 is a bot (PvP only, P1 is always human)
        bool player2Submitted;
    }

    mapping(uint256 => Game) public games;
    mapping(address => uint256) public winnings;
    uint256 public gameCount;
    address public oracle;
    address public resolver; // Server wallet for signed vote resolution
    IHouseVault public houseVault; // NEW: HouseVault contract
    
    uint256 public constant PAYOUT_NUMERATOR = 190; // 1.9x payout
    uint256 public constant PAYOUT_DENOMINATOR = 100;
    uint256 public constant FEE_PERCENT = 5; // 5% fee
    uint256 public constant PERFORMANCE_FEE = 20; // 20% of house wins

    event GameCreated(uint256 indexed gameId, address player1, uint256 stake);
    event GameJoined(uint256 indexed gameId, address player2);
    event VerdictSubmitted(uint256 indexed gameId, address player, bool guessedBot);
    event GameResolved(uint256 indexed gameId, address winner, uint256 payout);
    event GameDraw(uint256 indexed gameId, uint256 refundAmount);
    event WinningsClaimed(address indexed player, uint256 amount);

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only Oracle");
        _;
    }

    modifier onlyResolver() {
        require(msg.sender == resolver, "Not authorized resolver");
        _;
    }

    constructor() {
        oracle = msg.sender;
        resolver = msg.sender; // Initially set resolver to deployer
    }

    function setResolver(address _resolver) external onlyOracle {
        resolver = _resolver;
    }

    // NEW: Set HouseVault address
    function setHouseVault(address _houseVault) external onlyOracle {
        require(_houseVault != address(0), "Invalid address");
        houseVault = IHouseVault(_houseVault);
    }

    // Original PvP game creation
    function createGame() external payable {
        require(msg.value > 0, "Stake required");
        
        games[gameCount] = Game({
            player1: msg.sender,
            player2: address(0),
            stake: msg.value,
            status: GameStatus.Open,
            mode: GameMode.PvP,
            winner: address(0),
            timestamp: block.timestamp,
            isPlayer2Bot: false,
            player1GuessedBot: false,
            player1Submitted: false,
            player2GuessedBot: false,
            player2Submitted: false
        });

        emit GameCreated(gameCount, msg.sender, msg.value);
        gameCount++;
    }

    // NEW: Create PvE game (instant match vs House)
    function createGamePvE() external payable {
        require(msg.value > 0, "Stake required");
        require(address(houseVault) != address(0), "HouseVault not set");
        require(houseVault.canCoverBet(msg.value), "Bet exceeds pool capacity");
        
        uint256 currentGameId = gameCount;
        
        games[currentGameId] = Game({
            player1: msg.sender,
            player2: address(houseVault), // House is P2
            stake: msg.value,
            status: GameStatus.Active, // Immediately active
            mode: GameMode.PvE,
            winner: address(0),
            timestamp: block.timestamp,
            isPlayer2Bot: true, // House acts as bot
            player1GuessedBot: false,
            player1Submitted: false,
            player2GuessedBot: false,
            player2Submitted: false
        });

        emit GameCreated(currentGameId, msg.sender, msg.value);
        emit GameJoined(currentGameId, address(houseVault));
        gameCount++;
    }

    // For PvP or when the Oracle assigns a bot
    function joinGame(uint256 _gameId, bool _isBot) external payable {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Open, "Game not open");
        require(msg.value == game.stake, "Incorrect stake");
        require(msg.sender != game.player1, "Cannot play against self");

        game.player2 = msg.sender;
        game.isPlayer2Bot = _isBot;
        game.status = GameStatus.Active;
        // Update timestamp to when game actually starts (for timer)
        game.timestamp = block.timestamp;

        emit GameJoined(_gameId, msg.sender);
    }

    // NEW: Resolver/Bot joins game using HouseVault funds (converts PvP to PvE)
    function joinGameAsHouse(uint256 _gameId) external onlyResolver {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Open, "Game not open");
        require(address(houseVault) != address(0), "HouseVault not set");
        require(houseVault.canCoverBet(game.stake), "Bet exceeds pool capacity");
        
        // Request stake from HouseVault
        bool funded = houseVault.recordLoss(game.stake);
        require(funded, "HouseVault funding failed");
        
        // Convert to PvE mode
        game.player2 = address(houseVault);
        game.isPlayer2Bot = true;
        game.mode = GameMode.PvE;
        game.status = GameStatus.Active;
        game.timestamp = block.timestamp;
        
        emit GameJoined(_gameId, address(houseVault));
    }

    // Both players can submit verdict
    function submitVerdict(uint256 _gameId, bool _guessedBot) external {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Active, "Game not active");
        
        if (msg.sender == game.player1) {
            require(!game.player1Submitted, "P1 already submitted");
            game.player1GuessedBot = _guessedBot;
            game.player1Submitted = true;
            emit VerdictSubmitted(_gameId, msg.sender, _guessedBot);
        } else if (msg.sender == game.player2) {
            require(!game.player2Submitted, "P2 already submitted");
            game.player2GuessedBot = _guessedBot;
            game.player2Submitted = true;
            emit VerdictSubmitted(_gameId, msg.sender, _guessedBot);
        } else {
            revert("Not a player in this game");
        }
        
        // Check if we can resolve
        _tryResolve(_gameId);
    }

    function _tryResolve(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        
        // PvE mode - resolve when P1 submits
        if (game.mode == GameMode.PvE && game.player1Submitted) {
            _resolveVsHouse(_gameId);
            return;
        }
        
        // Old Bot mode (backward compatible) - resolve when P1 submits
        if (game.mode == GameMode.PvP && game.isPlayer2Bot && game.player1Submitted) {
            _resolveVsBot(_gameId);
            return;
        }
        
        // For PvP (human vs human), wait for both players to submit
        if (game.mode == GameMode.PvP && !game.isPlayer2Bot && game.player1Submitted && game.player2Submitted) {
            _resolveVsHuman(_gameId);
        }
    }

    // NEW: P1 vs House (PvE mode with HouseVault)
    function _resolveVsHouse(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        
        // In PvE, player is always guessing if opponent is bot (they are!)
        // Correct guess = player wins, wrong guess = house wins
        bool playerWins = game.player1GuessedBot; // True = guessed bot = CORRECT
        
        uint256 playerStake = game.stake;
        uint256 fee = playerStake * FEE_PERCENT / 100; // 5% protocol fee
        
        if (playerWins) {
            // Player wins - House pays out 1.9x
            uint256 payout = (playerStake * PAYOUT_NUMERATOR) / PAYOUT_DENOMINATOR;
            uint256 houseLoss = payout - playerStake; // Amount house pays from pool
            
            // House pays the player
            houseVault.recordLoss(houseLoss);
            winnings[game.player1] += payout - fee;
            game.winner = game.player1;
            
            payable(oracle).transfer(fee);
        } else {
            // House wins - gets back original stake + player's stake (minus fees)
            uint256 houseStake = playerStake; // House matched player's stake
            uint256 houseProfit = playerStake - fee; // Profit from player's stake
            uint256 performanceFee = houseProfit * PERFORMANCE_FEE / 100; // 20% performance fee on profit
            
            // Return house's original stake + net profit to HouseVault
            uint256 totalReturn = houseStake + (houseProfit - performanceFee);
            houseVault.recordWin{value: totalReturn}();
            game.winner = address(houseVault);
            
            payable(oracle).transfer(fee + performanceFee);
        }
        
        game.status = GameStatus.Resolved;
        emit GameResolved(_gameId, game.winner, playerWins ? game.stake : 0);
    }

    // Original logic: P1 vs Bot (legacy, for backward compatibility)
    function _resolveVsBot(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        
        bool correctGuess = (game.player1GuessedBot == game.isPlayer2Bot);
        uint256 totalPot = game.stake * 2;
        uint256 fee = totalPot * FEE_PERCENT / 100; // 5% fee
        uint256 payout = totalPot - fee;

        if (correctGuess) {
            game.winner = game.player1;
            winnings[game.player1] += payout;
        } else {
            game.winner = game.player2;
            winnings[game.player2] += payout;
        }

        payable(oracle).transfer(fee);
        game.status = GameStatus.Resolved;
        emit GameResolved(_gameId, game.winner, payout);
    }

    // New logic: P1 vs P2 (Human vs Human) - Zero Sum
    function _resolveVsHuman(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        
        // In PvP:
        // - P1 guesses if P2 is bot (P2 is HUMAN, so correct guess = "Human" = guessedBot:false)
        // - P2 guesses if P1 is bot (P1 is HUMAN, so correct guess = "Human" = guessedBot:false)
        
        bool p1Correct = (game.player1GuessedBot == false); // P2 is human, so guessing "human" is correct
        bool p2Correct = (game.player2GuessedBot == false); // P1 is human, so guessing "human" is correct
        
        uint256 totalPot = game.stake * 2;
        uint256 fee = totalPot * 5 / 100; // 5% fee
        uint256 payout = totalPot - fee;

        // Zero-sum logic:
        // - Both correct or both wrong = DRAW (refund minus fee)
        // - One correct, one wrong = Correct player wins
        
        if (p1Correct == p2Correct) {
            // DRAW - refund stakes (minus fee split)
            uint256 refundPerPlayer = (totalPot - fee) / 2;
            winnings[game.player1] += refundPerPlayer;
            winnings[game.player2] += refundPerPlayer;
            game.winner = address(0); // No winner
            
            payable(oracle).transfer(fee);
            game.status = GameStatus.Resolved;
            emit GameDraw(_gameId, refundPerPlayer);
        } else if (p1Correct) {
            // P1 wins
            game.winner = game.player1;
            winnings[game.player1] += payout;
            
            payable(oracle).transfer(fee);
            game.status = GameStatus.Resolved;
            emit GameResolved(_gameId, game.winner, payout);
        } else {
            // P2 wins
            game.winner = game.player2;
            winnings[game.player2] += payout;
            
            payable(oracle).transfer(fee);
            game.status = GameStatus.Resolved;
            emit GameResolved(_gameId, game.winner, payout);
        }
    }

    // Claim Winnings Function
    function claimWinnings() external {
        uint256 amount = winnings[msg.sender];
        require(amount > 0, "No winnings to claim");

        winnings[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit WinningsClaimed(msg.sender, amount);
    }

    // Oracle can force resolve or join as bot
    function oracleJoinAsBot(uint256 _gameId) external payable onlyOracle {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Open, "Game not open");
        require(msg.value == game.stake, "Incorrect stake");

        game.player2 = msg.sender;
        game.isPlayer2Bot = true;
        game.status = GameStatus.Active;
        game.timestamp = block.timestamp;

        emit GameJoined(_gameId, msg.sender);
    }
    
    // Emergency: Oracle can force resolve a stuck game
    function oracleForceResolve(uint256 _gameId, address _winner) external onlyOracle {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Active, "Game not active");
        
        uint256 totalPot = game.stake * 2;
        uint256 fee = totalPot * 5 / 100;
        uint256 payout = totalPot - fee;
        
        if (_winner == address(0)) {
            // Force draw
            uint256 refund = (totalPot - fee) / 2;
            winnings[game.player1] += refund;
            winnings[game.player2] += refund;
        } else {
            game.winner = _winner;
            winnings[_winner] += payout;
        }
        
        payable(oracle).transfer(fee);
        game.status = GameStatus.Resolved;
        emit GameResolved(_gameId, _winner, payout);
    }

    // Resolve game with signed votes from both players
    // Server collects signatures off-chain, submits them here for on-chain verification
    function resolveWithSignatures(
        uint256 _gameId,
        bool _p1GuessedBot,
        bytes calldata _p1Signature,
        bool _p2GuessedBot,
        bytes calldata _p2Signature
    ) external onlyResolver {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Active, "Game not active");
        require(!game.player1Submitted && !game.player2Submitted, "Already voted on-chain");
        
        // Verify P1 signature
        require(
            ECDSA.recover(
                MessageHashUtils.toEthSignedMessageHash(keccak256(abi.encodePacked(_gameId, _p1GuessedBot, "VOTE"))),
                _p1Signature
            ) == game.player1,
            "Invalid P1 signature"
        );
        
        // Verify P2 signature - allow resolver for PvE games (contracts can't sign)
        address p2Signer = ECDSA.recover(
            MessageHashUtils.toEthSignedMessageHash(keccak256(abi.encodePacked(_gameId, _p2GuessedBot, "VOTE"))),
            _p2Signature
        );
        require(p2Signer == game.player2 || (game.mode == GameMode.PvE && p2Signer == resolver), "Invalid P2 signature");
        
        // Record votes
        game.player1GuessedBot = _p1GuessedBot;
        game.player1Submitted = true;
        game.player2GuessedBot = _p2GuessedBot;
        game.player2Submitted = true;
        
        emit VerdictSubmitted(_gameId, game.player1, _p1GuessedBot);
        emit VerdictSubmitted(_gameId, game.player2, _p2GuessedBot);
        
        // Resolve based on game mode
        if (game.mode == GameMode.PvE) {
            _resolveVsHouse(_gameId);  // PvE: Uses HouseVault
        } else if (game.isPlayer2Bot) {
            _resolveVsBot(_gameId);    // Legacy: P1 vs assigned bot
        } else {
            _resolveVsHuman(_gameId);  // PvP: Human vs Human
        }
    }

    // Receive MNT from HouseVault
    receive() external payable {}
}
