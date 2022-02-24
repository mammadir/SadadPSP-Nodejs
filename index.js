// require("dotenv").config();
import express from "express";
import axios from "axios";
import CryptoJS from "crypto-js";
import dotenv from "dotenv";
dotenv.config();

// process.env.APP_URL
const app = express();
app.use(express.urlencoded({ extended: true }));
const port = 3000;

app.get("/", async (req, res) => {
  return res.send(
    `<form action="/purchase"><button type="submit">Send Request</button></form>`
  );
});

// رمزنگاری TripleDes
const signData = (message, key1) => {
  const keyHex = CryptoJS.enc.Base64.parse(key1);
  const encrypted = CryptoJS.TripleDES.encrypt(message, keyHex, {
    iv: keyHex,
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });

  return encrypted.toString();
};

/**
 * درخواست توکن به درگاه و هدایت به درگاه
 */
app.get("/purchase", async (req, res) => {
  try {
    // فایل .env ویرایش شود
    const terminalKey = process.env.terminalKey;
    const terminalId = process.env.terminalId;
    const merchantId = process.env.merchantId;
    const purchasePage = process.env.purchasePage;
    const returnUrl = process.env.returnUrl;

    const { amount } = {
      amount: 10000,
    };

    const orderId = Date.now() % 1000;

    const dData = {
      Amount: amount,
      LocalDateTime: new Date().toISOString(),
      MerchantId: merchantId,
      TerminalId: terminalId,
      OrderId: orderId,
      ReturnUrl: returnUrl,
      SignData: signData(`${terminalId};${orderId};${amount}`, terminalKey), // رمزنگاری TripleDes
      // MultiplexingData: multiplexingData,
      // UserId: (Date.now() % 1000) + 100,
    };

    // درخواست توکن به درگاه
    const response = await axios.post(
      `${purchasePage}/api/v0/Request/PaymentRequest`,
      dData
    );

    if (response.data.ResCode == 0) {
      // ذخیره
      // response.data.Token
      // در پایگاه داده

      return res.redirect(
        `${purchasePage}/Purchase/Index?token=${response.data.Token}`
      );
    }

    res.json({ data: response.data });
  } catch (e) {
    console.log(e.message);
  }
});

/**
 * تایید تراکنش بعد از پرداخت، مستقیم توسط درگاه صدا زده می شود این متد.
 */
app.all("/callback", async (req, res) => {
  try {
    const { ResCode, token } = req.body;

    // مقایسه و اعتبار سنجی توکن و شماره فاکتور در پایگاه داده
    // در صورت مجاز ادامه میدهیم

    // چک کردن مقدار زیر در صورت 0 بودن ادامه خواهیم داد
    // ResCode

    if (ResCode !== "0") {
      return res.json({ date: "تراکنش توسط کاربر لغو شد ." + ResCode });
    }

    // فایل .env ویرایش شود
    const terminalKey = process.env.terminalKey;
    const purchasePage = process.env.purchasePage;

    // بررسی صحت اطلاعات دریافتی با درگاه
    const response = await axios.post(`${purchasePage}/api/v0/Advice/Verify`, {
      SignData: signData(token, terminalKey), // رمزنگاری TripleDes
      token: token,
    });

    const verificationResCode = response.data.ResCode;

    if (verificationResCode === "0") {
      // success
      // عملیات موفق
      // ثبت اطلاعات در پایگاه داده
      console.log("success");
    } else {
      // عملیات ناموق
      // ثبت اطلاعات در پایگاه داده
    }

    res.json({
      date: response.data,
    });
  } catch (e) {
    console.log(e.message);
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
