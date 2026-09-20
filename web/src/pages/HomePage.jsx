import { FikaGuessCard } from '@/components/FikaGuessCard';
import { Leaderboard } from '@/components/Leaderboard';

export function HomePage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <FikaGuessCard />
      <Leaderboard />
    </div>
  );
}
