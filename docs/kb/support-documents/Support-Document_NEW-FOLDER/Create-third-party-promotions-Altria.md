---
source: gdrive
source_folder: support-documents
source_path: Support Document_NEW FOLDER/Create third party promotions  Altria.docx
extracted: 2026-04-23T02:40:56.751Z
sha: fc6374366392
---

# Create third party promotions  Altria

**[How to create third-party promotions for Altria scan Data?]{.underline}**

- **What is Scan Data?**

<!-- -->

- Scan data are the data recorded by retailers when consumers make purchases. It is mainly used to create discounts or promotions and review each record of the sold item in a store for a particular day. These records are transmitted weekly by the retailer to the particular vendor, Agent, Contractor, affiliate, or service provider through the SFTP site. These data are used for business enhancement and analysis purposes.

**Note:-** Before creating the Scan Data third-party promotions, Please make sure that the Scan data option is ON from BOS. Please click [here](file:///F:\Support%20Document\New%20documents\How%20to%20turn%20on%20Scan%20data%20promotion%20from%20Back%20office.docx) to turn on scan data promotion.

- **[Create the third-party promotions: -]{.underline}**

1.  Login to BOS with your user credentials.

2.  In the top right, click on three line hamburger ![hamburger-menu-icon-png-white-24.jpg](media/image1.png){width="0.2075404636920385in" height="0.2075404636920385in"} menu.

3.  Choose Third-party promotion option from the settings.

![](media/image2.png){width="6.5in" height="3.0108377077865267in"}

4.  Now, Select add tab.

![C:\\Users\\siya\\Downloads\\InkedScreenshot_11_LI.jpg](media/image3.jpeg){width="6.5in" height="3.012494531933508in"}

5.  Select vendor from the drop-down list.

**Note:-** As of now, we have only two vendors available for third-party promotions which are Alteria and RJR.

6.  Enter the Third-party Promotion name.

![C:\\Users\\siya\\Downloads\\InkedScreenshot_12_LI.jpg](media/image4.jpeg){width="6.5in" height="3.0273173665791777in"}

7.  Enter the quantity on which you want to apply the discount in the Buy Quantity.

![](media/image5.png){width="6.5in" height="3.009194006999125in"}

8.  Enter Vendor Participant Amount.

![C:\\Users\\siya\\Downloads\\InkedScreenshot_14_LI.jpg](media/image6.jpeg){width="6.5in" height="2.9893274278215225in"}

9.  Enter Total Discount Amount.

![C:\\Users\\siya\\Downloads\\InkedScreenshot_15_LI.jpg](media/image7.jpeg){width="6.5in" height="2.971337489063867in"}

10. Retail Participant amount appears automatically after entering the value of Vendor participant and total discount amount.

The following examples explain how the Retail Participant Amount appears automatically.\
\
**Example:-** The vendor provides a 0.50 cents discount for an item if the store provides 0.50 cents extra discount to their customer. Hence, the total discount amount will be \$1. So when you enter \$1 into The total discount amount. 0.50 cents discount will appear in the Retail participant amount tab automatically. **\**

**Vendor participant discount amount** = 0.50 cents

Total Discount discount amount = \$1\
(Vendor participant discount amount 0.50 cents + discount provided by the store of 0.50 cents)

**Therefore**, Retail participant amount = 0.50 cents.\
\
![](media/image8.png){width="6.5in" height="3.498765310586177in"}

**Example:-** The vendor gives a 0.50 cents discount for particular items. So when you enter 0.50 cents into The total discount amount. It will not appear anything in the retail participant amount because the discount is provided by the vendor only.**\**

**Vendor participant discount amount** = 0.50 cents

Total Discount discount amount = 0.50 (Vendor participant discount amount 0.50 cents)

**Therefore,** Retail participant amount = 0.

![](media/image9.png){width="6.5in" height="3.618086176727909in"}

11. Enter quantity in the Quantity Limit per transaction. It is mainly used to set restrictions to apply a discount on the item per transaction. If Cashier adds more than the limit per transaction in the same invoice, In reporting system will count Qty which was already defined in Promotion, and the remaining Qty that discount was not calculated. For the safer side Cashier need to add that Item in a different invoice for calculating the discount on the scan data items.

**Note : If you do not want to add Limit in the section so leave blank that filed to avoid any misunderstanding.**\
\
**Example:-** If the user enters 10 quantities in the quantity limit per transaction tab, the discount will only be applied for 10 quantities when you ring up or complete the transaction for items per transaction.\
\
![](media/image10.png){width="6.5in" height="3.247458442694663in"}

12. Enter promo code.

13. Select promotion types from available options.

    a.  Multipack or Loyalty based on the requirement

![](media/image11.png){width="6.5in" height="3.593406605424322in"}

14. When you create Loyalty Promotion, you need to enter promo code given by vendor in Back office and click on stackable option. **Note:-** The promotion code is a mandatory field for the Loyalty discount promotion type.

![](media/image12.png){width="6.5in" height="3.7248468941382327in"}

15. Select the date from which you want to start to apply a discount in the "From" date.

16. Select the date from which you want to close to apply a discount in the "To" date.

17. At the top left side, click on the Next button.

18. Select the items from the list.

![C:\\Users\\siya\\Downloads\\InkedScreenshot_20_LI.jpg](media/image13.jpeg){width="6.5in" height="3.083213035870516in"}

19. You can also select items using the filter option available at the top left side corner of the screen.

![](media/image14.png){width="6.5in" height="3.0240693350831145in"}\
\
![C:\\Users\\siya\\Downloads\\InkedScreenshot_21_LI.jpg](media/image15.jpeg){width="6.5in" height="2.983083989501312in"}\
![C:\\Users\\siya\\Downloads\\InkedScreenshot_22_LI.jpg](media/image16.jpeg){width="6.5in" height="2.990764435695538in"}

20. Click on the Next button again.

> ![C:\\Users\\siya\\Downloads\\InkedScreenshot_23_LI.jpg](media/image17.jpeg){width="6.5in" height="3.0068219597550305in"}

21. The selected items will appear in the preview section.

![C:\\Users\\siya\\Downloads\\InkedScreenshot_24_LI.jpg](media/image18.jpeg){width="6.5in" height="3.0340179352580927in"}

22. At the top left side, click on the Finish button.

Your newly created scan data promotion will be appear in the list.

23. When you create the scan data promotion, it will appear automatically in the promotion module from POS. You do not require to create the same promotion from POS now.

![](media/image19.png){width="6.5in" height="3.4917530621172355in"}

24. As you can see in the below image, multipack discount is applied on item but loyalty promotion is not applied due to not selected any customer from Cash register.

![](media/image20.png){width="5.174097769028871in" height="3.434194006999125in"}

25. To add loyalty promotion, you need to add customer from Cash register.

![](media/image21.png){width="5.006381233595801in" height="3.274932195975503in"}

- **New update in Scan Data Function in BOS.**

<!-- -->

- Now our system will send mail to remind you to upload your weekly scan data transaction so you do not forgot any files to upload from Back office.

![](media/image22.png){width="3.9713254593175855in" height="3.407794181977253in"}

> ![](media/image23.png){width="5.326388888888889in" height="3.640972222222222in"}

- When you upload scan data file and if you have any missing information, it will open validation widow so you can download the error file and verify the issue mentioned in remarks column from excel sheet. User can re-submit the file, once that error resolved from excel sheet.

![](media/image24.png){width="6.5in" height="2.6864173228346457in"}

![](media/image25.png){width="6.5in" height="1.8775404636920385in"}

- Once you resolved the error, system will allow you to upload file on the FTP sever.

![](media/image26.png){width="6.5in" height="2.4604516622922135in"}

