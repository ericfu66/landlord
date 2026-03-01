import { getDb, saveDb } from '../src/lib/db'
import { hashPassword } from '../src/lib/security/password'

async function seed() {
  const db = await getDb()
  
  const adminExists = db.exec(
    "SELECT id FROM users WHERE username = 'ericfu'"
  )
  
  if (adminExists[0]?.values?.length === 0) {
    const passwordHash = await hashPassword('jesica16')
    
    db.run(
      `INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`,
      ['ericfu', passwordHash, 'admin']
    )
    
    saveDb()
    console.log('Admin user seeded: ericfu')
  } else {
    console.log('Admin user already exists')
  }
}

seed().catch(console.error)