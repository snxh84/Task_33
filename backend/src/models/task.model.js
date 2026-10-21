const mongoose = require('mongoose');

/**
 * Task model — matches the data model in the API plan (§3).
 *
 * Notes:
 *  - `timestamps: true` manages createdAt / updatedAt.
 *  - The schema exposes `id` (not `_id`) so clients treat the id as an
 *    opaque string (§4.1).
 *  - The pre-save hook keeps `completed` (checkbox) and `status` (enum)
 *    in step with each other — challenge C3: whenever one of them is
 *    written, the other is derived from it. `status` wins when both are
 *    sent, so a single write path can never leave them contradicting.
 *  - Compound indexes back the list filters and sort (challenge C5).
 */
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title is required'],
      maxlength: [200, 'Title must be at most 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must be at most 2000 characters'],
      default: '',
    },
    completed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in-progress', 'completed'],
        message: 'Status must be pending, in-progress or completed',
      },
      default: 'pending',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be low, medium or high',
      },
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, 'Category must be at most 100 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Keep the two representations of completion consistent (C3).
taskSchema.pre('save', function keepStatusInSync(next) {
  if (this.isModified('status')) {
    this.completed = this.status === 'completed';
  } else if (this.isModified('completed')) {
    if (this.completed) {
      this.status = 'completed';
    } else if (this.status === 'completed') {
      this.status = 'pending';
    }
  }
  next();
});

// Indexes for the list endpoint's filters and sort (C5).
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
