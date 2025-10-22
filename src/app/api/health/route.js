import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
    try {
        const checks = {};

        // Check database connection
        try {
            await pool.query('SELECT 1');
            checks.database = { status: 'CONNECTED', message: 'Database connection successful' };
        } catch (err) {
            checks.database = { status: 'FAILED', error: err.message };
            return NextResponse.json(checks, { status: 503 });
        }

        // Check which tables exist
        try {
            const result = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `);
            const tables = result.rows.map(r => r.table_name);
            const expectedTables = ['users', 'votes', 'refresh_tokens', 'candidates', 'elections'];
            const missingTables = expectedTables.filter(t => !tables.includes(t));
            
            checks.tables = {
                status: missingTables.length === 0 ? 'OK' : 'INCOMPLETE',
                found: tables,
                expected: expectedTables,
                missing: missingTables,
                initialized: missingTables.length === 0
            };
        } catch (err) {
            checks.tables = { status: 'ERROR', error: err.message };
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
                checks.permissions = {
                    status: row.can_create ? 'OK' : 'RESTRICTED',
                    canCreate: row.can_create,
                    canUse: row.can_use
                };
            }
        } catch (err) {
            checks.permissions = { status: 'ERROR', error: err.message };
        }

        // Overall status
        const isHealthy = checks.database.status === 'CONNECTED' && 
                         checks.tables.initialized === true;

        const statusCode = isHealthy ? 200 : 503;
        
        return NextResponse.json(
            {
                status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
                checks,
                nextSteps: !isHealthy ? [
                    'If tables are missing, run: POST /api/db/setup',
                    'If permissions are restricted, check Aiven console user roles',
                    'If database is disconnected, verify connection string in .env'
                ] : []
            },
            { status: statusCode }
        );
    } catch (error) {
        console.error('Health check error:', error);
        return NextResponse.json(
            { 
                status: 'ERROR',
                error: error.message 
            },
            { status: 500 }
        );
    }
}
