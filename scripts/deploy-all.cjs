const hre = require("hardhat");

async function main() {
    console.log("Deploying BOTH contracts...\n");

    // 1. Deploy HouseVault
    console.log("1️⃣ Deploying HouseVault...");
    const HouseVault = await hre.ethers.getContractFactory("HouseVault");
    const houseVault = await HouseVault.deploy();
    await houseVault.waitForDeployment();
    const houseVaultAddress = await houseVault.getAddress();
    console.log(`   ✅ HouseVault deployed to: ${houseVaultAddress}\n`);

    // 2. Deploy OxHuman
    console.log("2️⃣ Deploying OxHuman...");
    const OxHuman = await hre.ethers.getContractFactory("OxHuman");
    const oxhuman = await OxHuman.deploy();
    await oxhuman.waitForDeployment();
    const oxhumanAddress = await oxhuman.getAddress();
    console.log(`   ✅ OxHuman deployed to: ${oxhumanAddress}\n`);

    // 3. Get resolver address
    const [deployer] = await hre.ethers.getSigners();
    const resolverAddress = deployer.address;
    console.log(`3️⃣ Resolver address: ${resolverAddress}\n`);

    // 4. Configure OxHuman
    console.log("4️⃣ Configuring OxHuman...");
    const txHV = await oxhuman.setHouseVault(houseVaultAddress);
    await txHV.wait();
    console.log("   ✅ HouseVault set on OxHuman");

    const txResolver = await oxhuman.setResolver(resolverAddress);
    await txResolver.wait();
    console.log("   ✅ Resolver set on OxHuman\n");

    // 5. Authorize OxHuman in HouseVault
    console.log("5️⃣ Authorizing OxHuman in HouseVault...");
    const txAuth = await houseVault.setGameContract(oxhumanAddress);
    await txAuth.wait();
    console.log("   ✅ OxHuman authorized in HouseVault\n");

    // 6. Fund HouseVault with initial liquidity (100 MNT)
    console.log("6️⃣ Funding HouseVault with 100 MNT...");
    const txFund = await houseVault.deposit({ value: hre.ethers.parseEther("100") });
    await txFund.wait();
    console.log("   ✅ HouseVault funded with 100 MNT\n");

    console.log("=".repeat(50));
    console.log("\n✅ ALL CONTRACTS DEPLOYED AND CONFIGURED!\n");
    console.log("Update your .env.local with:");
    console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${oxhumanAddress}`);
    console.log(`NEXT_PUBLIC_HOUSE_VAULT_ADDRESS=${houseVaultAddress}`);
    console.log("=".repeat(50));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
