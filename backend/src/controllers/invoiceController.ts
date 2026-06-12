import { Request, Response } from 'express';
import Invoice from '../models/Invoice';

/**
 * Returns a paginated list of invoices, optional filtering by invoiceNumber or customerName.
 */
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const query: any = {};
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    const totalCount = await Invoice.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    const invoices = await Invoice.find(query)
      .sort({ date: -1 }) // Newer invoices first
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      invoices,
      totalCount,
      page,
      totalPages
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
