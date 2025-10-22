import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'access-secret'

async function requireAdmin(req) {
  const secret = req.headers.get('x-admin-secret')
  if (secret && secret === (process.env.ADMIN_SECRET || 'admin-secret')) return true
  const a = req.headers.get('authorization') || ''
  const m = a.match(/^Bearer (.+)$/)
  if (!m) return false
  try {
    const payload = jwt.verify(m[1], ACCESS_SECRET)
    const r = await pool.query('SELECT is_admin FROM users WHERE id = $1', [payload.sub])
    return !!(r.rows[0] && r.rows[0].is_admin)
  } catch (err) {
    return false
  }
}

export async function GET() {
  try {
    const res = await pool.query('SELECT id, name, position FROM candidates ORDER BY created_at DESC')
    return NextResponse.json({ candidates: res.rows })
  } catch (error) {
    console.error('Error fetching candidates:', error.message)
    if (error.message.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Database tables have not been initialized yet. Please run POST /api/db/setup first.',
          candidates: []
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: error.message, candidates: [] },
      { status: 500 }
    )
  }
}

export async function POST(req) {
  const ok = await requireAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { name, position } = await req.json()
  if (!name || !position) return NextResponse.json({ error: 'name and position required' }, { status: 400 })
  const res = await pool.query('INSERT INTO candidates (name, position) VALUES ($1, $2) RETURNING id, name, position', [name, position])
  return NextResponse.json({ candidate: res.rows[0] })
}

export async function DELETE(req) {
  const ok = await requireAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  await pool.query('DELETE FROM candidates')
  return NextResponse.json({ ok: true, message: 'all candidates deleted' })
}
