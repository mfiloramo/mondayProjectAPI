import express, { Router } from 'express';
import {
  selectAllFragrances,
  addFragrance,
  updateFragrance,
  deleteFragrance,
  syncFragrances, fetchAllFragrancesFromMonday
} from "../controllers/fragrances.controller";


const router: Router = express.Router();

router.get('/', selectAllFragrances);
router.get('/sync', syncFragrances);
router.get('/monday', fetchAllFragrancesFromMonday);
router.post('/', addFragrance);
router.put('/:id', updateFragrance);
router.delete('/:id', deleteFragrance);


export const fragrancesRouter: Router = router;