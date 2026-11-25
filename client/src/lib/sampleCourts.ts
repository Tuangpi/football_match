import type { CourtSummary } from '@/components/CourtCard';

/**
 * Frontend-only examples for an empty, healthy public court directory.
 * They are never sent to or persisted in the database.
 */
export const sampleCourts: CourtSummary[] = [
  {
    id: 'sample-yangon-futsal-arena',
    name: 'Yangon Futsal Arena',
    city: 'Yangon',
    sportType: 'FUTSAL',
    basePricePerHour: 15000,
    isSample: true,
  },
  {
    id: 'sample-inya-lake-pitch',
    name: 'Inya Lake Pitch',
    city: 'Yangon',
    sportType: 'ELEVEN_A_SIDE',
    basePricePerHour: 30000,
    isSample: true,
  },
  {
    id: 'sample-mandalay-sports-hub',
    name: 'Mandalay Sports Hub',
    city: 'Mandalay',
    sportType: 'FUTSAL',
    basePricePerHour: 12000,
    isSample: true,
  },
];

/** Real courts always win; examples are limited to an unfiltered, successful empty result. */
export function courtsForDisplay(
  courts: CourtSummary[],
  options: { filtersActive?: boolean; loadFailed?: boolean } = {},
): CourtSummary[] {
  if (courts.length > 0 || options.filtersActive || options.loadFailed) return courts;
  return sampleCourts;
}