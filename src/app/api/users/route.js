import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    // include profile fields so client can render avatars/org/year
    const res = await pool.query('SELECT id, username, first_name, last_name, organization, role, avatar FROM users ORDER BY created_at DESC LIMIT 200')
    return NextResponse.json({ users: res.rows })
  } catch (error) {
    console.error('Error fetching users:', error.message)
    if (error.message.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Database tables have not been initialized yet. Please run POST /api/db/setup first.',
          users: []
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: error.message, users: [] },
      { status: 500 }
    )
  }
}
