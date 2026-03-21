export const VALIDATION = {
  name: {
    min: 3,
    max: 50,
    pattern: /^[a-zA-Z0-9][a-zA-Z0-9 .\-]{1,48}[a-zA-Z0-9.]$/,
    error: {
      empty: 'Agent name is required',
      short: 'Minimum 3 characters',
      long: 'Maximum 50 characters',
      invalid: 'Letters, numbers, spaces, dots, hyphens only',
    },
  },
  endpoint: {
    max: 256,
    error: {
      empty: 'Endpoint URL is required',
      invalid: 'Must be a valid http/https URL',
      long: 'Maximum 256 characters',
    },
  },
  capabilities: {
    max: 256,
    error: {
      empty: 'Select at least one capability',
    },
  },
  metadata: {
    max: 256,
    error: {
      invalid: 'Must be a valid URL',
      long: 'Maximum 256 characters',
    },
  },
};

export interface FormData {
  name: string;
  endpoint: string;
  metadata: string;
}

export function validateForm(form: FormData, selectedCaps: string[]) {
  const errors: Record<string, string> = {};

  // Name
  const name = form.name.trim();
  if (!name) {
    errors.name = VALIDATION.name.error.empty;
  } else if (name.length < VALIDATION.name.min) {
    errors.name = VALIDATION.name.error.short;
  } else if (name.length > VALIDATION.name.max) {
    errors.name = VALIDATION.name.error.long;
  } else if (!VALIDATION.name.pattern.test(name)) {
    errors.name = VALIDATION.name.error.invalid;
  }

  // Endpoint (optional — validate only if provided)
  const ep = form.endpoint.trim();
  if (ep) {
    if (ep.length > VALIDATION.endpoint.max) {
      errors.endpoint = VALIDATION.endpoint.error.long;
    } else {
      try {
        const url = new URL(ep);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.endpoint = VALIDATION.endpoint.error.invalid;
        }
      } catch {
        errors.endpoint = VALIDATION.endpoint.error.invalid;
      }
    }
  }

  // Capabilities
  if (selectedCaps.length === 0) {
    errors.capabilities = VALIDATION.capabilities.error.empty;
  }

  // Metadata (optional but must be valid URL if provided)
  const meta = form.metadata.trim();
  if (meta) {
    if (meta.length > VALIDATION.metadata.max) {
      errors.metadata = VALIDATION.metadata.error.long;
    } else {
      try {
        new URL(meta);
      } catch {
        errors.metadata = VALIDATION.metadata.error.invalid;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
