import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  // include profile fields so client can render avatars/org/year
  const res = await pool.query('SELECT id, username, first_name, last_name, organization, role, avatar, is_admin FROM users ORDER BY created_at DESC LIMIT 200')
  return NextResponse.json({ users: res.rows })
}
