  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const { User, Seller } = require('../models');
  const { randomUUID } = require('crypto');

  const register = async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;
      
      // Cek apakah email sudah terdaftar di User
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });

      const hashed = await bcrypt.hash(password, 10);
      
      const user = await User.create({
        id: randomUUID(),
        name,
        email,
        phone,
        password: hashed,
        role: 'BUYER', // Default sekarang BUYER
      });

      res.status(201).json({ success: true, message: 'Registrasi berhasil', data: user });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  };

  const login = async (req, res) => {
    try {
      const { email, password } = req.body;
      let userData = null;
      let sellerInfo = null;
      let finalSellerId = null;

      // 1. Cari di tabel User DAN sertakan relasi Seller (jika ada)
      // Asumsi: Di model User sudah ada relasi as: 'seller'
      userData = await User.findOne({ 
        where: { email },
        include: [{ model: Seller, as: 'seller' }] 
      });

      if (userData) {
        // Jika ditemukan di tabel User, cek apakah dia punya data Seller terkait
        finalSellerId = userData.seller ? userData.seller.id : null;
        sellerInfo = userData.seller; // Simpan object seller jika ada
      } else {
        // 2. Jika tidak ada di User, baru cari di tabel Seller
        userData = await Seller.findOne({ where: { email } });
        if (userData) {
          finalSellerId = userData.id;
          sellerInfo = userData;
        }
      }

      // 3. Validasi User & Password
      if (!userData || !(await bcrypt.compare(password, userData.password))) {
        return res.status(401).json({ success: false, message: 'Email atau password salah' });
      }

      // 4. Tentukan Role
      // Jika data dari tabel Seller langsung, role otomatis OWNER. 
      // Jika dari tabel User, gunakan role dari database.
      const role = finalSellerId && !userData.role ? 'OWNER' : userData.role;
      const displayPhone = sellerInfo ? sellerInfo.whatsapp : (userData.phone || "");

      const token = jwt.sign(
        { 
          id: userData.id, 
          role: role,
          sellerId: finalSellerId 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );

      res.json({ 
        success: true, 
        token, 
        user: {
          id: userData.id,
          name: userData.name || userData.namaToko,
          email: userData.email,
          role: role,
          phone: displayPhone,
          // Pastikan object seller dikirim lengkap agar frontend bisa simpan ke localStorage
          seller: sellerInfo ? {
            id: sellerInfo.id,
            namaToko: sellerInfo.namaToko,
            slug: sellerInfo.slug
          } : null
        } 
      });

    } catch (err) {
      console.error("Login Error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  };

  module.exports = { register, login };