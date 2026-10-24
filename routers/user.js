const express = require('express');
const crypto = require('crypto');
const User = require('../modules/user');
const OTP = require('../modules/otp');
const auth = require('../middleware/auth');
const generateOTP = require('../utils/generateOTP');
const sendEmail = require('../utils/sendEmail');
const router = new express.Router();

// ==================== Auth ====================

// Register — Step 1: Send OTP
router.post('/users/register', async (req, res) => {
  try {
    const { email, password, name, city } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ error: 'Email already registered' });
    }

    const otp = generateOTP();
    console.log(`OTP for ${email}: ${otp}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.findOneAndDelete({ email });
    await OTP.create({
      email,
      otp,
      expiresAt,
      userData: { email, password, name, city },
    });

    await sendEmail({
      to: email,
      subject: 'Your Verification Code',
      html: `
        <h2>Welcome!</h2>
        <p>Your OTP code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
      `,
    });

    res.status(201).send({
      message: 'OTP sent to your email',
      email,
    });
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

// Register — Step 2: Verify OTP
router.post('/users/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpDoc = await OTP.findOne({ email });
    if (!otpDoc) {
      return res.status(400).send({ error: 'OTP expired or not found' });
    }

    if (otpDoc.otp !== otp) {
      return res.status(400).send({ error: 'Invalid OTP' });
    }

    const user = new User({
      ...otpDoc.userData,
      isVerified: true,
    });
    await user.save();

    await OTP.deleteOne({ _id: otpDoc._id });

    const token = await user.generateAuthToken();

    res.status(201).send({ user, token });
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

// Register — Simple (بدون OTP) — للمستخدمين العاديين
router.post('/users', async (req, res) => {
  try {
    const user = new User({
      ...req.body,
      isVerified: true,
    });
    await user.save();
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

// Login
router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (e) {
    res.status(400).send({ error: 'Unable to login' });
  }
});

// Logout
router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(
      (token) => token.token !== req.token
    );
    await req.user.save();
    res.send();
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// Logout All
router.post('/users/logoutAll', auth, async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();
    res.send();
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// Get My Profile
router.get('/users/me', auth, async (req, res) => {
  res.send(req.user);
});

// ==================== Password Reset ====================

// Forgot Password — Send Reset Link
router.post('/users/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ error: 'No user with that email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 min

    await user.save();

    // Send email
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background:#9333ea;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
          Reset Password
        </a>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link expires in 10 minutes.</p>
      `,
    });

    res.send({
      message: 'Password reset email sent',
      resetToken, // ← في الإنتاج، متبعتش التوكن
    });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// Reset Password
router.patch('/users/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;

    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send({ error: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    const token = await user.generateAuthToken();

    res.send({ user, token });
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

// ==================== CRUD ====================

// Get All Users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.send(users);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// Get User by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send({ error: 'User not found!' });
    }
    res.send(user);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// Update User
router.patch('/users/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send({ error: 'User not found!' });
    }
    updates.forEach((update) => {
      user[update] = req.body[update];
    });
    await user.save();
    res.send(user);
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

// Delete User
router.delete('/users/:id', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).send({ error: 'User not found!' });
    }
    res.send({ message: 'Deleted successfully', user });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

module.exports = router;