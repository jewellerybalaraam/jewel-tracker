import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    recordDate:      { type: Date, default: null },
    recordTime:      { type: String, default: '' },
    barcode:         { type: String, required: true, unique: true, index: true },
    productId:       { type: Number, required: true },
    productName:     { type: String, default: '' },
    subProductName:  { type: String, default: '' },
    netWt:           { type: Number, default: 0 },
    size:            { type: String, default: '' },
    makingCharge:    { type: Number, default: 0 },
    pureRate:        { type: Number, default: 0 },
    purity:          { type: String, default: '' },
    status:          { type: String, enum: ['AVAILABLE', 'SOLD'], default: 'AVAILABLE' },
    lotNumber:       { type: Number, default: null, index: true },
    productKey:      { type: String, default: '' },
    serialNo:        { type: Number, default: 0 },
    prefix:          { type: String, default: '' },
    supplierName:    { type: String, default: '' },
  },
  { timestamps: true }
);

inventorySchema.index({ productName: 1, subProductName: 1 });
inventorySchema.index({ status: 1 });

export default mongoose.model('Inventory', inventorySchema);