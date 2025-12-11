// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract OxHuman {
    struct Game {
        address player1;
        address player2;
        uint256 stake;
        bool isPlayer2Bot;
        uint256 timestamp;
    }

    mapping(uint256 => Game) public games;
    uint256 public gameCount;

    event GameStarted(uint256 indexed gameId, address player1, uint256 stake);

    function createGame() external payable {
        require(msg.value > 0, "Stake required");
        
        games[gameCount] = Game({
            player1: msg.sender,
            player2: address(0), // To be filled
            stake: msg.value,
            isPlayer2Bot: false, // Logic to determine this
            timestamp: block.timestamp
        });

        emit GameStarted(gameCount, msg.sender, msg.value);
        gameCount++;
    }
}
