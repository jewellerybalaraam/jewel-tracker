import mongoose from 'mongoose'

/*
  Stores the in-progress state of the Inventory Entry wizard
  so a user can leave the page (or device) and resume right
  where they left off.

  ownerKey = username or email (whatever uniquely identifies a user
             in this app — see AuthContext / localStorage 'user').
*/

const inventoryDraftSchema = new mongoose.Schema(
  {
    ownerKey:   { type: String, required: true, unique: true, index: true },

    // wizard step: 1 = lot details, 2 = items entry
    step:       { type: Number, default: 1 },

    // the LOT we are currently working on (if already saved)
    lotNumber:  { type: Number, default: null },

    // raw form payload — kept generic so the UI can evolve freely
    formData:   { type: mongoose.Schema.Types.Mixed, default: {} },

    // index of the product the user was last editing (for step 2)
    activeProductKey: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.model('InventoryDraft', inventoryDraftSchema)
