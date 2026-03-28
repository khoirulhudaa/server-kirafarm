  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const { User } = require('../models');
  const { randomUUID } = require('crypto');
  const seller = require('../models/seller');

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

  // const login = async (req, res) => {
  //   try {
  //     const { email, password } = req.body;
  //     const user = await User.findOne({ where: { email } });
  //     if (!user || !(await bcrypt.compare(password, user.password))) {
  //       return res.status(401).json({ success: false, message: 'Invalid credentials' });
  //     }
  //     const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  //     res.json({ success: true, token, user });
  //   } catch (err) {
  //     res.status(500).json({ success: false, message: err.message });
  //   }
  // };


  const login = async (req, res) => {
    try {
      const { email, password } = req.body;
      let userData = null;
      let userType = ''; // Untuk membedakan asal tabel
      let sellerId = null;

      // 1. Cari di tabel User dulu (Buyer/Staff/Admin)
      userData = await User.findOne({ where: { email } });
      
      if (userData) {
        userType = 'USER';
      } else {
        // 2. Jika tidak ada di User, cari di tabel Seller
        userData = await seller.findOne({ where: { email } }); // Asumsi tabel Seller punya field email & password
        if (userData) {
          userType = 'SELLER';
          sellerId = userData.id;
        }
      }

      // 3. Validasi Password
      if (!userData || !(await bcrypt.compare(password, userData.password))) {
        return res.status(401).json({ success: false, message: 'Email atau password salah' });
      }

      console.log('USERDATA', userData)

      // 4. Tentukan Role & Payload JWT
      // Jika dari tabel Seller, role otomatis OWNER/SELLER
      const role = userType === 'SELLER' ? 'OWNER' : userData.role;

      const token = jwt.sign(
        { 
          id: userData.id, 
          role: role,
          sellerId: sellerId // Akan berisi ID jika dia Seller, null jika dia Buyer
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );

      res.json({ 
        success: true, 
        token, 
        user: {
          id: userData.id,
          name: userType === 'SELLER' ? userData.namaToko : userData.name, // Menyesuaikan field nama di tabel Seller
          email: userData.email,
          role: role,
          sellerId: sellerId
        } 
      });

    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  module.exports = { register, login };