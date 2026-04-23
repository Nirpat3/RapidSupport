---
source: gdrive
source_folder: support-documents
source_path: Support Document_NEW FOLDER/Sample API document_DoorDash 3.pdf
extracted: 2026-04-23T02:25:51.579Z
sha: 49eb02344114
---

# Sample API document_DoorDash 3

                           Sample API Document_DoorDash


                                            Authentication

First, you must log in to your account using your assigned credentials. As stated earlier, this will return
your session token along with other various user settings.



URL: POST https://rapidrmsapi.azurewebsites.net/API/Login/auth



Overview : this Api will be used to authenticate user by username and password. If authentication is
successful then in response we will return you access token along with other required keys explained
in below table of request. This same Api will be used to Refresh the token if it is expired. That time do
not need to pass username and password. Only Refresh_token and Client_id needs to be passed and
that will be returned on first time successful authentication.



If user has a multiple store then after authentication first we will return list of stores then from list client
need to select any one store in which client wants to login. Then have to call same api with same
parameter along with Client_id id that will be in list of store with Keyname = Id.

Headers



 Parameter                            Required                             Description


 Content-Type                         Yes                                  Content          type           e.g.
                                                                           application/json




Request

Pass the following values in the row body to successfully log in.




www.rapidrms.com                                                                                        Page 1
Sample



Token: {"grant_type":"token","refresh_token":"","client_id":"0","username":"xx","Password":"xx"}



Refresh                                                                                       Token:
{"grant_type":"refresh_token","refresh_token":"xx","client_id":"000","username":"","Password":""}

 Parameter                Type                     Required                  Description


 grant_type               string                   Yes                       For      new      token
                                                                             grant_type is “token”
                                                                             and for Refresh token

                                                                             grant_type            is
                                                                             “refresh_token”


 refresh_token            string                   Only when Refresh the While refreshing token
                                                   token after timeout of Here have to pass
                                                   token                  refresh_token

                                                                             That will be returned in
                                                                             response of first time
                                                                             Auth.


 client_id                string                   Required while refresh First      time      this
                                                   token and when user parameter needs to
                                                   have multiple store    pass “0” Not blank
                                                                          string. It must be a “0”
                                                                          ,If user have a multiple
                                                                          store list then in
                                                                          response store list will
                                                                          be returned. Here from
                                                                          this list have to select
                                                                          any one store to login
                                                                          and from this list key
                                                                          “Id” needs to pass in
                                                                          client_id, in response
                                                                          also      client_id     is
                                                                          returned and also while
                                                                          refresh the token this Id
                                                                          need to pass.



www.rapidrms.com                                                                               Page 2
 Username                   String                    Yes (not require while Email of user
                                                      refresh the token)


 Password                   string                    Yes (not require while Password of user
                                                      refresh the token)




Response

if the request is successful, you should receive a response with the following outputs defined.




 Parameter                  Type                      Required                   Description


 {                          json                      Yes                        In     response    of
                                                                                 successful
     "code": "999",
                                                                                 authentication we will
     "message": "OK",                                                            return 7 keys.

   "data":         "{\r\n                                                            1) “Code” = “999”
 \"access_token\":
                                                                                     2) “Message”      =
 \"eyJhbGciOiJIUzI1NiIsI
                                                                                        “ok”
 nR5cCI6IkpXVCJ9.eyJzd
 WIiOiIxODEwNDkiLCJqd                                                                3) access_token =
 GkiOiI5NTFjZjBkMC03                                                                    in this key we
 MjMxLTQ5ZTYtODNm                                                                       will       return
 MC00MWVmMDU2MD                                                                         token that will
 lmYzUiLCJpYXQiOiIxMS                                                                   be used to pass
 8xMy8yMDE5IDEyOjE1                                                                     on next all api’s
 OjQ5IFBNIiwibmJmIjox                                                                   for
 NTczNjQ3MzQ5LCJleHA                                                                    Authorization.
 iOjE1NzM2NDc0MDksI                                                                     Tjhis is a Bearer
 mlzcyI6Imh0dHA6Ly9sb                                                                   token.
 2NhbGhvc3Q6NDcyMD
                                                                                     4) Expires_in   =
 EvYXBpL3ZhbHVlcyIsIm
                                                                                        return seconds
 F1ZCI6Imh0dHA6Ly9sb
                                                                                        in which this
 2NhbGhvc3Q6NDcyMD
                                                                                        token will be
 EvYXBpL3ZhbHVlcyJ9.lg
                                                                                        expired.
 vNDXZ6tg8cuXtpHjiRyhl

www.rapidrms.com                                                                                   Page 3
xrbGYwBiZxQ8vVHUoY         5)    Refresh_token
gw\",\r\n                       = here we will
\"expires_in\": 120,\r\n        return another
\"refresh_token\":              token       that
\"cf9423b173db4331a2            needs to pass
30be140a2c25a9\",\r\n           to       refresh
\"DbName\":                     token      after
\"EQLVMQNWYUUDM                 expired.
34VLWBKPSTDFZ\",\r\n
                           6) DbName         =
\"client_id\":
                              database name
\"181049\"\r\n}"
                              of store.it will
}                             be returned in
                              encrypted
                              format.     This
                              needs to pass in
                              header of next
                              all api’s to
                              generate
                              connection
                              string.

                           7) Client_id = this
                              id needs to pass
                              while
                              refreshing
                              token.




www.rapidrms.com                         Page 4
                                           Get Item list
First, you must log in to your account using your Application Token and assigned credentials. As stated earlier, this
will return your session token along with other various user settings.

URL: GET https://rapidrmsapi.azurewebsites.net/API/Item

Headers


 Parameter        Required          Description



 Content-Type     Yes               Content type e.g. application/json



 DbName           Yes               Database name e.g

                                    EQLVMQNWYUUDM34VLWBKPSTDFZ


                                    (Encrypted format)



 token            yes               Token. need to pass token that is returned in response of Login Api .
                                    e.g
                                    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJKaWduZXNoIFRyaXZlZGkiLCJlbWFpb
                                    CI6InRlc3QuYnRlc3RAZ21haWwuY29tIiwiRGF0ZU9mSm9pbmciOiIyMDEwLTA4LTAyIiwia
                                    nRpIjoiNjlkMjBhMjAtNzcxMy00MGUxLWI4ZDItNDM1MDNmNjUwY2Q2IiwiZXhwIjoxNT
                                    Y5NTkwMTQ0LCJpc3MiOiJUZXN0LmNvbSIsImF1ZCI6IlRlc3QuY29tIn0.NqYJ1Uf9zum7-
                                    2U29zyjzITXLp0H8rvJ2eX8HszyBUA




Request

Pass the following values in the request body to successfully log in.


 Parameter                        Type               Required                     Description




www.rapidrms.com                                                                                              Page 5
Response

if the request is successful, you should receive a response with the following outputs defined.
                               object                                Type      Required            Description

                                                                    Json                   Get bunch of Item in json
 {                                                                                         format

           "itemcode": 8233,

  "description": "Auto 4 web",

           "price": 15.00,

           "active": true,

           "sysid": "0",

           "branchId": 0,

           "pcode": null,

           "sysDeptId": null,

           "groupCode": null,

           "sizeId": 0,

           "costPrice": 0.0,

           "iteM_InStock": 0,

           "iteM_InOrder": 0.0,

           "iteM_MinStockLevel": 0,

           "iteM_MaxStockLevel": 0,

           "item_ImagePath": null,

           "taxApply": false,

           "iteM_Remarks": null,

           "upc": null,

           "iteM_ShortName": null,

           "taxType": null,

           "profit_Type": null,

           "citM_Code": null,

           "child_Qty": 0,

           "userId": 0,



www.rapidrms.com                                                                                                 Page 6
       "isDeleted": false,

       "isFavourite": 0,

       "createdDate": "0001-01-01T00:00:00",

       "rating": 0.0,

       "isPriceAtPOS": 0,

       "isduplicateUPC": false,

       "cashierNote": null,

       "sysSubDeptId": 0,

       "quantityManagementEnabled": false,

       "isItemPayout": false,

       "isTicket": false,

       "isNotDisplayInventory": false,

       "isShortCut": false,

       "action": null,

       "isFoodItem": 0,

      “ITM_Type”:”0”,

       "taxRates": null,

       "tags": [],

       "itemPrices": [

           {

               "itemCode": 8233,

               "priceqtytype": "Single Item",

               "qty": 1.00,

               "cost": 12.00,

               "profit": 20.00,

               "unitPrice": 15.00,

               "priceA": 0.00,

               "priceB": 0.00,

               "priceC": 0.00,




www.rapidrms.com                                Page 7
               "applyprice": "UnitPrice",

               "createdDate": "2020-02-07T13:15:48",

               "isDeleted": false

          },

          {

               "itemCode": 8233,

               "priceqtytype": "Case",

               "qty": 3.00,

               "cost": 36.00,

               "profit": 0.00,

               "unitPrice": 45.00,

               "priceA": 0.00,

               "priceB": 0.00,

               "priceC": 0.00,

               "applyprice": "UnitPrice",

               "createdDate": "2020-02-07T13:15:48",

               "isDeleted": false

          },

          {

               "itemCode": 8233,

               "priceqtytype": "Pack",

               "qty": 5.00,

               "cost": 60.00,

               "profit": 0.00,

               "unitPrice": 75.00,

               "priceA": 0.00,

               "priceB": 0.00,

               "priceC": 0.00,

               "applyprice": "UnitPrice",




www.rapidrms.com                                       Page 8
                 "createdDate": "2020-02-07T13:15:48",

                 "isDeleted": false

             }

        ],

        "itemBarcodes": [

             {

                 "itemCode": 8233,

                "updatedDate": "2020-02-
07T07:45:50.447",

                 "isDefault": true,

                 "isDeleted": false,

                 "packageType": "Single Item",

                 "isUPCAutoGenerated": true,

                 "isDeptBarcode": false,

                 "upc": null

             }

        ],

        "itemVendors": [

             {

                 "id": 6760,

                 "suP_NAME": "Unassign Vendor",

                 "itemcode": 8233,

                 "branchId": 1,

                 "vendorId": 1,

                 "sysId": "1"

             }

        ],

        "itemFeeDesposits": null

    }




www.rapidrms.com                                         Page 9
                             Get Item By Itemcode

First, you must log in to your account using your Application Token and assigned credentials. As stated earlier, this
will return your session token along with other various user settings.




URL: GET https://rapidrmsapi.azurewebsites.net/API/Item/sysid/8217

Here 8217 is sysid that needs to pass along with Url. can use routing to
generate this url.



Headers




 Parameter           Required           Description



 Content-Type        Yes                Content type e.g. application/json



 DbName              Yes                Database name e.g

                                        EQLVMQNWYUUDM34VLWBKPSTDFZ


                                        (Encrypted format)



 token               yes                Token. need to pass token that is returned in response of Login Api
                                        . e.g
                                        eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJKaWduZXNoIFRyaXZlZGkiLCJlb
                                        WFpbCI6InRlc3QuYnRlc3RAZ21haWwuY29tIiwiRGF0ZU9mSm9pbmciOiIyMDEwLTA
                                        4LTAyIiwianRpIjoiNjlkMjBhMjAtNzcxMy00MGUxLWI4ZDItNDM1MDNmNjUwY2Q2I
                                        iwiZXhwIjoxNTY5NTkwMTQ0LCJpc3MiOiJUZXN0LmNvbSIsImF1ZCI6IlRlc3QuY29tIn
                                        0.NqYJ1Uf9zum7-2U29zyjzITXLp0H8rvJ2eX8HszyBUA




www.rapidrms.com                                                                                            Page 10
Request

Pass the following values in the request body to successfully log in.


 Parameter                        Type               Required                     Description




Response

if the request is successful, you should receive a response with the following outputs defined.
 object                                                                 Type     Required         Description

                                                                        Json                      Get bunch of Item in
 {                                                                                                json format

      "itemcode": 8217,

      "description": "test item book",

      "price": 13.50,

      "active": true,

      "sysid": "1",

      "branchId": 0,

      "pcode": null,

      "sysDeptId": null,

      "groupCode": null,

      "sizeId": 0,

      "costPrice": 0.0,

      "iteM_InStock": 0,

      "iteM_InOrder": 0.0,

      "iteM_MinStockLevel": 0,

      "iteM_MaxStockLevel": 0,




www.rapidrms.com                                                                                                Page 11
    "item_ImagePath": null,

    "taxApply": false,

    "iteM_Remarks": null,

    "upc": "12345678912",

    "iteM_ShortName": null,

    "taxType": null,

    "profit_Type": null,

    "citM_Code": null,

    "child_Qty": 0,

    "userId": 0,

    "isDeleted": false,

    "isFavourite": 0,

    "createdDate": "0001-01-01T00:00:00",

    "rating": 0.0,

    "isPriceAtPOS": 0,

    "isduplicateUPC": false,

    "cashierNote": null,

    "sysSubDeptId": 0,

    "quantityManagementEnabled": false,

    "isItemPayout": false,

    "isTicket": false,

    "isNotDisplayInventory": false,

    "isShortCut": false,

    "action": null,

    "isFoodItem": 0,

    “ITM_Type”:”0”,

    "taxRates": null,

    "tags": [

        {




www.rapidrms.com                            Page 12
              "itemId": 8217,

              "branchId": 1,

              "createdDate": "2020-01-31T14:00:00",

              "tagId": 0,

              "sysid": 1,

              "tagName": null,

              "isdeleted": false,

              "userId": 0,

              "action": null

         }

    ],

    "itemPrices": [

         {

              "itemCode": 8217,

              "priceqtytype": "Single Item",

              "qty": 1.00,

              "cost": 0.00,

              "profit": 0.00,

              "unitPrice": 0.00,

              "priceA": 0.00,

              "priceB": 0.00,

              "priceC": 0.00,

              "applyprice": "",

              "createdDate": "2020-01-31T14:00:00",

              "isDeleted": false

         },

         {    "itemCode": 8217,

              "priceqtytype": "Case",

              "qty": 10.00,




www.rapidrms.com                                      Page 13
              "cost": 0.00,

              "profit": 0.00,

              "unitPrice": 0.00,

              "priceA": 0.00,

              "priceB": 0.00,

              "priceC": 0.00,

              "applyprice": "",

              "createdDate": "2020-01-31T14:00:00",

              "isDeleted": false

         },

         {

              "itemCode": 8217,

              "priceqtytype": "Pack",

              "qty": 15.00,

              "cost": 0.00,

              "profit": 0.00,

              "unitPrice": 0.00,

              "priceA": 0.00,

              "priceB": 0.00,

              "priceC": 0.00,

              "applyprice": "",

              "createdDate": "2020-01-31T14:00:00",

              "isDeleted": false

         }

    ],

    "itemBarcodes": [

         {

              "itemCode": 8217,

              "updatedDate": "2020-01-31T14:00:00",




www.rapidrms.com                                      Page 14
              "isDefault": true,

              "isDeleted": false,

              "packageType": "",

              "isUPCAutoGenerated": false,

              "isDeptBarcode": false,

              "upc": "12345678912"

         },

         {

              "itemCode": 8217,

              "updatedDate": "2020-01-31T14:00:00",

              "isDefault": false,

              "isDeleted": false,

              "packageType": "",

              "isUPCAutoGenerated": false,

              "isDeptBarcode": false,

              "upc": "32165498732"

         }

    ],

    "itemVendors": [

         {    "id": 6756,

              "suP_NAME": "Amazon",

              "itemcode": 8217,

              "branchId": 1,

              "vendorId": 13,

              "sysId": "1"

         }

    ],"itemFeeDesposits": null

}




www.rapidrms.com                                      Page 15

