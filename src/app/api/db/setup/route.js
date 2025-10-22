import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
    try {
        // This endpoint attempts to grant permissions if needed
        // Note: You may need to run this with a superuser/owner account first
        
        // Try to grant schema permissions
        try {
            await pool.query(`GRANT USAGE ON SCHEMA public TO aivenpostgres;`);
        } catch (err) {
            // May fail if already granted or insufficient privileges
            console.log('GRANT USAGE on schema:', err.message);
        }

        try {
            await pool.query(`GRANT CREATE ON SCHEMA public TO aivenpostgres;`);
        } catch (err) {
            // May fail if already granted or insufficient privileges
            console.log('GRANT CREATE on schema:', err.message);
        }

        // Now attempt to create tables
        const results = [];

        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    first_name TEXT,
                    last_name TEXT,
                    role TEXT,
                    organization TEXT,
                    avatar TEXT,
                    is_admin BOOLEAN DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                );
            `);
            results.push({ table: 'users', status: 'created' });
        } catch (err) {
            results.push({ table: 'users', status: 'error', error: err.message });
        }

        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS votes (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    candidate TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                );
            `);
            results.push({ table: 'votes', status: 'created' });
        } catch (err) {
            results.push({ table: 'votes', status: 'error', error: err.message });
        }

        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id SERIAL PRIMARY KEY,
                    token TEXT NOT NULL,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    revoked BOOLEAN DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                );
            `);
            results.push({ table: 'refresh_tokens', status: 'created' });
        } catch (err) {
            results.push({ table: 'refresh_tokens', status: 'error', error: err.message });
        }

        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS candidates (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    position TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                );
            `);
            results.push({ table: 'candidates', status: 'created' });
        } catch (err) {
            results.push({ table: 'candidates', status: 'error', error: err.message });
        }

        try {
            await pool.query(`
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
            `);
            results.push({ table: 'elections', status: 'created' });
        } catch (err) {
            results.push({ table: 'elections', status: 'error', error: err.message });
        }

        // Add missing columns to existing tables
        try {
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;`);
        } catch (err) {
            console.log('Adding is_admin column:', err.message);
        }

        return NextResponse.json(
            { 
                message: 'Database initialization attempted',
                results: results
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Database setup error:', error);
        return NextResponse.json(
            { 
                error: error.message,
                solution: 'You may need to grant permissions using a superuser account'
            },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    return NextResponse.json(
        { 
            message: 'Database setup with permission grants endpoint',
            instructions: [
                '1. Run POST /api/db/diagnose to check permissions',
                '2. If permission denied, use Aiven console to grant privileges:',
                '   - Go to Aiven PostgreSQL dashboard',
                '   - Find your service and open it',
                '   - Go to Users tab',
                '   - Ensure aivenpostgres user has superuser or owner role',
                '3. Run POST /api/db/setup to create tables'
            ]
        },
        { status: 200 }
    );
}
