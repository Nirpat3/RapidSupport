---
source: gdrive
source_folder: support-documents
source_path: Payment Processing/Payment terminal Configuration.pdf
extracted: 2026-04-23T02:25:27.568Z
sha: 95f44734dda5
category: Payments
tags: ipad,pax,troubleshoot,payment
---

# Payment terminal Configuration

Payment terminal Configuration
1/9/21        4:26 PM




    Payment terminal Configuration
    Troubleshooting Questions

    Questions:

     1. Did they had network reset?
          a. If so, maybe IP changed on PaxS300
     2. Did they had power failure?
          a. If so, maybe IP changed on PaxS300
     3. For Pax A920
          a. Make sure BroadPOS application is open
     4. PED Tampered Error

    Things go look for:

     1. Check to make sure LAN wire is properly connected. If its disconnected, LAN disconnected will display
        on the screen.
     2. Make sure iPad is in same network as Pax payment terminal device.
         a. Often time iPad are connected to multiple wifi network and it switches between wifi network.


    Payment Terminal Setup

    Pax Onboarding at Pax Portal

     1. Push BroadPOS Manager
     2. Push BroadPOS App (Processor Specific)
     3. Update Firmware as needed

    Firmware Update

    Pax S300 Firmware Update

    Thank you for contacting PAX Technology.

    Your Ticket Number is "364323”: “So open error uai".
    received error message after updating terminal . advised him that firmware , .

    MON Version : 3.19 (r)
         1.   Power off the terminal
         2.   Power On
         3.   Immediately Press Menu (“Func” for semi-integrated terminals)
         4.   Select Remote Download
         5.   Select New Download
         6.   Select TCP/IP (Select the correct connectivity option for the Terminal WCDMA, Wifi, CDMA, etc.)
                1. Enter Remote IP 216.238.144.195 (To get the dots press “1” then the ALPHA key to filter
                    the keypad options)
                2. Enter Port 8582
                3. Enable DHCP (If the caller is using STATIC IP do not enable DHCP and then enter all the
                    static IP information)
                4. Enter TID 30030012, then 30030098
                    firmware was updated and now waiting on the payment application to be updated
                    payment application was successful.

                    made sure that the s300 is connected to the POS.

                    was able to connect . and test transaction was successful

    Pax A35 / A90 Firmware Update

         1.   Terminal Management
         2.   Search the Merchant
         3.   Select the Terminal
         4.   Select App & Firmware (Top sub-menu)
         5.   Select Push Firmware (Right menu)
         6.   Select + Firmware
         7.   Select Next Sequence of Firmware (Identify which firmware is running in Pax, then select next)
                a. Note: You cannot directly jump to most latest firmware
      8.      Select Time / Zone
      9.      Select Activate
     10.      Wait for:
                a. Download
                b. Install
     11.      Verify Installation


    Pax A35 App Selection




    Device Configuration

    Connecting to network

     1. Pax S300, plug the LAN cable into RED cable
     2. Pax A920, this device is connected wirelessly
         a. Go to main screen of the device.
         b. Select device setting
          c. Enter the password
               1. Bank of America
                      1) pax9876@@
         d. Select Wifi
         e. Select the SSID that is on same network as the POS system
          f. Enter the Wifi password
         g. Make sure its successfully connected to the Wifi




    IP Check

    Pax S300

     1. Press Func + 1 together.
          a. Contact your processor to identify how to get to the menu
     2. Enter Password
          a. MMDDYYYY (today’s date, if not try tomorrow’s date)
                1. If password does not work, contact your processor to identify what password they have
                    inserted for the device.
     3. Select Communication (May have to click down arrow)
     4. Select LAN parameter
     5. Select IP Address
     6. Write down the IP address.
     7. Exit to main screen by pressing X on the device. (Multiple press may requires)
     8. Go to POS system configuration for Payment terminal to verify the IP address.

    Pax A920

     1. Open BroadPOS application
     2. IP should be listed on top of the device

    ECR-Terminal Integration

    Pax S300 (Not Applicable)

    BofA Pax A920

     1. Open BroadPOS application
     2. Settings
     3. Enter password
          a. Bank of America: 1 follow by enter
     4. System Settings
     5. ECR-Terminal Integration Mode. Select External Mode
     6. Click Back to exit

    Pax A35

     1. Open BroadPOS application
     2. Settings - Tap top left, top right, bottom right, bottom left
     3. Enter password
          a. Today’s date
     4. System Settings
     5. ECR-Terminal Integration Mode
          a. POS Mode: External Mode
          b. Protocol: HTTP or HTTPS Get
          c. Communication: Ethernet
     6. Click Back to exit


    Communication Type

    Pax S300

     1. Press Func + 1 together.
          a. Contact your processor to identify how to get to the menu
     2. Enter Password
          a. MMDDYYYY (today’s date, if not try tomorrow’s date)
                1. If password does not work, contact your processor to identify what password they have
                     inserted for the device.
     3. Select Communication (May have to click down arrow)
     4. Enter Password again from Step 2
     5. Find ECR and click Enter (May need to click down arrow to go to next page)
     6. Select Ethernet follow by Enter
     7. Port will display as 10009, click Enter
     8. Select HPTT Get or HTTPS Get follow by Enter
     9. Exit to main screen by pressing X on the device. (Multiple press may requires)


    Pax A920 / A35

     1. Open BroadPOS application
     2. Settings (Tap top left, top right, bottom right and bottom left)
     3. Enter password
          a. Enter 1 (BofA)
          b. Today’s Date
          c. Contact your processor for the password
     4. ECR Comm Settings
     5. Ethernet: Enable
     6. Protocol: HTTP or HTTPS Get
     7. Select Host Port and make sure its set to 10009
     8. Click Back to exit

    POS Configuration for Payment Terminal

    Payment Terminal
    Bank of America - PaxA920

     1.       Open Payment Application
     2.       Click Func
     3.       Click Settings
     4.       Enter 1
     5.       Click System Settings
     6.       Click ECR-Terminal Integration Mode
     7.       Select External POS
     8.       Click Back until you reach main screen

    POS
     1.       Select setting bottom of Rapid Home Page
     2.       Enter the pin
     3.       Select Pax Configuration
     4.       Enter the Payment Terminal IP address
     5.       Enter the port 10009
     6.       Click Save
     7.       Click Test Connection. If the connection failed, make sure following:
                a. iPad is in same network as payment terminal.
                b. Payment terminal communication type is set to following:
                      1. Communication to Ethernet
                      2. ECR Protocol to Http Get or Https Get
                      3. For Pax A920 terminal, make sure ECR-Terminal Integration is set to “External Mode”

    Bank of America Requirement

     1. Update the MSCN
     2. Turn on BofA custom receipt format.

    Bank of America Troubleshooting

     1. You MUST settle a batch before updating the software. ALL transaction will be deleted during the
        update.

    Bank of America MSACN Requirement

    How to update the MSCN

     1.       Go to Rapid's Home page.
     2.       On bottom select "Setting"
     3.       Enter your pin
     4.       Select Pax Configuration from left menu
     5.       Follow below steps:
                a. Click "Tech Connection" tab to verify the connection of the Pax payment terminal. Make sure
                    Pax is connected before step b. If you get a failed error, view "Payment Terminal Setup" section
                    of the document to troubleshoot an issue.
               b. Click "Update MSCN", this appears next to Test Connection tab.


    Error Messages

    PED Tempered Error

    Heartland Processing

    Pax S300

    The terminal should pull down the app, but you can try the following steps.

    1. Power cycle the terminal
    2. During the self-test, press the Func key then press cancel
    3. From the menu that is displayed, choose "RemoteDownload"
    4. Choose "New Download"
    5. Next choose the communications method. For S300, use TCP/IP
    6. In the remote IP, enter "50.79.90.190"
    7. Enter "8001" for the port number
    8. Enter the terminal ID (30030030)
    9. Choose Yes if "Auto get local IP address(DHCP)" prompted




    Notes:       Pax A35
                 Datawire Provisioning
                 Pax Technology Support




    Pax Technology Support

     1. Batch is not auto settling
     2. Firmware Update
          a. Make sure to do next firmware update, do not jump the sequence.

