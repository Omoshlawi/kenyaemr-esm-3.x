import {
  Button,
  DataTableSkeleton,
  TableToolbarAction,
  TableToolbarMenu,
  TableToolbarSearch,
  Tile,
} from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { launchWorkspace, restBaseUrl } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStockLocationPages } from './locations-table.resource';
import styles from './location-items-table.scss';
import { handleMutate } from './stock-locations.resource';
import DataList from './table.component';

interface StockLocationsTableProps {
  status?: string;
}

const LocationsItems: React.FC<StockLocationsTableProps> = () => {
  const { t } = useTranslation();
  const { tableHeaders, tableRows, items, isLoading } = useStockLocationPages({
    v: 'full',
  });

  const handleRefresh = () => {
    handleMutate(`${restBaseUrl}/Location?_summary=data`);
  };

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  if (items?.length) {
    return (
      <>
        <DataList columns={tableHeaders} data={tableRows}>
          {({ onInputChange }) => (
            <>
              <TableToolbarSearch persistent onChange={onInputChange} />
              <TableToolbarMenu>
                <TableToolbarAction className={styles.toolbarMenuAction} onClick={handleRefresh}>
                  {t('refresh', 'Refresh')}
                </TableToolbarAction>
              </TableToolbarMenu>
              <Button
                kind="ghost"
                renderIcon={(props) => <Add size={16} {...props} />}
                onClick={() => {
                  launchWorkspace('manage-location-workspace', { workspaceTitle: t('addLocation', 'Add Location') });
                }}>
                {t('addLocation', 'Add Location')}
              </Button>
            </>
          )}
        </DataList>
      </>
    );
  }

  return (
    <div className={styles.tileContainer}>
      <Tile className={styles.tile}>
        <p className={styles.content}>{t('noStockItemsToDisplay', 'No stock items to display')}</p>
      </Tile>
    </div>
  );
};

export default LocationsItems;
