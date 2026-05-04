/**
 * Clean leaderboard — keep only one wallet's records.
 *
 * Backup → preview → delete in a single transaction. Run via:
 *   KEEP_ADDR=0x7200c2e8e506105a41e2CF21D1D3F9a5d8907d9b \
 *     node scripts/0g-test/clean-leaderboard.cjs
 *
 * Default KEEP_ADDR is the user's primary wallet.
 */

const { Pool } = require('pg');

const KEEP_ADDR = (process.env.KEEP_ADDR ?? '0x7200c2e8e506105a41e2CF21D1D3F9a5d8907d9b').toLowerCase();
const DRY_RUN = process.env.DRY_RUN === '1';

const pool = new Pool({
    host: process.env.POSTGRES_HOST || '15.235.207.188',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || '0xhuman_db',
    user: process.env.POSTGRES_USER || '0xh_root',
    password: process.env.POSTGRES_PASSWORD || '0xh_29',
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
});

async function main() {
    const client = await pool.connect();
    console.log(`\n[Clean leaderboard]`);
    console.log(`  KEEP_ADDR: ${KEEP_ADDR}`);
    console.log(`  DRY_RUN:   ${DRY_RUN}\n`);

    try {
        // 1. Snapshot — what's currently in there?
        const beforeAll = await client.query('SELECT COUNT(*) FROM player_exp');
        const beforeMatch = await client.query('SELECT COUNT(*) FROM match_history');
        console.log(`Before:  player_exp=${beforeAll.rows[0].count}, match_history=${beforeMatch.rows[0].count}`);

        // 2. Preview — what will be removed vs kept
        const toDelete = await client.query(
            'SELECT address, total_exp, games_played, games_won FROM player_exp WHERE LOWER(address) != $1 ORDER BY total_exp DESC',
            [KEEP_ADDR]
        );
        const toKeep = await client.query(
            'SELECT address, total_exp, games_played, games_won FROM player_exp WHERE LOWER(address) = $1',
            [KEEP_ADDR]
        );

        console.log(`\nWill DELETE ${toDelete.rows.length} rows from player_exp:`);
        toDelete.rows.forEach((r) => {
            console.log(`  - ${r.address.slice(0, 8)}…${r.address.slice(-4)}  played=${r.games_played} won=${r.games_won} exp=${r.total_exp}`);
        });

        console.log(`\nWill KEEP ${toKeep.rows.length} rows in player_exp:`);
        toKeep.rows.forEach((r) => {
            console.log(`  + ${r.address}  played=${r.games_played} won=${r.games_won} exp=${r.total_exp}`);
        });

        if (DRY_RUN) {
            console.log('\n(DRY_RUN=1 — no changes committed)');
            return;
        }

        if (toKeep.rows.length === 0) {
            console.log('\n⚠️  KEEP_ADDR has no row — refusing to delete (would empty the leaderboard).');
            return;
        }

        // 3. Backup — create timestamped backup tables
        const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        await client.query('BEGIN');
        await client.query(`CREATE TABLE IF NOT EXISTS player_exp_backup_${stamp} AS SELECT * FROM player_exp WHERE 1=0`);
        await client.query(`INSERT INTO player_exp_backup_${stamp} SELECT * FROM player_exp`);
        await client.query(`CREATE TABLE IF NOT EXISTS match_history_backup_${stamp} AS SELECT * FROM match_history WHERE 1=0`);
        await client.query(`INSERT INTO match_history_backup_${stamp} SELECT * FROM match_history`);
        console.log(`\n✓ Backed up to player_exp_backup_${stamp} + match_history_backup_${stamp}`);

        // 4. Delete
        const delExp = await client.query(
            'DELETE FROM player_exp WHERE LOWER(address) != $1',
            [KEEP_ADDR]
        );
        const delMatch = await client.query(
            'DELETE FROM match_history WHERE LOWER(player_address) != $1',
            [KEEP_ADDR]
        );
        await client.query('COMMIT');
        console.log(`✓ Deleted ${delExp.rowCount} rows from player_exp`);
        console.log(`✓ Deleted ${delMatch.rowCount} rows from match_history`);

        // 5. Verify
        const afterAll = await client.query('SELECT COUNT(*) FROM player_exp');
        const afterMatch = await client.query('SELECT COUNT(*) FROM match_history');
        const remaining = await client.query('SELECT * FROM player_exp');
        console.log(`\nAfter:   player_exp=${afterAll.rows[0].count}, match_history=${afterMatch.rows[0].count}`);
        console.log('\nRemaining player_exp rows:');
        remaining.rows.forEach((r) => {
            console.log(`  ${r.address}  played=${r.games_played} won=${r.games_won} exp=${r.total_exp} refs=${r.referral_count}`);
        });
    } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('\n❌ ERROR:', e.message ?? e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
