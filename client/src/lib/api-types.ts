import type { OpeningDay, TimeRange } from '@/lib/bookingTime';

export type SportType = 'FUTSAL' | 'ELEVEN_A_SIDE';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type CourtSuggestion = { id: string; name: string; city: string };
export type EventSuggestion = { id: string; title: string; city: string };
export type PlayerSuggestion = {
  id: string;
  email: string;
  playerProfile?: { fullName?: string | null } | null;
};

export type TeamMember = {
  id: string;
  role: string;
  user: { id: string; email: string };
};

export type Team = {
  id: string;
  name: string;
  sportType: SportType;
  captainId: string;
  captain: { id: string; email: string };
  members: TeamMember[];
  _count?: { members: number };
};

export type PlayerProfile = {
  fullName: string | null;
  phone: string | null;
  position: string | null;
  skillLevel: string | null;
  bio: string | null;
  avatarUrl: string | null;
  user: { id: string; email: string };
};

export type OwnerScheduleCourt = {
  id: string;
  name: string;
  openingHours: OpeningDay[];
};

export type OwnerScheduleBooking = TimeRange & {
  id: string;
  status: BookingStatus;
  totalPrice: number;
  court: { id: string; name: string };
  player: { id: string; email: string };
  team: { id: string; name: string } | null;
};

export type OwnerScheduleBlock = TimeRange & {
  id: string;
  courtId: string;
  reason: string;
};

export type OwnerScheduleResponse = {
  success: true;
  bookings: OwnerScheduleBooking[];
  courts: OwnerScheduleCourt[];
  blocks: OwnerScheduleBlock[];
};