const MovieBooking = require("../models/MovieBooking");
const FoodBooking = require("../models/FoodBooking");
const Showtime = require("../models/Showtime");
const Discount = require("../models/Discount");
const Food = require("../models/Food");
const STATUS = require("../constraints/status");
const crypto = require("crypto");

const reserveMovieTickets = async (req, res) => {
  try {
    const { showtimeId, seats } = req.body; // seats: [seatCode]
    const userId = req.userId;

    const showtime = await Showtime.findById(showtimeId);
    if (!showtime) return res.status(404).json({ message: "Showtime not found" });

    // Validate seats
    let totalAmount = 0;
    const reservedSeatsDetails = [];

    for (const seatCode of seats) {
      const seatObj = showtime.seats.find(s => s.seatCode === seatCode);
      if (!seatObj) {
        return res.status(400).json({ message: `Seat ${seatCode} is invalid for this showtime` });
      }
      if (seatObj.status !== STATUS.AVAILABLE) {
        return res.status(400).json({ message: `Seat ${seatCode} is not available` });
      }

      // Mark showtime seat as HELD
      seatObj.status = STATUS.HELD;
      totalAmount += seatObj.price;
      
      // Determine type based on price matching pricingRules (approximate fallback)
      let type = "NORMAL";
      if (seatObj.price === showtime.pricingRule.VIP) type = "VIP";
      if (seatObj.price === showtime.pricingRule.COUPLE) type = "COUPLE";

      reservedSeatsDetails.push({
        seatCode: seatObj.seatCode,
        type, 
        price: seatObj.price
      });
    }

    await showtime.save();

    const bookingCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    // Held tickets expire in 10 minutes if not paid
    const expiredAt = new Date(Date.now() + 10 * 60 * 1000); 

    const newBooking = new MovieBooking({
      bookingCode,
      showtimeId,
      userId,
      seats: reservedSeatsDetails,
      totalAmount,
      status: STATUS.HELD,
      expiredAt
    });

    await newBooking.save();

    res.status(201).json(newBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const orderFood = async (req, res) => {
  try {
    const { items } = req.body; // items: [{ foodId, quantity }]
    const userId = req.userId;

    let totalAmount = 0;
    const detailedItems = [];

    for (const item of items) {
      const foodItem = await Food.findById(item.foodId);
      if (!foodItem) {
        return res.status(404).json({ message: `Food item ${item.foodId} not found` });
      }

      const subtotal = foodItem.price * item.quantity;
      totalAmount += subtotal;

      detailedItems.push({
        foodId: foodItem._id,
        name: foodItem.name,
        type: foodItem.type,
        price: foodItem.price,
        quantity: item.quantity,
        subtotal
      });
    }

    const newFoodBooking = new FoodBooking({
      userId,
      items: detailedItems,
      totalAmount,
      status: STATUS.PENDING
    });

    await newFoodBooking.save();

    res.status(201).json(newFoodBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { method, transactionId, discountCode } = req.body;

    // Check if it's a MovieBooking
    let booking = await MovieBooking.findById(id);
    let isMovieBooking = true;

    if (!booking) {
      // Check FoodBooking
      booking = await FoodBooking.findById(id);
      isMovieBooking = false;
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
    }

    if (booking.status === STATUS.PAID) {
      return res.status(400).json({ message: "Booking is already paid" });
    }

    if (isMovieBooking && new Date() > new Date(booking.expiredAt) && booking.status === STATUS.HELD) {
        // Must release seats
        const showtime = await Showtime.findById(booking.showtimeId);
        if (showtime) {
          booking.seats.forEach(bSeat => {
             const sSeat = showtime.seats.find(s => s.seatCode === bSeat.seatCode);
             if (sSeat && sSeat.status === STATUS.HELD) {
                 sSeat.status = STATUS.AVAILABLE;
             }
          });
          await showtime.save();
        }
        booking.status = STATUS.EXPIRED;
        await booking.save();
        return res.status(400).json({ message: "Booking has expired" });
    }

    let finalAmount = booking.totalAmount;

    // Apply Discount
    if (discountCode) {
      const discount = await Discount.findOne({ code: discountCode, status: STATUS.ACTIVE });
      if (discount && discount.usedCount < discount.usageLimit) {
        const currentDate = new Date();
        if (currentDate >= discount.startDate && currentDate <= discount.endDate) {
           if (discount.discountType === "PERCENT") {
             finalAmount -= finalAmount * (discount.value / 100);
           } else if (discount.discountType === "FIXED") {
             finalAmount -= discount.value;
             if (finalAmount < 0) finalAmount = 0;
           }
           discount.usedCount += 1;
           await discount.save();
        }
      }
    }

    // Process payment
    booking.payment = {
      method, // CASH | ONLINE
      paidAt: new Date(),
      transactionId
    };
    booking.status = STATUS.PAID;
    
    if (isMovieBooking) {
        // Generate barcodes for tickets
        booking.seats.forEach(seat => {
            seat.barcode = crypto.randomBytes(6).toString("hex").toUpperCase();
        });
        
        // Update Showtime seats to SOLD
        const showtime = await Showtime.findById(booking.showtimeId);
        if (showtime) {
           booking.seats.forEach(bSeat => {
              const sSeat = showtime.seats.find(s => s.seatCode === bSeat.seatCode);
              if (sSeat) {
                  sSeat.status = STATUS.SOLD;
              }
           });
           await showtime.save();
        }
    }

    await booking.save();

    res.status(200).json({ message: "Payment confirmed", booking, finalAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getBookingHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const movieBookings = await MovieBooking.find({ userId }).populate("showtimeId");
    const foodBookings = await FoodBooking.find({ userId });

    res.status(200).json({
      movieBookings,
      foodBookings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const checkIn = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await MovieBooking.findById(id);
    if (!booking) return res.status(404).json({ message: "Movie Booking not found" });

    if (booking.status !== STATUS.PAID) {
      return res.status(400).json({ message: "Booking must be PAID to check in" });
    }

    booking.status = STATUS.CHECKED_IN;
    await booking.save();

    res.status(200).json({ message: "Checked in successfully", booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  reserveMovieTickets,
  orderFood,
  confirmPayment,
  getBookingHistory,
  checkIn
};
