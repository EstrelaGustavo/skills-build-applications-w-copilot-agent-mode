import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { _id?: string; name: string; mascot?: string; members: string[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams: result }) => { if (active) setTeams(result); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Request failed'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section><h2 className="h4">Teams</h2><p>Manage teams and members.</p>
    {loading ? <p role="status">Loading teams...</p> : error ? <p role="alert">Unable to load teams: {error}</p> : !teams?.length ? <p>No teams yet.</p> :
      <ul className="list-group">{teams.map((team, index) => <li className="list-group-item" key={team._id ?? `${team.name}-${index}`}>
        <strong>{team.name}</strong>{team.mascot ? ` · ${team.mascot}` : ''} · {team.members.length} members
      </li>)}</ul>}
  </section>;
}
