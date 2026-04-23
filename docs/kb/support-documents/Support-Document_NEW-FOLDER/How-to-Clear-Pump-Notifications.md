---
source: gdrive
source_folder: support-documents
source_path: Support Document_NEW FOLDER/How to Clear Pump Notifications.docx
extracted: 2026-04-23T02:36:45.832Z
sha: 3977434742af
category: Fuel & Pump
tags: pos,bof,troubleshoot,howto
---

# How to Clear Pump Notifications

**[How to Clear Pump Notification?]{.underline}**

- **Please follow the below steps:-**

1.  We have two types of Fuel Transcation.

- Post-Pay.

- Pre-Pay.

2.  POST-PAY Transcation : Status must be in "Charged".

PRE-PAY Transcation : Status must be in "Refund".

**[NOTE]{.underline}** : if both status is missing on POS then we can change it from BackOffice, if its required.

3.  Post-Pay Transcation.

If it's "Charged" status then transcation must be ringup. If it's not ringup then we will get error popup like

\"**The transcation is locked by another POS**\"

![](media/image1.png){width="6.5in" height="4.225445100612424in"}

In this case, we need to go into \"PENDING\" section on POS screen and we have to select that locked transcation and hit the below \"Unlock\" button. After that user can rignup the transcation and finish tender.

![](media/image2.png){width="6.5in" height="5.066765091863517in"}

\"**The transcation is not available**\"

In this case, we need to check communication between POS and commander.

4.  Initiated Stage

![](media/image3.png){width="6.5in" height="4.3181758530183725in"}

**[PRE-PAY with INITIATED stage]{.underline}** : Select Pre-Pay transcation and hit "**APPROVE**" button.

If customer does not want fuel OR he left from store that time hit the "**CANCEL**" button and refund the balance amount.

**[POST- PAY with INITIATED Stage]{.underline}** : Select Post-Pay transcation and hit the \"**Sync**\" button and it will Prompt altert message for delete the transcation. once you delete then transcation will be cleared.

