import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
    try {
        const checks = {};

        // Check database connection
        try {
            await pool.query('SELECT 1');
            checks.connection = { status: 'OK', message: 'Database connection successful' };
        } catch (err) {
            checks.connection = { status: 'FAIL', error: err.message };
        }

        // Check current user
        try {
            const result = await pool.query('SELECT current_user, current_database()');
            const { current_user, current_database } = result.rows[0];
            checks.currentUser = { status: 'OK', user: current_user, database: current_database };
        } catch (err) {
            checks.currentUser = { status: 'FAIL', error: err.message };
        }

        // Check schema permissions
        try {
            const result = await pool.query(`
                SELECT 
                    nspname as schema,
                    has_schema_privilege(nspname, 'CREATE') as can_create,
                    has_schema_privilege(nspname, 'USAGE') as can_use
                FROM pg_namespace 
                WHERE nspname = 'public'
            `);
            
            if (result.rows.length > 0) {
                const row = result.rows[0];
                checks.schemaPermissions = {
                    status: 'OK',
                    schema: row.schema,
                    canCreate: row.can_create,
                    canUse: row.can_use,
                    message: row.can_create ? 'User has CREATE permission' : 'User LACKS CREATE permission'
                };
            } else {
                checks.schemaPermissions = { status: 'FAIL', message: 'Public schema not found' };
            }
        } catch (err) {
            checks.schemaPermissions = { status: 'FAIL', error: err.message };
        }

        // Check existing tables
        try {
            const result = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            checks.existingTables = {
                status: 'OK',
                count: result.rows.length,
                tables: result.rows.map(r => r.table_name)
            };
        } catch (err) {
            checks.existingTables = { status: 'FAIL', error: err.message };
        }

        return NextResponse.json(checks, { status: 200 });
    } catch (error) {
        console.error('Diagnostic error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
