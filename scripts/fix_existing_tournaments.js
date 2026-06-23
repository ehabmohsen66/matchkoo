const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log("Starting data migration for existing tournaments...");

    // 1. Clean up official tournaments
    const tournaments = await prisma.tournament.findMany({
      where: {
        registrationMode: { not: "INVITE_ONLY" }
      }
    });

    for (const t of tournaments) {
      let correctComp = null;
      if (t.name.includes('[233]') || t.name.toLowerCase().includes('egyptian premier league')) {
        correctComp = 'egyptian_premier_league';
      } else if (t.name.includes('[39]') || t.name.toLowerCase().includes('english premier league') || t.name.toLowerCase().includes('premier league')) {
        correctComp = 'premier_league';
      } else if (t.name.includes('[140]') || t.name.toLowerCase().includes('la liga')) {
        correctComp = 'la_liga';
      } else if (t.name.includes('[2]') || t.name.toLowerCase().includes('champions league') || t.name.toLowerCase().includes('ucl')) {
        correctComp = 'champions_league';
      } else if (t.name.includes('[1]') || t.name.toLowerCase().includes('world cup')) {
        correctComp = 'world_cup';
      }

      if (correctComp && t.competition !== correctComp) {
        console.log(`Updating official tournament "${t.name}" competition from "${t.competition}" to "${correctComp}"`);
        await prisma.tournament.update({
          where: { id: t.id },
          data: { competition: correctComp }
        });
      }
    }

    // 2. Fix user's new mini league: "DG - Premier League 27" -> set to premier_league
    const dgLeague = await prisma.tournament.findFirst({
      where: {
        name: "DG - Premier League 27",
        registrationMode: "INVITE_ONLY"
      }
    });

    if (dgLeague) {
      if (dgLeague.competition !== 'premier_league') {
        console.log(`Fixing mini-league "DG - Premier League 27" competition from "${dgLeague.competition}" to "premier_league"`);
        await prisma.tournament.update({
          where: { id: dgLeague.id },
          data: { competition: 'premier_league' }
        });
      } else {
        console.log(`Mini-league "DG - Premier League 27" is already configured as "premier_league"`);
      }
    } else {
      console.log(`Mini-league "DG - Premier League 27" not found.`);
    }

    console.log("Migration complete!");

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
