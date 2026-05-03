/**
 * Deploy BotINFT.sol to 0G Galileo testnet (sanity check).
 *
 * Usage:
 *   npx hardhat run scripts/0g-test/deploy-bot-inft.cjs --network zeroGTestnet
 */

async function main() {
    const hre = require('hardhat');
    const { ethers } = hre;

    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log(`\n[BotINFT Deploy]\n`);
    console.log(`Deployer:  ${deployer.address}`);
    console.log(`Balance:   ${ethers.formatEther(balance)} 0G\n`);

    const t0 = Date.now();
    const BotINFT = await ethers.getContractFactory('BotINFT');
    const botINFT = await BotINFT.deploy();
    await botINFT.waitForDeployment();
    const addr = await botINFT.getAddress();
    const tx = botINFT.deploymentTransaction();
    const rcpt = await tx.wait();
    const elapsed = Date.now() - t0;

    console.log(`✓ BotINFT deployed (${elapsed}ms)`);
    console.log(`  address:  ${addr}`);
    console.log(`  tx:       ${rcpt.hash}`);
    console.log(`  gas used: ${rcpt.gasUsed.toString()}`);
    console.log(`  cost:     ${ethers.formatEther(rcpt.gasUsed * rcpt.gasPrice)} 0G`);

    // Sanity: read constants
    const maxBots = await botINFT.MAX_BOTS_PER_WALLET();
    const slot2Fee = await botINFT.MINT_PAID_SLOT_2_FEE();
    const slot3Fee = await botINFT.MINT_PAID_SLOT_3_FEE();
    console.log(`\n=== CONSTANTS READBACK ===`);
    console.log(`MAX_BOTS_PER_WALLET:      ${maxBots}`);
    console.log(`MINT_PAID_SLOT_2_FEE:     ${ethers.formatEther(slot2Fee)} 0G`);
    console.log(`MINT_PAID_SLOT_3_FEE:     ${ethers.formatEther(slot3Fee)} 0G`);
    console.log(`Admin:                    ${await botINFT.admin()}`);

    console.log(`\nExplorer:  https://chainscan-galileo.0g.ai/address/${addr}\n`);
}

main().catch((e) => {
    console.error('\n❌ DEPLOY ERROR:', e);
    process.exit(1);
});
