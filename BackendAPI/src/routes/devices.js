'use strict';

const express = require('express');
const controller = require('../controllers/devices');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Devices
 *     description: Operations related to network devices
 */

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: List all devices
 *     tags: [Devices]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         description: Page number for pagination
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: false
 *         description: Devices per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by device type
 *     responses:
 *       200:
 *         description: List of devices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Device'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/devices', controller.list.bind(controller));

/**
 * @swagger
 * /api/devices:
 *   post:
 *     summary: Create a new device
 *     tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceCreate'
 *     responses:
 *       201:
 *         description: Device created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Device'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/devices', controller.create.bind(controller));

/**
 * @swagger
 * /api/devices/{id}:
 *   get:
 *     summary: Get device by ID
 *     tags: [Devices]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Device details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Device'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/devices/:id', controller.getOne.bind(controller));

/**
 * @swagger
 * /api/devices/{id}:
 *   put:
 *     summary: Update device by ID (full)
 *     tags: [Devices]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DeviceUpdate' }
 *     responses:
 *       200:
 *         description: Device updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Device' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.put('/devices/:id', controller.put.bind(controller));

/**
 * @swagger
 * /api/devices/{id}:
 *   patch:
 *     summary: Update device by ID (partial)
 *     tags: [Devices]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DeviceUpdate' }
 *     responses:
 *       200:
 *         description: Device updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Device' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.patch('/devices/:id', controller.patch.bind(controller));

/**
 * @swagger
 * /api/devices/{id}:
 *   delete:
 *     summary: Delete a device
 *     tags: [Devices]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Device deleted
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/devices/:id', controller.remove.bind(controller));

/**
 * @swagger
 * /api/devices/{id}/ping:
 *   get:
 *     summary: Ping device by ID
 *     tags: [Ping]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Ping result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeviceStatus'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/devices/:id/ping', controller.ping.bind(controller));

module.exports = router;
