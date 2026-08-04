import React from 'react';
import { Checkbox, Select, SelectItem, Stack, TextArea, TextInput } from '@carbon/react';
import type { CodedAnswerOption } from '../constants/coded-answers';
import type { FieldDef, NumericFieldDef, TextFieldDef } from '../constants/field-definitions';
import { sanitizeBloodPressureInput, sanitizeNumericInput } from '../utils/field-validation';

type CommonProps = {
  id: string;
  def: FieldDef;
  value: string;
  error?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
};

export const NumericFieldInput: React.FC<CommonProps & { def: NumericFieldDef }> = ({
  id,
  def,
  value,
  error,
  readOnly,
  onChange,
}) => {
  const allowDecimal = def.step != null && def.step < 1;
  const rangeHint =
    def.min != null && def.max != null ? `Range: ${def.min}–${def.max}` : def.units ? `Unit: ${def.units}` : '';
  const helperText = [def.helperText, def.units && def.min == null ? `Unit: ${def.units}` : '', rangeHint]
    .filter(Boolean)
    .join(' · ');

  return (
    <TextInput
      id={id}
      type="number"
      labelText={def.label}
      required={def.required}
      value={value}
      min={def.min}
      max={def.max}
      step={def.step ?? 'any'}
      helperText={helperText || undefined}
      invalid={Boolean(error)}
      invalidText={error}
      readOnly={readOnly}
      onChange={(e) => onChange?.(sanitizeNumericInput(e.target.value, allowDecimal))}
    />
  );
};

export const TextFieldInput: React.FC<CommonProps & { def: TextFieldDef }> = ({ id, def, value, error, onChange }) => {
  const handleChange = (raw: string) => {
    if (def.pattern === 'bloodPressure') {
      onChange(sanitizeBloodPressureInput(raw));
      return;
    }
    onChange(raw);
  };

  return (
    <TextInput
      id={id}
      type="text"
      labelText={def.label}
      required={def.required}
      value={value}
      helperText={def.helperText}
      invalid={Boolean(error)}
      invalidText={error}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
};

type CodedSelectProps = {
  id: string;
  label: string;
  value: string;
  options: CodedAnswerOption[];
  error?: string;
  required?: boolean;
  chooseLabel: string;
  onChange: (value: string) => void;
};

export const CodedSelectField: React.FC<CodedSelectProps> = ({
  id,
  label,
  value,
  options,
  error,
  required,
  chooseLabel,
  onChange,
}) => (
  <Select
    id={id}
    labelText={label}
    required={required}
    value={value}
    invalid={Boolean(error)}
    invalidText={error}
    onChange={(e) => onChange(e.target.value)}>
    <SelectItem value="" text={chooseLabel} />
    {options.map((option) => (
      <SelectItem key={option.value} value={option.value} text={option.label} />
    ))}
  </Select>
);

type CodedCheckboxGroupProps = {
  label: string;
  options: CodedAnswerOption[];
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
  error?: string;
  required?: boolean;
};

export const CodedCheckboxGroup: React.FC<CodedCheckboxGroupProps> = ({
  label,
  options,
  selected,
  onToggle,
  error,
  required,
}) => (
  <div>
    <p className={`cds--label${error ? ' cds--label--invalid' : ''}`}>
      {label}
      {required ? <span className="cds--label__required"> *</span> : null}
    </p>
    {error ? <div className="cds--form-requirement">{error}</div> : null}
    <Stack gap={3}>
      {options.map((option) => (
        <Checkbox
          key={option.value}
          id={`coded-${option.value}`}
          labelText={option.label}
          checked={selected.includes(option.value)}
          onChange={(_, { checked }) => onToggle(option.value, checked)}
        />
      ))}
    </Stack>
  </div>
);

type TextAreaFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

export const TextAreaFieldInput: React.FC<TextAreaFieldProps> = ({ id, label, value, error, onChange }) => (
  <TextArea
    id={id}
    labelText={label}
    value={value}
    invalid={Boolean(error)}
    invalidText={error}
    onChange={(e) => onChange(e.target.value)}
  />
);
