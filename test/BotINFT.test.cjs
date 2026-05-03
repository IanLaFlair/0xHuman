/**
 * BotINFT.sol unit tests
 *
 * Covers:
 *  - Mint flows (free slot, paid slot 2/3) and slot cap
 *  - Vault deposit / withdraw / burn refund
 *  - Match integration (lockForMatch / creditFromMatch) — only callable by gameContract
 *  - Memory updates (resolver-only)
 *  - Tier graduation (paid promote, autoPromote, autoDemote)
 *  - ERC-7857: authorizeUsage, transferWithNewURI
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('BotINFT', function () {
    let bot, admin, alice, bob, gameContract, resolver;

    const PERSONALITY_URI = 'og-storage://abc123';
    const PERSONALITY_HASH = ethers.keccak256(ethers.toUtf8Bytes('personality-blob-1'));

    beforeEach(async function () {
        [admin, alice, bob, gameContract, resolver] = await ethers.getSigners();
        const BotINFT = await ethers.getContractFactory('BotINFT');
        bot = await BotINFT.deploy();
        await bot.waitForDeployment();

        await bot.connect(admin).setGameContract(gameContract.address);
        await bot.connect(admin).setResolver(resolver.address);
    });

    describe('admin', function () {
        it('deployer is admin', async function () {
            expect(await bot.admin()).to.equal(admin.address);
        });

        it('rejects setGameContract from non-admin', async function () {
            await expect(
                bot.connect(alice).setGameContract(alice.address)
            ).to.be.revertedWithCustomError(bot, 'NotAdmin');
        });
    });

    describe('mint', function () {
        it('mints free slot 1 to alice', async function () {
            const tx = await bot.connect(alice).mintFreeSlot(PERSONALITY_URI, PERSONALITY_HASH, {
                value: ethers.parseEther('2'),
            });
            const rcpt = await tx.wait();

            // Find Transfer event for tokenId
            expect(await bot.ownerOf(1)).to.equal(alice.address);
            expect(await bot.slotsOwned(alice.address)).to.equal(1);

            const b = await bot.bots(1);
            expect(b.slot).to.equal(1);
            expect(b.tier).to.equal(0); // Rookie
            expect(b.vaultBalance).to.equal(ethers.parseEther('2'));
            expect(b.personalityURI).to.equal(PERSONALITY_URI);
        });

        it('rejects free slot if value < 2 0G', async function () {
            await expect(
                bot.connect(alice).mintFreeSlot(PERSONALITY_URI, PERSONALITY_HASH, {
                    value: ethers.parseEther('1.99'),
                })
            ).to.be.revertedWithCustomError(bot, 'VaultUnderMin');
        });

        it('mints paid slot 2 (10 0G fee + 5 0G vault)', async function () {
            // First mint slot 1
            await bot.connect(alice).mintFreeSlot(PERSONALITY_URI, PERSONALITY_HASH, {
                value: ethers.parseEther('2'),
            });

            const adminBalanceBefore = await ethers.provider.getBalance(admin.address);
            const tx = await bot.connect(alice).mintPaidSlot(2, PERSONALITY_URI, PERSONALITY_HASH, {
                value: ethers.parseEther('15'), // 10 fee + 5 vault
            });
            await tx.wait();

            expect(await bot.slotsOwned(alice.address)).to.equal(2);
            const b = await bot.bots(2);
            expect(b.slot).to.equal(2);
            expect(b.tier).to.equal(1); // Verified
            expect(b.vaultBalance).to.equal(ethers.parseEther('5'));

            // Admin received the fee
            const adminBalanceAfter = await ethers.provider.getBalance(admin.address);
            expect(adminBalanceAfter - adminBalanceBefore).to.equal(ethers.parseEther('10'));
        });

        it('mints paid slot 3 (25 0G fee + 10 0G vault)', async function () {
            await bot.connect(alice).mintFreeSlot(PERSONALITY_URI, PERSONALITY_HASH, {
                value: ethers.parseEther('2'),
            });
            await bot.connect(alice).mintPaidSlot(2, PERSONALITY_URI, PERSONALITY_HASH, {
                value: ethers.parseEther('15'),
            });
            await bot.connect(alice).mintPaidSlot(3, PERSONALITY_URI, PERSONALITY_HASH, {
                value: ethers.parseEther('35'),
            });

            expect(await bot.slotsOwned(alice.address)).to.equal(3);
            const b = await bot.bots(3);
            expect(b.vaultBalance).to.equal(ethers.parseEther('10'));
        });

        it('rejects mintPaidSlot 4 (max 3 per wallet)', async function () {
            await bot.connect(alice).mintFreeSlot(PERSONALITY_URI, PERSONALITY_HASH, { value: ethers.parseEther('2') });
            await bot.connect(alice).mintPaidSlot(2, PERSONALITY_URI, PERSONALITY_HASH, { value: ethers.parseEther('15') });
            await bot.connect(alice).mintPaidSlot(3, PERSONALITY_URI, PERSONALITY_HASH, { value: ethers.parseEther('35') });

            // Now alice has 3 bots. Trying slot 4 should fail
            await expect(
                bot.connect(alice).mintPaidSlot(4, PERSONALITY_URI, PERSONALITY_HASH, { value: ethers.parseEther('35') })
            ).to.be.revertedWithCustomError(bot, 'SlotInvalid');
        });

        it('rejects out-of-order slots (slot 2 without slot 1)', async function () {
            await expect(
                bot.connect(alice).mintPaidSlot(2, PERSONALITY_URI, PERSONALITY_HASH, {
                    value: ethers.parseEther('15'),
                })
            ).to.be.revertedWithCustomError(bot, 'SlotAlreadyOwned');
        });
    });

    describe('vault', function () {
        beforeEach(async function () {
            await bot.connect(alice).mintFreeSlot(PERSONALITY_URI, PERSONALITY_HASH, {
                value: ethers.parseEther('2'),
            });
        });

        it('deposit increments vaultBalance', async function () {
            await bot.connect(alice).depositToVault(1, { value: ethers.parseEther('3') });
            const b = await bot.bots(1);
            expect(b.vaultBalance).to.equal(ethers.parseEther('5'));
        });

        it('owner can withdraw after delay', async function () {
            // Mine 2 blocks (deposit was at mint, delay is 1 block)
            await ethers.provider.send('evm_mine', []);
            await ethers.provider.send('evm_mine', []);

            const aliceBefore = await ethers.provider.getBalance(alice.address);
            const tx = await bot.connect(alice).withdrawFromVault(1, ethers.parseEther('1'));
            const rcpt = await tx.wait();
            const gasCost = rcpt.gasUsed * rcpt.gasPrice;

            const aliceAfter = await ethers.provider.getBalance(alice.address);
            expect(aliceAfter - aliceBefore + gasCost).to.equal(ethers.parseEther('1'));

            const b = await bot.bots(1);
            expect(b.vaultBalance).to.equal(ethers.parseEther('1'));
        });

        it('rejects withdraw from non-owner', async function () {
            await ethers.provider.send('evm_mine', []);
            await expect(
                bot.connect(bob).withdrawFromVault(1, ethers.parseEther('1'))
            ).to.be.revertedWithCustomError(bot, 'NotTokenOwnerOrAuthorized');
        });

        it('rejects withdraw exceeding vault', async function () {
            await ethers.provider.send('evm_mine', []);
            await ethers.provider.send('evm_mine', []);
            await expect(
                bot.connect(alice).withdrawFromVault(1, ethers.parseEther('100'))
            ).to.be.revertedWithCustomError(bot, 'InsufficientVault');
        });

        it('burn returns full vault balance', async function () {
            // Add more to vault
            await bot.connect(alice).depositToVault(1, { value: ethers.parseEther('3') });
            await ethers.provider.send('evm_mine', []);

            const aliceBefore = await ethers.provider.getBalance(alice.address);
            const tx = await bot.connect(alice).burnBot(1);
            const rcpt = await tx.wait();
            const gasCost = rcpt.gasUsed * rcpt.gasPrice;
            const aliceAfter = await ethers.provider.getBalance(alice.address);

            expect(aliceAfter - aliceBefore + gasCost).to.equal(ethers.parseEther('5'));
            expect(await bot.slotsOwned(alice.address)).to.equal(0);

            // Token gone
            await expect(bot.ownerOf(1)).to.be.reverted;
        });
    });

    describe('match integration', function () {
        beforeEach(async function () {
            // Alice mints a bot with 5 0G vault (free + extra deposit)
            await bot.connect(alice).mintFreeSlot(PERSONALITY_URI, PERSONALITY_HASH, {
                value: ethers.parseEther('2'),
            });
            await bot.connect(alice).depositToVault(1, { value: ethers.parseEther('3') });
        });

        it('lockForMatch debits vault and sends ETH to gameContract', async function () {
            const stake = ethers.parseEther('0.5'); // 10% of 5 0G

            const gameBefore = await ethers.provider.getBalance(gameContract.address);
            const tx = await bot.connect(gameContract).lockForMatch(1, stake, 42);
            const rcpt = await tx.wait();
            const gasCost = rcpt.gasUsed * rcpt.gasPrice;
            const gameAfter = await ethers.provider.getBalance(gameContract.address);

            // gameContract receives stake (minus gas cost it paid)
            expect(gameAfter - gameBefore + gasCost).to.equal(stake);

            const b = await bot.bots(1);
            expect(b.vaultBalance).to.equal(ethers.parseEther('4.5'));
        });

        it('lockForMatch fails if amount > maxStake (10% of vault)', async function () {
            // 5 0G vault → max stake 0.5 0G. Try 1 0G:
            await expect(
                bot.connect(gameContract).lockForMatch(1, ethers.parseEther('1'), 42)
            ).to.be.revertedWithCustomError(bot, 'InsufficientVault');
        });

        it('lockForMatch only callable by gameContract', async function () {
            await expect(
                bot.connect(bob).lockForMatch(1, ethers.parseEther('0.1'), 42)
            ).to.be.revertedWithCustomError(bot, 'NotGameContract');
        });

        it('creditFromMatch increases vault and tracks win', async function () {
            const credit = ethers.parseEther('1.85');
            await bot.connect(gameContract).creditFromMatch(1, true, 42, { value: credit });

            const b = await bot.bots(1);
            expect(b.vaultBalance).to.equal(ethers.parseEther('5') + credit);
            expect(b.wins).to.equal(1);
            expect(b.losses).to.equal(0);
        });

        it('creditFromMatch tracks loss', async function () {
            await bot.connect(gameContract).creditFromMatch(1, false, 42, { value: ethers.parseEther('0.1') });
            const b = await bot.bots(1);
            expect(b.wins).to.equal(0);
            expect(b.losses).to.equal(1);
        });
    });

    describe('memory updates', function () {
        beforeEach(async function () {
            await bot.connect(alice).mintFreeSlot(PERSONALITY_URI, PERSONALITY_HASH, {
                value: ethers.parseEther('2'),
            });
        });

        it('resolver can update memory', async function () {
            const memURI = 'og-storage://memory-1';
            const memHash = ethers.keccak256(ethers.toUtf8Bytes('memory-1'));
            await bot.connect(resolver).updateMemory(1, memURI, memHash);

            const b = await bot.bots(1);
            expect(b.memoryURI).to.equal(memURI);
            expect(b.memoryHash).to.equal(memHash);
        });

        it('non-resolver cannot update memory', async function () {
            await expect(
                bot.connect(alice).updateMemory(1, 'bad', ethers.ZeroHash)
            ).to.be.revertedWithCustomError(bot, 'NotResolver');
        });
    });

    describe('tier graduation', function () {
        beforeEach(async function () {
            await bot.connect(alice).mintFreeSlot(PERSONALITY_URI, PERSONALITY_HASH, {
                value: ethers.parseEther('2'),
            });
        });

        it('promoteToVerified with 10 0G fee', async function () {
            const adminBalanceBefore = await ethers.provider.getBalance(admin.address);
            await bot.connect(alice).promoteToVerified(1, { value: ethers.parseEther('10') });

            const b = await bot.bots(1);
            expect(b.tier).to.equal(1); // Verified

            const adminBalanceAfter = await ethers.provider.getBalance(admin.address);
            expect(adminBalanceAfter - adminBalanceBefore).to.equal(ethers.parseEther('10'));
        });

        it('promoteToVerified rejects wrong fee', async function () {
            await expect(
                bot.connect(alice).promoteToVerified(1, { value: ethers.parseEther('5') })
            ).to.be.revertedWithCustomError(bot, 'WrongFee');
        });

        it('autoPromote triggers when 30 matches @ 45%+ winrate', async function () {
            // Simulate 30 matches, 14 wins (winrate 46.67%)
            for (let i = 0; i < 14; i++) {
                await bot.connect(gameContract).creditFromMatch(1, true, i, { value: 1 });
            }
            for (let i = 14; i < 30; i++) {
                await bot.connect(gameContract).creditFromMatch(1, false, i, { value: 1 });
            }

            await bot.connect(resolver).autoPromote(1);
            const b = await bot.bots(1);
            expect(b.tier).to.equal(1);
        });

        it('autoPromote rejects if winrate too low', async function () {
            // 30 matches, 10 wins (33%)
            for (let i = 0; i < 10; i++) {
                await bot.connect(gameContract).creditFromMatch(1, true, i, { value: 1 });
            }
            for (let i = 10; i < 30; i++) {
                await bot.connect(gameContract).creditFromMatch(1, false, i, { value: 1 });
            }

            await expect(
                bot.connect(resolver).autoPromote(1)
            ).to.be.revertedWithCustomError(bot, 'NotEligibleForAutoPromote');
        });
    });

    describe('ERC-7857: authorize + transfer', function () {
        beforeEach(async function () {
            await bot.connect(alice).mintFreeSlot(PERSONALITY_URI, PERSONALITY_HASH, {
                value: ethers.parseEther('2'),
            });
        });

        it('owner authorizes bob to use bot', async function () {
            await bot.connect(alice).authorizeUsage(1, bob.address, true);
            expect(await bot.isUsageAuthorized(1, bob.address)).to.be.true;
        });

        it('owner is implicitly authorized', async function () {
            expect(await bot.isUsageAuthorized(1, alice.address)).to.be.true;
        });

        it('non-owner cannot authorize', async function () {
            await expect(
                bot.connect(bob).authorizeUsage(1, bob.address, true)
            ).to.be.revertedWithCustomError(bot, 'NotTokenOwnerOrAuthorized');
        });

        it('transferWithNewURI updates owner and personality', async function () {
            const newURI = 'og-storage://reencrypted-for-bob';
            const newHash = ethers.keccak256(ethers.toUtf8Bytes('new-blob'));

            await bot.connect(alice).transferWithNewURI(bob.address, 1, newURI, newHash);

            expect(await bot.ownerOf(1)).to.equal(bob.address);
            expect(await bot.slotsOwned(alice.address)).to.equal(0);
            expect(await bot.slotsOwned(bob.address)).to.equal(1);

            const b = await bot.bots(1);
            expect(b.personalityURI).to.equal(newURI);
            expect(b.personalityHash).to.equal(newHash);
        });
    });
});
