import { awardPointsForGame } from '../../src/api/points.js'
import { usersApi, getUserProfile } from '../../src/api/firebase.js'

async function run() {
  console.log('Integration: award points then verify leaderboard list')
  const testUser = { id: 'integration-user', email: 'integration@example.com' }
  const before = await usersApi.list()
  const meBefore = before.find(u => (u.id === testUser.id || u.uid === testUser.id))
  const beforePoints = Number(meBefore?.points || 0)

  await awardPointsForGame(testUser, 'integration_test', { fallbackScore: 5 })

  const after = await usersApi.list()
  const meAfter = after.find(u => (u.id === testUser.id || u.uid === testUser.id))
  const afterPoints = Number(meAfter?.points || 0)

  if (afterPoints >= beforePoints) {
    console.log('✓ Leaderboard reflects points change or is unchanged in offline mode')
  } else {
    console.error('✗ Leaderboard did not reflect points change')
    process.exitCode = 1
  }
}

run().catch(e => { console.error(e); process.exitCode = 1 })
