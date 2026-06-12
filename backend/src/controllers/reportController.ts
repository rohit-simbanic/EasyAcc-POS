import { Request, Response } from 'express';
import Invoice from '../models/Invoice';

/**
 * Generates an aggregated GSTR-1 compliant tax filing JSON payload.
 */
export const getGstr1Report = async (req: Request, res: Response) => {
  try {
    const invoices = await Invoice.find({ syncStatus: 'synced' });

    const b2b: any[] = [];
    const b2cs: any[] = [];
    const hsnSummaryMap: Map<string, any> = new Map();

    for (const inv of invoices) {
      // 1. Process B2B vs B2CS
      if (inv.customerGSTIN && inv.customerGSTIN.trim() !== '') {
        // Business to Business Invoice (B2B)
        b2b.push({
          ctin: inv.customerGSTIN,
          inv: [{
            inum: inv.invoiceNumber,
            idt: inv.date.toISOString().slice(0, 10),
            val: parseFloat(inv.totals.grandTotal.toString()),
            pos: inv.billingStateCode,
            itms: inv.items.map(item => ({
              num: 1,
              itm_det: {
                txval: parseFloat(item.taxableValue.toString()),
                rt: item.gstRate,
                iamt: parseFloat(item.igst.toString()),
                camt: parseFloat(item.cgst.toString()),
                samt: parseFloat(item.sgst.toString())
              }
            }))
          }]
        });
      } else {
        // Business to Consumer Small (B2CS) - Aggregated by State Code & Tax Rate
        b2cs.push({
          pos: inv.billingStateCode,
          txval: parseFloat(inv.totals.taxableAmount.toString()),
          rt: inv.items[0]?.gstRate || 0,
          iamt: parseFloat(inv.totals.totalIGST.toString()),
          camt: parseFloat(inv.totals.totalCGST.toString()),
          samt: parseFloat(inv.totals.totalSGST.toString())
        });
      }

      // 2. Aggregate HSN Summary
      for (const item of inv.items) {
        const key = `${item.hsnCode}_${item.gstRate}`;
        if (!hsnSummaryMap.has(key)) {
          hsnSummaryMap.set(key, {
            hsn_sc: item.hsnCode,
            desc: item.name,
            uqc: 'U', // Unit quantity code
            qty: 0,
            val: 0,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0
          });
        }
        const existing = hsnSummaryMap.get(key);
        existing.qty += item.quantity;
        existing.txval += parseFloat(item.taxableValue.toString());
        existing.val += parseFloat(item.taxableValue.toString()) + 
                         parseFloat(item.cgst.toString()) + 
                         parseFloat(item.sgst.toString()) + 
                         parseFloat(item.igst.toString());
        existing.iamt += parseFloat(item.igst.toString());
        existing.camt += parseFloat(item.cgst.toString());
        existing.samt += parseFloat(item.sgst.toString());
      }
    }

    res.json({
      success: true,
      reportDate: new Date(),
      gstr1: {
        b2b,
        b2cs,
        hsn: {
          data: Array.from(hsnSummaryMap.values())
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
