import Admin from '../models/Admin.js'

export async function seedAdmin() {
  try {
    const existing = await Admin.findOne({
      email: process.env.ADMIN_EMAIL?.toLowerCase(),
    })

    if (existing) {
      // Sync name/role if they changed in .env
      let updated = false

      if (existing.name !== process.env.ADMIN_NAME) {
        existing.name = process.env.ADMIN_NAME
        updated = true
      }
      if (existing.role !== 'Administrator') {
        existing.role = 'Administrator'
        updated = true
      }

      if (updated) {
        await existing.save()
        console.log(`👤 Admin updated: ${existing.email} → ${existing.name}`)
      } else {
        console.log(`👤 Admin exists: ${existing.email}`)
      }
      return
    }

    await Admin.create({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      name: process.env.ADMIN_NAME,
      role: 'Administrator',
    })

    console.log(`✅ Admin created: ${process.env.ADMIN_EMAIL}`)
  } catch (err) {
    console.error('❌ Failed to seed admin:', err.message)
  }
}