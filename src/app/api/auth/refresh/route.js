import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'access-secret'
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh-secret'

export async function POST(req) {
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(/(?:^|; )refresh=([^;]+)/)
  if (!m) return NextResponse.json({ error: 'no refresh token' }, { status: 401 })
  const token = m[1]

  try {
    const payload = jwt.verify(token, REFRESH_SECRET)
    // check DB
    const db = await pool.query('SELECT id, revoked, expires_at FROM refresh_tokens WHERE token = $1', [token])
    const row = db.rows[0]
    if (!row || row.revoked) return NextResponse.json({ error: 'invalid refresh' }, { status: 401 })

    const access = jwt.sign({ sub: payload.sub }, ACCESS_SECRET, { expiresIn: '15m' })
    return NextResponse.json({ access })
  } catch (err) {
    return NextResponse.json({ error: 'invalid refresh' }, { status: 401 })
  }
}
