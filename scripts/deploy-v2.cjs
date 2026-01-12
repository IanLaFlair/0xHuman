// Deploy script for HouseVault and OxHuman v2
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with:", deployer.address);
    console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT");

    // 1. Deploy HouseVault
    console.log("\n1. Deploying HouseVault...");
    const HouseVault = await hre.ethers.getContractFactory("HouseVault");
    const houseVault = await HouseVault.deploy();
    await houseVault.waitForDeployment();
    const houseVaultAddress = await houseVault.getAddress();
    console.log("   HouseVault deployed to:", houseVaultAddress);

    // 2. Deploy OxHuman
    console.log("\n2. Deploying OxHuman...");
    const OxHuman = await hre.ethers.getContractFactory("OxHuman");
    const oxHuman = await OxHuman.deploy();
    await oxHuman.waitForDeployment();
    const oxHumanAddress = await oxHuman.getAddress();
    console.log("   OxHuman deployed to:", oxHumanAddress);

    // 3. Configure HouseVault -> set OxHuman as game contract
    console.log("\n3. Configuring HouseVault...");
    const tx1 = await houseVault.setGameContract(oxHumanAddress);
    await tx1.wait();
    console.log("   HouseVault.gameContract set to:", oxHumanAddress);

    // 4. Configure OxHuman -> set HouseVault
    console.log("\n4. Configuring OxHuman...");
    const tx2 = await oxHuman.setHouseVault(houseVaultAddress);
    await tx2.wait();
    console.log("   OxHuman.houseVault set to:", houseVaultAddress);

    // 5. Bootstrap HouseVault with initial deposit (optional - comment out if not needed)
    console.log("\n5. Bootstrapping HouseVault with 100 MNT...");
    const depositTx = await houseVault.deposit({ value: hre.ethers.parseEther("100") });
    await depositTx.wait();
    console.log("   Deposited 100 MNT to HouseVault");

    // Summary
    console.log("\n========================================");
    console.log("DEPLOYMENT COMPLETE!");
    console.log("========================================");
    console.log("HouseVault:", houseVaultAddress);
    console.log("OxHuman:", oxHumanAddress);
    console.log("========================================");

    // Verify pool status
    const tvl = await houseVault.totalAssets();
    const maxBet = await houseVault.maxBet();
    console.log("\nPool Status:");
    console.log("  TVL:", hre.ethers.formatEther(tvl), "MNT");
    console.log("  Max Bet:", hre.ethers.formatEther(maxBet), "MNT");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
