const bwipjs = require("bwip-js");
const { transporter } = require("./email");

const createBarcodeAndSendEmail = async (booking) => {
  try {
    if (!booking) {
      console.error("Booking not found for barcode generation");
      return;
    }

    // 1. Generate Barcode Buffer
    const buffer = await bwipjs.toBuffer({
      bcid: "code128", // Barcode type
      text: booking.bookingCode, // Text to encode
      scale: 3, // 3x scaling factor
      height: 10, // Bar height, in millimeters
      includetext: true, // Show human-readable text
      textxalign: "center", // Always good to set this
    });

    // 2. Send Email with Inline Attachment (CID)
    const mailOptions = {
      from: '"Lily Cinema" <lovealarm.work@gmail.com>',
      to: booking.userId.email,
      subject: "Your Cinema Booking Confirmation",
      html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #e50914; text-align: center;">Booking Confirmation</h2>
                <p>Hi <strong>${booking.userId.fullName}</strong>,</p>
                <p>Thank you for booking with Lily Cinema! Your payment has been confirmed.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <p><strong>Booking Code:</strong> ${booking.bookingCode}</p>
                    <p><strong>Movie:</strong> ${booking.showtimeId ? "Movie detail here" : "Check your history"}</p>
                    <p><strong>Seats:</strong> ${booking.seats.map((s) => s.seatCode).join(", ")}</p>
                    <p><strong>Total Amount:</strong> ${booking.totalAmount.toLocaleString()} VND</p>
                </div>
                <p style="text-align: center;">Please present the barcode below at the cinema counter:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <img src="cid:bookingBarcode" alt="Booking Barcode" style="max-width: 100%; height: auto;" />
                </div>
                <p style="color: #666; font-size: 12px; text-align: center;">
                    This barcode is unique to your booking. Please do not share it with others.
                </p>
            </div>
        `,
      attachments: [
        {
          filename: "barcode.png",
          content: buffer,
          cid: "bookingBarcode", // referenced in the html img src above
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(
      `Barcode generated and sent via email for booking: ${booking.bookingCode}`,
    );
  } catch (error) {
    console.error("Error in createBarcodeAndSendEmail:", error);
  }
};

module.exports = { createBarcodeAndSendEmail };
