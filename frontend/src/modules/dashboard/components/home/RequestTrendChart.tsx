import { trackedTypeLabels, trackedTypes } from '../../../../core/requests/requestSchema';
import type { RequestStats } from '../../schemas/statsSchema';
import { bucketLabel, seriesColors } from './homeFormat';

const HEIGHT = 160;

/**
 * Histogramme empilé des demandes reçues par période (SVG, sans dépendance). Les mêmes données
 * sont fournies sous forme de tableau pour les lecteurs d'écran.
 */
export function RequestTrendChart({ stats }: { stats: RequestStats }) {
  const max = Math.max(1, ...stats.series.map((point) => point.total));
  const count = stats.series.length;
  const slot = 100 / count;
  const barWidth = slot * 0.7;
  // Étiquettes clairsemées pour rester lisibles sur mobile.
  const labelEvery = count > 8 ? Math.ceil(count / 5) : count > 6 ? 2 : 1;

  return (
    <figure className="space-y-3">
      <div className="relative">
        <svg
          viewBox={`0 0 100 ${String(HEIGHT)}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Demandes reçues : ${String(stats.received.total)} sur la période, maximum ${String(max)} par intervalle.`}
          className="h-40 w-full"
        >
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2="100"
              y1={HEIGHT - ratio * (HEIGHT - 4)}
              y2={HEIGHT - ratio * (HEIGHT - 4)}
              stroke="#202923"
              strokeOpacity="0.08"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {stats.series.map((point, index) => {
            let offset = 0;
            return trackedTypes.map((type) => {
              const value = point[type];
              if (value === 0) return null;
              const height = (value / max) * (HEIGHT - 4);
              offset += height;
              return (
                <rect
                  key={`${point.bucket}-${type}`}
                  x={index * slot + (slot - barWidth) / 2}
                  y={HEIGHT - offset}
                  width={barWidth}
                  height={height}
                  fill={seriesColors[type]}
                >
                  <title>
                    {`${bucketLabel(point.bucket, stats.granularity)} : ${String(value)} ${trackedTypeLabels[type].toLowerCase()}`}
                  </title>
                </rect>
              );
            });
          })}
        </svg>
        <span className="absolute top-0 left-0 text-[10px] text-charcoal/50">{max}</span>
      </div>
      <div aria-hidden="true" className="relative h-4 text-[10px] text-charcoal/60">
        {stats.series.map((point, index) =>
          index % labelEvery === 0 ? (
            <span
              key={point.bucket}
              className="absolute whitespace-nowrap"
              style={{
                left: `${String((index + 0.5) * slot)}%`,
                transform: index === 0 ? 'translateX(-25%)' : 'translateX(-50%)',
              }}
            >
              {bucketLabel(point.bucket, stats.granularity)}
            </span>
          ) : null,
        )}
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal/75">
        {trackedTypes.map((type) => (
          <span key={type} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: seriesColors[type] }}
            />
            {trackedTypeLabels[type]} ({stats.received[type]})
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>Demandes reçues par intervalle</caption>
        <thead>
          <tr>
            <th scope="col">Période</th>
            {trackedTypes.map((type) => (
              <th key={type} scope="col">
                {trackedTypeLabels[type]}
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {stats.series.map((point) => (
            <tr key={point.bucket}>
              <th scope="row">{bucketLabel(point.bucket, stats.granularity)}</th>
              {trackedTypes.map((type) => (
                <td key={type}>{point[type]}</td>
              ))}
              <td>{point.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
