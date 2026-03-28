  const { randomUUID } = require('crypto');
  const { Unit } = require('../models');

  // GET semua unit (hanya ACTIVE)
  const getAll = async (req, res) => {
    try {
      // Ambil sellerId dari query params: /units?sellerId=xxx
      const { sellerId } = req.query;

      // Default filter: hanya yang ACTIVE
      const whereCondition = { status: 'ACTIVE' };

      // Jika sellerId disertakan, tambahkan ke filter WHERE
      if (sellerId) {
        whereCondition.sellerId = sellerId;
      }

      const units = await Unit.findAll({
        where: whereCondition,
        attributes: ['id', 'name', 'fullName', 'description', 'status', 'sellerId', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']],
      });

      res.json({
        success: true,
        count: units.length,
        data: units,
      });
    } catch (err) {
      console.error('Error fetching units:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Gagal mengambil data satuan',
      });
    }
  };

  // GET unit berdasarkan ID
  const getById = async (req, res) => {
    try {
      const { id } = req.params;

      const unit = await Unit.findByPk(id);

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: 'Satuan tidak ditemukan',
        });
      }

      res.json({
        success: true,
        data: unit,
      });
    } catch (err) {
      console.error('Error fetching unit by ID:', err);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil detail satuan',
      });
    }
  };

  // CREATE unit baru
  const create = async (req, res) => {
    try {
      const { name, fullName, description } = req.body;

      if (!name || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'Name dan fullName wajib diisi',
        });
      }

      const unit = await Unit.create({
        id: randomUUID(),
        name,
        fullName,
        description: description || null,
        status: 'ACTIVE',
      });

      res.status(201).json({
        success: true,
        message: 'Satuan berhasil ditambahkan',
        data: unit,
      });
    } catch (err) {
      console.error('Error creating unit:', err);

      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Nama singkatan satuan sudah digunakan',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Gagal menambahkan satuan',
      });
    }
  };

  // UPDATE unit
  const update = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, fullName, description, status } = req.body;

      const unit = await Unit.findByPk(id);
      if (!unit) {
        return res.status(404).json({
          success: false,
          message: 'Satuan tidak ditemukan',
        });
      }

      await unit.update({
        name: name || unit.name,
        fullName: fullName || unit.fullName,
        description: description !== undefined ? description : unit.description,
        status: status || unit.status,
      });

      const updatedUnit = await Unit.findByPk(id);

      res.json({
        success: true,
        message: 'Satuan berhasil diperbarui',
        data: updatedUnit,
      });
    } catch (err) {
      console.error('Error updating unit:', err);

      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Nama singkatan satuan sudah digunakan',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Gagal memperbarui satuan',
      });
    }
  };

  // SOFT DELETE unit
  const softDelete = async (req, res) => {
    try {
      const { id } = req.params;

      const unit = await Unit.findByPk(id);
      if (!unit) {
        return res.status(404).json({
          success: false,
          message: 'Satuan tidak ditemukan',
        });
      }

      await unit.update({ status: 'INACTIVE' });

      res.json({
        success: true,
        message: 'Satuan berhasil dinonaktifkan',
      });
    } catch (err) {
      console.error('Error soft deleting unit:', err);
      res.status(500).json({
        success: false,
        message: 'Gagal menonaktifkan satuan',
      });
    }
  };

  // HARD DELETE unit
  const hardDelete = async (req, res) => {
    try {
      const { id } = req.params;

      const unit = await Unit.findByPk(id);
      if (!unit) {
        return res.status(404).json({
          success: false,
          message: 'Satuan tidak ditemukan',
        });
      }

      await unit.destroy();

      res.json({
        success: true,
        message: 'Satuan berhasil dihapus permanen',
      });
    } catch (err) {
      console.error('Error deleting unit:', err);
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus satuan',
      });
    }
  };

  module.exports = {
    getAll,
    getById,
    create,
    update,
    softDelete,
    hardDelete,
  };