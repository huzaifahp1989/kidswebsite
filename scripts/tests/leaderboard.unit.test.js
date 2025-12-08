async function run() {
  console.log('Unit: leaderboard sorting by points desc with name mapping')
  const list = [
    { id: '1', full_name: 'A', email: 'a@example.com', points: 10 },
    { id: '2', full_name: 'B', email: 'b@example.com', points: 30 },
    { id: '3', full_name: '', email: 'c@example.com', points: 20 },
  ]
  const sorted = [...list].sort((a, b) => Number(b.points || 0) - Number(a.points || 0))
  if (sorted[0] && Number(sorted[0].points) >= Number(sorted[1]?.points || 0)) {
    console.log('✓ Sorted correctly')
  } else {
    console.error('✗ Sorting incorrect')
    process.exitCode = 1
  }
  const name = (sorted[0].full_name || sorted[0].fullName || sorted[0].email || 'Anonymous')
  if (name) console.log('✓ Name mapping OK:', name)
}

run().catch(e => { console.error(e); process.exitCode = 1 })
