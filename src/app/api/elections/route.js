import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'access-secret'

function mapElectionRow(row) {
  if (!row) return null
  const mapped = {
    id: row.id,
    name: row.name,
    nomination_start_at: row.nomination_start_at || row.start_at || null,
    nomination_end_at: row.nomination_end_at || null,
    election_start_at: row.election_start_at || row.start_at || null,
    election_end_at: row.election_end_at || row.end_at || null,
    start_at: row.start_at || null,
    end_at: row.end_at || null,
  }
  return mapped
}

export async function GET() {
  try {
    const res = await pool.query(`
      SELECT id, name, nomination_start_at, nomination_end_at, election_start_at, election_end_at, start_at, end_at
      FROM elections
      ORDER BY created_at DESC
      LIMIT 1
    `)
    return NextResponse.json({ election: mapElectionRow(res.rows[0]) })
  } catch (error) {
    console.error('Error fetching election:', error.message)
    if (error.message.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Database tables have not been initialized yet. Please run POST /api/db/setup first.',
          election: null
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: error.message, election: null },
      { status: 500 }
    )
  }
}

async function requireAdmin(req) {
  const a = req.headers.get('authorization') || ''
  const m = a.match(/^Bearer (.+)$/)
  if (!m) return null
  try {
    const payload = jwt.verify(m[1], ACCESS_SECRET)
    const r = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [payload.sub])
    if (r.rows[0] && r.rows[0].is_admin) return r.rows[0]
  } catch (err) {}
  return null
}

export async function POST(req) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const nominationStart = body.nomination_start_at ? new Date(body.nomination_start_at) : null
  const nominationEnd = body.nomination_end_at ? new Date(body.nomination_end_at) : null
  const electionStart = body.election_start_at ? new Date(body.election_start_at) : null
  const electionEnd = body.election_end_at ? new Date(body.election_end_at) : null

  const existing = await pool.query('SELECT id FROM elections ORDER BY created_at DESC LIMIT 1')
  let res
  if (existing.rows[0]) {
    res = await pool.query(
      `UPDATE elections
       SET nomination_start_at = $1,
           nomination_end_at = $2,
           election_start_at = $3,
           election_end_at = $4,
           start_at = $3,
           end_at = $4
       WHERE id = $5
       RETURNING id, name, nomination_start_at, nomination_end_at, election_start_at, election_end_at, start_at, end_at`,
      [nominationStart, nominationEnd, electionStart, electionEnd, existing.rows[0].id]
    )
  } else {
    res = await pool.query(
      `INSERT INTO elections (nomination_start_at, nomination_end_at, election_start_at, election_end_at, start_at, end_at)
       VALUES ($1, $2, $3, $4, $3, $4)
       RETURNING id, name, nomination_start_at, nomination_end_at, election_start_at, election_end_at, start_at, end_at`,
      [nominationStart, nominationEnd, electionStart, electionEnd]
    )
  }

  return NextResponse.json({ election: mapElectionRow(res.rows[0]) })
}
