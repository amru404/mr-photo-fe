"use client";

import { useCallback, useState } from "react";
import { ApiError, type FieldErrors } from "./api";

/**
 * Form state plus the backend's validation errors, keyed like Laravel
 * returns them ("email", "timeline.selection").
 */
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const { [key as string]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  /** Puts a 422's field errors on the form; rethrows anything else. */
  const capture = useCallback((error: unknown, fallbackField?: string) => {
    if (error instanceof ApiError && error.isValidation) {
      setErrors(Object.keys(error.errors).length ? error.errors : { [fallbackField ?? "form"]: [error.message] });
      return;
    }
    if (error instanceof ApiError && fallbackField) {
      setErrors({ [fallbackField]: [error.message] });
      return;
    }
    throw error;
  }, []);

  const error = useCallback((key: string) => errors[key]?.[0], [errors]);

  return { values, setValues, set, errors, setErrors, capture, error, reset: () => setValues(initial) };
}
