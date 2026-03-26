import { STATE_OPTIONS, CARGO_OPTIONS } from "./constants";

export function sanitizeSearchTerm(input: string): string {
  return input
    .trim()
    .replace(/['"%;\\]/g, "")
    .slice(0, 200);
}

export function validateDotNumber(input: string): boolean {
  return /^\d{1,10}$/.test(input.trim());
}

export function validateZipCode(input: string): boolean {
  return /^\d{3,5}$/.test(input.trim());
}

export function sanitizeCityName(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z\s\-'.]/g, "")
    .slice(0, 100);
}

export function validateStateCode(input: string): boolean {
  return STATE_OPTIONS.some((opt) => opt.value === input);
}

export function validateCargoField(input: string): boolean {
  return CARGO_OPTIONS.some((opt) => opt.value === input);
}

export function validatePowerUnitsOp(input: string): input is ">" | "<" {
  return input === ">" || input === "<";
}

export function validatePowerUnitsValue(input: string): boolean {
  const num = Number(input);
  return !isNaN(num) && num >= 0 && num <= 1000000;
}
