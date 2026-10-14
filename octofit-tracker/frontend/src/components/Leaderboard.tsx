import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<Entry[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: Entry[] }>('/api/leaderboard')
      .then(({ leaderboard: result }) => { if (active) setLeaderboard(result); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Request failed'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section><h2 className="h4">Leaderboard</h2><p>Compare team point totals.</p>
    {loading ? <p role="status">Loading leaderboard...</p> : error ? <p role="alert">Unable to load leaderboard: {error}</p> : !leaderboard?.length ? <p>No leaderboard rankings yet.</p> :
      <ol className="list-group list-group-numbered">{leaderboard.map((entry) => <li className="list-group-item d-flex justify-content-between" key={entry.rank}>
        <span>{entry.teamName}</span><strong>{entry.totalPoints} points</strong>
      </li>)}</ol>}
  </section>;
}
