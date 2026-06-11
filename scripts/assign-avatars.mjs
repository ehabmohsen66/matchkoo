/**
 * assign-avatars.mjs
 * One-shot script: finds users with no avatar (image = null or empty)
 * and assigns a random DiceBear avatar from the app's avatar grid based on gender.
 *
 * Run: node scripts/assign-avatars.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MALE_SEEDS = [
  "Felix&backgroundColor=b6e3f4",
  "Kai&backgroundColor=c0aede",
  "Marco&backgroundColor=ffd5dc",
];

const FEMALE_SEEDS = [
  "Nadia&backgroundColor=b6e3f4",
  "Luna&backgroundColor=c0aede",
  "Jade&backgroundColor=ffd5dc",
  "Sofia&backgroundColor=d1d4f9",
];

function randomAvatar(gender) {
  const pool = gender === "female" ? FEMALE_SEEDS : MALE_SEEDS;
  const seed = pool[Math.floor(Math.random() * pool.length)];
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

async function main() {
  // Find all users with null or empty image
  const users = await prisma.user.findMany({
    where: {
      OR: [{ image: null }, { image: "" }],
    },
    select: { id: true, name: true, email: true, gender: true, image: true },
    orderBy: { createdAt: "desc" },
  });

  if (users.length === 0) {
    console.log("✅ All users already have avatars. Nothing to do.");
    return;
  }

  console.log(`\n🔍 Found ${users.length} user(s) without an avatar:\n`);
  users.forEach((u) => {
    console.log(`  • ${u.name ?? "(no name)"} <${u.email}> — gender: ${u.gender ?? "male (default)"}`);
  });

  console.log("\n🎨 Assigning avatars...\n");

  let updated = 0;
  for (const user of users) {
    const avatar = randomAvatar(user.gender ?? "male");
    await prisma.user.update({
      where: { id: user.id },
      data: { image: avatar },
    });
    console.log(`  ✓ ${user.name ?? user.email} → ${avatar.split("seed=")[1]}`);
    updated++;
  }

  console.log(`\n✅ Done! Updated ${updated} user(s) with avatars.`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
