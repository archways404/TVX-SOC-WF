import { FikaGuessCard } from '@/components/FikaGuessCard';
import { Leaderboard } from '@/components/Leaderboard';

export function HomePage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <FikaGuessCard />
      <Leaderboard />
    </div>
  );
}
