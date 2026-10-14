import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

type Payload = Record<string, unknown>;

function isPayload(value: unknown): value is Payload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serviceError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw serviceError(400, `${field} is required`);
  return value.trim();
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isPayload(input)) throw serviceError(400, 'Activity details are required');
  const userId = requiredText(input.userId, 'userId');
  const teamId = requiredText(input.teamId, 'teamId');
  const type = requiredText(input.type, 'type');
  const minutes = Number(input.minutes);
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(teamId)) {
    throw serviceError(400, 'userId and teamId must be valid IDs');
  }
  if (!Number.isFinite(minutes) || minutes <= 0) throw serviceError(400, 'minutes must be a positive number');

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) throw serviceError(404, 'User or team was not found');

  return Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isPayload(input)) throw serviceError(400, 'Team details are required');
  const name = requiredText(input.name, 'name');
  const mascot = requiredText(input.mascot, 'mascot');
  const memberIds = input.members ?? [];
  if (!Array.isArray(memberIds) || memberIds.some((id) => typeof id !== 'string' || !mongoose.isValidObjectId(id))) {
    throw serviceError(400, 'members must contain valid user IDs');
  }

  const users = memberIds.length ? await User.find({ _id: { $in: memberIds } }).select('_id').lean() : [];
  if (users.length !== memberIds.length) throw serviceError(404, 'One or more users were not found');

  const team = await Team.create({ name, mascot, members: memberIds });
  if (memberIds.length) {
    await Team.updateMany({ _id: { $ne: team._id } }, { $pull: { members: { $in: memberIds } } });
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw serviceError(404, 'User was not found');

  const [activities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean(),
    Workout.find().lean(),
  ]);
  const activityFocus: Record<string, string> = {
    run: 'endurance',
    cycle: 'endurance',
    walk: 'endurance',
    strength: 'strength',
    yoga: 'mobility',
  };
  const goalFocus = user.fitnessGoal?.trim().toLowerCase();
  const recentFocus = activities.map(({ type }) => activityFocus[type.toLowerCase()]).find(Boolean);
  const hasGoalWorkout = goalFocus && workouts.some(({ focus: workoutFocus }) => workoutFocus.toLowerCase() === goalFocus);
  const focus = hasGoalWorkout ? goalFocus : recentFocus ?? goalFocus;
  if (!focus) return [];

  const matching = workouts.filter(({ focus: workoutFocus }) => workoutFocus.toLowerCase() === focus);
  return matching.map((workout) => ({
    ...workout,
    reason: `Recommended for your ${focus} goal or recent activity.`,
  }));
}

export { User };
