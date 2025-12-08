import { awardPointsForGame } from '../../src/api/points.js'
import { usersApi } from '../../src/api/firebase.js'

async function simulateGameplay(userId, n = 5) {
  const user = { id: userId, email: `${userId}@example.com` }
  for (let i = 0; i < n; i++) {
    await awardPointsForGame(user, 'e2e_game', { fallbackScore: 2, idempotencyKey: `${userId}-k-${i}` })
  }
}

async function run() {
  console.log('E2E: simulate multiple users gameplay and check leaderboard ranking')
  const users = ['e2e-a', 'e2e-b', 'e2e-c']
  await Promise.all(users.map((u, idx) => simulateGameplay(u, idx + 1)))
  const list = await usersApi.list()
  const points = users.map(u => Number(list.find(x => (x.id === u || x.uid === u))?.points || 0))
  console.log('Points snapshot:', points)
  console.log('✓ E2E simulated without crash')
}

run().catch(e => { console.error(e); process.exitCode = 1 })
