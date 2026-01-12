const hre = require("hardhat");

async function main() {
    const OXHUMAN_ADDRESS = "0x7C538946201Fd1E8656f474A815589d55fE676C2";
    const HOUSEVAULT_ADDRESS = "0xf50Cac50BAE7c6261c85485FFffc9468dd93eB86";
    const RESOLVER_ADDRESS = "0xEfdb7dEA33e418E3D5A65bD49778859AEEaD252c";

    console.log("Configuring contracts...");
    console.log(`OxHuman: ${OXHUMAN_ADDRESS}`);
    console.log(`HouseVault: ${HOUSEVAULT_ADDRESS}`);
    console.log(`Resolver: ${RESOLVER_ADDRESS}`);

    const oxHuman = await hre.ethers.getContractAt("OxHuman", OXHUMAN_ADDRESS);
    const houseVault = await hre.ethers.getContractAt("HouseVault", HOUSEVAULT_ADDRESS);

    // 1. Set HouseVault on OxHuman
    console.log("\n1. Setting HouseVault on OxHuman...");
    const tx1 = await oxHuman.setHouseVault(HOUSEVAULT_ADDRESS);
    await tx1.wait();
    console.log("   ✅ HouseVault set!");

    // 2. Set Resolver on OxHuman
    console.log("2. Setting Resolver on OxHuman...");
    const tx2 = await oxHuman.setResolver(RESOLVER_ADDRESS);
    await tx2.wait();
    console.log("   ✅ Resolver set!");

    // 3. IMPORTANT: Authorize OxHuman in HouseVault
    console.log("3. Authorizing OxHuman in HouseVault...");
    const tx3 = await houseVault.setGameContract(OXHUMAN_ADDRESS);
    await tx3.wait();
    console.log("   ✅ OxHuman authorized in HouseVault!");

    console.log("\n✅ All contracts configured successfully!");
    console.log("\nNow update your .env.local:");
    console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${OXHUMAN_ADDRESS}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
