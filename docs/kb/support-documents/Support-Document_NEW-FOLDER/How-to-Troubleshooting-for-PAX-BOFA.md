---
source: gdrive
source_folder: support-documents
source_path: Support Document_NEW FOLDER/How to Troubleshooting for PAX-BOFA.docx
extracted: 2026-04-23T02:31:56.400Z
sha: 09e07491c1cf
---

# How to Troubleshooting for PAX-BOFA

**[How to Troubleshooting for PAX - BOFA]{.underline}**

**1) [Network Error 1001]{.underline} :-**

**A. Verify the Pax and iPad are on same network.**

The Internet connection is the gateway to connect all devices on the network to communicate with one another. Please make sure Pax and Ipad are connected to the same network.

**B. Verify the IP of the Pax is same under the Rapid Application \> Settings \> Pax Configuration \> IP Address.**

![](media/image1.png){width="6.268055555555556in" height="3.219666447944007in"}

**C. Verify that Pax is configured for External POS (Pax to POS communication).**

Please follow below steps and screenshort to verify the same.

- Open Your BOFA Application from Home Screen.

- Click on Setting icon.

- Enter a password 1 and click on Enter button.

- Find "System Settings" and click Enter.

- Select the ECR Terminal Integration Mode and click Enter.

- Select External POS.

![](media/image2.png){width="3.6638888888888888in" height="5.855201224846894in"}

**2)** **[Restart the devices if #1 steps are configured correctly]{.underline} :-**

A. Restart the Pax\
B. Restart the iPad\
C. Repeat Step #1

**3)** **[SSL Error]{.underline}** **:-**

**A. Verify the ECR Setup**.\
i. Communication: Ethernet\
ii. Protocol: HTTP Get (Preffered for default) or HTTPS Get

Please follow below steps and screenshort to verify the ECR Setup.

- Open Your BOFA Application from Home Screen.

- Click on Setting icon.

- Enter a password 1 and click on Enter button.

- Find "**ECR Comm Settings**" and click Enter.

- Select the Ethernet option and click Enter.

- Port will display as **10009**, Click enter again.

- Select HTTP Get or HTTPS Get and click on enter.

**[Note:-]{.underline}** Please make sure that HTTP and HTTPS options should be selected according to Pax configuration settings from IPad.

  ----------------------------------------------------------------------------
      **Processor**                          **Protocol**
  --------------------- ------------------------------------------------------
      All Processor      It supports **HTTP GET** and **HTTPS GET** Protocol.

     TSYS Processor              It supports HTTP GET Protocol only.
  ----------------------------------------------------------------------------

- Exit to main screen by pressing \< on the device.

![](media/image3.png){width="3.7604166666666665in" height="4.137029746281715in"}

![](media/image4.png){width="3.8541666666666665in" height="3.9768274278215223in"}

![](media/image5.png){width="3.53125in" height="3.9147714348206475in"}

![](media/image6.png){width="3.2708333333333335in" height="4.393590332458443in"}

![](media/image7.png){width="3.3645833333333335in" height="7.09375in"}

**B. Go to Rapid Application and match the configuration for protocol under Pax Configuration.**

![](media/image1.png){width="6.268055555555556in" height="3.219666447944007in"}

