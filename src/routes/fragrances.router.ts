import express, { Router } from 'express';
import {
  selectAllFragrances,
  addFragrance,
  updateFragrance,
  deleteFragrance,
  syncFragrances
} from "../controllers/fragrances.controller";


const router: Router = express.Router();

router.get('/', selectAllFragrances);
router.get('/sync', syncFragrances);
router.post('/', addFragrance);
router.put('/:id', updateFragrance);
router.delete('/:id', deleteFragrance);


export const fragrancesRouter: Router = router;