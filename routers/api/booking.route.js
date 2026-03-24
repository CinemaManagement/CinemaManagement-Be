const express = require("express");
const router = express.Router();
const bookingController = require("../../controllers/booking.controller");
const verifyRoles = require("../../middlewares/roleMiddleware");
const { ROLE } = require("../../constraints/role");

// Booking specific endpoints
router.post(
  "/movie",
  verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Reserve movie tickets'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.requestBody = {
     required: true,
     content: {
       "application/json": {
         example: {
           "showtimeId": "67d6f295d8a4d18fb2145f2a",
           "seats": ["A1", "A2"],
         }
       }
     }
   }*/

  /* #swagger.responses[201] = {
     description: 'Booking created successfully',
     content: {
       "application/json": {
         example: {
           "success": true,
           "data": {
             "_id": "67d6f39cd8a4d18fb21461f3",
             "showtimeId": "67d6f295d8a4d18fb2145f2a",
             "userId": "67d6ef74d8a4d18fb2144f10",
             "seats": ["A1", "A2"],
             "status": "PENDING"
           }
         }
       }
     }
   }*/
  bookingController.reserveMovieTickets,
);

router.post(
  "/food",
  verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Order food for booking'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.requestBody = {
     required: true,
     content: {
       "application/json": {
         example: {
           "items": [
             { "foodId": "67d6f4f6d8a4d18fb21463a2", "quantity": 2 },
             { "foodId": "67d6f506d8a4d18fb21463ad", "quantity": 1 }
           ]
         }
       }
     }
   }*/
  /* #swagger.responses[201] = {
   description: 'Food booking created successfully',
   content: {
     "application/json": {
       example: {
         "success": true,
         "data": {
           "_id": "67d6f59fd8a4d18fb2146470",
           "userId": "67d6ef74d8a4d18fb2144f10",
           "items": [
             { "foodId": "67d6f4f6d8a4d18fb21463a2", "quantity": 2, "price": 5.5 },
             { "foodId": "67d6f506d8a4d18fb21463ad", "quantity": 1, "price": 4.0 }
           ],
           "totalAmount": 15
         }
       }
     }
   }
 }*/
  bookingController.orderFood,
);

router.post(
  "/:id/pay",
  verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Confirm booking payment'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['id'] = {
     in: 'path',
     description: 'Movie booking id',
     required: true,
     type: 'string',
     example: '67d6f39cd8a4d18fb21461f3'
   }
     */
  /* #swagger.requestBody = {
     required: true,
     content: {
       "application/json": {
         example: {
           "method": "VNPAY",
           "transactionId": "TRX_20260317_0001",
         }
       }
     }
   }
     */
  /* #swagger.responses[200] = {
     description: 'Payment confirmed successfully',
     content: {
       "application/json": {
         example: {
           "message": "Payment confirmed",
           "booking": {
             "_id": "67d6f39cd8a4d18fb21461f3",
             "status": "PAID"
           },
           "finalAmount": 12.5
         }
       }
     }
   }*/
  bookingController.confirmPayment,
);

router.get(
  "/history",
  verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Get booking history'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.responses[200] = {
     description: 'Get booking history successfully',
     content: {
       "application/json": {
         example: {
           "movieBookings": [
             {
               "_id": "67d6f39cd8a4d18fb21461f3",
               "showtimeId": "67d6f295d8a4d18fb2145f2a",
               "seats": ["A1", "A2"],
               "status": "PAID"
             }
           ],
           "foodBookings": [
             {
               "_id": "67d6f59fd8a4d18fb2146470",
               "items": [
                 { "foodId": "67d6f4f6d8a4d18fb21463a2", "quantity": 2 },
               ],
               "totalAmount": 15
             }
           ]
         }
       }
     }
   }*/
  bookingController.getBookingHistory,
);

router.get(
  "/all-history",
  verifyRoles(ROLE.ADMIN, ROLE.CINEMA, ROLE.MANAGER),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Get all booking history in the system'
  // #swagger.security = [{ "bearerAuth": [] }]
  bookingController.getAllBookingHistory,
);

router.post(
  "/:id/checkout",
  verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Checkout: create food booking (optional) and return VNPay payment URL'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['id'] = {
     in: 'path',
     description: 'Movie booking id',
     required: true,
     type: 'string'
   }*/
  /* #swagger.requestBody = {
     required: false,
     content: {
       "application/json": {
         example: {
           "foodItems": [{ "foodId": "67d6f4f6d8a4d18fb21463a2", "quantity": 2 }],
           "discountCode": "SUMMER20"
         }
       }
     }
   }*/
  bookingController.checkoutAndPay,
);

router.get(
  "/:id",
  verifyRoles(ROLE.CUSTOMER, ROLE.ADMIN, ROLE.CINEMA, ROLE.MANAGER),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Get booking detail by ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['id'] = {
     in: 'path',
     description: 'Booking ID (movie or food)',
     required: true,
     type: 'string',
     example: '67d6f39cd8a4d18fb21461f3'
   }*/
  bookingController.getBookingById,
);

router.patch(
  "/:id/checkin",
  verifyRoles(ROLE.CINEMA),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Check in a booking'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['id'] = {
     in: 'path',
     description: 'Movie booking id',
     required: true,
     type: 'string',
     example: '67d6f39cd8a4d18fb21461f3'
   }*/
  /* #swagger.responses[200] = {
     description: 'Check in booking successfully',
     content: {
       "application/json": {
         example: {
           "message": "Checked in successfully",
           "booking": {
             "_id": "67d6f39cd8a4d18fb21461f3",
             "status": "CHECKED_IN"
           }
         }
       }
     }
   }*/
  bookingController.checkIn,
);

router.patch(
  "/:id/cancel",
  verifyRoles(ROLE.CUSTOMER),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Cancel a booking'
  // #swagger.security = [{ "bearerAuth": [] }]
  bookingController.cancelBooking,
);

router.patch(
  "/add-food-order",
  verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Attach a food booking to a movie booking'
  // #swagger.security = [{ "bearerAuth": [] }]
  bookingController.addFoodToBooking,
);

router.patch(
  "/food/:id/cancel",
  verifyRoles(ROLE.CUSTOMER),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Cancel a standalone food booking'
  // #swagger.security = [{ "bearerAuth": [] }]
  bookingController.cancelFoodBooking,
);

router.post(
  "/:id/create-vnpay-url",
  verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Create VNPay payment URL for a booking'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['id'] = {
     in: 'path',
     description: 'Booking id (movie or food)',
     required: true,
     type: 'string',
     example: '67d6f39cd8a4d18fb21461f3'
   }*/
  /* #swagger.requestBody = {
     required: false,
     content: {
       "application/json": {
         example: {
           "discountCode": "SUMMER20"
         }
       }
     }
   }*/
  /* #swagger.responses[200] = {
     description: 'VNPay payment URL created',
     content: {
       "application/json": {
         example: {
           "success": true,
           "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
           "finalAmount": 150000
         }
       }
     }
   }*/
  bookingController.createVnpayPaymentUrl,
);

router.patch(
  "/release-seat",
  verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Release seats for a movie booking'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.requestBody = {
     required: true,
     content: {
       "application/json": {
         example: {
           "movieBookingId": "67d6f39cd8a4d18fb21461f3"
         }
       }
     }
   }*/
  /* #swagger.responses[200] = {
     description: 'Release seats successfully',
     content: {
       "application/json": {
          example: {
            "deleted": true,
            "message": "Release old seats successfully",
            "data":{
            
            }
         }
       }
     }
   }*/
  bookingController.releaseSeat,
);

router.post(
  "/:movieBookingId/get-vietqr-info",
  verifyRoles(ROLE.CUSTOMER, ROLE.CINEMA),
  // #swagger.tags = ['Bookings']
  // #swagger.summary = 'Get VietQR payment information for a booking'
  // #swagger.security = [{ "bearerAuth": [] }]
  /* #swagger.parameters['id'] = {
     in: 'path',
     description: 'Booking id (movie or food)',
     required: true,
     type: 'string',
     example: '67d6f39cd8a4d18fb21461f3'
   }*/
  /* #swagger.requestBody = {
     required: false,
     content: {
       "application/json": {
         example: {
           "foodItems": [
             {"foodId": "67d6f4f6d8a4d18fb21463a2", "quantity": 2},
             {"foodId": "67d6f4f6d8a4d18fb21463a2", "quantity": 2},
           ],
           "discountCode": "SUMMER20"
         }
       }
     }
   }*/
  /* #swagger.responses[200] = {
     description: 'VietQR payment information retrieved',
     content: {
       "application/json": {
         example: {
           "success": true,
           "bankBin": "970422",
           "accountNumber": "123456789",
           "amount": 150000,
           "description": "Booking payment for booking ID: 67d6f39cd8a4d18fb21461f3",
           "bookingId": "67d6f39cd8a4d18fb21461f3"
         }
       }
     }
   }*/
  bookingController.getVietQRInfo,
);

module.exports = router;
