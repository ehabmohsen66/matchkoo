const { getFixturesByDate, getFixturesByLeague } = require('./src/lib/football-api.ts');
require('dotenv').config({ path: '.env.local' });
// wait, ts file cannot be directly run with node. I'll write a simple fetch script instead.

