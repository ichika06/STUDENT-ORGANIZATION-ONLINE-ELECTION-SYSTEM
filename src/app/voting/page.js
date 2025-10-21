"use client"

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { EmptyUser } from '@/components/emptyuser'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const DEFAULT_POSITIONS = ['President', 'Vice President', 'Secretary']

export default function Voting() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState('')
  const [allCandidates, setAllCandidates] = useState([])
  const [usersList, setUsersList] = useState([])
  const [selectedPosition, setSelectedPosition] = useState('President')
  const [votes, setVotes] = useState([])
  const [userVotedPositions, setUserVotedPositions] = useState([])
  const [isCandidate, setIsCandidate] = useState(false)
  const [message, setMessage] = useState('')
  const [loadingVotes, setLoadingVotes] = useState(false)
  const [votingFor, setVotingFor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [election, setElection] = useState(null)

  const positions = useMemo(() => {
    const unique = Array.from(new Set((allCandidates || []).map(c => c.position).filter(Boolean)))
    return unique.length ? unique : DEFAULT_POSITIONS
  }, [allCandidates])

  useEffect(() => {
    if (!positions.length) return
    if (!positions.includes(selectedPosition)) {
      setSelectedPosition(positions[0])
    }
  }, [positions, selectedPosition])

  const fetchVotes = useCallback(async () => {
    try {
      const res = await fetch('/api/votes')
      const json = await res.json()
      setVotes(json.results || [])
      if (json.myVotes) {
        setUserVotedPositions((json.myVotes || []).map(v => v.position))
      }
    } catch (err) {
      console.error('Failed to load votes', err)
      setMessage('Failed to load votes')
    }
  }, [])

  useEffect(() => {
    fetch('/api/candidates').then(r=>r.json()).then(d=>{
      setAllCandidates(d.candidates || [])
    })
    fetch('/api/users').then(r=>r.json()).then(d=>setUsersList(d.users || []))
    fetch('/api/elections').then(r=>r.json()).then(d=>setElection(d.election || null))
  }, [])

  useEffect(() => {
    if (!user) { setIsCandidate(false); return }
    const found = (allCandidates || []).some(c => c.name === user.username)
    setIsCandidate(found)
  }, [user, allCandidates])

  const fetchUser = useCallback(async (tkn) => {
    if (!tkn) {
      setUser(null)
      return
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + tkn },
      })
      const json = await res.json()
      setUser(json.user || null)
    } catch (err) {
      console.error('Failed to fetch user', err)
      setUser(null)
    }
  }, [])

  const signOut = () => {
    try {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch (err) {
      console.warn('Logout request failed', err)
    }
    localStorage.removeItem('access')
    setToken('')
    setUser(null)
  }

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('access') : null
    if (stored) setToken(stored)
    fetchVotes()
    fetchUser(stored)
    setLoading(false)
  }, [fetchVotes, fetchUser])

  async function submitVote(candidate) {
    setMessage('')
    if (!token) {
      setMessage('You must be logged in to vote.')
      return
    }
    setVotingFor(candidate)
    setLoadingVotes(true)
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ candidate }),
      })
      let json = await res.json()
      if (res.status === 401) {
        // try refresh
        const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
        const jr = await r.json()
        if (jr.access) {
          localStorage.setItem('access', jr.access)
          setToken(jr.access)
          // retry
          const res2 = await fetch('/api/votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jr.access },
            body: JSON.stringify({ candidate }),
          })
          json = await res2.json()
        } else {
          setMessage('Session expired, please login again')
          setToken('')
          setUser(null)
          localStorage.removeItem('access')
          return
        }
      }
      if (json.error) {
        setMessage(json.error)
      } else {
        setMessage('Vote submitted')
        await fetchVotes()
      }
    } catch (err) {
      console.error('Vote error', err)
      setMessage('Failed to submit vote')
    } finally {
      setVotingFor(null)
      setLoadingVotes(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={48} />
      </div>
    )
  }

  if (!user) {
    return (
      <EmptyUser />
    )
  }

  const nominationStartDate = election?.nomination_start_at ? new Date(election.nomination_start_at) : null
  const nominationEndDate = election?.nomination_end_at ? new Date(election.nomination_end_at) : null
  const electionStartDate = election?.election_start_at ? new Date(election.election_start_at) : (election?.start_at ? new Date(election.start_at) : null)
  const electionEndDate = election?.election_end_at ? new Date(election.election_end_at) : (election?.end_at ? new Date(election.end_at) : null)

  const now = new Date()
  let phase = 'unscheduled'
  if (!election) {
    phase = 'unscheduled'
  } else if (nominationStartDate && now < nominationStartDate) {
    phase = 'pre-nomination'
  } else if (nominationStartDate && (!nominationEndDate || now <= nominationEndDate)) {
    phase = 'nomination'
  } else if (nominationEndDate && now > nominationEndDate && (!electionStartDate || now < electionStartDate)) {
    phase = 'pre-election'
  } else if (electionStartDate && now >= electionStartDate && (!electionEndDate || now <= electionEndDate)) {
    phase = 'election'
  } else if (electionEndDate && now > electionEndDate) {
    phase = 'closed'
  } else if (electionStartDate && now < electionStartDate) {
    phase = 'pre-election'
  }

  const isNominationPhase = phase === 'nomination'
  const isPreNomination = phase === 'pre-nomination'
  const isPreElection = phase === 'pre-election'
  const isElectionPhase = phase === 'election'
  const isClosedPhase = phase === 'closed'

  // compute winners per position when votes/candidates are known
  const resultsByPosition = {}
  positions.forEach(pos => {
    const candidatesForPos = (allCandidates || []).filter(c => c.position === pos)
    // build array of { id, name, votes }
    const arr = candidatesForPos.map(c => ({ id: c.id, name: c.name, votes: votes.find(v => v.candidate === c.name)?.votes || 0 }))
    arr.sort((a,b)=> b.votes - a.votes)
    resultsByPosition[pos] = arr
  })

  const dateTimeOpts = { dateStyle: 'medium', timeStyle: 'short' }
  const formatDate = (date) => (date ? date.toLocaleString(undefined, dateTimeOpts) : '—')

  const positionTotals = {}
  const topByPosition = {}
  positions.forEach(pos => {
    const list = resultsByPosition[pos] || []
    positionTotals[pos] = list.reduce((sum, item) => sum + (item.votes || 0), 0)
    const winner = list[0]
    topByPosition[pos] = { candidate: winner?.name || '—', votes: winner?.votes ?? 0 }
  })

  const chartData = positions.map(p => ({ name: p, votes: positionTotals[p] || 0 }))
  const leaderboardOrder = [...positions].sort((a, b) => (topByPosition[b]?.votes || 0) - (topByPosition[a]?.votes || 0))
  const candidatesBySelectedPosition = allCandidates.filter(c => c.position === selectedPosition)

  let phaseMessage = ''
  if (!election) {
    phaseMessage = 'No election schedule has been configured yet.'
  } else if (isPreNomination) {
    phaseMessage = nominationStartDate ? `Nomination opens on ${formatDate(nominationStartDate)}.` : 'Nomination schedule has not been set.'
  } else if (isNominationPhase) {
    phaseMessage = nominationEndDate ? `Nomination period is open until ${formatDate(nominationEndDate)}.` : 'Nomination period is currently open.'
  } else if (isPreElection) {
    phaseMessage = electionStartDate ? `Nomination is closed. Voting opens on ${formatDate(electionStartDate)}.` : 'Nomination is closed. Awaiting election schedule.'
  } else if (isElectionPhase) {
    phaseMessage = electionEndDate ? `Election is in progress. Voting closes on ${formatDate(electionEndDate)}.` : 'Election is in progress.'
  } else if (isClosedPhase) {
    phaseMessage = electionEndDate ? `Election closed on ${formatDate(electionEndDate)}.` : 'Election closed.'
  }

  return (
    <div className="p-8 flex flex-col max-h-screen">
          <div className="max-w-screen w-full rounded-lg p-6 shadow">
        <h1 className="text-2xl font-bold mb-4">Simple Voting</h1>

        <div className="mb-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-gray-700">{(user.first_name ? user.first_name[0] : user.username?.[0]||'U') + (user.last_name ? user.last_name[0] : '')}</span>
                )}
              </div>
              <div className="flex-1">Logged in as <strong>{user.username}</strong></div>
              <Button size="sm" variant="outline" onClick={signOut}>Sign Out</Button>
            </div>

          ) : (
            <div>
              Not logged in. <a href="/auth/login" className="underline text-sm">Login / Sign up</a>
            </div>
          )}
        </div>

        <div className="mb-4">
          <h2 className="font-semibold mb-2">Overview</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="p-3 border rounded">
              <h3 className="text-sm font-medium mb-2">Position leaders</h3>
              <ul className="space-y-2">
                {leaderboardOrder.map(p => (
                  <li key={p} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{p}</div>
                      <div className="text-xs text-muted-foreground">{topByPosition[p].candidate}</div>
                    </div>
                    <div className="text-sm">{topByPosition[p].votes}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 border rounded">
              <h3 className="text-sm font-medium mb-2">Votes (by position)</h3>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="votes" stroke="#8884d8" fillOpacity={1} fill="url(#colorVotes)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 border rounded">
            <h3 className="text-sm font-medium mb-2">Schedule</h3>
            <div className="text-sm">Nomination opens: <strong>{formatDate(nominationStartDate)}</strong></div>
            <div className="text-sm">Nomination closes: <strong>{formatDate(nominationEndDate)}</strong></div>
            <div className="text-sm">Election opens: <strong>{formatDate(electionStartDate)}</strong></div>
            <div className="text-sm">Election closes: <strong>{formatDate(electionEndDate)}</strong></div>
            <div className="mt-2 text-xs text-muted-foreground capitalize">Current phase: {phase.replace('-', ' ')}</div>
          </div>

          <h2 className="font-semibold mb-2">Candidates</h2>
          {isElectionPhase ? (
            <div className="mb-3 flex gap-2 items-center">
              <label className="text-sm">Position:</label>
              <Select value={selectedPosition} onValueChange={v=>setSelectedPosition(v)}>
                <SelectTrigger className="w-48">
                  <SelectValue>{selectedPosition}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {positions.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {phaseMessage ? <div className="mb-3 text-sm text-muted-foreground">{phaseMessage}</div> : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isClosedPhase ? (
              positions.map(pos => {
                const list = resultsByPosition[pos] || []
                const winner = list[0]
                return (
                  <Card key={pos} className="p-2">
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-semibold">{pos}</div>
                          <div className="text-sm text-muted-foreground">Winner: {winner ? winner.name : '—'}</div>
                        </div>
                        <div className="text-sm">{winner ? winner.votes : 0} votes</div>
                      </div>
                      <div className="mt-3">
                        <ol className="list-decimal list-inside text-sm space-y-1">
                          {list.slice(0,5).map(item => (
                            <li key={item.id || item.name} className="flex items-center justify-between">
                              <span>{item.name}</span>
                              <span className="text-xs text-muted-foreground">{item.votes}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : isPreNomination ? (
              <Card className="p-4 col-span-full">
                <CardContent>
                  <p className="text-sm text-muted-foreground">Nomination has not started yet. Please check back on {formatDate(nominationStartDate)}.</p>
                </CardContent>
              </Card>
            ) : (() => {
              const list = isElectionPhase ? candidatesBySelectedPosition : allCandidates
              if (!list.length) {
                return (
                  <Card className="p-4 col-span-full">
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {isElectionPhase
                          ? `No candidates have been nominated for ${selectedPosition} yet.`
                          : 'No candidates have been nominated yet.'}
                      </p>
                    </CardContent>
                  </Card>
                )
              }

              return list.map(c => {
                const name = c.name
                const tally = votes.find(v => v.candidate === name)?.votes || 0
                const isVoting = votingFor === name && loadingVotes
                const hasVotedPosition = userVotedPositions.includes(c.position)
                const u = usersList.find(u => u.username === name)
                const voteDisabled = !isElectionPhase || !user || isVoting || hasVotedPosition || isCandidate
                return (
                  <Card key={c.id || name} className="p-2">
                    <CardContent>
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                          {u && u.avatar ? (
                            <img src={u.avatar} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-semibold text-gray-700">{(u ? ((u.first_name||'')[0] + (u.last_name||'')[0]) : name[0])}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sheet>
                                <SheetTrigger asChild>
                                  <button className="text-lg font-medium underline">{name}</button>
                                </SheetTrigger>
                                <SheetContent side="right">
                                  <SheetHeader>
                                    <SheetTitle>{name}</SheetTitle>
                                    <SheetDescription>{c.position}</SheetDescription>
                                  </SheetHeader>
                                  <div className="p-4">
                                    {u && u.avatar ? <img src={u.avatar} alt={name} className="w-32 h-32 rounded-md object-cover mb-4" /> : null}
                                    <div className="text-sm">Org: {u?.organization || '—'}</div>
                                    <div className="text-sm">Role/Year: {u?.role || '—'}</div>
                                  </div>
                                  <SheetFooter>
                                    <Button variant="outline">Close</Button>
                                  </SheetFooter>
                                </SheetContent>
                              </Sheet>
                            </div>
                            <div className="text-xs text-muted-foreground">ID: {c.id}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{c.position} · {tally} votes</div>
                          <div className="mt-2 text-xs text-muted-foreground">Org: {u?.organization || '—'} · Year: {u?.role || '—'}</div>
                          <div className="mt-2">{u ? <span className="text-xs font-medium text-green-700">Candidate</span> : null}</div>
                        </div>
                        <div className="flex flex-col items-end">
                          {isElectionPhase ? (
                            <Button onClick={() => submitVote(name)} disabled={voteDisabled} aria-disabled={voteDisabled}>
                              {isVoting ? <Spinner className="mr-2" /> : null}
                              {isCandidate ? 'Candidates cannot vote' : (hasVotedPosition ? 'Already Voted' : 'Vote')}
                            </Button>
                          ) : (
                            <div className="text-xs text-muted-foreground text-right">
                              {isNominationPhase
                                ? `Nomination in progress${electionStartDate ? `. Voting opens ${formatDate(electionStartDate)}.` : ''}`
                                : `Voting opens ${formatDate(electionStartDate)}.`}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            })()}
          </div>
        </div>

        {message && <div className="mt-2 text-sm text-red-600">{message}</div>}
      </div>
    </div>
  )
}
