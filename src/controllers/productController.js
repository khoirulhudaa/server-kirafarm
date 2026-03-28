const { randomUUID } = require('crypto');
const { Product, Category, Unit, Seller } = require('../models');
const cloudinary = require('cloudinary').v2;

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const folderAndFile = parts.slice(parts.indexOf('upload') + 2).join('/');
  return folderAndFile.split('.')[0];
};

/**
 * Helper: Upload Buffer ke Cloudinary via Stream
 */
const streamUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "products" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};

// GET semua produk dengan Detail Error
const getAll = async (req, res) => {
  try {
    const products = await Product.findAll({
     include: [
        { 
          model: Seller, 
          as: 'seller', // Wajib ada karena di model didefinisikan pakai 'as'
          attributes: ['id', 'namaToko', 'slug'] 
        },
        { model: Category, attributes: ['name'] },
        { model: Unit, attributes: ['name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: products });
  } catch (err) {
    // Log ke terminal (Server Side) untuk melihat stack trace lengkap
    console.error('--- DEBUG ERROR START ---');
    console.error('Message:', err.message);
    console.error('Name:', err.name);
    if (err.sql) console.error('SQL Query:', err.sql); // Muncul jika error database
    console.error('--- DEBUG ERROR END ---');

    // Kirim detail ke frontend (Client Side) agar Anda tahu apa yang salah
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengambil data produk',
      errorType: err.name,
      errorMessage: err.message,
      // hint membantu menebak penyebab umum
      hint: err.message.includes('belongsTo') 
            ? 'Cek relasi/association di model Product' 
            : 'Cek apakah kolom sellerId/categoryId sudah ada di tabel Products'
    });
  }
};

const getMyProducts = async (req, res) => {
  try {
    // Mengambil dari URL (?sellerId=...)
    const { sellerId } = req.query;

    console.log("DEBUG target sellerId from Query:", sellerId);

    if (!sellerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query parameter sellerId wajib dikirim' 
      });
    }

    const products = await Product.findAll({
      where: { sellerId: sellerId }, 
      include: [
        { model: Category, attributes: ['name'], required: false },
        { model: Unit, attributes: ['name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ 
      success: true, 
      count: products.length,
      data: products 
    });
  } catch (err) {
    console.error("ERROR getMyProducts:", err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengambil data produk',
      error: err.message 
    });
  }
};

// GET produk berdasarkan ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id, {
      include: [Category, Unit],
    });
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail produk' });
  }
};

// CREATE produk
const create = async (req, res) => {
  try {
    const { code, name, price, stock, description, origin, categoryId, unitId } = req.body;
    const sellerId = req.user.sellerId;
    
    if (!sellerId) {
      return res.status(403).json({ success: false, message: 'Hanya akun seller yang bisa menambah produk' });
    }

    // Validasi data wajib
    if (!code || !name || !price || !categoryId || !unitId) {
      return res.status(400).json({ success: false, message: 'Data wajib belum lengkap' });
    }

    let thumbnailUrl = null;
    
    // Jika ada file gambar yang diupload via multer
    if (req.file) {
      const uploadResult = await streamUpload(req.file.buffer);
      thumbnailUrl = uploadResult.secure_url;
    }

    const product = await Product.create({
      id: randomUUID(),
      code,
      name,
      price,
      stock: stock || 0,
      description,
      thumbnail: thumbnailUrl,
      origin,
      status: 'ACTIVE',
      categoryId,
      unitId,
      sellerId
    });

    const newProduct = await Product.findByPk(product.id, { include: [Category, Unit] });
    res.status(201).json({ success: true, message: 'Produk ditambahkan', data: newProduct });
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Kode produk sudah digunakan' });
    }
    res.status(500).json({ success: false, message: 'Gagal menambahkan produk' });
  }
};

// UPDATE produk
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user.sellerId;
    const { name, code, price, stock, description, origin, categoryId, unitId } = req.body;

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

    // SECURITY CHECK: Pastikan seller hanya mengupdate produk miliknya sendiri
    if (product.sellerId !== sellerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke produk ini' });
    }

    let thumbnailUrl = product.thumbnail;

    // Jika user mengunggah file baru
    if (req.file) {
      // Hapus foto lama di Cloudinary jika ada
      if (product.thumbnail) {
        const oldPublicId = getPublicIdFromUrl(product.thumbnail);
        if (oldPublicId) await cloudinary.uploader.destroy(oldPublicId);
      }
      
      // Upload gambar baru
      const uploadResult = await streamUpload(req.file.buffer);
      thumbnailUrl = uploadResult.secure_url;
    }

    await product.update({
      name,
      code,
      price,
      stock,
      description,
      origin,
      categoryId,
      unitId,
      thumbnail: thumbnailUrl
    });

    const updatedProduct = await Product.findByPk(id, { include: [Category, Unit] });
    res.json({ success: true, message: 'Produk diperbarui', data: updatedProduct });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui produk' });
  }
};

// SOFT DELETE
const softDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

    await product.update({ status: 'INACTIVE' });
    res.json({ success: true, message: 'Produk dinonaktifkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menonaktifkan produk' });
  }
};

// HARD DELETE
const hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    const sellerId = req.user.sellerId;
    if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

    // SECURITY CHECK
    if (product.sellerId !== sellerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    if (product.thumbnail) {
      const publicId = getPublicIdFromUrl(product.thumbnail);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    }

    await product.destroy();
    res.json({ success: true, message: 'Produk berhasil dihapus permanen' });
  } catch (err) {
    console.error('Error hard deleting:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus produk' });
  }
};

module.exports = { getAll, getById, create, update, softDelete, hardDelete, getMyProducts };