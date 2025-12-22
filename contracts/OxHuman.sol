// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


contract OxHuman {
    enum GameStatus { Open, Active, Resolved }
    enum Role { Human, Bot }

    struct Game {
        address player1;
        address player2;
        uint256 stake;
        GameStatus status;
        address winner;
        uint256 timestamp;
        bool isPlayer2Bot; // In a real version, this might be hidden/hashed
        bool player1GuessedBot; // True if P1 guessed P2 is a bot
        bool player1Submitted;
    }

    mapping(uint256 => Game) public games;
    mapping(address => uint256) public winnings; // [NEW] Track winnings
    uint256 public gameCount;
    address public oracle; // The Game Master who verifies functionality

    event GameCreated(uint256 indexed gameId, address player1, uint256 stake);
    event GameJoined(uint256 indexed gameId, address player2);
    event GameResolved(uint256 indexed gameId, address winner, uint256 payout);
    event WinningsClaimed(address indexed player, uint256 amount); // [NEW]

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only Oracle");
        _;
    }

    constructor() {
        oracle = msg.sender;
    }

    function createGame() external payable {
        require(msg.value > 0, "Stake required");
        
        games[gameCount] = Game({
            player1: msg.sender,
            player2: address(0),
            stake: msg.value,
            status: GameStatus.Open,
            winner: address(0),
            timestamp: block.timestamp,
            isPlayer2Bot: false, // Default, set by join or oracle
            player1GuessedBot: false,
            player1Submitted: false
        });

        emit GameCreated(gameCount, msg.sender, msg.value);
        gameCount++;
    }

    // For PvP or when the Oracle assigns a bot
    function joinGame(uint256 _gameId, bool _isBot) external payable {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Open, "Game not open");
        require(msg.value == game.stake, "Incorrect stake");
        require(msg.sender != game.player1, "Cannot play against self");

        game.player2 = msg.sender;
        game.isPlayer2Bot = _isBot; // In PvP, this would be false. For Bot, Oracle calls this.
        game.status = GameStatus.Active;

        emit GameJoined(_gameId, msg.sender);
    }

    // Player 1 submits their verdict
    function submitVerdict(uint256 _gameId, bool _guessedBot) external {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Active, "Game not active");
        require(msg.sender == game.player1, "Only Player 1 can guess");
        require(!game.player1Submitted, "Already submitted");

        game.player1GuessedBot = _guessedBot;
        game.player1Submitted = true;
        
        // In this simplified version, we resolve immediately if P2 is known
        // In a real version with hidden roles, we'd wait for reveal
        _resolveGame(_gameId);
    }

    function _resolveGame(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        
        bool correctGuess = (game.player1GuessedBot == game.isPlayer2Bot);
        uint256 totalPot = game.stake * 2;
        uint256 fee = totalPot * 5 / 100; // 5% fee
        uint256 payout = totalPot - fee;

        if (correctGuess) {
            // Player 1 wins
            game.winner = game.player1;
            winnings[game.player1] += payout; // [NEW] Add to winnings
        } else {
            // Player 2 (or Bot/House) wins
            game.winner = game.player2;
            winnings[game.player2] += payout; // [NEW] Add to winnings
        }

        // Collect fee (send to oracle for now)
        payable(oracle).transfer(fee);

        game.status = GameStatus.Resolved;
        emit GameResolved(_gameId, game.winner, payout);
    }

    // [NEW] Claim Winnings Function
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
        // Oracle matches stake to play as bot
        require(msg.value == game.stake, "Incorrect stake");

        game.player2 = msg.sender; // Oracle address acts as the bot wallet
        game.isPlayer2Bot = true;
        game.status = GameStatus.Active;

        emit GameJoined(_gameId, msg.sender);
    }
}
