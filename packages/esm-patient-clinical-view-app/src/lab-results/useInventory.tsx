import useSWR from 'swr';
import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type StockItemInventoryResponse } from './malaria-results.schema';

const STOCK_OPERATION_TYPE_UUID = '92c1e378-e362-4cca-9f74-a25db0d38d19';
const STOCK_OPERATION_REASON_UUID = '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export type {
  StockItemInventoryLink,
  StockItemInventoryResult,
  StockItemInventoryResponse,
} from './malaria-results.schema';

export const useInventory = (stockItemUuid: string) => {
  const url = `${restBaseUrl}/stockmanagement/stockiteminventory?v=default&limit=10&totalCount=true&stockItemUuid=${stockItemUuid}&includeBatchNo=true`;
  const { data, error, isLoading } = useSWR<FetchResponse<StockItemInventoryResponse>>(url, openmrsFetch);
  return {
    inventory: data?.data?.results ?? [],
    isLoading,
    error,
  };
};

export type StockOperationDeductionPayload = {
  operationDate: string;
  sourceUuid: string;
  reasonUuid: string;
  responsiblePersonUuid: string;
  responsiblePersonOther: string;
  remarks: string;
  operationTypeUuid: string;
  stockOperationItems: Array<{
    stockItemUuid: string;
    stockItemPackagingUOMUuid: string;
    stockBatchUuid: string;
    quantity: number;
    hasExpiration: boolean;
    isOutOfStock: boolean;
  }>;
  approvalRequired: boolean;
};

export type StockDeductionRequest = {
  sourceUuid: string;
  responsiblePersonUuid: string;
  stockItemUuid: string;
  stockBatchUuid: string;
  stockItemPackagingUOMUuid: string;
  reasonUuid?: string;
  responsiblePersonOther?: string;
  remarks?: string;
  operationTypeUuid?: string;
  quantity?: number;
  hasExpiration?: boolean;
  isOutOfStock?: boolean;
  approvalRequired?: boolean;
  operationDate?: string;
};

export const updateStockItemUsage = async (input: StockDeductionRequest) => {
  const url = `${restBaseUrl}/stockmanagement/stockoperation`;
  const payload = createStockDeductionPayload(input);
  const response = await openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: { 'Content-Type': 'application/json' },
  });
  if (response.ok) {
    await completeStockOperation(response.data.uuid);
    return response;
  }
  throw new Error('Failed to update stock item usage');
};

const completeStockOperation = async (stockOperationUuid: string) => {
  const url = `${restBaseUrl}/stockmanagement/stockoperationaction`;
  const payload = {
    name: 'COMPLETE',
    uuid: stockOperationUuid,
    reason: 'Deduction on Malaria Rapid Test Usage',
  };
  return openmrsFetch(url, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' } });
};

const createStockDeductionPayload = (input: StockDeductionRequest): StockOperationDeductionPayload => {
  const {
    sourceUuid,
    responsiblePersonUuid,
    stockItemUuid,
    stockBatchUuid,
    stockItemPackagingUOMUuid,
    reasonUuid = STOCK_OPERATION_REASON_UUID,
    responsiblePersonOther = '',
    remarks = 'Malaria Rapid Test Usage',
    operationTypeUuid = STOCK_OPERATION_TYPE_UUID,
    quantity = 1,
    hasExpiration = true,
    isOutOfStock = false,
    approvalRequired = false,
    operationDate = new Date().toISOString(),
  } = input;

  return {
    operationDate,
    sourceUuid,
    reasonUuid,
    responsiblePersonUuid,
    responsiblePersonOther,
    remarks,
    operationTypeUuid,
    stockOperationItems: [
      {
        stockItemUuid,
        stockItemPackagingUOMUuid,
        stockBatchUuid,
        quantity,
        hasExpiration,
        isOutOfStock,
      },
    ],
    approvalRequired,
  };
};
