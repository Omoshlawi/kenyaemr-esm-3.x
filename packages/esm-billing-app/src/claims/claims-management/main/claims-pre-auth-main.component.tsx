import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClaimsManagementHeader } from '../header/claims-header.component';
import { TableContainer, Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from '@carbon/react';

const ClaimsManagementPreAuthRequest = () => {
  const { t } = useTranslation();

  return (
    <div className="omrs-main-content">
      <ClaimsManagementHeader title={t('preAuthRequets', 'Pre-Auth Requests')} />
    </div>
  );
};

export default ClaimsManagementPreAuthRequest;
