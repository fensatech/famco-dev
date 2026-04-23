const { Pool } = require("pg")
const fs = require("fs")
const path = require("path")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const file = process.argv[2]
  if (!file) { console.error("Usage: node scripts/run-migration.js <file.sql>"); process.exit(1) }
  const sql = fs.readFileSync(path.resolve(file), "utf8")
  console.log(`Running ${file}...`)
  await pool.query(sql)
  console.log("Done.")
  await pool.end()
}

run().catch((e) => { console.error(e.message); process.exit(1) })
