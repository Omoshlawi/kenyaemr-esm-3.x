/** BMI from weight (kg) and height (cm), rounded to one decimal place. */
export const calculateBodyMassIndex = (weightKg?: string, heightCm?: string): string => {
  const weight = Number(weightKg);
  const height = Number(heightCm);
  if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) {
    return '';
  }
  const heightM = height / 100;
  return (weight / (heightM * heightM)).toFixed(1);
};
