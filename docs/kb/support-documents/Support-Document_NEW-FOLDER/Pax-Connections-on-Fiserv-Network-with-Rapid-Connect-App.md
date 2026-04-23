---
source: gdrive
source_folder: support-documents
source_path: Support Document_NEW FOLDER/Pax Connections on Fiserv Network with Rapid Connect App.docx
extracted: 2026-04-23T02:26:47.847Z
sha: 868fc239db09
category: Payments
tags: pos,ipad,pax,troubleshoot,payment
---

# Pax Connections on Fiserv Network with Rapid Connect App

**[Pax Connections on Fiserv Network with Rapid Connect App]{.underline}**

**1) [Here are the steps]{.underline} :-**

1\. Connect the device to the internet.\
2. The terminal will perform the following updates:\
\
   a. Firmware update  \
   b. Auto-download BroadPOS Manager  \
   c. Auto-download Rapid Connect  \
\
***Note: Allow approximately 30 minutes for everything to complete.***\
\
🡪Once the updates are finished, you will see the Rapid Connect app on the screen.\
\
🡪Next, identify the IP address of the Pax terminal, as you will need this later to enter into the Rapid POS application.

**2)** **[On the Payment Terminal]{.underline} :-**

1\. Open the Rapid Connect app and accept any agreements if they appear.\
2. Once it boots up, you will be on the Pax screen.\
**\
*Note: For the POS to communicate, the terminal must remain on the Pax screen.***

**3)** **[In the Rapid App]{.underline} :-**

1\. Launch the Rapid App.\
2. Go to Settings (bottom center).\
3. Click on Pax Configuration.\
4. Enter the IP address of the Pax terminal.\
5. Enter Port: 10009.\
6. Save the settings.\
7. Ensure that the Protocol is set to HTTP and the Gateway is set to Rapid SDK at the bottom.\
8. Save the settings.\
9. Select Test Connect. If you receive an "Unspecified Error," it means you are connected and ready to process transactions.

**Troubleshooting:**\
\
-**Error 1001.** This means the iPad is not able to communicate with the terminal. You may need to check the network connection.\
- **Error 1200 SSL**: This indicates that the ECR settings do not align correctly.

