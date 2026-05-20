import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const register = async (req, res) => {
  try {
    const { username, password, role } = req.body

    const existingUser = await User.findOne({ username })

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      username,
      password: hashedPassword,
      role: role || 'user',
    })

    res.json(user)

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Registration Failed' })
  }
}

export const login = async (req, res) => {
  try {
    const { username, password, deviceId } = req.body

    const user = await User.findOne({ username })

    if (!user) {
      return res.status(400).json({ message: 'Invalid Username' })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Password' })
    }

    // ADMIN DEVICE LOCK
    if (user.role === 'admin') {
      if (!user.deviceId) {
        user.deviceId = deviceId
        await user.save()
      } else if (user.deviceId !== deviceId) {
        return res.status(403).json({
          message: 'Admin login allowed only on registered device',
        })
      }
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
      },
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Login Failed' })
  }
}