const hre = require("hardhat");

async function main() {
    const HOUSE_VAULT = "0xe2f21988c31FfD66c4d24Fba63F529Dbd5dB7442";

    const houseVault = await hre.ethers.getContractAt("HouseVault", HOUSE_VAULT);

    // Check current state
    const totalAssets = await houseVault.totalAssets();
    const maxBet = await houseVault.maxBet();

    console.log("Current State:");
    console.log(`  totalAssets: ${hre.ethers.formatEther(totalAssets)} MNT`);
    console.log(`  maxBet: ${hre.ethers.formatEther(maxBet)} MNT`);

    // Deposit 20 MNT more to support 10 MNT bets
    const depositAmount = hre.ethers.parseEther("120");
    console.log(`\nDepositing ${hre.ethers.formatEther(depositAmount)} MNT...`);

    const tx = await houseVault.deposit({ value: depositAmount });
    await tx.wait();

    // Check new state
    const newTotalAssets = await houseVault.totalAssets();
    const newMaxBet = await houseVault.maxBet();

    console.log("\nNew State:");
    console.log(`  totalAssets: ${hre.ethers.formatEther(newTotalAssets)} MNT`);
    console.log(`  maxBet: ${hre.ethers.formatEther(newMaxBet)} MNT`);
    console.log("\n✅ Done! 10 MNT bets should now work.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
