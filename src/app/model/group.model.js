import mongoose from 'mongoose';
import { connectToDatabase } from '../../lib/database/mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    default: ''
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: ''
  }
});

let Group;
try {
  Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
} catch (error) {
  Group = mongoose.model('Group', groupSchema);
}

export default Group;