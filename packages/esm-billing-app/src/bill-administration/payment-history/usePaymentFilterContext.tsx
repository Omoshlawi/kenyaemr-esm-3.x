import React, { createContext, useContext, useState, ReactNode } from 'react';
import dayjs from 'dayjs';
import { Timesheet, Filter } from '../../types';

interface PaymentFilterContextType {
  dateRange: [Date, Date];
  setDateRange: (dates: [Date, Date]) => void;
  appliedFilters: string[];
  setAppliedFilters: (filters: string[]) => void;
  appliedTimesheet: Timesheet | undefined;
  setAppliedTimesheet: (timesheet: Timesheet | undefined) => void;
  resetFilters: () => void;
  getAllAppliedFilters: () => string[];
  filters: Filter;
  setFilters: (filters: Filter) => void;
}

const defaultDateRange: [Date, Date] = [dayjs().startOf('day').toDate(), dayjs().endOf('day').toDate()];

export const PaymentFilterContext = createContext<PaymentFilterContextType>({
  dateRange: defaultDateRange,
  setDateRange: () => {},
  appliedFilters: [],
  setAppliedFilters: () => {},
  appliedTimesheet: undefined,
  setAppliedTimesheet: () => {},
  resetFilters: () => {},
  getAllAppliedFilters: () => [],
  filters: {
    paymentMethods: [],
    cashiers: [],
    serviceTypes: [],
  },
  setFilters: () => {},
});

interface PaymentFilterProviderProps {
  children: ReactNode;
}

export const PaymentFilterProvider = ({ children }: PaymentFilterProviderProps) => {
  const [dateRange, setDateRange] = useState<[Date, Date]>(defaultDateRange);
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [appliedTimesheet, setAppliedTimesheet] = useState<Timesheet | undefined>();
  const defaultFilters: Filter = {
    paymentMethods: [],
    cashiers: [],
    serviceTypes: [],
  };
  const [filters, setFilters] = useState<Filter>(defaultFilters);

  const resetFilters = () => {
    setAppliedFilters([]);
    setAppliedTimesheet(undefined);
  };

  const getAllAppliedFilters = (): string[] => {
    const allFilters = [...appliedFilters];
    if (appliedTimesheet) {
      allFilters.push(`${appliedTimesheet.display} (${appliedTimesheet.cashier.display})`);
    }
    return allFilters;
  };

  const value = {
    dateRange,
    setDateRange,
    appliedFilters,
    setAppliedFilters,
    appliedTimesheet,
    setAppliedTimesheet,
    resetFilters,
    getAllAppliedFilters,
    filters,
    setFilters,
  };

  return <PaymentFilterContext.Provider value={value}>{children}</PaymentFilterContext.Provider>;
};

export const usePaymentFilterContext = () => {
  const context = useContext(PaymentFilterContext);

  if (context === undefined) {
    throw new Error('usePaymentFilterContext must be used within a PaymentFilterProvider');
  }

  return context;
};
