/**
 * 0G Galileo — Sanity Deploy
 *
 * Throwaway deploy of current OxHuman + HouseVault to validate:
 * - Hardhat workflow against 0G testnet
 * - EVM compatibility (zero contract changes)
 * - Gas costs on 0G
 *
 * NOTE: Both contracts are deployed even though we're dropping HouseVault
 * for the final architecture — the goal here is to exercise full deploy flow.
 *
 * Usage:
 *   npx hardhat run scripts/0g-test/deploy-sanity.cjs --network zeroGTestnet
 */

async function main() {
    const hre = require('hardhat');
    const { ethers } = hre;

    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    const network = await ethers.provider.getNetwork();

    console.log(`\n[0G Galileo Sanity Deploy]\n`);
    console.log(`Deployer:  ${deployer.address}`);
    console.log(`Network:   chain ${network.chainId}`);
    console.log(`Balance:   ${ethers.formatEther(balance)} 0G\n`);

    if (balance < ethers.parseEther('0.01')) {
        console.error('❌ Balance too low (need ≥0.01 0G for deploys)');
        process.exit(1);
    }

    // Deploy OxHuman (current Mantle version, includes HouseVault dependency)
    console.log('=== Deploying OxHuman ===');
    const tOx0 = Date.now();
    const OxHuman = await ethers.getContractFactory('OxHuman');
    const oxhuman = await OxHuman.deploy();
    await oxhuman.waitForDeployment();
    const oxhumanAddr = await oxhuman.getAddress();
    const oxhumanTx = oxhuman.deploymentTransaction();
    const oxhumanRcpt = await oxhumanTx.wait();
    const tOxMs = Date.now() - tOx0;

    console.log(`✓ OxHuman deployed (${tOxMs}ms)`);
    console.log(`  address:  ${oxhumanAddr}`);
    console.log(`  tx:       ${oxhumanRcpt.hash}`);
    console.log(`  gas used: ${oxhumanRcpt.gasUsed.toString()}`);
    console.log(`  cost:     ${ethers.formatEther(oxhumanRcpt.gasUsed * oxhumanRcpt.gasPrice)} 0G\n`);

    // Deploy HouseVault
    console.log('=== Deploying HouseVault ===');
    const tHv0 = Date.now();
    const HouseVault = await ethers.getContractFactory('HouseVault');
    const houseVault = await HouseVault.deploy();
    await houseVault.waitForDeployment();
    const houseVaultAddr = await houseVault.getAddress();
    const houseVaultTx = houseVault.deploymentTransaction();
    const houseVaultRcpt = await houseVaultTx.wait();
    const tHvMs = Date.now() - tHv0;

    console.log(`✓ HouseVault deployed (${tHvMs}ms)`);
    console.log(`  address:  ${houseVaultAddr}`);
    console.log(`  tx:       ${houseVaultRcpt.hash}`);
    console.log(`  gas used: ${houseVaultRcpt.gasUsed.toString()}`);
    console.log(`  cost:     ${ethers.formatEther(houseVaultRcpt.gasUsed * houseVaultRcpt.gasPrice)} 0G\n`);

    const balanceAfter = await ethers.provider.getBalance(deployer.address);
    const totalCost = balance - balanceAfter;

    console.log('=== SUMMARY ===');
    console.log(`Total deploy cost: ${ethers.formatEther(totalCost)} 0G`);
    console.log(`OxHuman:           ${oxhumanAddr}`);
    console.log(`  https://chainscan-galileo.0g.ai/address/${oxhumanAddr}`);
    console.log(`HouseVault:        ${houseVaultAddr}`);
    console.log(`  https://chainscan-galileo.0g.ai/address/${houseVaultAddr}`);
    console.log(`\nBalance remaining: ${ethers.formatEther(balanceAfter)} 0G`);
    console.log(`\nVerdict: EVM compat ${oxhumanAddr && houseVaultAddr ? '✓ CONFIRMED' : '❌ FAILED'}`);
}

main().catch((e) => {
    console.error('\n❌ DEPLOY ERROR:', e);
    process.exit(1);
});
