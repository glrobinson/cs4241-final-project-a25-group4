import './App.css'
import { useEffect, useRef, useState } from 'react'
const rooms = ['Room 1', 'Room 2', 'Room 3']
export default function App() {
  const [msgs, whoMsgs] = useState([])
  const [ok, setOk] = useState(false)
  const [me, setMe] = useState(null)
  const [ready, setReady] = useState(false)
  const [roomId, setRoomId] = useState(rooms[0])
  const [state, setState] = useState(null)
  const [bet, setBet] = useState(10)
  const ref = useRef(null)
  const [banner] = useState(null)
  const [leaders, setLeaders] = useState([])

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(u => { setMe(u); setOk(true) })
      .catch(() => { window.location.href = '/login' })
  }, [])

  useEffect(() => {
    if (!ok) return
    fetch('/api/leaderboard', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(setLeaders)
      .catch(() => { })
  }, [ok])
  useEffect(() => {
    const uid = me?.id || me?._id
    if (!ok) return
    setReady(false)
    const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
    const ws = new WebSocket(import.meta.env.VITE_WS_URL || WS_URL);
    ref.current = ws
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'identify', userId: uid, name: me.name }))
    }
    ws.onmessage = (evt) => {
      let msg; try { msg = JSON.parse(evt.data) } catch { return }
      if (msg.type === 'ok') {
        setReady(true)
        ws.send(JSON.stringify({ type: 'join_room', roomId }))
        return
      }
      if (msg.type === 'state') setState(msg.state)
      // this is where rhe results of the game are shown to the users
      if (msg.type === 'hand_result') {
        const myId = me.id || me._id
        const myName = me?.name || 'Player'
        const mine = msg.results.find(r => r.userId === myId)
        if (mine) {
          const verb = mine.outcome === 'win' ? 'won'
            : mine.outcome === 'push' ? 'pushed' : 'lost'
          const amt = Math.abs(mine.delta)
          const ddTag = mine.dd ? ' (doubled down)' : ''
          whoMsgs(m => [
            `${myName} ${verb} ${amt} chips${ddTag} — ${mine.reason} (you ${mine.pv} vs dealer ${mine.dv})`,
            ...m
          ])
        }
        // chips are updated here
        msg.results.forEach(r => {
          const change = r.delta >= 0 ? `+${r.delta}` : `${r.delta}`
          whoMsgs(m => [`${r.name}: ${change} → ${r.chips}`, ...m])
        })
      }
      if (msg.type === 'leaderboard') setLeaders(msg.top)
    }
    ws.onclose = () => { ref.current = null; setReady(false) }
    const closeOnUnload = () => { try { ws.close() } catch { } }
    window.addEventListener('beforeunload', closeOnUnload)
    return () => { window.removeEventListener('beforeunload', closeOnUnload); ws.close() }
  }, [ok, me?.id, me?._id])

  useEffect(() => {
    if (!ready) return
    ref.current?.send(JSON.stringify({ type: 'join_room', roomId }))
  }, [ready, roomId])

  const send = (payload) => {
    const ws = ref.current
    if (ws?.readyState !== 1 || !ready) return
    ws.send(JSON.stringify(payload))
  }
  // this is where the bet that is placed is sent
  const placeBet = (e) => {
    e.preventDefault()
    const amt = Math.max(10, Math.floor(Number(bet || 0) / 10) * 10)
    send({ type: 'place_bet', amount: amt })
  }
  // these are again the different actions that the player can do against the dealer
  const hit = () => send({ type: 'action', move: 'HIT' })
  const stand = () => send({ type: 'action', move: 'STAND' })
  const doubleDown = () => send({ type: 'action', move: 'DOUBLE_DOWN' })

  const logout = async () => {
    try {
      await fetch('/logout', { method: 'POST', credentials: 'include' })
    } finally {
      window.location.href = '/login'
    }
  }
  const you = state?.players?.find(p => p.you)
  const phase = state?.phase
  const dealerUp = state?.dealer?.upcard
  const dealerFull = state?.dealer?.hand
  const myTurn = state?.currentPlayerId && (state.currentPlayerId === (me?.id || me?._id))


  return (
    <>
      <nav className="navbar bg-light border-bottom">
        <div className="container-lg d-flex justify-content-between align-items-center">
          <a className="navbar-brand fw-semibold" href="#">Blackjack</a>

          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center">
              <span className="text-muted me-2">Room:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 140 }}
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                disabled={!ready}
              >
                {rooms.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <span className="navbar-text">
              Signed in as <strong>{me?.name}</strong>
            </span>

            <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container-lg py-4">
        {banner && (
          <div
            className={`alert fw-semibold ${banner.kind === 'win' ? 'alert-success'
                : banner.kind === 'lose' ? 'alert-danger'
                  : 'alert-secondary'
              }`}
            role="alert"
          >
            {banner.text}
          </div>
        )}

        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="card mb-3">
              <div className="card-header fw-bold">Dealer</div>
              <div className="card-body">
                {phase === 'playing' ? (
                  <div className="text-muted">
                    Upcard:{' '}
                    <span className="fw-semibold">
                      {dealerUp ? `${dealerUp.rank}${dealerUp.suit}` : '—'}
                    </span>{' '}
                    <span className="ms-2">(cards: {state?.dealer?.count ?? 0})</span>
                  </div>
                ) : (
                  <div>
                    Hand:{' '}
                    {dealerFull?.map((c, i) => (
                      <span key={i} className="badge rounded-pill bg-light text-dark border me-1">
                        {c.rank}{c.suit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header fw-bold">Players</div>
              <div className="card-body p-0">
                <ul className="list-group list-group-flush">
                  {state?.players?.map(p => (
                    <li key={p.userId} className="list-group-item">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center flex-wrap gap-2">
                          <strong>{p.you ? 'You' : p.name}</strong>
                          <small className="text-muted">Chips:</small>
                          <span className="badge bg-secondary">{p.chips}</span>
                          <small className="text-muted ms-2">Bet:</small>
                          <span className="badge bg-info text-dark">{p.bet || 0}</span>
                          {p.you && <em className="text-muted ms-2">(your hand)</em>}
                        </div>
                        {state?.currentPlayerId === p.userId && (
                          <span className={`badge ${p.you ? 'bg-warning text-dark' : 'bg-light text-dark border'}`}>
                            {p.you ? 'your turn' : 'their turn'}
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        Hand:{' '}
                        {p.hand?.map((c, i) => (
                          <span key={i} className="badge rounded-pill bg-light text-dark border me-1">
                            {c.rank}{c.suit}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card mb-3">
              <div className="card-header fw-bold">Actions</div>
              <div className="card-body">
                <form onSubmit={placeBet} className="row gy-2 gx-2 align-items-center">
                  <div className="col-auto">
                    <label className="col-form-label">Bet (10s):</label>
                  </div>
                  <div className="col-auto">
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={bet}
                      onChange={e => setBet(e.target.value)}
                      className="form-control"
                      style={{ width: 160 }}
                    />
                  </div>
                  <div className="col-auto">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!ready || (phase && phase !== 'betting' && phase !== 'lobby')}
                    >
                      Place Bet
                    </button>
                  </div>
                </form>

                <div className="btn-group mt-3" role="group" aria-label="Play actions">
                  <button className="btn btn-outline-secondary" onClick={hit} disabled={!ready || !myTurn}>Hit</button>
                  <button className="btn btn-outline-secondary" onClick={stand} disabled={!ready || !myTurn}>Stand</button>
                  <button className="btn btn-outline-secondary" onClick={doubleDown} disabled={!ready || !myTurn || (you?.hand?.length !== 2)}>Double Down</button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header fw-bold">Game Outcome</div>
              <div className="card-body">
                <ul className="list-group">
                  {msgs.map((m, i) => <li key={i} className="list-group-item">{m}</li>)}
                </ul>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header fw-bold">Leaderboard</div>
            <div className="card-body">
              <ol className="list-group list-group-numbered">
                {leaders.map((p, i) => {
                  const amI = p.id === (me?.id || me?._id)
                  return (
                    <li
                      key={p.id || i}
                      className={`list-group-item d-flex justify-content-between align-items-center ${amI ? 'active' : ''}`}
                    >
                      <span>{p.name} {amI ? '(you)' : ''}</span>
                      <span className={`badge ${amI ? 'bg-light text-dark' : 'bg-secondary'}`}>{p.chips}</span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}