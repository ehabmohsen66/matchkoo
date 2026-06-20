import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper to get week start and end from a date
function getMatchWeekBounds(dateStr: string | Date) {
  const matchDateObj = new Date(dateStr);
  const dayOfWeek = matchDateObj.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const matchWeekStart = new Date(Date.UTC(
    matchDateObj.getUTCFullYear(),
    matchDateObj.getUTCMonth(),
    matchDateObj.getUTCDate() + diffToMonday,
    0, 0, 0, 0
  ));
  const matchWeekEnd = new Date(matchWeekStart);
  matchWeekEnd.setUTCDate(matchWeekEnd.getUTCDate() + 7);
  
  return { start: matchWeekStart, end: matchWeekEnd };
}

async function cleanupChips(chipType: 'JOKER' | 'SHIELD') {
  console.log(`Starting cleanup for ${chipType} chips...`);
  const fieldName = chipType === 'JOKER' ? 'isDouble' : 'isShield';

  // Find all predictions with this chip applied
  const predictions = await prisma.prediction.findMany({
    where: { [fieldName]: true },
    include: { match: true }
  });

  // Group by User + MatchWeek
  // Key format: "userId_weekStartTime"
  const userWeekGroups = new Map<string, any[]>();

  for (const pred of predictions) {
    const { start } = getMatchWeekBounds(pred.match.matchDate);
    const key = `${pred.userId}_${start.getTime()}`;
    if (!userWeekGroups.has(key)) {
      userWeekGroups.set(key, []);
    }
    userWeekGroups.get(key)!.push(pred);
  }

  let removedCount = 0;

  for (const [key, group] of userWeekGroups.entries()) {
    if (group.length > 1) {
      const [userId, timeStr] = key.split('_');
      // Sort by updatedAt descending (keep the most recently updated)
      group.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      const keep = group[0];
      const remove = group.slice(1);
      
      console.log(`User ${userId} has ${group.length} ${chipType}s in week starting ${new Date(parseInt(timeStr)).toISOString().split('T')[0]}.`);
      console.log(`  Keeping: Match ${keep.matchId} (updated ${keep.updatedAt})`);
      
      for (const r of remove) {
        console.log(`  Removing: Match ${r.matchId} (updated ${r.updatedAt})`);
        await prisma.prediction.update({
          where: { id: r.id },
          data: { [fieldName]: false }
        });
        removedCount++;
      }
    }
  }

  console.log(`Finished cleanup for ${chipType}. Removed ${removedCount} extra chips.\n`);
}

async function main() {
  await cleanupChips('JOKER');
  await cleanupChips('SHIELD');
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
