/**
 * EXP (Experience Points) Tracking System - PostgreSQL Version
 * 
 * Stores player EXP in PostgreSQL database on VPS.
 * Can be converted to tokens via airdrop/claim later.
 */

import { Pool } from 'pg';

// Database connection
const pool = new Pool({
    host: process.env.POSTGRES_HOST || '15.235.207.188',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || '0xhuman_db',
    user: process.env.POSTGRES_USER || '0xh_root',
    password: process.env.POSTGRES_PASSWORD || '0xh_29',
    max: 10,
    idleTimeoutMillis: 30000,
});

// EXP rewards configuration
export const EXP_CONFIG = {
    GAME_WIN: 100,      // Win a game
    GAME_LOSS: 25,      // Lose a game (participation)
    FIRST_GAME: 50,     // Bonus for first game
    REFERRAL: 200,      // Refer a new player
    STREAK_BONUS: 10,   // Per win in streak
};

// EXP data interface
export interface ExpData {
    totalExp: number;
    gamesPlayed: number;
    gamesWon: number;
    referralCount: number;
    lastUpdated: number;
}

/**
 * Initialize database tables
 */
export async function initExpTable(): Promise<void> {
    try {
        // Player EXP table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS player_exp (
        address VARCHAR(42) PRIMARY KEY,
        total_exp INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        referral_count INTEGER DEFAULT 0,
        referred_by VARCHAR(42),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Match history table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS match_history (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL,
        player_address VARCHAR(42) NOT NULL,
        opponent_address VARCHAR(42),
        stake DECIMAL(20, 8) NOT NULL,
        won BOOLEAN NOT NULL,
        exp_earned INTEGER NOT NULL,
        payout DECIMAL(20, 8),
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('✅ EXP and match_history tables initialized');
    } catch (error: any) {
        console.error('❌ Failed to init tables:', error.message);
    }
}

/**
 * Register a referral relationship (called when new user connects via referral link)
 * Only stores the relationship, bonus is triggered on first game completion
 */
export async function registerReferral(referrerCode: string, referredAddress: string): Promise<void> {
    const normalizedReferred = referredAddress.toLowerCase();

    try {
        // Try to find full referrer address from code (first 8 chars)
        const referrerResult = await pool.query(
            'SELECT address FROM player_exp WHERE address LIKE $1 LIMIT 1',
            [referrerCode.toLowerCase() + '%']
        );

        let referrerAddress = referrerCode.toLowerCase();
        if (referrerResult.rows.length > 0) {
            referrerAddress = referrerResult.rows[0].address;
        }

        // Create or update referred user with referrer info
        await pool.query(`
      INSERT INTO player_exp (address, referred_by)
      VALUES ($1, $2)
      ON CONFLICT (address) DO UPDATE SET
        referred_by = COALESCE(player_exp.referred_by, $2)
    `, [normalizedReferred, referrerAddress]);

        console.log(`📎 Stored referral: ${referredAddress.slice(0, 8)}... → referred_by ${referrerAddress.slice(0, 8)}...`);
    } catch (error: any) {
        console.error('❌ Failed to register referral:', error.message);
    }
}

/**
 * Get player's EXP data
 */
export async function getPlayerExp(address: string): Promise<ExpData> {
    const normalizedAddress = address.toLowerCase();
    try {
        const result = await pool.query(
            'SELECT total_exp, games_played, games_won, referral_count, last_updated FROM player_exp WHERE address = $1',
            [normalizedAddress]
        );

        if (result.rows.length === 0) {
            return {
                totalExp: 0,
                gamesPlayed: 0,
                gamesWon: 0,
                referralCount: 0,
                lastUpdated: Date.now(),
            };
        }

        const row = result.rows[0];
        return {
            totalExp: row.total_exp,
            gamesPlayed: row.games_played,
            gamesWon: row.games_won,
            referralCount: row.referral_count,
            lastUpdated: new Date(row.last_updated).getTime(),
        };
    } catch (error: any) {
        console.error('❌ Failed to get player EXP:', error.message);
        return { totalExp: 0, gamesPlayed: 0, gamesWon: 0, referralCount: 0, lastUpdated: Date.now() };
    }
}

/**
 * Award EXP for game result
 */
export async function awardGameExp(address: string, won: boolean, betSize: number): Promise<number> {
    const normalizedAddress = address.toLowerCase();

    try {
        // Get current data
        const currentData = await getPlayerExp(normalizedAddress);

        // Base EXP
        let expGained = won ? EXP_CONFIG.GAME_WIN : EXP_CONFIG.GAME_LOSS;

        // First game bonus
        if (currentData.gamesPlayed === 0) {
            expGained += EXP_CONFIG.FIRST_GAME;
        }

        // Bet size multiplier (higher stakes = more EXP)
        const betMultiplier = Math.min(betSize / 2, 3); // Cap at 3x for 6+ MNT bets
        expGained = Math.floor(expGained * Math.max(1, betMultiplier));

        // Upsert player data
        await pool.query(`
      INSERT INTO player_exp (address, total_exp, games_played, games_won, last_updated)
      VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (address) DO UPDATE SET
        total_exp = player_exp.total_exp + $2,
        games_played = player_exp.games_played + 1,
        games_won = player_exp.games_won + $3,
        last_updated = CURRENT_TIMESTAMP
    `, [normalizedAddress, expGained, won ? 1 : 0]);

        console.log(`🎮 EXP awarded: ${address.slice(0, 8)}... +${expGained} EXP`);

        // Check if this is first game and player has a referrer → trigger referral bonus
        if (currentData.gamesPlayed === 0) {
            const referrerResult = await pool.query(
                'SELECT referred_by FROM player_exp WHERE address = $1',
                [normalizedAddress]
            );
            if (referrerResult.rows.length > 0 && referrerResult.rows[0].referred_by) {
                const referrer = referrerResult.rows[0].referred_by;
                await awardReferralExp(referrer, normalizedAddress);
                console.log(`🔗 Referral triggered! ${referrer.slice(0, 8)}... gets +${EXP_CONFIG.REFERRAL} EXP`);
            }
        }

        return expGained;
    } catch (error: any) {
        console.error('❌ Failed to award game EXP:', error.message);
        return 0;
    }
}

/**
 * Award referral EXP
 */
export async function awardReferralExp(referrerAddress: string, referredAddress: string): Promise<number> {
    const normalizedReferrer = referrerAddress.toLowerCase();
    const normalizedReferred = referredAddress.toLowerCase();

    try {
        // Update referrer's EXP and count
        await pool.query(`
      INSERT INTO player_exp (address, total_exp, referral_count, last_updated)
      VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (address) DO UPDATE SET
        total_exp = player_exp.total_exp + $2,
        referral_count = player_exp.referral_count + 1,
        last_updated = CURRENT_TIMESTAMP
    `, [normalizedReferrer, EXP_CONFIG.REFERRAL]);

        // Mark referred user
        await pool.query(`
      INSERT INTO player_exp (address, referred_by)
      VALUES ($1, $2)
      ON CONFLICT (address) DO UPDATE SET
        referred_by = COALESCE(player_exp.referred_by, $2)
    `, [normalizedReferred, normalizedReferrer]);

        console.log(`🔗 Referral EXP: ${referrerAddress.slice(0, 8)}... +${EXP_CONFIG.REFERRAL} EXP`);

        return EXP_CONFIG.REFERRAL;
    } catch (error: any) {
        console.error('❌ Failed to award referral EXP:', error.message);
        return 0;
    }
}

/**
 * Get leaderboard (top EXP players)
 */
export async function getExpLeaderboard(limit: number = 10): Promise<Array<{ address: string; exp: number; gamesPlayed: number }>> {
    try {
        const result = await pool.query(
            'SELECT address, total_exp, games_played FROM player_exp ORDER BY total_exp DESC LIMIT $1',
            [limit]
        );

        return result.rows.map(row => ({
            address: row.address,
            exp: row.total_exp,
            gamesPlayed: row.games_played,
        }));
    } catch (error: any) {
        console.error('❌ Failed to get leaderboard:', error.message);
        return [];
    }
}

/**
 * Get total EXP distributed
 */
export async function getTotalExpDistributed(): Promise<number> {
    try {
        const result = await pool.query('SELECT COALESCE(SUM(total_exp), 0) as total FROM player_exp');
        return parseInt(result.rows[0].total);
    } catch (error: any) {
        console.error('❌ Failed to get total EXP:', error.message);
        return 0;
    }
}

/**
 * Get total players with EXP
 */
export async function getTotalPlayers(): Promise<number> {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM player_exp');
        return parseInt(result.rows[0].count);
    } catch (error: any) {
        console.error('❌ Failed to get total players:', error.message);
        return 0;
    }
}

// Match history interface
export interface MatchRecord {
    gameId: number;
    opponent: string;
    stake: number;
    won: boolean;
    expEarned: number;
    payout: number;
    playedAt: string;
}

/**
 * Record a match result
 */
export async function recordMatch(
    gameId: number,
    playerAddress: string,
    opponentAddress: string,
    stake: number,
    won: boolean,
    expEarned: number,
    payout: number
): Promise<void> {
    try {
        await pool.query(`
      INSERT INTO match_history (game_id, player_address, opponent_address, stake, won, exp_earned, payout)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [gameId, playerAddress.toLowerCase(), opponentAddress.toLowerCase(), stake, won, expEarned, payout]);
    } catch (error: any) {
        console.error('❌ Failed to record match:', error.message);
    }
}

/**
 * Get player match history
 */
export async function getMatchHistory(address: string, limit: number = 10): Promise<MatchRecord[]> {
    try {
        const result = await pool.query(`
      SELECT game_id, opponent_address, stake, won, exp_earned, payout, played_at
      FROM match_history
      WHERE player_address = $1
      ORDER BY played_at DESC
      LIMIT $2
    `, [address.toLowerCase(), limit]);

        return result.rows.map(row => ({
            gameId: row.game_id,
            opponent: row.opponent_address,
            stake: parseFloat(row.stake),
            won: row.won,
            expEarned: row.exp_earned,
            payout: parseFloat(row.payout) || 0,
            playedAt: row.played_at.toISOString(),
        }));
    } catch (error: any) {
        console.error('❌ Failed to get match history:', error.message);
        return [];
    }
}

// Initialize tables on import
initExpTable();
