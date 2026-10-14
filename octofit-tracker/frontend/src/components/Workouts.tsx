import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Suggestion = { title: string; focus: string; minutes: number; difficulty: string; reason: string };

export default function Workouts() {
  const userEmail = 'mona@example.com';
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then(({ suggestions: result }) => { if (active) setSuggestions(result); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Request failed'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userEmail]);

  return <section><h2 className="h4">Workout suggestions</h2><p>Recommend workouts from activity patterns.</p>
    {loading ? <p role="status">Loading workout suggestions...</p> : error ? <p role="alert">Unable to load workout suggestions: {error}</p> : !suggestions?.length ? <p>No workout suggestions available.</p> :
      <ul className="list-group">{suggestions.map((suggestion) => <li className="list-group-item" key={suggestion.title}>
        <strong>{suggestion.title}</strong> · {suggestion.focus} · {suggestion.minutes} minutes · {suggestion.difficulty}
        <p className="mb-0">{suggestion.reason}</p>
      </li>)}</ul>}
  </section>;
}
