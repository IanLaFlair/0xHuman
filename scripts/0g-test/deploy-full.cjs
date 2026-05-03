/**
 * Deploy full 0G stack: BotINFT + OxHuman, then wire them together.
 *
 * Usage:
 *   npx hardhat run scripts/0g-test/deploy-full.cjs --network zeroGTestnet
 *
 * Output: addresses + linkage transactions, written to scripts/0g-test/_deployed.json
 */

const fs = require('fs');
const path = require('path');

async function main() {
    const hre = require('hardhat');
    const { ethers } = hre;

    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log(`\n[Deploy: BotINFT + OxHuman]\n`);
    console.log(`Deployer:  ${deployer.address}`);
    console.log(`Balance:   ${ethers.formatEther(balance)} 0G\n`);

    // ===== BotINFT =====
    console.log('=== Deploying BotINFT ===');
    const t0 = Date.now();
    const BotINFT = await ethers.getContractFactory('BotINFT');
    const botINFT = await BotINFT.deploy();
    await botINFT.waitForDeployment();
    const botAddr = await botINFT.getAddress();
    const botRcpt = await botINFT.deploymentTransaction().wait();
    console.log(`✓ BotINFT  → ${botAddr}`);
    console.log(`  gas: ${botRcpt.gasUsed.toString()}, cost: ${ethers.formatEther(botRcpt.gasUsed * botRcpt.gasPrice)} 0G, ${Date.now() - t0}ms\n`);

    // ===== OxHuman =====
    console.log('=== Deploying OxHuman ===');
    const t1 = Date.now();
    const OxHuman = await ethers.getContractFactory('OxHuman');
    const oxhuman = await OxHuman.deploy();
    await oxhuman.waitForDeployment();
    const oxAddr = await oxhuman.getAddress();
    const oxRcpt = await oxhuman.deploymentTransaction().wait();
    console.log(`✓ OxHuman  → ${oxAddr}`);
    console.log(`  gas: ${oxRcpt.gasUsed.toString()}, cost: ${ethers.formatEther(oxRcpt.gasUsed * oxRcpt.gasPrice)} 0G, ${Date.now() - t1}ms\n`);

    // ===== Wire them together =====
    console.log('=== Wiring contracts ===');
    const t2 = Date.now();
    const tx1 = await oxhuman.setBotINFT(botAddr);
    const r1 = await tx1.wait();
    console.log(`✓ OxHuman.setBotINFT(${botAddr})`);
    console.log(`  gas: ${r1.gasUsed.toString()}\n`);

    const tx2 = await botINFT.setGameContract(oxAddr);
    const r2 = await tx2.wait();
    console.log(`✓ BotINFT.setGameContract(${oxAddr})`);
    console.log(`  gas: ${r2.gasUsed.toString()}, total wiring ${Date.now() - t2}ms\n`);

    // ===== Sanity reads =====
    console.log('=== SANITY ===');
    console.log(`OxHuman.botINFT():            ${await oxhuman.botINFT()}`);
    console.log(`BotINFT.gameContract():       ${await botINFT.gameContract()}`);
    console.log(`BotINFT.admin():              ${await botINFT.admin()}`);
    console.log(`BotINFT.MAX_BOTS_PER_WALLET:  ${await botINFT.MAX_BOTS_PER_WALLET()}`);

    const balanceAfter = await ethers.provider.getBalance(deployer.address);
    const totalCost = balance - balanceAfter;

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total cost:  ${ethers.formatEther(totalCost)} 0G`);
    console.log(`Remaining:   ${ethers.formatEther(balanceAfter)} 0G`);
    console.log(`\nBotINFT:    https://chainscan-galileo.0g.ai/address/${botAddr}`);
    console.log(`OxHuman:    https://chainscan-galileo.0g.ai/address/${oxAddr}\n`);

    // Save deployment record
    const record = {
        network: 'zeroGTestnet',
        chainId: 16602,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            BotINFT: botAddr,
            OxHuman: oxAddr,
        },
        explorerBaseUrl: 'https://chainscan-galileo.0g.ai',
    };
    const outPath = path.resolve(process.cwd(), 'scripts/0g-test/_deployed.json');
    fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
    console.log(`✓ Deployment record: ${outPath}`);
}

main().catch((e) => {
    console.error('\n❌ DEPLOY ERROR:', e);
    process.exit(1);
});
