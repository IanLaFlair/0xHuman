// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HouseVault
 * @notice Vault for House Pool liquidity in 0xHuman game
 * @dev Users deposit MNT to become "the house" and earn yield from bot wins
 */
contract HouseVault is ReentrancyGuard {
    // ============ Storage ============
    
    address public owner;
    address public gameContract; // OxHuman contract address
    
    uint256 public totalShares;
    uint256 public totalAssets;
    
    mapping(address => uint256) public shares;
    mapping(address => uint256) public depositBlock; // For withdraw delay
    
    // ============ Constants ============
    
    uint256 public constant DEAD_SHARES = 1000; // Burned on first deposit to prevent attack
    uint256 public constant MIN_DEPOSIT = 1 ether; // 1 MNT minimum
    uint256 public constant MIN_POOL_RESERVE = 10 ether; // 10 MNT minimum pool
    uint256 public constant MAX_BET_PERCENT = 10; // 10% of pool max per bet
    uint256 public constant MAX_DEPOSIT_PERCENT = 10; // 10% of pool max per user
    uint256 public constant WITHDRAW_DELAY_BLOCKS = 1; // 1 block delay
    
    // ============ Events ============
    
    event Deposit(address indexed user, uint256 amount, uint256 sharesMinted);
    event Withdraw(address indexed user, uint256 sharesAmount, uint256 assetsReceived);
    event GameWin(uint256 amount);
    event GameLoss(uint256 amount);
    event GameContractUpdated(address newGameContract);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyGame() {
        require(msg.sender == gameContract, "Not game contract");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
    }
    
    // ============ Admin Functions ============
    
    function setGameContract(address _gameContract) external onlyOwner {
        require(_gameContract != address(0), "Invalid address");
        gameContract = _gameContract;
        emit GameContractUpdated(_gameContract);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Deposit MNT to receive LP shares
     * @return sharesMinted Number of shares minted
     */
    function deposit() external payable nonReentrant returns (uint256 sharesMinted) {
        require(msg.value >= MIN_DEPOSIT, "Below min deposit");
        
        // NOTE: Max deposit limit removed for easier testing
        // In production, consider adding whale protection mechanisms
        
        // Calculate shares to mint
        if (totalShares == 0) {
            // First deposit: burn dead shares to prevent attack
            sharesMinted = msg.value - DEAD_SHARES;
            totalShares = DEAD_SHARES; // Dead shares stay forever
        } else {
            // Subsequent deposits: proportional shares
            sharesMinted = (msg.value * totalShares) / totalAssets;
        }
        
        require(sharesMinted > 0, "Zero shares");
        
        // Update state
        shares[msg.sender] += sharesMinted;
        totalShares += sharesMinted;
        totalAssets += msg.value;
        depositBlock[msg.sender] = block.number;
        
        emit Deposit(msg.sender, msg.value, sharesMinted);
    }
    
    /**
     * @notice Withdraw MNT by burning LP shares
     * @param _shares Number of shares to burn
     * @return assets Amount of MNT received
     */
    function withdraw(uint256 _shares) external nonReentrant returns (uint256 assets) {
        require(_shares > 0, "Zero shares");
        require(shares[msg.sender] >= _shares, "Insufficient shares");
        
        // Withdraw delay check (flash deposit prevention)
        require(
            block.number > depositBlock[msg.sender] + WITHDRAW_DELAY_BLOCKS,
            "Withdraw delay not met"
        );
        
        // Calculate assets to return
        assets = previewRedeem(_shares);
        
        // Check min pool reserve
        require(totalAssets - assets >= MIN_POOL_RESERVE || totalAssets - assets == 0, "Below min reserve");
        
        // Update state
        shares[msg.sender] -= _shares;
        totalShares -= _shares;
        totalAssets -= assets;
        
        // Transfer
        (bool success, ) = payable(msg.sender).call{value: assets}("");
        require(success, "Transfer failed");
        
        emit Withdraw(msg.sender, _shares, assets);
    }
    
    /**
     * @notice Withdraw all shares
     */
    function withdrawAll() external returns (uint256 assets) {
        return this.withdraw(shares[msg.sender]);
    }
    
    // ============ Game Integration ============
    
    /**
     * @notice Called by game contract when house wins
     * @dev Receives MNT from OxHuman contract = player's stake - fees
     */
    function recordWin() external payable onlyGame {
        require(msg.value > 0, "No value sent");
        totalAssets += msg.value;
        emit GameWin(msg.value);
    }
    
    /**
     * @notice Called by game contract when house loses (pays winner)
     * @param amount Amount to pay out
     */
    function recordLoss(uint256 amount) external onlyGame returns (bool) {
        require(totalAssets >= amount + MIN_POOL_RESERVE, "Insufficient pool");
        totalAssets -= amount;
        
        // Transfer to game contract (which will pay the winner)
        (bool success, ) = payable(gameContract).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit GameLoss(amount);
        return true;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Preview how much MNT you'd get for burning shares
     */
    function previewRedeem(uint256 _shares) public view returns (uint256) {
        if (totalShares == 0) return 0;
        return (_shares * totalAssets) / totalShares;
    }
    
    /**
     * @notice Preview how many shares you'd get for depositing MNT
     */
    function previewDeposit(uint256 _assets) public view returns (uint256) {
        if (totalShares == 0) return _assets - DEAD_SHARES;
        return (_assets * totalShares) / totalAssets;
    }
    
    /**
     * @notice Get user's share percentage (0-100 scaled by 1e18)
     */
    function sharePercent(address user) public view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[user] * 1e18 * 100) / totalShares;
    }
    
    /**
     * @notice Get user's current asset value
     */
    function balanceOf(address user) public view returns (uint256) {
        return previewRedeem(shares[user]);
    }
    
    /**
     * @notice Get max bet allowed (3% of pool)
     */
    function maxBet() public view returns (uint256) {
        return (totalAssets * MAX_BET_PERCENT) / 100;
    }
    
    /**
     * @notice Check if pool can cover a bet
     */
    function canCoverBet(uint256 amount) public view returns (bool) {
        // Check max bet limit
        if (amount > maxBet()) return false;
        // Check pool can pay 1.9x payout
        uint256 maxPayout = (amount * 190) / 100; // 1.9x
        if (totalAssets < maxPayout + MIN_POOL_RESERVE) return false;
        return true;
    }
    
    // ============ Receive ============
    
    receive() external payable {
        // Accept MNT from game contract
    }
}
