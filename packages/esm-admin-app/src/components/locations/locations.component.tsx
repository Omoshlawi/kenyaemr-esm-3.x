import React from 'react';
import LocationsItems from './locations-table.component';
import Header from './location-management-header.component';
import { useTranslation } from 'react-i18next';

function Locations() {
  const { t } = useTranslation();
  return (
    <div className="omrs-main">
      <Header title={t('manageLocations', 'Manage Locations')} />
      <LocationsItems />
    </div>
  );
}

export default Locations;
