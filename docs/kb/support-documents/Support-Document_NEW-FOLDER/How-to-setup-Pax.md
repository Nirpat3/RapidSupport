---
source: gdrive
source_folder: support-documents
source_path: Support Document_NEW FOLDER/How to setup Pax.docx
extracted: 2026-04-23T02:32:04.096Z
sha: ebf3e3d87ca7
category: Payments
tags: pos,ipad,pax,troubleshoot,setup,howto,payment
---

# How to setup Pax

**[Payment Terminal Configuration]{.underline}**

If you are not able to connect with your Pax. Please follow the below steps to connect your Pax machine.

1.  **[Check Network Connection:-]{.underline}**

<!-- -->

1.  Please make sure that Lan wire is connected properly. If it is not connected, It will appear the error message "Lan Disconnected" on the screen.

2.  The Internet connection is the gateway to connect all devices on the network to communicate with one another. Please make sure Pax and Ipad are connected to the same network.

3.  Please make sure that you have turned on Local Network from Ipad Settings. Please follow the below steps to check Local Network.

- **[Check for Local Network:-]{.underline}**

1.  Go to Settings from your Ipad.

2.  Click on Rapid RMS Application. (May need to scroll down to search Rapid RMS App).

3.  Click on Local Network Toggle button.

- If your devices are connected on the same network and you still cannot connect with the Pax machine. Please follow the below steps.

2.  **[Check Pax Configuration:-]{.underline}**

- Please check entered Pax machine IP address in RapidRMS Application. You may not be able to connect with the Pax machine due to a change of IP address. If you do not remember the Pax IP address, please follow the below steps to get an IP address from the Pax machine.

1.  First, Press the Function and **1** number key together.

2.  Enter a password and press the function key.

> **Note: -** The password is tomorrow\'s date.

3.  Click on the down arrow.

4.  Select the communication option.

5.  Again enter the password and press the function key.

6.  Click on the down arrow again.

7.  Select the Lan parameter and IP address option.

8.  It will appear IP address.

9.  Exit to main screen by pressing X button on device. (Multiple press may requires)

10. Go to POS system configuration for Payment terminal to verify the IP address.

- The IP Port will always be **10009** by default for PaxS300 and Pax A920.

<!-- -->

- **[Please follow the below steps to get an IP port from the Pax machine:-]{.underline}**

1.  First, Press the Function and **1** number key together.

2.  Enter a password and press the function key.

> **Note: -** The password is tomorrow\'s date.

3.  Click on the down arrow.

4.  Select the communication option.

5.  Again enter the password and press the function key.

6.  Click on the down arrow again.

7.  Select the ECR communication type and Ethernet option.

8.  It will appear IP Port.

9.  Exit to the main screen by pressing X button on device. (Multiple press may requires)

10. Go to POS system configuration for Payment terminal to verify the IP Port.

<!-- -->

3.  **[Check ECR Settings:-]{.underline}**

<!-- -->

1.  First, Press the Function and **1** number key together.

2.  Enter a password and press the function key.

**Note: -** The password is tomorrow\'s date.

3.  Click on the down arrow.

4.  Select the communication option.

5.  Again enter the password and press the function key.

6.  Find ECR and click Enter.

7.  Click on the down arrow again.

8.  Select the Ethernet option and click Enter.

9.  Port will display as 10009, Click enter again.

10. Select HTTP get or HTTPS Get and click on enter.

**[Note:-]{.underline}** Please make sure that HTTP and HTTPS options should be selected according to Pax configuration settings from IPad.

  -----------------------------------------------------------------------------
      **Processor**      **Protocol**
  ---------------------- ------------------------------------------------------
      All Processor      It supports **HTTP GET** and **HTTPS Get** Protocol.

      TSYS Processor     It supports HTTP GET Protocol only.
  -----------------------------------------------------------------------------

11. Exit to main screen by pressing X on the device.

<!-- -->

4.  **[Pax Configuration with Ipad :-]{.underline}**

- After getting the Pax Machine IP address and Ip Port.

- Open the Rapid RMS Application.

- Click on the setting option available at bottom of the screen.

- Enter Quick access or four digits pin.

- Click on the Pax configuration option available on the right side of the screen.

- Enter your Ip address and IP Port.

- Set communication to Ethernet.

- Select HTTP and HTTPS options available for communication.

**[Note:-]{.underline}** Please make sure that HTTP and HTTPS options should be selected according to ECR settings from the Pax machine.

- Click or tap on the save button.

- Now, click on the test connection button. If it appears a connection message with a green indication line, which means that you are connected with the Pax machine.

- If it appears failed connection message with a red indication line, which means you may have entered the wrong IP address or IP Port. Please enter your IP address and Ip Port properly and click on the save button again.

If you are still not able to connect the pax machine. Please contact your Payment Processor or Account Manager.

