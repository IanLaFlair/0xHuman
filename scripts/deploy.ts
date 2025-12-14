import hre from "hardhat";

async function main() {
    console.log("Deploying OxHuman contract...");

    const oxHuman = await hre.ethers.deployContract("OxHuman");

    await oxHuman.waitForDeployment();

    const address = await oxHuman.getAddress();

    console.log(`OxHuman deployed to: ${address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
