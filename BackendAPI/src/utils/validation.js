'use strict';

/**
 * Validation helpers for device payloads and query params.
 */

const STATUS_ENUM = ['online', 'offline', 'unknown'];

function isIPv4(ip) {
  const re =
    /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  return re.test(ip);
}

function requiredString(obj, field, errors) {
  if (!obj || typeof obj[field] !== 'string' || obj[field].trim() === '') {
    errors.push(`${field} is required and must be a non-empty string`);
  }
}

// PUBLIC_INTERFACE
function validateCreateDevice(body) {
  /** Validate DeviceCreate payload according to OpenAPI schema. */
  const errors = [];
  requiredString(body, 'name', errors);
  requiredString(body, 'ip_address', errors);
  requiredString(body, 'mac_address', errors);
  requiredString(body, 'device_type', errors);
  requiredString(body, 'location', errors);

  if (body.ip_address && !isIPv4(body.ip_address)) {
    errors.push('ip_address must be a valid IPv4 address');
  }

  return errors;
}

// PUBLIC_INTERFACE
function validateUpdateDevice(body) {
  /** Validate DeviceUpdate payload according to OpenAPI schema. */
  const errors = [];
  if ('ip_address' in body && body.ip_address && !isIPv4(body.ip_address)) {
    errors.push('ip_address must be a valid IPv4 address');
  }
  if ('status' in body && body.status && !STATUS_ENUM.includes(body.status)) {
    errors.push(`status must be one of: ${STATUS_ENUM.join(', ')}`);
  }
  return errors;
}

// PUBLIC_INTERFACE
function parsePagination(query) {
  /** Parse pagination query params page and per_page. */
  let page = parseInt(query.page, 10);
  let perPage = parseInt(query.per_page, 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(perPage) || perPage < 1 || perPage > 100) perPage = 10;
  return { page, perPage };
}

// PUBLIC_INTERFACE
function errorResponse(code, message, details, statusCode = 400) {
  /** Construct an error object matching Error schema. */
  const err = new Error(message);
  err.code = code;
  err.details = details;
  err.statusCode = statusCode;
  return err;
}

module.exports = {
  STATUS_ENUM,
  validateCreateDevice,
  validateUpdateDevice,
  parsePagination,
  errorResponse,
};
