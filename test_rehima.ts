import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      name: { contains: 'Ahmed Rehima', mode: 'insensitive' }
    }
  });

  if (users.length === 0) {
    console.log("User Ahmed Rehima not found");
    return;
  }
  
  const user = users[0];
  console.log(`Found user: ${user.name} (${user.id})`);

  const prediction = await prisma.prediction.findFirst({
    where: {
      userId: user.id,
      match: {
        AND: [
          { homeTeam: { contains: 'Belgium', mode: 'insensitive' } },
          { awayTeam: { contains: 'Egypt', mode: 'insensitive' } }
        ]
      }
    },
    include: {
      match: true
    }
  });

  if (!prediction) {
    console.log("No prediction found for Belgium vs Egypt for this user.");
    return;
  }

  console.log(`Match: ${prediction.match.homeTeam} vs ${prediction.match.awayTeam}`);
  console.log(`Prediction: ${prediction.homeScore} - ${prediction.awayScore}`);
  console.log(`First Goal Scorer: ${prediction.firstGoalScorer}`);
  console.log(`Joker Used: ${prediction.isDouble}`);
  console.log(`Shield Used: ${prediction.isShield}`);
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
