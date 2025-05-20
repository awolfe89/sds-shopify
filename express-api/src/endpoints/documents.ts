import { Router } from 'express';
import { oauthMiddleware } from '../middleware/oauth';

const router = Router();

/**
 * @route   POST /api/documents
 * @desc    Upload a document
 * @access  Private
 */
router.post('/', oauthMiddleware, (req, res) => {
  // Placeholder for document upload endpoint
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Document upload is not yet implemented'
    }
  });
});

/**
 * @route   GET /api/documents
 * @desc    List all documents
 * @access  Private
 */
router.get('/', oauthMiddleware, (req, res) => {
  // Placeholder for document listing endpoint
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Document listing is not yet implemented'
    }
  });
});

export default router;