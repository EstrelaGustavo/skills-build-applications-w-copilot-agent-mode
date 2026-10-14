import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Activity = { _id?: string; type: string; minutes: number; points: number; occurredAt?: string };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getJson<{ activities: Activity[] }>('/api/activities')
      .then(({ activities: result }) => { if (active) setActivities(result); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Request failed'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section><h2 className="h4">Activities</h2><p>Track student activity minutes and points.</p>
    {loading ? <p role="status">Loading activities...</p> : error ? <p role="alert">Unable to load activities: {error}</p> : !activities?.length ? <p>No activities yet.</p> :
      <ul className="list-group">{activities.map((activity, index) => <li className="list-group-item" key={activity._id ?? `${activity.type}-${index}`}>
        <strong>{activity.type}</strong> · {activity.minutes} minutes · {activity.points} points
      </li>)}</ul>}
  </section>;
}
