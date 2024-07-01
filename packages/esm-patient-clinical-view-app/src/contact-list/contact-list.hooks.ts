import { formatDatetime, openmrsFetch, parseDate, useConfig } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import useSWR from 'swr';
import { ConfigObject } from '../config-schema';
import { Contact, Enrollment, HTSEncounter, Person, RelationShipType, Relationship } from './contact-list.types';

function extractContactData(
  patientIdentifier: string,
  relationships: Array<Relationship>,
  config: ConfigObject,
): Array<Contact> {
  const relationshipsData: Contact[] = [];

  for (const r of relationships) {
    if (patientIdentifier === r.personA.uuid) {
      relationshipsData.push({
        ...extractAttributeData(r.personB, config),
        uuid: r.uuid,
        name: extractName(r.personB.display),
        display: r.personB.display,
        relativeAge: r.personB.age,
        dead: r.personB.dead,
        causeOfDeath: r.personB.causeOfDeath,
        relativeUuid: r.personB.uuid,
        relationshipType: r.relationshipType.bIsToA,
        patientUuid: r.personB.uuid,
        gender: r.personB.gender,
        startDate: !r.startDate
          ? null
          : formatDatetime(parseDate(r.startDate), { day: true, mode: 'standard', year: true, noToday: true }),
      });
    } else {
      relationshipsData.push({
        ...extractAttributeData(r.personA, config),
        uuid: r.uuid,
        name: extractName(r.personA.display),
        display: r.personA.display,
        relativeAge: r.personA.age,
        causeOfDeath: r.personA.causeOfDeath,
        relativeUuid: r.personA.uuid,
        dead: r.personA.dead,
        relationshipType: r.relationshipType.aIsToB,
        patientUuid: r.personA.uuid,
        gender: r.personB.gender,
        startDate: !r.startDate
          ? null
          : formatDatetime(parseDate(r.startDate), { day: true, mode: 'standard', year: true, noToday: true }),
      });
    }
  }
  return relationshipsData;
}

function extractName(display: string) {
  const pattern = /-\s*(.*)$/;
  const match = display.match(pattern);
  if (match && match.length > 1) {
    return match[1].trim();
  }
  return display.trim();
}

function extractTelephone(display: string) {
  const pattern = /=\s*(.*)$/;
  const match = display.match(pattern);
  if (match && match.length > 1) {
    return match[1].trim();
  }
  return display.trim();
}

function extractAttributeData(person: Person, config: ConfigObject) {
  return person.attributes.reduce<{
    contact: string | null;
    baselineHIVStatus: string | null;
    personContactCreated: string | null;
    pnsAproach: string | null;
    livingWithClient: string | null;
  }>(
    (prev, attr) => {
      if (attr.attributeType.uuid === config.contactPersonAttributesUuid.telephone) {
        return { ...prev, contact: attr.display ? extractTelephone(attr.display) : null };
      } else if (attr.attributeType.uuid === config.contactPersonAttributesUuid.baselineHIVStatus) {
        return { ...prev, baselineHIVStatus: attr.display ?? null };
      } else if (attr.attributeType.uuid === config.contactPersonAttributesUuid.contactCreated) {
        return { ...prev, personContactCreated: attr.display ?? null };
      } else if (attr.attributeType.uuid === config.contactPersonAttributesUuid.livingWithContact) {
        return { ...prev, livingWithClient: attr.display ?? null };
      } else if (attr.attributeType.uuid === config.contactPersonAttributesUuid.preferedPnsAproach) {
        return { ...prev, pnsAproach: attr.display ?? null };
      }
      return prev;
    },
    { contact: null, baselineHIVStatus: null, personContactCreated: null, pnsAproach: null, livingWithClient: null },
  );
}

export const useContacts = (patientUuid: string) => {
  const customeRepresentation =
    'custom:(display,uuid,personA:(uuid,age,display,dead,causeOfDeath,gender,attributes:(uuid,display,attributeType:(uuid,display))),personB:(uuid,age,display,dead,causeOfDeath,gender,attributes:(uuid,display,attributeType:(uuid,display))),relationshipType:(uuid,display,description,aIsToB,bIsToA),startDate)';
  const url = `/ws/rest/v1/relationship?v=${customeRepresentation}&person=${patientUuid}`;
  const config = useConfig<ConfigObject>();
  const { data, error, isLoading, isValidating } = useSWR<{ data: { results: Relationship[] } }, Error>(
    url,
    openmrsFetch,
  );
  const relationships = useMemo(() => {
    return data?.data?.results?.length ? extractContactData(patientUuid, data?.data?.results, config) : [];
  }, [data?.data?.results, patientUuid, config]);
  return {
    contacts: relationships,
    error,
    isLoading,
    isValidating,
  };
};

export const useRelationshipTypes = () => {
  const customeRepresentation = 'custom:(uuid,displayAIsToB)';
  const url = `/ws/rest/v1/relationshiptype?v=${customeRepresentation}`;

  const { data, error, isLoading } = useSWR<{ data: { results: RelationShipType[] } }>(url, openmrsFetch);
  return {
    error,
    isLoading,
    relationshipTypes: data?.data?.results ?? [],
  };
};

export const useRelativeHivEnrollment = (relativeUuid: string) => {
  const customeRepresentation = 'custom:(uuid,program:(name,uuid))';
  const url = `/ws/rest/v1/programenrollment?v=${customeRepresentation}&patient=${relativeUuid}`;
  const config = useConfig<ConfigObject>();
  const { data, error, isLoading } = useSWR<{ data: { results: Enrollment[] } }>(url, openmrsFetch);
  return {
    error,
    isLoading,
    enrollment: (data?.data?.results ?? []).find((en) => en.program.uuid === config.hivProgramUuid) ?? null,
  };
};

export const useRelativeHTSEncounter = (relativeUuid: string) => {
  const customeRepresentation = 'custom:(uuid,display,encounterDatetime,obs:(uuid,display,value:(uuid,display)))';
  const {
    encounterTypes: { hivTestingServices },
  } = useConfig<ConfigObject>();
  const url = `/ws/rest/v1/encounter?v=${customeRepresentation}&patient=${relativeUuid}&encounterType=${hivTestingServices}`;
  const { data, error, isLoading } = useSWR<{ data: { results: HTSEncounter[] } }>(url, openmrsFetch);
  return {
    error,
    isLoading,
    encounters: data?.data?.results ?? [],
  };
};
