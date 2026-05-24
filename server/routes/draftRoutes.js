import express from 'express'
import { getDraft, upsertDraft, clearDraft } from '../controllers/draftController.js'

const router = express.Router()

router.get('/inventory-entry',     getDraft)
router.put('/inventory-entry',     upsertDraft)
router.delete('/inventory-entry',  clearDraft)

export default router
