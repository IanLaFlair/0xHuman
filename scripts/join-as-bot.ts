import hre from "hardhat";

async function main() {
    const gameId = process.env.GAME_ID;
    if (!gameId) {
        console.error("Please provide GAME_ID env var");
        process.exit(1);
    }

    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress) {
        console.error("Contract address not found in env");
        process.exit(1);
    }

    console.log(`Connecting to contract at ${contractAddress}...`);
    const OxHuman = await hre.ethers.getContractFactory("OxHuman");
    const contract = OxHuman.attach(contractAddress);

    // Get game info to know the stake
    console.log(`Fetching info for game ${gameId}...`);
    const game = await contract.games(gameId);
    const stake = game.stake;

    console.log(`Joining game ${gameId} as Bot with stake ${hre.ethers.formatEther(stake)} MNT...`);

    const tx = await contract.oracleJoinAsBot(gameId, { value: stake });
    console.log(`Transaction sent: ${tx.hash}`);

    await tx.wait();

    console.log(`Successfully joined game ${gameId} as Bot!`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
