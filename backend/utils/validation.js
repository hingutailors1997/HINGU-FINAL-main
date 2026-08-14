/**
 * Request Data Validation & Sanitization Utility
 * Enforces production validation rules beyond standard Mongoose schema restrictions
 */

const validateCustomerPayload = (data, isCreate = true) => {
  const errors = {};

  if (isCreate) {
    if (!data.mobile || typeof data.mobile !== 'string' || data.mobile.trim().length < 10) {
      errors.mobile = 'A valid mobile number with at least 10 digits is required.';
    }
    if (!data.firstName && !data.fullName) {
      errors.name = 'Customer first name or full name is required.';
    }
  } else {
    if (data.mobile !== undefined && (typeof data.mobile !== 'string' || data.mobile.trim().length < 10)) {
      errors.mobile = 'Mobile number must contain at least 10 digits.';
    }
  }

  if (data.email && typeof data.email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.email = 'Invalid email address syntax.';
    }
  }

  if (data.category && !['Regular', 'Premium', 'VIP', 'Wholesale'].includes(data.category)) {
    errors.category = 'Invalid customer category selected.';
  }

  if (data.gender && !['Male', 'Female', 'Kids', 'Other'].includes(data.gender)) {
    errors.gender = 'Invalid gender value.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateMeasurementPayload = (data) => {
  const errors = {};

  if (!data.customerId) {
    errors.customerId = 'Customer ID reference is required for storing measurements.';
  }
  if (!data.garmentType || typeof data.garmentType !== 'string' || data.garmentType.trim() === '') {
    errors.garmentType = 'Garment Type (e.g., Shirt, Pant) is required.';
  }
  if (!data.measurements || typeof data.measurements !== 'object') {
    errors.measurements = 'Measurements object containing values is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  validateCustomerPayload,
  validateMeasurementPayload
};
