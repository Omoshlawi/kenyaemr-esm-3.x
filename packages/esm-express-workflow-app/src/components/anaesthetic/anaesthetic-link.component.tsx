import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigurableLink } from '@openmrs/esm-framework';

export interface PartographLinkProps {
  patientUuid: string;
}

const PartographLink: React.FC<PartographLinkProps> = ({ patientUuid }) => {
  const { t } = useTranslation();

  return (
    <ConfigurableLink
      to={`\${openmrsSpaBase}/patient/\${patientUuid}/chart/anaesthetic`}
      templateParams={{ patientUuid }}>
      {t('anaesthetic', 'Anaesthetic')}
    </ConfigurableLink>
  );
};

export default PartographLink;
