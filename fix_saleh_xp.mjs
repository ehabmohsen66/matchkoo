import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Read env manually
const env = readFileSync('.env.local', 'utf8');
const match = env.match(/POSTGRES_URL_NON_POOLING=(.+)/);
const dbUrl = match[1].trim();

const sql = neon(dbUrl);

// Step 1: Find Mohamed Saleh
const users = await sql`
  SELECT id, name, "displayName", xp 
  FROM "User" 
  WHERE name ILIKE '%saleh%' OR "displayName" ILIKE '%saleh%'
`;
console.log('Users found:', JSON.stringify(users, null, 2));

// Step 2: Find the Argentina vs Algeria match
const matches = await sql`
  SELECT id, "homeTeam", "awayTeam", "matchDate", "firstGoalscorer", result 
  FROM "Match" 
  WHERE ("homeTeam" ILIKE '%argentina%' AND "awayTeam" ILIKE '%algeria%')
     OR ("homeTeam" ILIKE '%algeria%' AND "awayTeam" ILIKE '%argentina%')
`;
console.log('Match:', JSON.stringify(matches, null, 2));
