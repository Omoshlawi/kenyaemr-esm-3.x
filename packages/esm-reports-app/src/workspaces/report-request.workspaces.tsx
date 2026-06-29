import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import {
  Button,
  ButtonSet,
  Checkbox,
  Form,
  FormGroup,
  InlineLoading,
  NumberInput,
  SkeletonText,
  Stack,
  TextInput,
} from '@carbon/react';
import classNames from 'classnames';
import {
  ErrorState,
  OpenmrsDatePicker,
  ResponsiveWrapper,
  Workspace2,
  navigate,
  showSnackbar,
  useLayoutType,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';

import styles from './report-request.workspace.scss';
import { requestReport, useReportDefinition } from '../hooks/useReportDefinition';
import { type ReportParameter, type ReportWithDefinition } from '../types';

type ReportRequestWorkspacesProps = {
  reportUuid: string;
};

const isDateType = (type: string) => type === 'java.util.Date';
const isBooleanType = (type: string) => type === 'java.lang.Boolean';
const isNumberType = (type: string) => ['java.lang.Integer', 'java.lang.Long', 'java.lang.Double'].includes(type);

const humanizeName = (name: string) =>
  name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();

const formatDateParam = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultValue = (parameter: ReportParameter) => {
  if (isBooleanType(parameter.type)) {
    return parameter.defaultValue === true || parameter.defaultValue === 'true';
  }
  if (isDateType(parameter.type)) {
    return parameter.defaultValue ? new Date(parameter.defaultValue as string) : null;
  }
  return parameter.defaultValue ?? '-1';
};

const serializeValue = (parameter: ReportParameter, value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (isDateType(parameter.type)) {
    return value instanceof Date ? formatDateParam(value) : '';
  }
  if (isBooleanType(parameter.type)) {
    return String(Boolean(value));
  }
  return String(value);
};

type ReportRequestFormProps = {
  report: ReportWithDefinition;
  parameters: Array<ReportParameter>;
  closeWorkspace: Workspace2DefinitionProps<ReportRequestWorkspacesProps>['closeWorkspace'];
};

const ReportRequestForm: React.FC<ReportRequestFormProps> = ({ report, parameters, closeWorkspace }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<Record<string, unknown>>({
    defaultValues: Object.fromEntries(parameters.map((parameter) => [parameter.name, getDefaultValue(parameter)])),
  });

  const onSubmit = async (data: Record<string, unknown>) => {
    const payload = Object.fromEntries(
      parameters.map((parameter) => [parameter.name, serializeValue(parameter, data[parameter.name])]),
    );

    try {
      await requestReport(report.uuid, payload);
      showSnackbar({
        title: t('reportQueued', 'Report queued'),
        kind: 'success',
        subtitle: t('reportQueuedSubtitle', '{{name}} has been queued for processing.', { name: report.name }),
      });
      closeWorkspace({ discardUnsavedChanges: true });
      navigate({ to: `${(globalThis as any).spaBase}/reporting/report/${report.uuid}` });
    } catch (error: any) {
      showSnackbar({
        title: t('reportRequestError', 'Error requesting report'),
        kind: 'error',
        isLowContrast: false,
        subtitle:
          error?.responseBody?.error?.message ?? error?.message ?? t('unknownError', 'An unknown error occurred'),
      });
    }
  };

  const renderField = (parameter: ReportParameter) => {
    const labelText = parameter.label?.trim() || humanizeName(parameter.name);
    const isRequired = parameter.defaultValue === null || parameter.defaultValue === undefined;
    const requiredRule = isRequired
      ? { required: t('fieldRequired', '{{field}} is required', { field: labelText }) }
      : {};

    return (
      <Controller
        key={parameter.name}
        name={parameter.name}
        control={control}
        rules={isBooleanType(parameter.type) ? {} : requiredRule}
        render={({ field, fieldState }) => {
          if (isDateType(parameter.type)) {
            return (
              <OpenmrsDatePicker
                id={`${parameter.name}Input`}
                className={styles.datePicker}
                labelText={labelText}
                value={(field.value as Date) ?? undefined}
                onChange={(date) => field.onChange(date ?? null)}
                invalid={Boolean(fieldState.error)}
                invalidText={fieldState.error?.message}
              />
            );
          }

          if (isBooleanType(parameter.type)) {
            return (
              <Checkbox
                id={`${parameter.name}Input`}
                labelText={labelText}
                checked={Boolean(field.value)}
                onChange={(_event, { checked }) => field.onChange(checked)}
              />
            );
          }

          if (isNumberType(parameter.type)) {
            return (
              <NumberInput
                id={`${parameter.name}Input`}
                label={labelText}
                value={(field.value as number) ?? ''}
                onChange={(_event, { value }) => field.onChange(value)}
                invalid={Boolean(fieldState.error)}
                invalidText={fieldState.error?.message}
              />
            );
          }

          return (
            <TextInput
              id={`${parameter.name}Input`}
              labelText={labelText}
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
              invalid={Boolean(fieldState.error)}
              invalidText={fieldState.error?.message}
              helperText={t('parameterType', 'Parameter type: {{type}}', { type: parameter.type })}
            />
          );
        }}
      />
    );
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formContainer}>
        <div>
          <span className={styles.reportName}>{report.name}</span>
          {report.description && <p className={styles.reportDescription}>{report.description}</p>}
        </div>
        <Stack gap={5}>
          {parameters.length === 0 ? (
            <p className={styles.emptyState}>
              {t('noParameters', 'This report has no parameters. Submit to queue it for processing.')}
            </p>
          ) : (
            parameters.map((parameter) => (
              <ResponsiveWrapper key={parameter.name}>
                <FormGroup legendText="">{renderField(parameter)}</FormGroup>
              </ResponsiveWrapper>
            ))
          )}
        </Stack>
      </div>

      <ButtonSet
        className={classNames({
          [styles.tablet]: isTablet,
          [styles.desktop]: !isTablet,
        })}>
        <Button className={styles.buttonContainer} kind="secondary" onClick={() => closeWorkspace()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          className={styles.buttonContainer}
          disabled={isSubmitting || (parameters.length > 0 && !isDirty)}
          kind="primary"
          type="submit">
          {isSubmitting ? (
            <span className={styles.inlineLoading}>
              {t('submitting', 'Submitting...')}
              <InlineLoading status="active" iconDescription="Loading" />
            </span>
          ) : (
            t('requestReport', 'Request report')
          )}
        </Button>
      </ButtonSet>
    </Form>
  );
};

const ReportRequestWorkspaces: React.FC<Workspace2DefinitionProps<ReportRequestWorkspacesProps>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const { t } = useTranslation();
  const { report, parameters, isLoading, error } = useReportDefinition(workspaceProps?.reportUuid ?? '');

  return (
    <Workspace2 title={t('reportRequest', 'Report Request')} hasUnsavedChanges={false}>
      {isLoading ? (
        <div className={styles.formContainer}>
          <SkeletonText heading width="60%" />
          <SkeletonText paragraph lineCount={3} />
        </div>
      ) : error ? (
        <div className={styles.formContainer}>
          <ErrorState error={error} headerTitle={t('reportRequest', 'Report Request')} />
        </div>
      ) : report ? (
        <ReportRequestForm report={report} parameters={parameters} closeWorkspace={closeWorkspace} />
      ) : (
        <div className={styles.formContainer}>
          <p className={styles.emptyState}>{t('reportNotFound', 'Report not found.')}</p>
        </div>
      )}
    </Workspace2>
  );
};

export default ReportRequestWorkspaces;
