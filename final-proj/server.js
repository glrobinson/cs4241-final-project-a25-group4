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
import { WebSocketServer } from 'ws'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { MongoClient, ObjectId } from 'mongodb'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const origin = process.env.APP_ORIGIN || 'http://localhost:3000'
const app = express()
const server = http.createServer( app ),
      socketServer = new WebSocketServer({ server }),
      clients = []
const client = new MongoClient(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
await client.connect()
const db = client.db(process.env.MONGODB_DBNAME || 'app')
const Users = db.collection('users')
await Users.createIndex({ email: 1 }, { unique: true, sparse: true }).catch(() => {})
await Users.createIndex({ githubId: 1 }, { unique: true, sparse: true }).catch(() => {})
console.log('Yay!!! Connected to MongoDB Atlas')
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
  const user = await Users.findOne({ email, password, provider: { $in: [null, 'local'] } })
  if (user) {
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
  const newUser = { email, password, name: guessName(), provider: 'local', createdAt: new Date() }
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
app.get('/', requireAuth, (req, res, next) => next())
socketServer.on( 'connection', client => {
  console.log( 'connect!' )
  // when the server receives a message from this client...
  client.on( 'message', msg => {
	  // send msg to every client EXCEPT the one who originally sent it
    clients.forEach( c => { if( c !== client ) c.send( msg ) })
  })

  // add client to client list
  clients.push( client )
})

server.listen( 3000 )

ViteExpress.bind( app, server )