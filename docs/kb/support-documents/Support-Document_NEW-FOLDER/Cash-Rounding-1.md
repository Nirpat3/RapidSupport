---
source: gdrive
source_folder: support-documents
source_path: Support Document_NEW FOLDER/Cash Rounding 1.docx
extracted: 2026-04-23T02:25:46.602Z
sha: 22c6cab328e9
---

# Cash Rounding 1

In the United States, **rounding cash payments to the nearest nickel (5 cents)** is allowed **only for CASH transactions** when 1-cent coins (pennies) are not used. This is commonly called **cash rounding** and follows widely accepted U.S. Treasury/Federal Reserve guidance (though not a single federal statute).

**Key Rules (Cash Only)**

- Applies **only to the final total** of a cash transaction

- **Electronic payments (card, UPI, ACH, etc.) are NOT rounded**

- Prices and taxes are still calculated to the exact cent

- Rounding must be **neutral** (sometimes up, sometimes down)

**Rounding Table**

  --------------------------------------------
  **Ending Cents**   **Rounded To**
  ------------------ -------------------------
  **1, 2**           Round **down** to **0**

  **3, 4**           Round **up** to **5**

  **6, 7**           Round **down** to **5**

  **8, 9**           Round **up** to **10**

  **0, 5**           No rounding
  --------------------------------------------

### Examples

- **\$10.01 → \$10.00**

- **\$10.02 → \$10.00**

- **\$10.03 → \$10.05**

- **\$10.04 → \$10.05**

- **\$10.06 → \$10.05**

- **\$10.07 → \$10.05**

- **\$10.08 → \$10.10**

- **\$10.09 → \$10.10**

### Important Compliance Points

- Rounding **must not systematically favor the retailer**

- Customers must be **clearly informed** (signage or receipt note)

- Rounding applies **after tax**, not per item

- Legal at federal level; some **state/local disclosure rules** may apply

**Receipt Footer (only for cash)\**
Cash payments rounded to nearest \$0.05 as permitted by law.

**Reporting changes**

PennyRoundOff should be display in "Out" section and consider in Overshort

![C:\\Users\\Rajendra\\Downloads\\Image (2).jfif](media/image1.jpeg){width="5.512271434820647in" height="9.799086832895888in"}

# Configuration

![](media/image2.png){width="6.5in" height="4.6546161417322836in"}

After restart POS will apply rounding as per above document mention **only CASH**

# Execution 

- RCR/Customer display

1.  Bill Amount

2.  Change due

# Reporting 

1.  Out section will display sum of rounding amount so over short will manage

