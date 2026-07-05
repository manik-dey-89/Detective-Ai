import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'detective_ai.db');
console.log('DB path:', dbPath);

const db = new Database(dbPath);

console.log('\n--- PLAYERS ---');
const players = db.prepare('SELECT * FROM players').all();
console.log(JSON.stringify(players, null, 2));

console.log('\n--- CASES ---');
const cases = db.prepare('SELECT * FROM cases').all();
console.log(JSON.stringify(cases, null, 2));

console.log('\n--- GAMES ---');
const games = db.prepare('SELECT * FROM games').all();
console.log(JSON.stringify(games, null, 2));
