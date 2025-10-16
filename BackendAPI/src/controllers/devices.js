'use strict';

const deviceService = require('../services/devices');
const {
  validateCreateDevice,
  validateUpdateDevice,
  parsePagination,
  errorResponse,
} = require('../utils/validation');

class DevicesController {
  // PUBLIC_INTERFACE
  async list(req, res, next) {
    /** List devices with pagination and optional filter by device_type via ?type= */
    try {
      const { page, perPage } = parsePagination(req.query);
      const type = req.query.type;
      const items = await deviceService.listDevices({ page, perPage, type });
      return res.status(200).json(items);
    } catch (err) {
      next(err);
    }
  }

  // PUBLIC_INTERFACE
  async create(req, res, next) {
    /** Create a new device, validating required fields and ip format */
    try {
      const errors = validateCreateDevice(req.body || {});
      if (errors.length) {
        return next(errorResponse('BAD_REQUEST', 'Invalid input', errors.join('; '), 400));
      }
      const device = await deviceService.createDevice(req.body);
      return res.status(201).json(device);
    } catch (err) {
      next(err);
    }
  }

  // PUBLIC_INTERFACE
  async getOne(req, res, next) {
    /** Retrieve device by id */
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return next(errorResponse('BAD_REQUEST', 'Invalid id parameter', 'id must be integer', 400));
      }
      const device = await deviceService.getDevice(id);
      if (!device) {
        return next(errorResponse('NOT_FOUND', 'Device not found', `id=${id}`, 404));
      }
      return res.status(200).json(device);
    } catch (err) {
      next(err);
    }
  }

  // PUBLIC_INTERFACE
  async put(req, res, next) {
    /** Full update of a device */
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return next(errorResponse('BAD_REQUEST', 'Invalid id parameter', 'id must be integer', 400));
      }
      const errors = validateUpdateDevice(req.body || {});
      if (errors.length) {
        return next(errorResponse('UNPROCESSABLE_ENTITY', 'Validation failed', errors.join('; '), 422));
      }
      const updated = await deviceService.updateDevice(id, req.body, { partial: false });
      if (!updated) {
        return next(errorResponse('NOT_FOUND', 'Device not found', `id=${id}`, 404));
      }
      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  // PUBLIC_INTERFACE
  async patch(req, res, next) {
    /** Partial update of a device */
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return next(errorResponse('BAD_REQUEST', 'Invalid id parameter', 'id must be integer', 400));
      }
      const errors = validateUpdateDevice(req.body || {});
      if (errors.length) {
        return next(errorResponse('UNPROCESSABLE_ENTITY', 'Validation failed', errors.join('; '), 422));
      }
      const updated = await deviceService.updateDevice(id, req.body, { partial: true });
      if (!updated) {
        return next(errorResponse('NOT_FOUND', 'Device not found', `id=${id}`, 404));
      }
      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  // PUBLIC_INTERFACE
  async remove(req, res, next) {
    /** Delete device by id */
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return next(errorResponse('BAD_REQUEST', 'Invalid id parameter', 'id must be integer', 400));
      }
      const ok = await deviceService.deleteDevice(id);
      if (!ok) {
        return next(errorResponse('NOT_FOUND', 'Device not found', `id=${id}`, 404));
      }
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  // PUBLIC_INTERFACE
  async ping(req, res, next) {
    /** Ping device, update status and last_ping and return status info */
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return next(errorResponse('BAD_REQUEST', 'Invalid id parameter', 'id must be integer', 400));
      }
      const result = await deviceService.pingAndUpdate(id);
      if (!result) {
        return next(errorResponse('NOT_FOUND', 'Device not found', `id=${id}`, 404));
      }
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DevicesController();
