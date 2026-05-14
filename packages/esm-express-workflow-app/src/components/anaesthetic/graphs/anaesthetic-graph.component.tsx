import React from 'react';
import { LineChart } from '@carbon/charts-react';
import styles from '../anaesthetic.scss';

export interface AnaestheticGraphData {
  pulse: number;
  systolicBP: number;
  diastolicBP: number;
  spo2?: number;
  etco2?: number;
  time?: string;
  index?: number;
  date?: string;
  timestamp?: Date;
}

interface ChartDataPoint {
  index: number;
  time: string;
  group: string;
  value: number;
}

interface AnaestheticGraphProps {
  data: AnaestheticGraphData[];
}

enum ScaleTypes {
  LABELS = 'labels',
  LINEAR = 'linear',
}

const DEFAULT_VISIBLE_SLOTS = 24;

const ANAESTHETIC_CHART_OPTIONS = {
  axes: {
    bottom: {
      title: 'Time',
      mapsTo: 'index',
      scaleType: ScaleTypes.LINEAR,
      domain: [0, DEFAULT_VISIBLE_SLOTS - 1],
      ticks: {
        values: Array.from({ length: DEFAULT_VISIBLE_SLOTS }, (_, index) => index),
        formatter: () => '',
      },
    },
    left: {
      title: 'Vitals',
      mapsTo: 'value',
      domain: [0, 260],
      ticks: {
        values: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260],
        formatter: (value: number) => `${value}`,
      },
      scaleType: ScaleTypes.LINEAR,
    },
  },
  points: {
    enabled: true,
    radius: 4,
    filled: true,
  },
  curve: 'curveLinear',
  height: '600px',
  theme: 'white',
  toolbar: {
    enabled: false,
  },
  legend: {
    position: 'top',
    clickable: false,
  },
  grid: {
    x: {
      enabled: true,
      numberOfTicks: DEFAULT_VISIBLE_SLOTS,
    },
    y: {
      enabled: true,
      numberOfTicks: 14,
    },
  },
  zoomBar: {
    top: {
      enabled: false,
    },
  },
};

const AnaestheticGraph: React.FC<AnaestheticGraphProps> = ({ data }) => {
  const actualData: AnaestheticGraphData[] = React.useMemo(() => (data.length > 0 ? data : []), [data]);
  const dataForPlot = actualData;
  const hasActualData = dataForPlot.length > 0;
  const visibleSlotCount = Math.max(dataForPlot.length, DEFAULT_VISIBLE_SLOTS);

  const finalChartData: ChartDataPoint[] = hasActualData
    ? dataForPlot.flatMap((item, index) => {
        const time = item.time || `T${index + 1}`;
        return [
          { index, time, value: item.systolicBP, group: 'Systolic BP' },
          { index, time, value: item.diastolicBP, group: 'Diastolic BP' },
          { index, time, value: item.pulse, group: 'Heart Rate' },
          { index, time, value: item.spo2 ?? 0, group: 'SPO2' },
          { index, time, value: item.etco2 ?? 0, group: 'EtCO2' },
        ] satisfies ChartDataPoint[];
      })
    : Array.from({ length: visibleSlotCount }, (_, index) => ({
        index,
        time: '',
        value: Number.NaN,
        group: '__grid__',
      }));

  const colorScale: { [key: string]: string } = {
    'Systolic BP': '#da1e28',
    'Diastolic BP': '#24a148',
    'Heart Rate': '#0f62fe',
    SPO2: '#8a3ffc',
    EtCO2: '#ff832b',
    __grid__: 'rgba(0, 0, 0, 0)',
  };

  const chartOptions = {
    ...ANAESTHETIC_CHART_OPTIONS,
    title: 'Anaesthetic record',
    axes: {
      ...ANAESTHETIC_CHART_OPTIONS.axes,
      bottom: {
        ...ANAESTHETIC_CHART_OPTIONS.axes.bottom,
        domain: [0, visibleSlotCount - 1],
        ticks: {
          values: Array.from({ length: visibleSlotCount }, (_, index) => index),
          formatter: (index: number) => dataForPlot[index]?.time || '',
        },
      },
    },
    color: {
      scale: colorScale,
    },
    points: {
      enabled: true,
      radius: 4,
      filled: true,
      strokeWidth: 2,
    },
    legend: {
      position: 'top',
      clickable: false,
      enabled: hasActualData,
    },
    grid: {
      x: {
        enabled: true,
        numberOfTicks: visibleSlotCount,
      },
      y: {
        enabled: true,
        numberOfTicks: 14,
      },
    },
    tooltip: {
      showTotal: false,
      customHTML: (data: any) => {
        if (data && data.length > 0) {
          const point = data[0];
          return `<div style="background: #333; color: white; padding: 8px; border-radius: 4px; font-size: 14px; border: none;">
            <div>${point.group}</div>
            <div>${point.time}: ${point.value}</div>
          </div>`;
        }
        return '';
      },
    },
  };

  return (
    <div className={styles.pulseBPGraph}>
      <div className={styles.chartContainer} data-chart-id="pulse-bp">
        <LineChart data={finalChartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default AnaestheticGraph;
