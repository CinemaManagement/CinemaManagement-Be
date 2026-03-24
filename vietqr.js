import { VietQR } from "vietqr";

let vietQR = new VietQR({
  clientID: "client_id_here",
  apiKey: "api_key_here",
});

// list banks are supported create QR code by Vietqr
vietQR
  .getBanks()
  .then((banks) => {
    console.log(banks);
  })
  .catch((err) => {});
