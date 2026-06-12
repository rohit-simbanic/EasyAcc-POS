import { Request, Response } from 'express';
import Product from '../models/Product';

/**
 * Returns a paginated list of catalog products, optional filtering by sku/name.
 */
export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const totalCount = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      products,
      totalCount,
      page,
      totalPages
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Returns products with stock counts below threshold or expiring in less than 90 days.
 */
export const getInventoryAlerts = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(today.getDate() + 90);

    // Query low stock products
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$stock.quantity', '$stock.lowStockAlert'] }
    });

    // Query products with expiring batches (within 90 days)
    const expiringProducts = await Product.find({
      'batches.expiryDate': { $gte: today, $lte: ninetyDaysLater }
    });

    res.json({
      success: true,
      lowStock: lowStockProducts,
      expiringSoon: expiringProducts
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
