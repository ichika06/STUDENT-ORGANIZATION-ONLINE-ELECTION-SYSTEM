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

export async function DELETE(req, { params }) {
  const ok = await requireAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  
  const { id } = params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  
  const res = await pool.query('DELETE FROM candidates WHERE id = $1 RETURNING id', [id])
  
  if (!res.rows[0]) {
    return NextResponse.json({ error: 'candidate not found' }, { status: 404 })
  }
  
  return NextResponse.json({ ok: true, message: 'candidate deleted', id: res.rows[0].id })
}
