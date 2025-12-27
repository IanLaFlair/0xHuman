const hre = require("hardhat");

async function main() {
    console.log("Deploying OxHuman contract...");

    const OxHuman = await hre.ethers.getContractFactory("OxHuman");
    const oxHuman = await OxHuman.deploy();

    await oxHuman.waitForDeployment();

    const address = await oxHuman.getAddress();
    console.log("OxHuman deployed to:", address);
    console.log("\nUpdate your .env.local with:");
    console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
