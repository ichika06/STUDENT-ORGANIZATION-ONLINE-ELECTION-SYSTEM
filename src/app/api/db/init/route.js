import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
    try {
        // Create users table
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

        // Add is_admin column if it doesn't exist (for existing tables)
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;`);

        // Create votes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS votes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                candidate TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
        `);

        // Create refresh_tokens table
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

        // Create candidates table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS candidates (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                position TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
        `);

        // Create elections table
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

        return NextResponse.json(
            { 
                success: true, 
                message: 'All database tables created successfully!' 
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Database initialization error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error.message 
            },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    return NextResponse.json(
        { 
            message: 'Database initialization endpoint. Send a POST request to create tables.',
            endpoint: 'POST /api/db/init'
        },
        { status: 200 }
    );
}
