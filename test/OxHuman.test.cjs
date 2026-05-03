/**
 * OxHuman + BotINFT integration tests
 *
 * Covers:
 *  - PvP create/join/resolve (player wins, draw)
 *  - PvE flow: createGamePvE locks bot vault → resolve player wins → fee distribution
 *  - PvE flow: createGamePvE → resolve bot wins → bot vault credited correctly
 *  - resolveWithSignatures path (signed off-chain votes)
 *  - claimWinnings
 *  - anchorChatLog (resolver-only)
 *
 * Fee math sanity (per stake X):
 *   Bot wins:  treasury  = 0.15X (5% protocol + 10% performance)
 *              bot vault = 1.85X credited
 *   Player wins: treasury = 0.05X
 *                player   = 1.85X (claimable via claimWinnings)
 *                bot vault = 0.10X refunded
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('OxHuman + BotINFT integration', function () {
    let oxhuman, bot;
    let admin, alice, charlie, resolver, p2;

    const PERSONALITY_URI = 'og-storage://persona-1';
    const PERSONALITY_HASH = ethers.keccak256(ethers.toUtf8Bytes('persona-1-blob'));

    beforeEach(async function () {
        [admin, alice, charlie, resolver, p2] = await ethers.getSigners();

        const BotINFT = await ethers.getContractFactory('BotINFT');
        bot = await BotINFT.deploy();
        await bot.waitForDeployment();

        const OxHuman = await ethers.getContractFactory('OxHuman');
        oxhuman = await OxHuman.deploy();
        await oxhuman.waitForDeployment();

        // Wire them together
        await oxhuman.connect(admin).setBotINFT(await bot.getAddress());
        await bot.connect(admin).setGameContract(await oxhuman.getAddress());
        await oxhuman.connect(admin).setResolver(resolver.address);
        await bot.connect(admin).setResolver(resolver.address);

        // Alice mints a bot with healthy vault (10 0G total)
        // Free slot: 2 0G initial, then deposit 8 more
        await bot.connect(alice).mintFreeSlot(PERSONALITY_URI, PERSONALITY_HASH, {
            value: ethers.parseEther('2'),
        });
        await bot.connect(alice).depositToVault(1, { value: ethers.parseEther('8') });
    });

    describe('PvP basic flow', function () {
        it('createGame → joinGame → both vote correctly → DRAW', async function () {
            // Charlie creates, p2 joins. Both are humans, both should vote HUMAN.
            await oxhuman.connect(charlie).createGame({ value: ethers.parseEther('1') });
            await oxhuman.connect(p2).joinGame(0, { value: ethers.parseEther('1') });

            // Both vote HUMAN (correct, since both opponents are human)
            await oxhuman.connect(charlie).submitVerdict(0, false);
            await oxhuman.connect(p2).submitVerdict(0, false);

            const game = await oxhuman.games(0);
            expect(game.status).to.equal(2); // Resolved
            expect(game.winner).to.equal(ethers.ZeroAddress); // draw

            // Each gets back ~0.95 0G (95% of 1 0G stake; total fee 5% of 2 0G = 0.1 0G split)
            // Pot = 2, fee = 0.1, refund per = (2 - 0.1) / 2 = 0.95
            const charlieWinnings = await oxhuman.winnings(charlie.address);
            const p2Winnings = await oxhuman.winnings(p2.address);
            expect(charlieWinnings).to.equal(ethers.parseEther('0.95'));
            expect(p2Winnings).to.equal(ethers.parseEther('0.95'));
        });

        it('PvP: one correct, one wrong → correct player wins', async function () {
            await oxhuman.connect(charlie).createGame({ value: ethers.parseEther('1') });
            await oxhuman.connect(p2).joinGame(0, { value: ethers.parseEther('1') });

            // Charlie correct (votes HUMAN), p2 wrong (votes BOT)
            await oxhuman.connect(charlie).submitVerdict(0, false);
            await oxhuman.connect(p2).submitVerdict(0, true);

            const game = await oxhuman.games(0);
            expect(game.winner).to.equal(charlie.address);

            // Charlie gets 1.9 0G (95% of pot 2)
            expect(await oxhuman.winnings(charlie.address)).to.equal(ethers.parseEther('1.9'));
            expect(await oxhuman.winnings(p2.address)).to.equal(0);
        });
    });

    describe('PvE flow — bot wins (player guesses HUMAN, wrong)', function () {
        it('locks bot vault, resolves with treasury fee + bot credit', async function () {
            const stake = ethers.parseEther('0.5'); // 5% of 10 0G vault — well under 10% max

            // Snapshot bot vault before
            const botBefore = (await bot.bots(1)).vaultBalance;
            expect(botBefore).to.equal(ethers.parseEther('10'));

            const treasuryBefore = await ethers.provider.getBalance(admin.address);

            // Charlie stakes against bot tokenId 1
            const tx1 = await oxhuman.connect(charlie).createGamePvE(1, { value: stake });
            await tx1.wait();

            // Bot vault should be debited by stake
            const botAfterLock = (await bot.bots(1)).vaultBalance;
            expect(botAfterLock).to.equal(botBefore - stake);

            // Charlie votes HUMAN — wrong (bot IS bot)
            const tx2 = await oxhuman.connect(charlie).submitVerdict(0, false);
            await tx2.wait();

            const game = await oxhuman.games(0);
            expect(game.status).to.equal(2); // Resolved
            expect(game.winner).to.equal(await bot.getAddress());

            // Bot wins: treasury gets 0.15 * 0.5 = 0.075; bot vault credited 1.85 * 0.5 = 0.925
            const treasuryAfter = await ethers.provider.getBalance(admin.address);
            expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseEther('0.075'));

            const botAfterCredit = (await bot.bots(1)).vaultBalance;
            // After lock: botBefore - stake. After credit: + 1.85 * stake
            const expected = botBefore - stake + (stake * 185n) / 100n;
            expect(botAfterCredit).to.equal(expected);

            // Stats
            const b = await bot.bots(1);
            expect(b.wins).to.equal(1);
            expect(b.losses).to.equal(0);

            // Charlie has no winnings
            expect(await oxhuman.winnings(charlie.address)).to.equal(0);
        });
    });

    describe('PvE flow — player wins (player guesses BOT, correct)', function () {
        it('credits player winnings + refunds bot vault leftover', async function () {
            const stake = ethers.parseEther('0.5');
            const botBefore = (await bot.bots(1)).vaultBalance;
            const treasuryBefore = await ethers.provider.getBalance(admin.address);

            await oxhuman.connect(charlie).createGamePvE(1, { value: stake });
            await oxhuman.connect(charlie).submitVerdict(0, true); // BOT — correct

            const game = await oxhuman.games(0);
            expect(game.winner).to.equal(charlie.address);

            // Treasury gets 5% of stake = 0.025
            const treasuryAfter = await ethers.provider.getBalance(admin.address);
            expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseEther('0.025'));

            // Charlie's winnings = 1.85 * stake
            const expectedWinnings = (stake * 185n) / 100n;
            expect(await oxhuman.winnings(charlie.address)).to.equal(expectedWinnings);

            // Bot vault: -stake (locked) + 0.10 * stake (refund) = -0.90 * stake net
            const expectedBotVault = botBefore - stake + (stake * 10n) / 100n;
            expect((await bot.bots(1)).vaultBalance).to.equal(expectedBotVault);

            const b = await bot.bots(1);
            expect(b.wins).to.equal(0);
            expect(b.losses).to.equal(1);
        });

        it('claimWinnings transfers ETH to player', async function () {
            const stake = ethers.parseEther('0.5');
            await oxhuman.connect(charlie).createGamePvE(1, { value: stake });
            await oxhuman.connect(charlie).submitVerdict(0, true);

            const expectedWinnings = (stake * 185n) / 100n;
            const charlieBefore = await ethers.provider.getBalance(charlie.address);
            const tx = await oxhuman.connect(charlie).claimWinnings();
            const rcpt = await tx.wait();
            const gasCost = rcpt.gasUsed * rcpt.gasPrice;
            const charlieAfter = await ethers.provider.getBalance(charlie.address);

            expect(charlieAfter - charlieBefore + gasCost).to.equal(expectedWinnings);
            expect(await oxhuman.winnings(charlie.address)).to.equal(0);
        });
    });

    describe('PvE — fee math sanity for varied stakes', function () {
        const cases = [
            { stake: '0.1', botCreditOnWin: '0.185', treasuryOnBotWin: '0.015', playerWinnings: '0.185', botRefundOnLoss: '0.01', treasuryOnPlayerWin: '0.005' },
            { stake: '0.5', botCreditOnWin: '0.925', treasuryOnBotWin: '0.075', playerWinnings: '0.925', botRefundOnLoss: '0.05', treasuryOnPlayerWin: '0.025' },
            { stake: '1.0', botCreditOnWin: '1.85', treasuryOnBotWin: '0.15', playerWinnings: '1.85', botRefundOnLoss: '0.10', treasuryOnPlayerWin: '0.05' },
        ];

        for (const c of cases) {
            it(`stake ${c.stake}: bot wins → treasury ${c.treasuryOnBotWin}, bot credit ${c.botCreditOnWin}`, async function () {
                const stake = ethers.parseEther(c.stake);
                const treasuryBefore = await ethers.provider.getBalance(admin.address);
                const botBefore = (await bot.bots(1)).vaultBalance;

                await oxhuman.connect(charlie).createGamePvE(1, { value: stake });
                await oxhuman.connect(charlie).submitVerdict(0, false); // wrong

                const treasuryAfter = await ethers.provider.getBalance(admin.address);
                expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseEther(c.treasuryOnBotWin));

                const botAfter = (await bot.bots(1)).vaultBalance;
                expect(botAfter - botBefore).to.equal(ethers.parseEther(c.botCreditOnWin) - stake); // net = credit - locked
            });

            it(`stake ${c.stake}: player wins → treasury ${c.treasuryOnPlayerWin}, player ${c.playerWinnings}`, async function () {
                const stake = ethers.parseEther(c.stake);
                const treasuryBefore = await ethers.provider.getBalance(admin.address);
                const botBefore = (await bot.bots(1)).vaultBalance;

                await oxhuman.connect(charlie).createGamePvE(1, { value: stake });
                await oxhuman.connect(charlie).submitVerdict(0, true); // correct

                const treasuryAfter = await ethers.provider.getBalance(admin.address);
                expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseEther(c.treasuryOnPlayerWin));

                expect(await oxhuman.winnings(charlie.address)).to.equal(ethers.parseEther(c.playerWinnings));

                // Bot vault net: -stake + 0.10x = -(0.90x)
                const botAfter = (await bot.bots(1)).vaultBalance;
                const netDelta = botAfter - botBefore;
                expect(netDelta).to.equal(-stake + ethers.parseEther(c.botRefundOnLoss));
            });
        }
    });

    describe('createGamePvE rejections', function () {
        it('rejects if BotINFT not set', async function () {
            // Deploy fresh OxHuman without setting BotINFT
            const O = await ethers.getContractFactory('OxHuman');
            const fresh = await O.deploy();
            await expect(
                fresh.connect(charlie).createGamePvE(1, { value: ethers.parseEther('0.1') })
            ).to.be.revertedWith('BotINFT not set');
        });

        it('rejects if stake exceeds bot maxStake (10% of vault)', async function () {
            // Bot has 10 0G, max stake 1 0G. Try 2 0G:
            await expect(
                oxhuman.connect(charlie).createGamePvE(1, { value: ethers.parseEther('2') })
            ).to.be.revertedWith('Bot vault too small');
        });

        it('rejects zero stake', async function () {
            await expect(
                oxhuman.connect(charlie).createGamePvE(1, { value: 0 })
            ).to.be.revertedWith('Stake required');
        });
    });

    describe('resolveWithSignatures', function () {
        it('PvE: resolver submits signed votes', async function () {
            const stake = ethers.parseEther('0.5');
            await oxhuman.connect(charlie).createGamePvE(1, { value: stake });

            const gameId = 0n;
            const p1Vote = true; // BOT (correct)
            const p2Vote = false;

            const p1Hash = ethers.solidityPackedKeccak256(['uint256', 'bool', 'string'], [gameId, p1Vote, 'VOTE']);
            const p1Sig = await charlie.signMessage(ethers.getBytes(p1Hash));

            const p2Hash = ethers.solidityPackedKeccak256(['uint256', 'bool', 'string'], [gameId, p2Vote, 'VOTE']);
            const p2Sig = await resolver.signMessage(ethers.getBytes(p2Hash)); // PvE: resolver signs for bot

            await oxhuman.connect(resolver).resolveWithSignatures(gameId, p1Vote, p1Sig, p2Vote, p2Sig);

            const game = await oxhuman.games(gameId);
            expect(game.status).to.equal(2);
            expect(game.winner).to.equal(charlie.address);
        });

        it('rejects forged P1 signature', async function () {
            const stake = ethers.parseEther('0.5');
            await oxhuman.connect(charlie).createGamePvE(1, { value: stake });

            const gameId = 0n;
            // p2 (not charlie) tries to sign for charlie's vote
            const p1Hash = ethers.solidityPackedKeccak256(['uint256', 'bool', 'string'], [gameId, true, 'VOTE']);
            const forgedSig = await p2.signMessage(ethers.getBytes(p1Hash));

            const p2Hash = ethers.solidityPackedKeccak256(['uint256', 'bool', 'string'], [gameId, false, 'VOTE']);
            const p2Sig = await resolver.signMessage(ethers.getBytes(p2Hash));

            await expect(
                oxhuman.connect(resolver).resolveWithSignatures(gameId, true, forgedSig, false, p2Sig)
            ).to.be.revertedWith('Invalid P1 sig');
        });
    });

    describe('anchorChatLog', function () {
        it('resolver anchors chat hash + URI after match resolved', async function () {
            const stake = ethers.parseEther('0.5');
            await oxhuman.connect(charlie).createGamePvE(1, { value: stake });
            await oxhuman.connect(charlie).submitVerdict(0, true);

            const hash = ethers.keccak256(ethers.toUtf8Bytes('chat-log'));
            const uri = 'og-storage://chat-1234';
            await oxhuman.connect(resolver).anchorChatLog(0, hash, uri);

            const game = await oxhuman.games(0);
            expect(game.chatLogHash).to.equal(hash);
            expect(game.chatLogURI).to.equal(uri);
        });

        it('rejects non-resolver', async function () {
            const stake = ethers.parseEther('0.5');
            await oxhuman.connect(charlie).createGamePvE(1, { value: stake });
            await oxhuman.connect(charlie).submitVerdict(0, true);

            await expect(
                oxhuman.connect(charlie).anchorChatLog(0, ethers.ZeroHash, 'x')
            ).to.be.revertedWith('Not resolver');
        });

        it('rejects if game not yet resolved', async function () {
            await oxhuman.connect(charlie).createGamePvE(1, { value: ethers.parseEther('0.5') });
            // No vote yet, still Active
            await expect(
                oxhuman.connect(resolver).anchorChatLog(0, ethers.ZeroHash, 'x')
            ).to.be.revertedWith('Not resolved');
        });
    });
});
