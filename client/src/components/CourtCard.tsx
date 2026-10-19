import { t } from '../lib/language';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Star, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { courtImage } from '@/lib/images';
import { formatPrice } from '@/lib/currency';

export type CourtSummary = {
  id: string;
  name: string;
  city: string;
  sportType: string;
  basePricePerHour: number;
  reviews?: Array<{ rating: number }>;
};

/** Mean of the court's review ratings, or null when it has none. */
export function averageRating(court: CourtSummary): number | null {
  if (!court.reviews?.length) return null;
  return court.reviews.reduce((sum, r) => sum + r.rating, 0) / court.reviews.length;
}

/** Public court card used on the home page and the courts list. */
export function CourtCard({ court }: { court: CourtSummary }) {
  useLanguage();
  const rating = averageRating(court);

  return (
    <Link to={`/courts/${court.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
        <div className="relative h-40 overflow-hidden bg-muted">
          <img
            src={courtImage(court.id)}
            alt={court.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <Badge className="absolute left-3 top-3 border-transparent bg-black/60 text-white backdrop-blur">
            {court.sportType === 'ELEVEN_A_SIDE' ? t("11-a-side") : t("Futsal")}
          </Badge>
          <div className="absolute bottom-3 left-3 text-white">
            <span className="text-lg font-bold drop-shadow">{court.name}</span>
          </div>
        </div>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{court.city}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">
              {formatPrice(court.basePricePerHour)}
              <span className="font-normal text-muted-foreground">{t("/hr")}</span>
            </span>
            {rating ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium">
                <Star className="h-4 w-4 fill-primary text-primary" />
                {rating.toFixed(1)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">{t("No reviews")}</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{court.sportType === 'ELEVEN_A_SIDE' ? '11' : '5'} {t("players per side")}</span>
            <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
