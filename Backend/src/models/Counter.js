import mongoose from 'mongoose'

// One document per sequence, e.g. { _id: 'invoice', seq: 5 }.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
})

export default mongoose.model('Counter', counterSchema)