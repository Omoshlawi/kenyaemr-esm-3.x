import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import TransmissionPipelineTabs from './transmission-pipeline-tabs.component';
import { DataPipeline } from './transmission.type';
import { useDataPipelines } from './transmission.resources';

vi.mock('./transmission.resources', async () => {
  const actual = await vi.importActual<typeof import('./transmission.resources')>('./transmission.resources');

  return {
    ...actual,
    useDataPipelines: vi.fn(),
  };
});

vi.mock('./pipeline-tab-pannel.component', () => ({
  default: () => <div data-testid="pipeline-panel" />,
}));

vi.mock('@carbon/react', () => ({
  Layer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tab: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  TabPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabPanels: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsSkeleton: () => <div data-testid="tabs-skeleton" />,
}));

const mockedUseDataPipelines = vi.mocked(useDataPipelines);

describe('TransmissionPipelineTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects the first pipeline on initial render when pipelines are available', () => {
    const onActivePipelineChange = vi.fn();
    const firstPipeline = {
      pipeline: DataPipeline.CASE_SURVEILLANCE,
      slug: 'case-surveillance',
      basePath: '/case-surveillance',
      extractionOnDemand: true,
      maxRetries: 3,
      transmissionBatchSize: 100,
      cleanupRetentionDays: 30,
    };

    mockedUseDataPipelines.mockReturnValue({
      pipelines: [firstPipeline],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<TransmissionPipelineTabs onActivePipelineChange={onActivePipelineChange} />);

    expect(onActivePipelineChange).toHaveBeenCalledWith(firstPipeline);
    expect(screen.getByText('Case surveillance')).toBeInTheDocument();
  });

  it('renders the empty state when no pipelines are returned', () => {
    mockedUseDataPipelines.mockReturnValue({
      pipelines: [],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });

    render(<TransmissionPipelineTabs onActivePipelineChange={vi.fn()} />);

    expect(screen.getByText(/There are no .* to display for this patient/i)).toBeInTheDocument();
  });
});
