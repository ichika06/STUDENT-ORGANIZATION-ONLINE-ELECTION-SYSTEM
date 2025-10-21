import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'access-secret'

async function tryRefresh(req) {
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(/(?:^|; )refresh=([^;]+)/)
  if (!m) return null
  // call internal refresh logic: verify DB and sign new access
  try {
    const token = m[1]
    const payload = jwt.verify(token, process.env.REFRESH_SECRET || 'refresh-secret')
    // ensure token not revoked
    const db = await pool.query('SELECT revoked FROM refresh_tokens WHERE token = $1', [token])
    if (!db.rows[0] || db.rows[0].revoked) return null
    const access = jwt.sign({ sub: payload.sub }, ACCESS_SECRET, { expiresIn: '15m' })
    return access
  } catch (err) {
    return null
  }
}

export async function GET(req) {
  const auth = req.headers.get('authorization') || ''
  const m = auth.match(/^Bearer (.+)$/)
  let access = m ? m[1] : null
  if (!access) {
    access = await tryRefresh(req)
  }
  if (!access) return NextResponse.json({ user: null })

  try {
    const payload = jwt.verify(access, ACCESS_SECRET)
  const res = await pool.query('SELECT id, username, first_name, last_name, avatar, is_admin FROM users WHERE id = $1', [payload.sub])
    return NextResponse.json({ user: res.rows[0] || null })
  } catch (err) {
    return NextResponse.json({ user: null })
  }
}
