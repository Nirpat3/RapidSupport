---
source: gdrive
source_folder: support-documents
source_path: Support Document_NEW FOLDER/How can I verify status in the reconcile page.docx
extracted: 2026-04-23T02:41:59.539Z
sha: f6ad23963691
---

# How can I verify status in the reconcile page

**How can I verify status in the reconcile page?**

Based on order and receive qty system display status in the reconcile page.

Follow below steps to import EDI File.

- Open any browser, Go to [[https://www.rapidrms.com/Account/Branchlogin]{.underline}](https://www.rapidrms.com/Account/Branchlogin)

- In the Sign in page, Login with your store credential.

- In the Left side menu, in inventory go to EDI File option.

- Before importing an EDI file with existing order we should have order so first create one open order from PO.

- Purchase order -\> Purchase order list -\> Add items -\> Add Qty Reorder -\> enter Po title -\>select items -\> click on 'Create Open order.

- One order would be created.

![](media/image1.png){width="6.5in" height="3.0555555555555554in"}

- Now go to the EDI purchase page.

- For adding a new EDI file click on add new option.

- After clicking on add new option then window for import EDI file data would open.

- From the drop down list, select file type (Ex. Fintech, EbyBrown, WLpetrey, Amcon, WholeSalellc and HTHackney) which is already defined.

- Upload file from your pc base on selected file type and after it, uploaded file would display with its name and extension.

- In Vendor field, select vendor if vendor not present under uploaded file if present then it automatically fetch from EDI file.

- From the **Open order** field, **choose 'Existing open order'**.

- When you choose an existing open order then an open order list popup would be displayed.

- Select the order which was created in above point and click on 'Select OO' button.

- One new Open Order Title field would be displayed with order title in non editable mode and 'change OO' button.

- Enter Invoice# and click on the 'Import' button.

- EDI file would be imported and page redirects on the reconcile page with EDI file data

![](media/image2.png){width="6.5in" height="3.013888888888889in"}

- Now Verify status of all imported items based on Qty Purchase and qty Receive.

> Qty Purchase = Qty Receive -\> **Match**
>
> Qty Purchase \< Qty Receive -\> **Over**
>
> Qty Purchase \> Qty Receive -\> **Short**

![](media/image3.png){width="6.5in" height="2.986111111111111in"}

