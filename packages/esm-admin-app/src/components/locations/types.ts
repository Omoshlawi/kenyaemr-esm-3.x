import { KeyedMutator } from 'swr';

export type LocationMutator = KeyedMutator<{
  data: {
    results: Array<Location>;
  };
}>;

export interface LocationData {
  uuid?: string;
  name: string;
  tags: [];
}

export interface PagingCriteria {
  startIndex?: number | null;
  limit?: number | null;
}

export interface ResourceFilterCriteria extends PagingCriteria {
  v?: string | null;
  q?: string | null;
  totalCount?: boolean | null;
  limit?: number | null;
}
export interface StockOperationFilter extends ResourceFilterCriteria {
  status?: string | null | undefined;
  operationTypeUuid?: string | null | undefined;
  locationUuid?: string | null | undefined;
  isLocationOther?: boolean | null | undefined;
  stockItemUuid?: string | null | undefined;
  operationDateMin?: string | null | undefined;
  operationDateMax?: string | null | undefined;
  sourceTypeUuid?: string | null | undefined;
}

import type React from 'react';

export interface DataTableRenderProps {
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>, defaultValue?: string) => void;
}
