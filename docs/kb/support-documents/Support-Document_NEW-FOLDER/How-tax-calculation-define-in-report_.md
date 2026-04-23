---
source: gdrive
source_folder: support-documents
source_path: Support Document_NEW FOLDER/How tax calculation define in report_.docx
extracted: 2026-04-23T02:43:29.228Z
sha: b0e0585980d1
category: Reports
tags: pos,ebt,report,gift-card
---

# How tax calculation define in report_

**How tax calculations define in report?**

In rapid RMS POS there one system available for tax calculation.

Tax can be applied on price and also it can be consider into price. Tax calculation is defined in report as per tax name and tax definition.

There is different definition of tax calculation in report.

I tax section four columns are there.

**Tax Type:** Display tax name or tax type.

**Sales Amount**: Display total amount of **sales amount** of sold items under particular tax.

**Tax Amount:** Display total amount of **tax value** sold under particular tax.

**Count:** Display number of times particular tax applied. Display the count based on invoices.

![](media/image1.png){width="6.5in" height="4.5in"}

Variation definition and calculation of tax are as per defined below.

**DEFINED TAX (TAX master)**

This is tax wise calculation. As in tax master is defined and that item is sold in POS then that calculation is consider under that particular tax.

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Total of discounted price of Item in which tax was applied. + Fees (Not cover Check cash, gift card, charge type & coupon amount) - Refund Item in which Tax applied
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------

**EBT TAX**

EBT tax = Total of discounted price of Item in which EBT applied (EBT not apply on Check cash, Payout, charge type) - Total refund item in which EBT applied

EBT is non-tax sales. In other words, when EBT items are sold, there is no tax on them or tax is removed from the item.

Count: Display the count based on Invoices and not line item.

**TAX EXEMPT**

This is all kind of selling in which initially tax is applied but from POS tax is removed via 'Tax remove' option.

Total of discounted price of Item in which tax was removed at ring up time. (Not include EBT) + Fees (Not cover Check cash, gift card, charge type & coupon amount) - Refund Item in which tax was removed.

When tax is removed from item then that kind of selling and that removed tax amount is consider in tax exempt.

**UNASSIGN TAX**

Sold items in which tax is not applied that all are consider under unassigned tax.

+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Total of discounted price of Item in which tax was not applied.(Not include EBT & removed Tax item & Payout Item) + Fees (Not cover Check cash, gift card, charge type & coupon amount) - Refund item in which tax was not applied |
|                                                                                                                                                                                                                                    |
| Display the count based on line item but not invoices                                                                                                                                                                              |
+====================================================================================================================================================================================================================================+

