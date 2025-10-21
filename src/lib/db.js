"use server";

const { Pool } = require('pg');

const pool = new Pool({
        user: process.env.POST_USER,
        password: process.env.POST_PASSWORD,
        host: process.env.POST_HOST,
        port: process.env.POST_PORT,
        database: process.env.POST_DATABASE// Connect to default postgres database first
});

// initialize schema if missing
(async function init() {
    try {
        // ensure profile columns exist for upgrades
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;`)
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;`)
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;`)
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS organization TEXT;`)
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;`)

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS votes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                candidate TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                token TEXT NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                revoked BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            
            CREATE TABLE IF NOT EXISTS candidates (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                position TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            
            CREATE TABLE IF NOT EXISTS elections (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL DEFAULT 'Main Election',
                nomination_start_at TIMESTAMP WITH TIME ZONE,
                nomination_end_at TIMESTAMP WITH TIME ZONE,
                election_start_at TIMESTAMP WITH TIME ZONE,
                election_end_at TIMESTAMP WITH TIME ZONE,
                start_at TIMESTAMP WITH TIME ZONE,
                end_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
        `)

        await pool.query(`ALTER TABLE elections ADD COLUMN IF NOT EXISTS nomination_start_at TIMESTAMP WITH TIME ZONE;`)
        await pool.query(`ALTER TABLE elections ADD COLUMN IF NOT EXISTS nomination_end_at TIMESTAMP WITH TIME ZONE;`)
        await pool.query(`ALTER TABLE elections ADD COLUMN IF NOT EXISTS election_start_at TIMESTAMP WITH TIME ZONE;`)
        await pool.query(`ALTER TABLE elections ADD COLUMN IF NOT EXISTS election_end_at TIMESTAMP WITH TIME ZONE;`)
    } catch (err) {
        console.error('db init error', err.message)
    }
})();

module.exports = pool;