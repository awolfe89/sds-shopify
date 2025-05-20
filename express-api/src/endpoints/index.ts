import { Router } from 'express';
import healthRoutes from './health';
import documentRoutes from './documents';

const router = Router();

router.use('/health', healthRoutes);
router.use('/documents', documentRoutes);

export default router;