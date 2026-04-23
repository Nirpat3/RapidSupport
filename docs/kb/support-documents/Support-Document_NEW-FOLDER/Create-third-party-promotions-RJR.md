---
source: gdrive
source_folder: support-documents
source_path: Support Document_NEW FOLDER/Create third party promotions  RJR.docx
extracted: 2026-04-23T02:43:48.586Z
sha: a975cd591c12
---

# Create third party promotions  RJR

**[How to create third-party promotions for RJR scan Data?]{.underline}**

- **What is Scan Data?**

<!-- -->

- Scan data are the data recorded by retailers when consumers make purchases. It is mainly used to create discounts or promotions and review each record of the sold item in a store for a particular day. These records are transmitted weekly by the retailer to the particular vendor, Agent, Contractor, affiliate, or service provider through the SFTP site. These data are used for business enhancement and analysis purposes.

**Note:-** Before creating the Scan Data third-party promotions, Please make sure that the Scan data option is ON from BOS.

If the third-party promotion option does not appear, please follow the below steps:-

1.  Login to BOS with your user credentials.

2.  At the top right side, click on three line hamburger ![hamburger-menu-icon-png-white-24.jpg](media/image1.png){width="0.2075404636920385in" height="0.2075404636920385in"} menu.

3.  To select settings, you might need to scroll down.

4.  Choose the module option from the list.

5.  Now, Select the Scan data module option from the list.

![](media/image2.png){width="6.5in" height="3.0150918635170605in"}

- **[Create the third-party promotions: -]{.underline}**

1.  Login to BOS with your user credentials.

2.  In the top right, click on three line hamburger ![hamburger-menu-icon-png-white-24.jpg](media/image1.png){width="0.2075404636920385in" height="0.2075404636920385in"} menu.

3.  Choose the Third-party promotion option from the settings.

![](media/image3.png){width="6.5in" height="3.0108377077865267in"}

4.  Now, Select add tab.

> ![](media/image4.png){width="6.5in" height="3.0003127734033246in"}

5.  Select vendor from the drop-down list.

**Note:-** As of now, we have only two vendors available for third-party promotions which are Alteria and RJR.

6.  Enter the Third-party Promotion name.

> ![](media/image5.png){width="6.5in" height="3.1805314960629922in"}

7.  Enter the quantity on which you want to apply the discount in the Buy Quantity.

> ![](media/image6.png){width="6.5in" height="3.0542957130358706in"}

8.  Enter Vendor Participant Amount.

![](media/image7.png){width="6.5in" height="2.9203893263342082in"}

9.  Enter Total Discount Amount.

> ![](media/image8.png){width="6.5in" height="2.822120516185477in"}

10. Retail Participant amount appears automatically after entering the value of Vendor participant and total discount amount.

The following examples explain how the Retail Participant Amount appears automatically.\
\
**Example:-** The vendor provides a 0.50 cents discount for an item if the store provides 0.50 cents extra discount to their customer. Hence, the total discount amount will be \$1. So when you enter \$1 into The total discount amount. 0.50 cents discount will appear in the Retail participant amount tab automatically. **\**

**Vendor participant discount amount** = 0.50 cents

Total Discount discount amount = \$1\
(Vendor participant discount amount 0.50 cents + discount provided by the store of 0.50 cents)

**Therefore**, Retail participant amount = 0.50 cents.\
\
![](media/image9.png){width="6.5in" height="3.3604647856517937in"}

**Example:-** The vendor gives a 0.50 cents discount for particular items. So when you enter 0.50 cents into The total discount amount. It will not appear anything in the retail participant amount because the discount has been provided by the vendor only.**\**

**Vendor participant discount amount** = 0.50 cents

Total Discount discount amount = 0.50 (Vendor participant discount amount 0.50 cents)

**Therefore,** Retail participant amount = 0.\
\
![](media/image10.png){width="6.5in" height="3.316968503937008in"}

11. Enter quantity in the Quantity Limit per transaction. It is mainly used to restrict for appling a discount on the item per transaction. If Cashier add more then the limit per transcatio in same invoice, In reporting system will count Qty which was already define in Promotion and remaining Qty that discount not calculated. For the safer side Cashier need to add that Item in different invoice for calculation the discount on the scan data items.

**Note : If not want to add Limit in the section so leave blank that filed to avoid any misunderstanding.**\
\
**Example:-** If the user enters 2 quantities in the quantity limit per transaction tab, the discount will only be applied for 1 quantities when you ring up or complete the transaction for items per transaction.\
\
![](media/image11.png){width="6.5in" height="3.3104855643044617in"}

12. Enter promo code.

13. Select promotion types from available options.

    a.  Multipack or Loyalty based on the requirement

![](media/image12.png){width="6.5in" height="3.2253740157480313in"}

14. When add Loyalty Promotion formthe BOS so need to add Promo code must

![](media/image13.png){width="6.5in" height="3.8741043307086613in"}

15. Select the date from which you want to start to apply a discount in the "From" date.

16. Select the date from which you want to close to apply a discount in the "To" date.

17. At the top left side, click on the Next button.

18. Select the items from the list.

![C:\\Users\\siya\\Downloads\\InkedScreenshot_20_LI.jpg](media/image14.jpeg){width="6.5in" height="3.083213035870516in"}

19. You can also select items using the filter option available at the top left side corner of the screen.

![](media/image15.png){width="6.5in" height="3.0240693350831145in"}\
\
![C:\\Users\\siya\\Downloads\\InkedScreenshot_21_LI.jpg](media/image16.jpeg){width="6.5in" height="2.983083989501312in"}\
![C:\\Users\\siya\\Downloads\\InkedScreenshot_22_LI.jpg](media/image17.jpeg){width="6.5in" height="2.990764435695538in"}

20. Click on the Next button again.

> ![C:\\Users\\siya\\Downloads\\InkedScreenshot_23_LI.jpg](media/image18.jpeg){width="6.5in" height="3.0068219597550305in"}

21. The selected items will appear in the preview section.

![C:\\Users\\siya\\Downloads\\InkedScreenshot_24_LI.jpg](media/image19.jpeg){width="6.5in" height="3.0340179352580927in"}

22. At the top left side, click on the Finish button.

23. Now your Scan data discount creatd and you can see them form the List tab by doing filtering.

24. BOS (Scan Data) Promotion automatic created in POS so no need to create same discount form the Promotion moduel of POS.

![](media/image20.png){width="6.5in" height="3.4562073490813647in"}

25. Now see that Discunt not calculated for the item even ring up the same item which are there in Above promotion and fulfill the condition. But the missing point to add customer in thar transaction which was not added in Bill screen.

![](media/image21.png){width="5.174097769028871in" height="3.434194006999125in"}

26. Now add the customer in to the same transaction and see that now discount is calculated based on the promotion define.

![](media/image22.png){width="5.006381233595801in" height="3.274932195975503in"}

**Note: If Cashier take customer loyalty in Promotion option then Cashier must add customer when they ringup item form the RCR (POS).**

- **[New update in Scan Data Function in BOS.]{.mark}**

<!-- -->

- Form now when user create the scan data promotion regardless of Multipack or Loyalty it will automaticly created the same promotion into POS Promotion so no need to create the same from the POS side.

- Now in scan data system will send reminder mail before 7 days to client for Erpitation of the promotion Date and also send mail for wrong Loyalty code at same time.

![](media/image23.png){width="4.105127952755906in" height="3.5226104549431323in"}

> ![](media/image24.png){width="5.326388888888889in" height="3.640972222222222in"}

- Also we support the Validation window when file has any mismatch information and for that it Promt the user and stop submitting that file and ask them to download and see the Error message at the end of the same sheet. Once that error will resolved by user and re submit the same file system allow to upload same file on the vendor server.

![](media/image25.png){width="6.5in" height="2.6864173228346457in"}

![](media/image26.png){width="6.5in" height="1.8775404636920385in"}

- After resolved the error system allow to upload file on the FTP sever.

![](media/image27.png){width="6.5in" height="2.4604516622922135in"}

