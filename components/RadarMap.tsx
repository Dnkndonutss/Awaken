type RadarMapDatum = {
  id: string;
  label: string;
  value: number;
  displayValue?: string;
};

type RadarMapProps = {
  ariaLabel: string;
  data: RadarMapDatum[];
  maximumValue?: number;
};

const chartSize = 280;
const center = chartSize / 2;
const radius = 96;
const ringScales = [0.25, 0.5, 0.75, 1];

export function RadarMap({ ariaLabel, data, maximumValue }: Readonly<RadarMapProps>) {
  const maxValue = Math.max(
    1,
    maximumValue ?? Math.max(...data.map((item) => Math.max(0, item.value)))
  );
  const getScale = (value: number) => {
    const progress = Math.min(1, Math.max(0, value) / maxValue);

    return maximumValue ? Math.sqrt(progress) : progress;
  };
  const areaPoints = data
    .map((item, index) => {
      const point = getPoint(index, data.length, getScale(item.value));
      return `${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <div className="radar-map mx-auto aspect-square w-full max-w-[22rem]">
      <svg aria-label={ariaLabel} className="h-full w-full overflow-visible" role="img" viewBox={`0 0 ${chartSize} ${chartSize}`}>
        <title>{ariaLabel}</title>
        <desc>
          {maximumValue
            ? `A five-axis radar map using a square-root scale so early progress remains visible. The center is 0 and the outer edge is ${maximumValue}.`
            : "A five-axis radar map. Values are scaled relative to the largest displayed value."}
        </desc>
        {ringScales.map((scale) => (
          <polygon
            className="fill-cyan-300/[0.02] stroke-white/10"
            key={scale}
            points={data.map((_, index) => {
              const point = getPoint(index, data.length, scale);
              return `${point.x},${point.y}`;
            }).join(" ")}
            strokeWidth="1"
          />
        ))}
        {data.map((item, index) => {
          const outer = getPoint(index, data.length, 1);
          const label = getPoint(index, data.length, 1.27);

          return (
            <g key={item.id}>
              <line
                className="stroke-cyan-100/15"
                strokeWidth="1"
                x1={center}
                x2={outer.x}
                y1={center}
                y2={outer.y}
              />
              <text
                className="fill-slate-300 text-[10px] font-semibold uppercase tracking-wide"
                dominantBaseline="middle"
                textAnchor="middle"
                x={label.x}
                y={label.y}
              >
                {item.label.slice(0, 3)}
              </text>
            </g>
          );
        })}
        <polygon
          className="radar-map-area fill-cyan-300/20 stroke-cyan-200"
          points={areaPoints}
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        {data.map((item, index) => {
          const point = getPoint(index, data.length, getScale(item.value));

          return (
            <circle
              className="radar-map-point fill-amber-200 stroke-[#111827]"
              cx={point.x}
              cy={point.y}
              key={item.id}
              r="4.5"
              strokeWidth="2"
            >
              <title>{item.label}: {item.displayValue ?? item.value.toLocaleString()}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

function getPoint(index: number, count: number, scale: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(1, count);

  return {
    x: Number((center + Math.cos(angle) * radius * scale).toFixed(2)),
    y: Number((center + Math.sin(angle) * radius * scale).toFixed(2))
  };
}
