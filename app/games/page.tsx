import type { Metadata } from "next";
import Link from "next/link";
import { getAllAvatars } from "@/lib/games/avatars";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import CoinBadge from "@/components/games/CoinBadge";
import AvatarCollection from "@/components/games/AvatarCollection";

const TITLE = `Games & Collectibles | ${SITE_NAME}`;
const DESCRIPTION = "Play cute anime girl mini-games, earn coins, and spin the wheel to collect avatars you can download.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${getBaseUrl()}/games` },
  // Keep this section out of search results for now, same reasoning as the
  // sitemap: new, unproven pages don't need to compete for crawl budget yet.
  robots: { index: false, follow: true },
};

const GAMES = [
  {
    href: "/games/memory",
    title: "Memory Match",
    blurb: "Flip cards, find the matching pairs of avatars. Fewer moves = more coins.",
    emoji: "🧠",
  },
  {
    href: "/games/match3",
    title: "Gem Match-3",
    blurb: "Swap gems to line up 3+ in a row before your moves run out.",
    emoji: "💎",
  },
  {
    href: "/games/tetris",
    title: "Chibi Blocks",
    blurb: "A Tetris twist -- clear 4 lines in a row and a surprise avatar pops in for a coin bonus.",
    emoji: "🧱",
  },
  {
    href: "/games/g2048",
    title: "2048",
    blurb: "Slide and merge tiles to reach 2048. Higher score = more coins.",
    emoji: "🔢",
  },
  {
    href: "/games/snake",
    title: "Snake",
    blurb: "Eat strawberries, grow longer, don't crash. It speeds up as you go.",
    emoji: "🐍",
  },
  {
    href: "/games/whack",
    title: "Whack-an-Avatar",
    blurb: "Tap avatars as they pop up for 30 seconds -- but dodge the bombs!",
    emoji: "🔨",
  },
  {
    href: "/games/minesweeper",
    title: "Minesweeper",
    blurb: "Classic 9x9 mine clearing. Win for a 50 coin prize.",
    emoji: "🚩",
  },
  {
    href: "/games/tictactoe",
    title: "Tic-Tac-Toe",
    blurb: "Beat the computer for 25 coins. A draw still pays 8.",
    emoji: "⭕",
  },
  {
    href: "/games/simon",
    title: "Pattern Pop",
    blurb: "Watch the pads light up and repeat the pattern. It grows every round.",
    emoji: "🎵",
  },
  {
    href: "/games/reaction",
    title: "Reaction Rush",
    blurb: "Tap the instant the box turns green. Five rounds, faster = more coins.",
    emoji: "⚡",
  },
];

export default async function GamesHubPage() {
  const avatars = await getAllAvatars();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Games &amp; Collectibles</h1>
          <p className="mt-2 max-w-2xl text-muted">{DESCRIPTION}</p>
        </div>
        <CoinBadge className="text-base" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="rounded-2xl border-2 border-ink bg-surface p-5 shadow-block transition-transform hover:-translate-y-0.5"
          >
            <div className="text-3xl">{g.emoji}</div>
            <h2 className="mt-2 font-display text-xl font-bold">{g.title}</h2>
            <p className="mt-1 text-sm text-muted">{g.blurb}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border-2 border-ink bg-gradient-to-br from-heroFrom to-heroTo p-6 shadow-block">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Spin for a collectible avatar</h2>
            <p className="mt-1 text-muted">Use the coins you earn from the games above to win avatars you can download.</p>
          </div>
          <Link
            href="/games/spin"
            className="shrink-0 rounded-full bg-beam px-6 py-3 text-sm font-bold text-white hover:bg-beamDeep"
          >
            Go to the spinner →
          </Link>
        </div>
      </div>

      <AvatarCollection avatars={avatars} />
    </div>
  );
}
