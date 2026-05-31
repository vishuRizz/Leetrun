const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding series character-based achievement badges...");

  const badges = [
    // FROM Badges
    { id: "FROM_streak_3", title: "Dale (FROM)", description: "Noob status. The guy everyone wishes stayed in Colony House.", icon: "😒", type: "STREAK" },
    { id: "FROM_streak_7", title: "Ethan (FROM)", description: "Finding clues about the mysterious Anghkooey people.", icon: "👦", type: "STREAK" },
    { id: "FROM_solved_10", title: "Kristi (FROM)", description: "Rising helper. Keeping the town patched up.", icon: "👩‍⚕️", type: "LEVEL" },
    { id: "FROM_solved_100", title: "Boyd Stevens (FROM)", description: "Peak Protagonist. 'I gotta go!' - Master of talismans.", icon: "🤠", type: "LEVEL" },
    { id: "FROM_friends_5", title: "Kenny (FROM)", description: "Social sidekick. Reliable deputy sheriff.", icon: "👮‍♂️", type: "SOCIAL" },
    { id: "FROM_lobbyist", title: "Victor (FROM)", description: "Lobby Guide. Navigating the farway trees.", icon: "🍑", type: "SOCIAL" },

    // Stranger Things Badges
    { id: "STRANGER_THINGS_streak_3", title: "Angela (Stranger Things)", description: "Hated bully. Got hit in the face with a roller skate.", icon: "⛸️", type: "STREAK" },
    { id: "STRANGER_THINGS_streak_7", title: "Ted Wheeler (Stranger Things)", description: "Noob father. Just wants to read the newspaper in peace.", icon: "📰", type: "STREAK" },
    { id: "STRANGER_THINGS_solved_10", title: "Steve Harrington (Stranger Things)", description: "Babysitter. Wielder of the spiked bat.", icon: "🏏", type: "LEVEL" },
    { id: "STRANGER_THINGS_solved_100", title: "Eleven (Stranger Things)", description: "Main Protagonist. Mind-bending telekinetic solver.", icon: "🩸", type: "LEVEL" },
    { id: "STRANGER_THINGS_friends_5", title: "Dustin Henderson (Stranger Things)", description: "Social mastermind. Radio tower constructor.", icon: "🧢", type: "SOCIAL" },
    { id: "STRANGER_THINGS_lobbyist", title: "Jim Hopper (Stranger Things)", description: "Lobby Host. Morning is for coffee and contemplation.", icon: "☕", type: "SOCIAL" },

    // DARK Badges
    { id: "DARK_streak_3", title: "Erik Obendorf (DARK)", description: "First to vanish in the Winden cave.", icon: "🕳️", type: "STREAK" },
    { id: "DARK_streak_7", title: "Helge Doppler (DARK)", description: "Confused time-traveling Winden noob.", icon: "👂", type: "STREAK" },
    { id: "DARK_solved_10", title: "Mikkel Nielsen (DARK)", description: "Young magician. Ultimate trigger of the Winden loop.", icon: "🎩", type: "LEVEL" },
    { id: "DARK_solved_100", title: "Jonas / Adam (DARK)", description: "Main Protagonist. What we know is a drop, what we don't is an ocean.", icon: "🧥", type: "LEVEL" },
    { id: "DARK_friends_5", title: "Martha Nielsen (DARK)", description: "Eva of the parallel Winden timeline.", icon: "⏳", type: "SOCIAL" },
    { id: "DARK_lobbyist", title: "Claudia Tiedemann (DARK)", description: "The White Devil. Master of Winden's loops.", icon: "👵", type: "SOCIAL" },

    // Naruto Badges
    { id: "NARUTO_streak_3", title: "Mizuki (Naruto)", description: "Hated betrayer. Tricked Naruto with a scroll.", icon: "📜", type: "STREAK" },
    { id: "NARUTO_streak_7", title: "Konohamaru (Naruto)", description: "Noob rival learning Sexy Jutsu.", icon: "🧣", type: "STREAK" },
    { id: "NARUTO_solved_10", title: "Sasuke Uchiha (Naruto)", description: "Rival sidekick. Wielder of the Sharingan.", icon: "👁️", type: "LEVEL" },
    { id: "NARUTO_solved_100", title: "Naruto Uzumaki (Naruto)", description: "Main Protagonist. Sage of Six Paths. Believe it!", icon: "🍜", type: "LEVEL" },
    { id: "NARUTO_friends_5", title: "Iruka Sensei (Naruto)", description: "First social bond. Taught the shadow clone technique.", icon: "🍥", type: "SOCIAL" },
    { id: "NARUTO_lobbyist", title: "Minato Namikaze (Naruto)", description: "Yellow Flash of the Leaf. Creator of Rasengan.", icon: "⚡", type: "SOCIAL" },

    // Luffy Badges
    { id: "LUFFY_streak_3", title: "Alvida (Luffy)", description: "Hated starter boss. Feared iron mace wielder.", icon: "🪵", type: "STREAK" },
    { id: "LUFFY_streak_7", title: "Koby (Luffy)", description: "Timid rookie cabin boy climbing the Navy ranks.", icon: "👓", type: "STREAK" },
    { id: "LUFFY_solved_10", title: "Roronoa Zoro (Luffy)", description: "First mate. Three-sword style master.", icon: "⚔️", type: "LEVEL" },
    { id: "LUFFY_solved_100", title: "Luffy (Luffy)", description: "Peak Protagonist. Sun God Gear 5. Pirate King!", icon: "👒", type: "LEVEL" },
    { id: "LUFFY_friends_5", title: "Straw Hat Crew (Luffy)", description: "Unbreakable nakama bonds.", icon: "🏴‍☠️", type: "SOCIAL" },
    { id: "LUFFY_lobbyist", title: "Shanks (Luffy)", description: "Lobby Emperor. The pirate who inspired Luffy.", icon: "👑", type: "SOCIAL" },
  ];

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { id: b.id },
      update: {
        title: b.title,
        description: b.description,
        icon: b.icon,
        type: b.type,
      },
      create: b,
    });
  }

  console.log(`Successfully seeded ${badges.length} series character-based achievement badges.`);
}

main()
  .catch((e) => {
    console.error("Error seeding badges:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
