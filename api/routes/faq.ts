/**
 * Public FAQ Routes
 * Handle public-facing FAQ content retrieval
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../lib/database.js';

const router = Router();

/**
 * Get all active FAQ categories with their items
 * GET /api/faq/categories
 */
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch active categories with their active items
    const categoriesResult = await query(
      `SELECT id, name, description, display_order
       FROM faq_categories
       WHERE is_active = true
       ORDER BY display_order ASC, created_at ASC`
    );

    const categories = categoriesResult.rows || [];

    // Fetch all active items for these categories
    const categoryIds = categories.map(c => c.id);
    
    let items: any[] = [];
    if (categoryIds.length > 0) {
      const itemsResult = await query(
        `SELECT id, category_id, question, answer, display_order
         FROM faq_items
         WHERE category_id = ANY($1) AND is_active = true
         ORDER BY display_order ASC, created_at ASC`,
        [categoryIds]
      );
      items = itemsResult.rows || [];
    }

    // Group items by category
    const categoriesWithItems = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      display_order: category.display_order,
      items: items
        .filter(item => item.category_id === category.id)
        .map(item => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          display_order: item.display_order
        }))
    }));

    res.json({ categories: categoriesWithItems });
  } catch (error: any) {
    console.error('FAQ categories fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch FAQ categories',
      details: error.message 
    });
  }
});

/**
 * Get all active latest updates
 * GET /api/faq/updates
 */
router.get('/updates', async (req: Request, res: Response): Promise<void> => {
  try {
    const updatesResult = await query(
      `SELECT id, title, description, published_date, display_order
       FROM faq_updates
       WHERE is_active = true
       ORDER BY display_order ASC, published_date DESC`
    );

    const updates = (updatesResult.rows || []).map(update => ({
      id: update.id,
      title: update.title,
      description: update.description,
      published_date: update.published_date,
      display_order: update.display_order
    }));

    res.json({ updates });
  } catch (error: any) {
    console.error('FAQ updates fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch FAQ updates',
      details: error.message 
    });
  }
});

export default router;
