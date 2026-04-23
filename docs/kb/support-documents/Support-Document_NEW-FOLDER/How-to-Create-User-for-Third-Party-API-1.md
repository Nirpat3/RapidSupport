---
source: gdrive
source_folder: support-documents
source_path: Support Document_NEW FOLDER/How to Create User for Third Party API 1.pdf
extracted: 2026-04-23T02:25:54.197Z
sha: 5970e4656b08
category: User & Role Management
tags: bof,howto
---

# How to Create User for Third Party API 1

                  How to Create a User for Third Party API ?
Objective:
This document outlines the steps to create a user for third-party API access in the system.




Step 1: Collect Customer Information
    •   Obtain a valid email address from the customer for whom the API access user will be created.




Step 2: Create a Role for API Access
    1. Log in to BackOffice

    2. Navigate to the Settings section.

    3. Under Settings, go to Staff.

    4. In Staff, select Role Management.

    5. Click on the Add button to create a new role.

    6. In the role creation form:

            o   Provide the Role Name: API ACCESS ROLE

            o   Enable only the E-Commerce Vendor option.

            o   Click Save.




www.rapidrms.com                                                                                Page 1
Step 3: Create a User and Assign the Role
   1. Go to Settings.

   2. Under Settings, navigate to Staff.

   3. In Staff, go to User List.

   4. Click on the Add button to create a new user.




   5. Fill in the personal details in the user creation form.




www.rapidrms.com                                                Page 2
   6. Enable the Third API Access option.

   7. Click Save.




   8. Assign the role to the user:

           o   Go to the User Rights section.

           o   Select the role API ACCESS ROLE from the dropdown menu.

           o   Click Save.




www.rapidrms.com                                                         Page 3
   9. The user will now appear in your User List.




Step 4: Grant API Access
   1. Navigate to the Admin Panel.

   2. Go to the Third Party API section.




www.rapidrms.com                                    Page 4
   3. Select the following details:

           o   Company

           o   Store

           o   User (the user created in Step 3).




   4. Choose only the following APIs:

           o   Get Item List

           o   Get Item By Item Code




www.rapidrms.com                                    Page 5
    5. Click Save.




Step 5: Generate Client ID Using Postman
To integrate the third-party API, you need to generate a Client ID using Postman.

    1. Download and Install Postman:

            o   Download Postman from https://www.postman.com/downloads .




            o   Install it on your local PC.

www.rapidrms.com                                                                    Page 6
   2. Log in to Postman

          o   Open the Postman application.

          o   Navigate to the "Send an API Request" section.




   3. Configure the API Request

          o   Select POST as the request method.

          o   Enter the following URL: https://rapidrmsapi.azurewebsites.net/api/Login/auth

          o   Go to the Body section and select "raw" format.

          o   Enter the following JSON parameters:
              {"grant_type":"token","client_id":"0","Username":"bhavesh.patel@gmail.com","Passwo
              rd":"Admin$123"} (Replace your Username and Password which you created for third-
              party access.)




www.rapidrms.com                                                                              Page 7
   4. Send the API Request

           o   Click on the SEND button.

           o   You will receive a response in JSON format in the body section.

           o   Extract the Client ID from this response.




Step 6: Share Credentials & Client ID with Vendor/Customer
   •   Provide the customer with the following details:

           o   Username : bhavesh.patel@gmail.com

           o   Password : Admin$123

           o   Client ID : 18661

   •   Instruct the customer to share these credentials with the third-party vendor’s contact person.

   •   Provide the customer with the sample API document for reference.




www.rapidrms.com                                                                                Page 8

