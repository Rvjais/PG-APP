import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import multer from 'multer';
import { parse } from 'csv-parse';

const router = Router();

router.use(authMiddleware);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_, file, cb) => {
    if (!file.originalname.match(/\.(csv|txt)$/i)) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { buildingId, floor, isActive } = req.query;
    const where: any = { ownerId: req.userId };

    if (buildingId) where.buildingId = buildingId as string;
    if (floor) { const f = parseInt(floor as string); if (!isNaN(f)) where.floor = f; }
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        building: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ building: { name: 'asc' } }, { floor: 'asc' }, { roomNumber: 'asc' }],
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
      include: {
        building: {
          select: { id: true, name: true, address: true },
        },
      },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { buildingId, name, phone, roomNumber, floor, rentAmount, joinDate, customFieldValues } = req.body;

    if (!buildingId || !name || !phone || !roomNumber) {
      return res.status(400).json({ error: 'Building, name, phone, and room number are required' });
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    const cleanedPhone = phone.replace(/[^\d]/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use 10+ digits with optional + prefix.' });
    }

    // BUG #9 FIX: validate floor is >= 1
    if (floor !== undefined && floor !== null) {
      const floorNum = parseInt(floor, 10);
      if (isNaN(floorNum) || floorNum < 1) {
        return res.status(400).json({ error: 'Floor must be at least 1' });
      }
    }

    const building = await prisma.building.findFirst({
      where: { id: buildingId, ownerId: req.userId },
    });
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        buildingId,
        ownerId: req.userId!,
        name,
        phone,
        roomNumber,
        floor: floor !== undefined && floor !== null ? floor : 1,
        rentAmount: rentAmount !== undefined && rentAmount !== null ? (() => { const v = parseFloat(rentAmount); return isNaN(v) ? null : v; })() : null,
        joinDate: joinDate ? new Date(joinDate) : null,
        customFieldValues: customFieldValues || {},
      },
      include: {
        building: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(tenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { buildingId, name, phone, roomNumber, floor, rentAmount, joinDate, isActive, customFieldValues } = req.body;

    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // BUG #9 FIX: validate floor is >= 1
    if (floor !== undefined && floor !== null) {
      const floorNum = parseInt(floor, 10);
      if (isNaN(floorNum) || floorNum < 1) {
        return res.status(400).json({ error: 'Floor must be at least 1' });
      }
    }

    // Validate building ownership if buildingId is being changed
    if (buildingId && buildingId !== tenant.buildingId) {
      const building = await prisma.building.findFirst({
        where: { id: buildingId, ownerId: req.userId },
      });
      if (!building) {
        return res.status(404).json({ error: 'Building not found or access denied' });
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        buildingId,
        name,
        phone,
        roomNumber,
        floor: floor !== undefined ? floor : tenant.floor,
        rentAmount: rentAmount !== undefined
          ? (() => { const v = parseFloat(rentAmount); return isNaN(v) ? null : v; })()
          : tenant.rentAmount,
        joinDate: joinDate !== undefined ? new Date(joinDate) : tenant.joinDate,
        isActive: isActive !== undefined ? isActive : tenant.isActive,
        customFieldValues: customFieldValues !== undefined ? customFieldValues : tenant.customFieldValues,
      },
      include: {
        building: { select: { id: true, name: true } },
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await prisma.tenant.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tenant deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// FEATURE: Import tenants from CSV
router.post('/import', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const { buildingId } = req.body;

    if (!buildingId) {
      return res.status(400).json({ error: 'Building ID is required' });
    }

    // Validate building ownership
    const building = await prisma.building.findFirst({
      where: { id: buildingId, ownerId: req.userId },
    });
    if (!building) {
      return res.status(404).json({ error: 'Building not found or access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    // Get custom fields for the owner to map custom field columns
    const customFields = await prisma.customField.findMany({
      where: { ownerId: req.userId },
    });

    // Parse CSV
    const records: any[] = [];
    const parser = parse(req.file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    for await (const record of parser) {
      records.push(record);
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Validate and prepare tenants
    const errors: { row: number; field: string; value: string; message: string }[] = [];
    const validTenants: any[] = [];
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 because row 1 is headers, row 2 is first data row
      const rowErrors: typeof errors = [];

      // Required fields
      const name = (row.name || row.Name || row.NAME || '').trim();
      const phone = (row.phone || row.Phone || row.PHONE || row.mobile || row.Mobile || '').replace(/[^\d+]/g, '');
      const roomNumber = (row.roomNumber || row.room_number || row.Room || row.RoomNumber || '').trim();

      // Optional fields
      const floorStr = row.floor || row.Floor || '1';
      const floor = parseInt(floorStr, 10) || 1;
      const rentAmountStr = row.rentAmount || row.rent_amount || row.Rent || row.rent || '';
      const rentAmount = rentAmountStr ? parseFloat(rentAmountStr) : null;
      const joinDateStr = row.joinDate || row.join_date || row.JoinDate || row.joined || '';
      const joinDate = joinDateStr ? new Date(joinDateStr) : null;

      // Validate required fields
      if (!name) {
        rowErrors.push({ row: rowNum, field: 'name', value: row.name || '', message: 'Name is required' });
      }
      if (!phone) {
        rowErrors.push({ row: rowNum, field: 'phone', value: row.phone || '', message: 'Phone number is required' });
      } else if (!phoneRegex.test(phone)) {
        rowErrors.push({ row: rowNum, field: 'phone', value: phone, message: 'Phone must be 7-15 digits' });
      }
      if (!roomNumber) {
        rowErrors.push({ row: rowNum, field: 'roomNumber', value: row.roomNumber || '', message: 'Room number is required' });
      }

      // Collect custom field values
      const customFieldValues: Record<string, any> = {};
      for (const field of customFields) {
        const value = row[field.fieldName] || row[field.fieldName.toLowerCase()] || '';
        if (value) {
          customFieldValues[field.fieldName] = value.trim();
        }
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validTenants.push({
          buildingId,
          ownerId: req.userId!,
          name,
          phone,
          roomNumber,
          floor,
          rentAmount: isNaN(rentAmount as any) ? null : rentAmount,
          joinDate,
          isActive: true,
          customFieldValues,
        });
      }
    }

    // Bulk insert valid tenants
    let imported = 0;
    if (validTenants.length > 0) {
      await prisma.tenant.createMany({
        data: validTenants,
        skipDuplicates: true, // Skip if phone + roomNumber already exists
      });
      imported = validTenants.length;
    }

    res.json({
      success: errors.length === 0,
      total: records.length,
      imported,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Failed to import tenants from CSV' });
  }
});

// GET /tenants/template - Download CSV template
router.get('/template', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const customFields = await prisma.customField.findMany({
      where: { ownerId: req.userId },
    });

    const headers = ['name', 'phone', 'roomNumber', 'floor', 'rentAmount', 'joinDate'];
    const customFieldNames = customFields.map(f => f.fieldName);

    const csvRows = [
      headers.join(','),
      `John Doe,9876543210,101,1,5000,2024-01-15${customFieldNames.length > 0 ? ',' + customFieldNames.join(',') : ''}`,
      `Jane Smith,9876543211,102,1,5500,2024-02-01${customFieldNames.length > 0 ? ',' + customFieldNames.map(() => 'value').join(',') : ''}`,
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tenant_import_template.csv');
    res.send(csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

export default router;