/* 
1. Open up a socket server
2. Maintain a list of clients connected to the socket server
3. When a client sends a message to the socket server, forward it to all
connected clients
*/
import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import http from 'http'
import ViteExpress from 'vite-express'
import { WebSocketServer, WebSocket } from 'ws'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { MongoClient, ObjectId } from 'mongodb'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const origin = process.env.APP_ORIGIN || 'http://localhost:3000'
const app = express()
const server = http.createServer(app),
    socketServer = new WebSocketServer({ server, path: '/ws' }),
    clients = []
const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
await client.connect()
const db = client.db(process.env.MONGODB_DBNAME || 'app')
const Users = db.collection('users')
await Users.createIndex({ email: 1 }, { unique: true, sparse: true }).catch(() => { })
await Users.createIndex({ githubId: 1 }, { unique: true, sparse: true }).catch(() => { })
await Users.createIndex({ chips: -1 }).catch(() => { })
console.log('Yay!!! Connected to MongoDB Atlas')
const cardValues = {};
// numbers 2-10
for (let i = 2; i <= 10; i++) {
    cardValues[i.toString()] = i;
}
// royalty cards
['J', 'Q', 'K'].forEach(c => (cardValues[c] = 10));
// ace initially counted as 11 (Can be equal to 1 situationally)
cardValues['A'] = 11;

// Build shuffled deck
function create_deck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (const s of suits) {
        for (const r of ranks) {
            deck.push({ rank: r, suit: s });
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Draw card
function draw(deck) {
    if (!deck || deck.length <= 0) {
        console.log('Error!!! Deck is empty!!!');
        return null;
    }
    return deck.pop();
}

function hand_value(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
        total += cardValues[card.rank];
        if (card.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) { 
        total -= 10; 
        aces--; 
    }
    return total;
}

function is_bust(v) { 
    return v > 21; 
}

function resolve_hand(player_hand, dealer_hand, bet, double_down = false) {
    const pv = hand_value(player_hand)
    const dv = hand_value(dealer_hand)
    const mult = double_down ? 2 : 1

    if (is_bust(pv)) return { delta: -bet * mult, outcome: 'lose', reason: 'you busted', pv, dv, dd: double_down }
    if (pv === 21 && player_hand.length === 2 && dv !== 21)
        return { delta: 1.5 * bet * mult, outcome: 'win', reason: 'blackjack', pv, dv, dd: double_down }
    if (is_bust(dv)) return { delta: bet * mult, outcome: 'win', reason: 'dealer busted', pv, dv, dd: double_down }
    if (pv > dv) return { delta: bet * mult, outcome: 'win', reason: 'higher total', pv, dv, dd: double_down }
    if (pv < dv) return { delta: -bet * mult, outcome: 'lose', reason: 'lower total', pv, dv, dd: double_down }

    return { delta: 0, outcome: 'push', reason: 'push', pv, dv, dd: double_down }
}

const player_moves = Object.freeze({ 
    HIT: 0, 
    STAND: 1, 
    DOUBLE_DOWN: 2 
});

function parse_move(input) {
    const s = String(input).trim().toUpperCase();
    if (s === 'HIT') return player_moves.HIT;
    if (s === 'STAND') return player_moves.STAND;
    if (s === 'DOUBLE_DOWN') return player_moves.DOUBLE_DOWN;
    return null;
}

class GameRoom {
    constructor(id) {
        this.id = id
        this.deck = create_deck()
        this.dealer = []
        this.players = new Map()
        this.turnOrder = []
        this.phase = 'lobby'
        this.currentIdx = -1
    }
    ensureDeck() { if (this.deck.length < 15) this.deck = create_deck() }
    // this is here to check if a player has joined the room
    join({ userId, name, chips }) {
        if (!this.players.has(userId)) this.players.set(userId, { name, chips, hand: [], bet: 0, done: false, dd: false })
        this.share()
    }
    // this is here to check if a player has left the room
    leave(userId) {
        const idx = this.turnOrder.indexOf(userId)
        this.players.delete(userId)
        if (idx !== -1) this.turnOrder.splice(idx, 1)
        if (this.phase === 'playing') {
            if (idx !== -1 && idx < this.currentIdx) this.currentIdx--
            if (idx === this.currentIdx) this.advance()
            if (this.turnOrder.length === 0) {
                this.phase = 'lobby'
                this.dealer = []
                this.currentIdx = -1
            }
        } else if (this.phase === 'betting') {
            // this is where the game will actually start going because the players who are in the room have made bets
            if (this.turnOrder.length > 0 &&
                [...this.players.values()].every(p => p.bet >= 10)) {
                this.startRound()
            } else if (this.turnOrder.length === 0) {
                this.phase = 'lobby'
                this.dealer = []
                this.currentIdx = -1
            }
        } else {
            if (this.turnOrder.length === 0) {
                this.phase = 'lobby'
                this.dealer = []
                this.currentIdx = -1
            }
        }

        this.share()
    }
    // this is where the bets are set for each player
    setBet(userId, amount) {
        const p = this.players.get(userId); if (!p) return
        const bet = Math.max(0, Math.min(p.chips, Math.floor(amount / 10) * 10))
        if (bet < 10) return
        p.bet = bet
        this.phase = 'betting'
        if ([...this.players.values()].every(x => x.bet >= 10)) this.startRound()
        this.share()
    }
    // this is how the game starts and the things that happen when starting the game
    startRound() {
        this.ensureDeck()
        this.dealer = []
        this.turnOrder = [...this.players.keys()]
        for (const id of this.turnOrder) {
            const p = this.players.get(id)
            p.hand = [draw(this.deck), draw(this.deck)]
            p.done = false
            p.dd = false
        }
        this.dealer = [draw(this.deck), draw(this.deck)]
        this.phase = 'playing'
        this.currentIdx = 0
    }
    currentPlayerId() {
        if (this.phase !== 'playing') return null
        const id = this.turnOrder[this.currentIdx]
        const p = this.players.get(id)
        return p && !p.done ? id : null
    }
    // this is here to help with giving whoever players turn it is the option to either hit, stand, or double down
    action(userId, move) {
        if (this.phase !== 'playing') return
        const turnId = this.currentPlayerId()
        if (turnId !== userId) return
        const p = this.players.get(userId); if (!p) return
        const m = typeof move === 'string' ? parse_move(move) : move

        if (m === player_moves.HIT) {
            p.hand.push(draw(this.deck))
            // if the player busts then that means that the plays turn ends right then and there sad :(
            if (is_bust(hand_value(p.hand))) p.done = true
        } else if (m === player_moves.STAND) {
            p.done = true
        } else if (m === player_moves.DOUBLE_DOWN && p.hand.length === 2 && p.chips >= p.bet) {
            p.dd = true
            p.hand.push(draw(this.deck))
            p.done = true
        }

        if (p.done) this.advance()
        this.share()
    }
    advance() {
        while (this.currentIdx < this.turnOrder.length && this.players.get(this.turnOrder[this.currentIdx])?.done) {
            this.currentIdx++
        }
        if (this.currentIdx >= this.turnOrder.length) this.playDealer()
    }
    // in this the dealer is supposed to draw the number 17 or more and then based on the dealers hand and the hand of the players the results decides what happened in the game and who won or lost
    playDealer() {
        while (hand_value(this.dealer) < 17) this.dealer.push(draw(this.deck))

        const results = []
        for (const [id, p] of this.players) {
            const r = resolve_hand(p.hand, this.dealer, p.bet, p.dd)
            p.chips = Math.max(0, p.chips + r.delta)
            results.push({ userId: id, name: p.name, chips: p.chips, ...r })
            p.hand = []; p.bet = 0; p.done = false; p.dd = false
        }

        this.phase = 'settle'
        this.share({ type: 'hand_result', results })
    }
    // this is here so that the cards of the dealer are secret hehe other than the card that is showing and showing who the players are
    view(forUserId) {
        const players = [...this.players.entries()].map(([id, p]) => ({
            userId: id, name: p.name, chips: p.chips, bet: p.bet, hand: p.hand, done: p.done, you: id === forUserId
        }))
        const dealer = (this.phase === 'playing') ? { upcard: this.dealer[0], count: this.dealer.length } : { hand: this.dealer }
        return { roomId: this.id, phase: this.phase, players, dealer, currentPlayerId: this.currentPlayerId() }
    }
    share(extra = null) {
        for (const [ws, meta] of sockets.entries()) {
            if (meta.roomId === this.id) {
                safeSend(ws, { type: 'state', state: this.view(meta.userId) })
                if (extra) safeSend(ws, extra)
            }
        }
    }
}
const sockets = new Map()
const safeSend = (ws, obj) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(obj))
    }
}

// this is where the three rooms for the different games are created!!!
const rooms = new Map([
    ['Room 1', new GameRoom('Room 1')],
    ['Room 2', new GameRoom('Room 2')],
    ['Room 3', new GameRoom('Room 3')],
])
const getUserSafe = (u) => {
    if (!u) return null
    const { password, ...safe } = u
    return safe
}
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'randomstuffforsecretidk',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 },
    })
)
passport.serializeUser((user, done) => done(null, user._id.toString()))
passport.deserializeUser(async (id, done) => {
    try {
        const u = await Users.findOne({ _id: new ObjectId(id) })
        done(null, u || false)
    } catch (e) {
        done(e)
    }
})
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
        new GitHubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: process.env.OAUTH_CALLBACK_URL,
                scope: ['user:email'],
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const githubId = profile.id
                    let user = await Users.findOne({ githubId })
                    if (!user) {
                        const primaryEmail =
                            (Array.isArray(profile.emails) && profile.emails.find((e) => e.verified)?.value) ||
                            (Array.isArray(profile.emails) && profile.emails[0]?.value) ||
                            null
                        if (primaryEmail) {
                            user = await Users.findOne({ email: primaryEmail })
                        }
                        if (user) {
                            await Users.updateOne(
                                { _id: user._id },
                                {
                                    $set: {
                                        githubId,
                                        provider: 'github',
                                        avatar: profile.photos?.[0]?.value || null,
                                        name: user.name || profile.displayName || profile.username,
                                    },
                                }
                            )
                            user = await Users.findOne({ _id: user._id })
                        } else {
                            const doc = {
                                provider: 'github',
                                githubId,
                                email: primaryEmail,
                                name: profile.displayName || profile.username || 'GitHub User',
                                avatar: profile.photos?.[0]?.value || null,
                                createdAt: new Date(),
                            }
                            const { insertedId } = await Users.insertOne(doc)
                            user = await Users.findOne({ _id: insertedId })
                        }
                    }
                    if (user && user.chips == null) {
                        await Users.updateOne({ _id: user._id }, { $set: { chips: 500 } })
                        user = await Users.findOne({ _id: user._id })
                    }
                    return done(null, user)
                } catch (e) {
                    return done(e)
                }
            }
        )
    )
}
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(path.join(__dirname, 'public')))
const requireAuth = (req, res, next) => {
    if (req.user?._id) {
        req.session.userId = req.user._id.toString()
        return next()
    }
    if (!req.session.userId) return res.status(401).json({ error: 'NO NO NO! Not authenticated' })
    next()
}
app.get('/login', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'))
})
app.post('/login', async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    let user = await Users.findOne({ email, password, provider: { $in: [null, 'local'] } })
    if (user) {
        if (user.chips == null) {
            await Users.updateOne({ _id: user._id }, { $set: { chips: 500 } })
            user = await Users.findOne({ _id: user._id })
        }
        req.session.userId = user._id.toString()
        req.login(user, (err) => {
            if (err) console.error('Passport login error for local', err)
            return res.json({ ok: true, created: false, user: getUserSafe({ ...user, id: user._id.toString() }) })
        })
        return
    }
    const emailExisting = await Users.findOne({ email })
    if (emailExisting) {
        return res.status(401).json({ error: 'Invalid password!' })
    }
    const guessName = () => {
        const base = String(email).split('@')[0] || 'User'
        return base.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }
    const newUser = { email, password, name: guessName(), provider: 'local', chips: 500, createdAt: new Date() }
    const { insertedId } = await Users.insertOne(newUser)
    const createdUser = await Users.findOne({ _id: insertedId })
    req.session.userId = createdUser._id.toString()
    req.login(createdUser, (err) => {
        if (err) console.error('Passport login error!!!', err)
        return res.json({
            ok: true,
            created: true,
            message: 'Account created and you are now logged in! Yay!',
            user: getUserSafe({ ...createdUser, id: createdUser._id.toString() }),
        })
    })
})
app.get('/auth/github',
    (req, res, next) => {
        if (!passport._strategy('github')) return res.status(500).send('GitHub OAuth is not configured!!!!')
        next()
    },
    passport.authenticate('github', { scope: ['user:email'] })
)
app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
        if (req.user?._id) req.session.userId = req.user._id.toString()
        res.redirect(origin)
    }
)
app.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err)
        req.session.destroy(() => res.json({ ok: true }))
    })
})
app.get('/api/me', async (req, res) => {
    const id = req.user?._id?.toString() || req.session.userId
    if (!id) return res.status(401).json({ error: 'Not authenticated' })
    const user = await Users.findOne({ _id: new ObjectId(id) })
    if (!user) return res.status(401).json({ error: 'Not authenticated' })
    res.json(getUserSafe({ ...user, id }))
})
app.get('/api/leaderboard', async (_req, res) => {
    const top = await Users.find({}, { projection: { name: 1, chips: 1 } })
        .sort({ chips: -1 }).limit(10).toArray()
    res.json(top.map(u => ({ id: u._id.toString(), name: u.name || 'Player', chips: u.chips ?? 0 })))
})

app.get('/', (req, res, next) => next())
socketServer.on('connection', async (client) => {
    console.log('connect!')
    sockets.set(client, { userId: null, name: null, roomId: null })
    // when the server receives a message from this client...
    client.on('message', async (raw) => {
        let msg
        try { msg = JSON.parse(raw.toString()) } catch { return }
        const meta = sockets.get(client)
        if (!meta) return
        // this is here to check to see who the player is and if they actually have created an account
        if (msg.type === 'identify') {
            meta.userId = msg.userId
            meta.name = msg.name
            const u = await Users.findOne({ _id: new ObjectId(meta.userId) }, { projection: { name: 1, chips: 1 } })
            if (!u) return safeSend(client, { type: 'error', error: 'Unknown user' })
            meta.name = u.name || meta.name || 'Player'
            return safeSend(client, { type: 'ok', ok: true })
        }
        // this is where the player joins a room of their choosing
        if (msg.type === 'join_room') {
            if (!meta.userId) return safeSend(client, { type: 'error', error: 'Identify first' })
            if (meta.roomId) {
                const prev = rooms.get(meta.roomId)
                prev?.leave(meta.userId)
            }
            const room = rooms.get(msg.roomId) || rooms.get('room-1')
            meta.roomId = room.id
            const u = await Users.findOne({ _id: new ObjectId(meta.userId) }, { projection: { chips: 1, name: 1 } })
            room.join({
                userId: meta.userId,
                name: u?.name || meta.name || 'Player',
                chips: u?.chips ?? 500
            })
            safeSend(client, { type: 'state', state: room.view(meta.userId) })
            return
        }
        // this is where we get the number of the bet the player makes
        if (msg.type === 'place_bet') {
            const room = rooms.get(meta.roomId); if (!room) return
            const amt = Math.max(10, Math.floor(Number(msg.amount || 0) / 10) * 10)
            room.setBet(meta.userId, amt)
            return
        }
        // this is where we actully get the player making moves agains the dealer either hitting, standing, or doubleing down!!! super inetense!!!
        if (msg.type === 'action') {
            const room = rooms.get(meta.roomId); if (!room) return
            room.action(meta.userId, msg.move)
            if (room.phase === 'settle') {
                for (const [id, p] of room.players) {
                    await Users.updateOne({ _id: new ObjectId(id) }, { $set: { chips: p.chips } })
                }
                const top = await Users.find({}, { projection: { name: 1, chips: 1 } })
                    .sort({ chips: -1 }).limit(10).toArray()
                room.share({
                    type: 'leaderboard',
                    top: top.map(t => ({ id: t._id.toString(), name: t.name || 'Player', chips: t.chips ?? 0 }))
                })
                room.phase = 'lobby'
                room.share()
            }
            return
        }
    })

    const cleanup = () => {
        const meta = sockets.get(client)
        if (meta?.roomId && meta?.userId) rooms.get(meta.roomId)?.leave(meta.userId)
        sockets.delete(client)
    }
    client.on('close', cleanup)
    client.on('error', cleanup)
})

server.listen(3000)

ViteExpress.bind(app, server)