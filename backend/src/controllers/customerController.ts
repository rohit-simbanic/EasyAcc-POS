import { Request, Response } from 'express';
import Customer from '../models/Customer';
import Invoice from '../models/Invoice';

/**
 * Returns a statement of outstanding transactions (Ledger/Khata) for a customer.
 */
export const getCustomerLedger = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const customerInvoices = await Invoice.find({ customerId: id }).sort({ date: 1 });

    // Build transaction ledger entries
    let runningBalance = 0;
    const entries = customerInvoices.map(invoice => {
      const grandTotal = parseFloat(invoice.totals.grandTotal.toString());
      runningBalance += grandTotal;

      return {
        date: invoice.date,
        reference: invoice.invoiceNumber,
        invoiceId: invoice._id,
        type: 'Invoice (Debit)',
        amount: grandTotal,
        runningBalance
      };
    });

    res.json({
      success: true,
      customer: {
        name: customer.name,
        gstin: customer.gstin,
        currentBalance: customer.balance
      },
      ledger: entries
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
